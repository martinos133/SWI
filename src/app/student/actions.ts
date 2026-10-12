"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { DocumentType } from "@/generated/prisma/enums";
import { fetchStudentRecord } from "@/lib/ais";
import {
  applicationInclude,
  changeStatus,
  currentDocument,
  requiredDocumentTypes,
  STUDENT_EDITABLE,
} from "@/lib/applications";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActivePeriod, windows } from "@/lib/period";
import { DOCUMENT_TYPE } from "@/lib/status";
import { storeEncrypted } from "@/lib/storage";

export type ActionResult = { ok: true; savedAt?: string } | { ok: false; error: string };

async function loadOwn() {
  const user = await requireUser(["STUDENT"]);
  const period = await getActivePeriod();
  if (!period) throw new Error("Nie je otvorené žiadne konanie.");
  const app = await db.application.findUnique({
    where: { studentId_periodId: { studentId: user.id, periodId: period.id } },
    include: applicationInclude,
  });
  return { user, period, app };
}

async function syncAis(applicationId: string, aisId: string, actorId: string) {
  const record = await fetchStudentRecord(aisId);
  await db.application.update({
    where: { id: applicationId },
    data: {
      aisYear: record.year,
      aisProgram: record.program,
      aisFaculty: record.faculty,
      aisGpa: record.gpa,
      aisDistanceKm: record.distanceKm,
      aisSyncedAt: new Date(),
    },
  });
  await audit({
    actorId,
    action: "AIS_SYNCHRONIZACIA",
    entityType: "Application",
    entityId: applicationId,
    detail: { gpa: record.gpa, year: record.year, distanceKm: record.distanceKm },
  });
}

/** Založí rozpracovanú žiadosť a prevezme údaje z AIS (S.01, S.02). */
export async function startApplication(): Promise<ActionResult> {
  const { user, period, app } = await loadOwn();
  if (app) return { ok: true };
  if (!windows(period).canSubmit) {
    return { ok: false, error: "Podávanie žiadostí nie je otvorené." };
  }
  if (!user.aisId) return { ok: false, error: "Konto nie je prepojené s akademickým IS." };

  const created = await db.application.create({
    data: { studentId: user.id, periodId: period.id },
  });
  await syncAis(created.id, user.aisId, user.id);
  revalidatePath("/student", "layout");
  return { ok: true };
}

export async function refreshFromAis(): Promise<ActionResult> {
  const { user, app } = await loadOwn();
  if (!app || !user.aisId) return { ok: false, error: "Žiadosť neexistuje." };
  if (!STUDENT_EDITABLE.includes(app.status)) {
    return { ok: false, error: "Žiadosť sa už vyhodnocuje, údaje sa obnovia automaticky." };
  }
  await syncAis(app.id, user.aisId, user.id);
  revalidatePath("/student", "layout");
  return { ok: true };
}

const draftSchema = z.object({
  phone: z.string().trim().max(30),
  preferredBeds: z.number().int().min(1).max(3).nullable(),
  claimsSocial: z.boolean(),
  claimsHealth: z.boolean(),
  note: z.string().trim().max(1000),
  preferences: z.array(z.string().min(1)).max(4),
});

export type DraftInput = z.infer<typeof draftSchema>;

/** Priebežné ukladanie rozpísanej žiadosti (S.09). */
export async function saveDraft(input: DraftInput): Promise<ActionResult> {
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Niektoré údaje nie sú platné." };
  const data = parsed.data;

  const { user, period, app } = await loadOwn();
  if (!app) return { ok: false, error: "Žiadosť neexistuje." };
  if (!STUDENT_EDITABLE.includes(app.status) || !windows(period).canEdit) {
    return { ok: false, error: "Žiadosť už nemožno upravovať." };
  }

  const preferences = [...new Set(data.preferences)];
  const dorms = await db.dorm.count({ where: { id: { in: preferences } } });
  if (dorms !== preferences.length) return { ok: false, error: "Neznámy internát." };

  await db.$transaction([
    db.application.update({
      where: { id: app.id },
      data: {
        phone: data.phone || null,
        preferredBeds: data.preferredBeds,
        claimsSocial: data.claimsSocial,
        claimsHealth: data.claimsHealth,
        note: data.note || null,
      },
    }),
    db.preference.deleteMany({ where: { applicationId: app.id } }),
    db.preference.createMany({
      data: preferences.map((dormId, i) => ({ applicationId: app.id, dormId, rank: i + 1 })),
    }),
  ]);

  if (app.status !== "ROZPRACOVANA") {
    await audit({
      actorId: user.id,
      action: "ZIADOST_UPRAVENA",
      entityType: "Application",
      entityId: app.id,
      detail: { ...data, preferences },
    });
  }

  return { ok: true, savedAt: new Date().toISOString() };
}

const PHONE = /^\+?[0-9 ]{9,16}$/;

export async function submitApplication(): Promise<ActionResult> {
  const { user, period, app } = await loadOwn();
  if (!app) return { ok: false, error: "Žiadosť neexistuje." };
  if (app.status !== "ROZPRACOVANA") return { ok: false, error: "Žiadosť je už podaná." };
  if (!windows(period).canSubmit) {
    return { ok: false, error: "Termín na podávanie žiadostí uplynul." };
  }

  const problems: string[] = [];
  if (!app.phone || !PHONE.test(app.phone)) problems.push("vyplňte telefón");
  if (app.preferences.length === 0) problems.push("vyberte aspoň jeden internát");
  for (const type of requiredDocumentTypes(app)) {
    if (!currentDocument(app.documents, type)) {
      problems.push(`nahrajte doklad „${DOCUMENT_TYPE[type].label.toLowerCase()}“`);
    }
  }
  if (problems.length > 0) {
    return { ok: false, error: `Pred podaním ešte ${problems.join(", ")}.` };
  }

  await changeStatus(app.id, "PODANA", user.id);
  await audit({
    actorId: user.id,
    action: "ZIADOST_PODANA",
    entityType: "Application",
    entityId: app.id,
  });
  revalidatePath("/student", "layout");
  return { ok: true };
}

export async function cancelApplication(): Promise<ActionResult> {
  const { user, period, app } = await loadOwn();
  if (!app) return { ok: false, error: "Žiadosť neexistuje." };
  if (!STUDENT_EDITABLE.includes(app.status) || !windows(period).canEdit) {
    return { ok: false, error: "Žiadosť už nemožno zrušiť." };
  }
  await changeStatus(app.id, "ZRUSENA", user.id);
  await audit({
    actorId: user.id,
    action: "ZIADOST_ZRUSENA",
    entityType: "Application",
    entityId: app.id,
  });
  revalidatePath("/student", "layout");
  return { ok: true };
}

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ["application/pdf", "image/jpeg", "image/png"];

/** Nahranie dokladu k žiadosti (S.03). */
export async function uploadDocument(_: unknown, formData: FormData): Promise<ActionResult> {
  const type = formData.get("type") as DocumentType;
  const file = formData.get("file");
  if (!(type === "PRIJEM" || type === "ZDRAVOTNY")) {
    return { ok: false, error: "Neznámy typ dokladu." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Vyberte súbor." };
  }
  if (file.size > MAX_SIZE) return { ok: false, error: "Súbor môže mať najviac 5 MB." };
  if (!ALLOWED.includes(file.type)) {
    return { ok: false, error: "Nahrajte PDF, JPG alebo PNG." };
  }

  const { user, period, app } = await loadOwn();
  if (!app) return { ok: false, error: "Najprv vyplňte žiadosť." };
  if (!STUDENT_EDITABLE.includes(app.status)) {
    return { ok: false, error: "K žiadosti už nemožno nahrávať doklady." };
  }

  const storageKey = await storeEncrypted(Buffer.from(await file.arrayBuffer()));
  const retainUntil = new Date(period.appealTo);
  retainUntil.setMonth(retainUntil.getMonth() + 9);

  const doc = await db.document.create({
    data: {
      applicationId: app.id,
      type,
      fileName: file.name.slice(0, 200),
      mimeType: file.type,
      size: file.size,
      storageKey,
      retainUntil,
    },
  });
  await audit({
    actorId: user.id,
    action: "DOKLAD_NAHRANY",
    entityType: "Document",
    entityId: doc.id,
    detail: { applicationId: app.id, type, fileName: doc.fileName },
  });

  // Ak študent doplnil všetko, o čo referent žiadal, žiadosť sa vráti na overenie.
  if (app.status === "CAKA_NA_DOPLNENIE") {
    const fresh = await db.application.findUniqueOrThrow({
      where: { id: app.id },
      include: { documents: { orderBy: { uploadedAt: "desc" } } },
    });
    const stillMissing = requiredDocumentTypes(fresh).some((t) => {
      const current = fresh.documents.find((d) => d.type === t && !d.appealId);
      return !current || current.status === "DOPLNIT";
    });
    if (!stillMissing) await changeStatus(app.id, "OVERUJE_SA", user.id);
  }

  revalidatePath("/student", "layout");
  return { ok: true };
}
