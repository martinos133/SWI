import type { PrismaClient } from "@/generated/prisma/client";
import { purgeFile } from "./storage";

/**
 * Zmaže doklady, ktorým uplynula doba uchovávania (E.04, S.12).
 * Záznam o doklade zostáva (kvôli auditu), zmaže sa iba šifrovaný súbor.
 */
export async function purgeExpiredDocuments(db: PrismaClient, now = new Date()) {
  const expired = await db.document.findMany({
    where: { retainUntil: { lt: now }, purgedAt: null },
    select: { id: true, storageKey: true, applicationId: true, type: true },
  });
  for (const doc of expired) {
    await purgeFile(doc.storageKey);
    await db.document.update({ where: { id: doc.id }, data: { purgedAt: now } });
    await db.auditLog.create({
      data: {
        actorId: null,
        action: "DOKLAD_ZMAZANY_RETENCIA",
        entityType: "Document",
        entityId: doc.id,
        detail: JSON.stringify({ applicationId: doc.applicationId, type: doc.type }),
      },
    });
  }
  return expired.length;
}
