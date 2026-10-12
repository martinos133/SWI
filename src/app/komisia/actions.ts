"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { changeStatus } from "@/lib/applications";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { mails, sendMail } from "@/lib/mail";

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

class DecisionError extends Error {}

const decisionSchema = z.object({
  appealId: z.string().min(1),
  upheld: z.boolean(),
  note: z.string().trim().min(10, "Odôvodnite rozhodnutie aspoň jednou vetou.").max(2000),
  roomTypeId: z.string().min(1).nullable(),
  pointsAdjustment: z.number().min(-100).max(100).nullable(),
});

/** Rozhodnutie komisie o odvolaní (UC.08). Zmena bodov aj miesta ide do auditu. */
export async function decideAppeal(input: z.input<typeof decisionSchema>): Promise<ActionResult> {
  const user = await requireUser(["KOMISIA"]);
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { appealId, upheld, note, roomTypeId, pointsAdjustment } = parsed.data;

  const appeal = await db.appeal.findUnique({
    where: { id: appealId },
    include: { application: { include: { student: true, allocation: true } } },
  });
  if (!appeal || appeal.status !== "PODANE") return { ok: false, error: "Odvolanie už je rozhodnuté." };
  const app = appeal.application;
  if (app.status !== "ODVOLANIE") return { ok: false, error: "Žiadosť nie je v stave odvolania." };

  let hasPlace = Boolean(app.allocation);
  try {
    await db.$transaction(async (tx) => {
      const claimed = await tx.appeal.updateMany({
        where: { id: appeal.id, status: "PODANE" },
        data: {
          status: upheld ? "UZNANE" : "ZAMIETNUTE",
          decisionNote: note,
          decidedBy: user.id,
          decidedAt: new Date(),
          pointsAdjustment: upheld ? pointsAdjustment : null,
        },
      });
      if (claimed.count === 0) throw new DecisionError("Odvolanie už rozhodol iný člen komisie.");

      if (upheld && roomTypeId && roomTypeId !== app.allocation?.roomTypeId) {
        const room = await tx.roomType.findUniqueOrThrow({
          where: { id: roomTypeId },
          include: { _count: { select: { allocations: true } }, dorm: true },
        });
        if (room._count.allocations >= room.capacity) {
          throw new DecisionError(`V internáte ${room.dorm.name} už nie je voľné miesto tohto typu.`);
        }
        if (app.allocation) {
          await tx.allocation.update({
            where: { id: app.allocation.id },
            data: { roomTypeId, confirmedBy: user.id, confirmedAt: new Date(), runId: null },
          });
        } else {
          await tx.allocation.create({
            data: { applicationId: app.id, roomTypeId, confirmedBy: user.id },
          });
        }
        hasPlace = true;
      }

      if (upheld && pointsAdjustment) {
        await audit(
          {
            actorId: user.id,
            action: "BODY_ZMENENE",
            entityType: "Application",
            entityId: app.id,
            detail: { appealId: appeal.id, adjustment: pointsAdjustment, note },
          },
          tx,
        );
      }
      await audit(
        {
          actorId: user.id,
          action: "ODVOLANIE_ROZHODNUTE",
          entityType: "Appeal",
          entityId: appeal.id,
          detail: { upheld, roomTypeId, pointsAdjustment, note },
        },
        tx,
      );
    });
  } catch (error) {
    if (error instanceof DecisionError) return { ok: false, error: error.message };
    throw error;
  }

  await changeStatus(app.id, hasPlace ? "PRIDELENA" : "NEPRIDELENA", user.id, { notify: false });
  const mail = mails.appealDecided(app.student.name, upheld, note);
  await sendMail(app.student.email, mail.subject, mail.text);

  revalidatePath("/komisia");
  return { ok: true };
}
