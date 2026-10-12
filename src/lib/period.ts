import "server-only";
import { db } from "./db";

export async function getActivePeriod() {
  return db.period.findFirst({
    where: { isActive: true },
    orderBy: { submitFrom: "desc" },
  });
}

type Deadlines = { submitFrom: Date; submitTo: Date; editTo: Date; appealTo: Date };

/** Pravidlá termínov (S.11) – po termíne systém danú akciu nepustí. */
export function windows(period: Deadlines, now = new Date()) {
  return {
    beforeSubmit: now < period.submitFrom,
    canSubmit: now >= period.submitFrom && now <= period.submitTo,
    canEdit: now >= period.submitFrom && now <= period.editTo,
    canAppeal: now <= period.appealTo,
  };
}
