import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { ApplicationStatus, DocumentType } from "@/generated/prisma/enums";
import { audit } from "./audit";
import { db } from "./db";
import { mails, sendMail } from "./mail";
import { assertTransition, STATUS } from "./status";

export const applicationInclude = {
  period: true,
  student: { select: { id: true, name: true, email: true, login: true } },
  preferences: { include: { dorm: true }, orderBy: { rank: "asc" } },
  documents: { orderBy: { uploadedAt: "desc" } },
  allocation: { include: { roomType: { include: { dorm: true } } } },
  appeals: {
    orderBy: { createdAt: "desc" },
    include: { documents: { orderBy: { uploadedAt: "desc" } } },
  },
} satisfies Prisma.ApplicationInclude;

export type FullApplication = Prisma.ApplicationGetPayload<{
  include: typeof applicationInclude;
}>;

type Doc = FullApplication["documents"][number];

/** Stavy, v ktorých môže študent žiadosť ešte upravovať (do termínu úprav). */
export const STUDENT_EDITABLE: ApplicationStatus[] = [
  "ROZPRACOVANA",
  "PODANA",
  "OVERUJE_SA",
  "CAKA_NA_DOPLNENIE",
];

export function requiredDocumentTypes(app: {
  claimsSocial: boolean;
  claimsHealth: boolean;
}): DocumentType[] {
  const types: DocumentType[] = [];
  if (app.claimsSocial) types.push("PRIJEM");
  if (app.claimsHealth) types.push("ZDRAVOTNY");
  return types;
}

/** Najnovší doklad každého typu – staršie verzie zostávajú v histórii. */
export function currentDocument(docs: Doc[], type: DocumentType) {
  return docs.find((d) => d.type === type && !d.appealId && !d.purgedAt) ?? null;
}

export type ChecklistItem = {
  type: DocumentType;
  doc: Doc | null;
  state: "CHYBA" | Doc["status"];
};

export function documentChecklist(app: FullApplication): ChecklistItem[] {
  return requiredDocumentTypes(app).map((type) => {
    const doc = currentDocument(app.documents, type);
    return { type, doc, state: doc ? doc.status : "CHYBA" };
  });
}

/**
 * Zmení stav žiadosti cez stavový automat, zapíše audit a pošle e-mail (S.10).
 */
export async function changeStatus(
  applicationId: string,
  to: ApplicationStatus,
  actorId: string | null,
  options: { notify?: boolean; detail?: Record<string, unknown> } = {},
) {
  const app = await db.application.findUniqueOrThrow({
    where: { id: applicationId },
    include: { student: true },
  });
  if (app.status === to) return app;
  assertTransition(app.status, to);

  const updated = await db.$transaction(async (tx) => {
    const result = await tx.application.update({
      where: { id: applicationId },
      data: {
        status: to,
        ...(to === "PODANA" && !app.submittedAt ? { submittedAt: new Date() } : {}),
        ...(to === "ZRUSENA" ? { cancelledAt: new Date() } : {}),
      },
    });
    await audit(
      {
        actorId,
        action: "STAV_ZMENENY",
        entityType: "Application",
        entityId: applicationId,
        detail: { from: app.status, to, ...options.detail },
      },
      tx,
    );
    return result;
  });

  if (options.notify !== false) {
    const mail = mails.statusChanged(app.student.name, STATUS[to].label, STATUS[to].forStudent);
    await sendMail(app.student.email, mail.subject, mail.text);
  }
  return updated;
}
