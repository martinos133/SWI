"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export type ActionResult = { ok: true } | { ok: false; error: string };

const schema = z.object({
  periodId: z.string().min(1),
  criteria: z
    .array(
      z.object({
        id: z.string().min(1),
        weight: z.number().int().min(0).max(100),
        description: z.string().trim().min(10).max(500),
      }),
    )
    .min(1),
});

/** Úprava váh kritérií (S.16). Zmena ruší predchádzajúce schválenie. */
export async function saveCriteria(input: z.input<typeof schema>): Promise<ActionResult> {
  const user = await requireUser(["KOMISIA"]);
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Skontrolujte váhy a popisy kritérií." };
  const { periodId, criteria } = parsed.data;

  const sum = criteria.reduce((s, c) => s + c.weight, 0);
  if (sum !== 100) return { ok: false, error: `Súčet váh musí byť 100, teraz je ${sum}.` };

  const current = await db.criterion.findMany({ where: { periodId } });
  const changed = criteria.filter((c) => {
    const before = current.find((x) => x.id === c.id);
    return before && (before.weight !== c.weight || before.description !== c.description);
  });
  if (changed.length === 0) return { ok: true };

  await db.$transaction([
    ...changed.map((c) =>
      db.criterion.update({
        where: { id: c.id, periodId },
        data: { weight: c.weight, description: c.description },
      }),
    ),
    db.period.update({
      where: { id: periodId },
      data: { criteriaApprovedAt: null, criteriaApprovedBy: null },
    }),
  ]);
  await audit({
    actorId: user.id,
    action: "KRITERIA_ZMENENE",
    entityType: "Period",
    entityId: periodId,
    detail: Object.fromEntries(
      changed.map((c) => [
        current.find((x) => x.id === c.id)!.key,
        { from: current.find((x) => x.id === c.id)!.weight, to: c.weight },
      ]),
    ),
  });
  revalidatePath("/komisia/kriteria");
  return { ok: true };
}

/** Schválenie kritérií komisiou – bez neho sa poradie nedá vypočítať (E.03). */
export async function approveCriteria(periodId: string): Promise<ActionResult> {
  const user = await requireUser(["KOMISIA"]);
  const criteria = await db.criterion.findMany({ where: { periodId } });
  const sum = criteria.reduce((s, c) => s + c.weight, 0);
  if (sum !== 100) return { ok: false, error: `Súčet váh musí byť 100, teraz je ${sum}.` };

  await db.period.update({
    where: { id: periodId },
    data: { criteriaApprovedAt: new Date(), criteriaApprovedBy: user.id },
  });
  await audit({
    actorId: user.id,
    action: "KRITERIA_SCHVALENE",
    entityType: "Period",
    entityId: periodId,
    detail: Object.fromEntries(criteria.map((c) => [c.key, c.weight])),
  });
  revalidatePath("/komisia/kriteria");
  return { ok: true };
}
