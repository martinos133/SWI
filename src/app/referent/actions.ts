"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { changeStatus, currentDocument, requiredDocumentTypes } from "@/lib/applications";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { allocationsInPeriod } from "@/lib/evaluation";
import { mails, sendMail } from "@/lib/mail";
import { DOCUMENT_TYPE } from "@/lib/status";

export type ActionResult = { ok: true } | { ok: false; error: string };

const refresh = (applicationId: string) => {
  revalidatePath(`/referent/ziadosti/${applicationId}`);
  revalidatePath("/referent");
};

export async function startReview(applicationId: string): Promise<ActionResult> {
  const user = await requireUser(["REFERENT"]);
  const app = await db.application.findUnique({ where: { id: applicationId } });
  if (!app) return { ok: false, error: "Žiadosť neexistuje." };
  if (app.status !== "PODANA") return { ok: false, error: "Žiadosť sa už overuje." };
  await changeStatus(applicationId, "OVERUJE_SA", user.id);
  refresh(applicationId);
  return { ok: true };
}

const reviewSchema = z
  .object({
    documentId: z.string().min(1),
    decision: z.enum(["OVERENY", "ZAMIETNUTY", "DOPLNIT"]),
    note: z.string().trim().max(1000),
    socialLevel: z.number().int().min(0).max(3).nullable(),
  })
  .refine((v) => v.decision === "OVERENY" || v.note.length >= 5, {
    message: "Napíšte študentovi, čo je zle (aspoň pár slov).",
  });

/** Posúdenie dokladu referentom (S.06, UC.06). */
export async function reviewDocument(input: z.input<typeof reviewSchema>): Promise<ActionResult> {
  const user = await requireUser(["REFERENT"]);
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { documentId, decision, note, socialLevel } = parsed.data;

  const doc = await db.document.findUnique({
    where: { id: documentId },
    include: { application: { include: { student: true } } },
  });
  if (!doc || doc.appealId) return { ok: false, error: "Doklad neexistuje." };
  const app = doc.application;
  if (!["PODANA", "OVERUJE_SA", "CAKA_NA_DOPLNENIE"].includes(app.status)) {
    return { ok: false, error: "Doklady tejto žiadosti sa už neposudzujú." };
  }
  if (decision === "OVERENY" && doc.type === "PRIJEM" && socialLevel == null) {
    return { ok: false, error: "Pri potvrdení o príjme zvoľte stupeň sociálnej situácie." };
  }

  await db.$transaction(async (tx) => {
    await tx.document.update({
      where: { id: doc.id },
      data: {
        status: decision,
        reviewNote: decision === "OVERENY" ? null : note,
        reviewedBy: user.id,
        reviewedAt: new Date(),
      },
    });
    await audit(
      {
        actorId: user.id,
        action:
          decision === "OVERENY"
            ? "DOKLAD_SCHVALENY"
            : decision === "ZAMIETNUTY"
              ? "DOKLAD_ZAMIETNUTY"
              : "DOKLAD_VYZIADANE_DOPLNENIE",
        entityType: "Document",
        entityId: doc.id,
        detail: { applicationId: app.id, type: doc.type, note: note || undefined },
      },
      tx,
    );
    if (doc.type === "PRIJEM") {
      const level = decision === "OVERENY" ? socialLevel : null;
      if (level !== app.socialLevel) {
        await tx.application.update({ where: { id: app.id }, data: { socialLevel: level } });
        await audit(
          {
            actorId: user.id,
            action: "SOCIALNA_SITUACIA_POSUDENA",
            entityType: "Application",
            entityId: app.id,
            detail: { from: app.socialLevel, to: level },
          },
          tx,
        );
      }
    }
  });

  if (app.status === "PODANA") await changeStatus(app.id, "OVERUJE_SA", user.id, { notify: false });

  const label = DOCUMENT_TYPE[doc.type].label;
  if (decision === "DOPLNIT") {
    await changeStatus(app.id, "CAKA_NA_DOPLNENIE", user.id, { notify: false });
    const mail = mails.documentRequested(app.student.name, label, note);
    await sendMail(app.student.email, mail.subject, mail.text);
  } else if (decision === "ZAMIETNUTY") {
    const mail = mails.documentRejected(app.student.name, label, note);
    await sendMail(app.student.email, mail.subject, mail.text);
  }

  refresh(app.id);
  return { ok: true };
}

/** Všetky doklady sú posúdené – žiadosť ide do výpočtu poradia. */
export async function finishReview(applicationId: string): Promise<ActionResult> {
  const user = await requireUser(["REFERENT"]);
  const app = await db.application.findUnique({
    where: { id: applicationId },
    include: { documents: { orderBy: { uploadedAt: "desc" } } },
  });
  if (!app) return { ok: false, error: "Žiadosť neexistuje." };
  if (app.status !== "OVERUJE_SA") {
    return { ok: false, error: "Na vyhodnotenie sa dá posunúť iba žiadosť, ktorá sa overuje." };
  }
  for (const type of requiredDocumentTypes(app)) {
    const doc = currentDocument(app.documents, type);
    if (!doc) return { ok: false, error: `Chýba doklad „${DOCUMENT_TYPE[type].label}“. Vyžiadajte ho.` };
    if (doc.status === "NAHRANY" || doc.status === "DOPLNIT") {
      return { ok: false, error: `Doklad „${DOCUMENT_TYPE[type].label}“ ešte nie je posúdený.` };
    }
  }
  await changeStatus(applicationId, "VYHODNOCUJE_SA", user.id);
  refresh(applicationId);
  return { ok: true };
}

/**
 * Pridelenie uvoľneného miesta náhradníkovi počas roka (SW.08 – robí referent ručne
 * podľa poradia náhradníkov). Kapacita sa overuje v transakcii (E.07).
 */
export async function assignFreePlace(applicationId: string, roomTypeId: string): Promise<ActionResult> {
  const user = await requireUser(["REFERENT"]);
  const app = await db.application.findUnique({
    where: { id: applicationId },
    include: { allocation: true },
  });
  if (!app || app.status !== "NEPRIDELENA" || app.allocation) {
    return { ok: false, error: "Miesto sa dá prideliť iba náhradníkovi." };
  }
  try {
    await db.$transaction(async (tx) => {
      const room = await tx.roomType.findUniqueOrThrow({
        where: { id: roomTypeId },
        include: { ...allocationsInPeriod(app.periodId), dorm: true },
      });
      if (room._count.allocations >= room.capacity) {
        throw new CapacityError(`V internáte ${room.dorm.name} už nie je voľné miesto tohto typu.`);
      }
      await tx.allocation.create({ data: { applicationId, roomTypeId, confirmedBy: user.id } });
      await audit(
        {
          actorId: user.id,
          action: "PRIDELENIE_POTVRDENE",
          entityType: "Application",
          entityId: applicationId,
          detail: { manual: true, dorm: room.dorm.name, room: room.label },
        },
        tx,
      );
    });
  } catch (error) {
    if (error instanceof CapacityError) return { ok: false, error: error.message };
    throw error;
  }
  await changeStatus(applicationId, "PRIDELENA", user.id);
  refresh(applicationId);
  return { ok: true };
}

class CapacityError extends Error {}
