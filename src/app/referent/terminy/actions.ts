"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { toDateInput, zonedDate } from "@/lib/dates";

export type DeadlinesState = { ok?: boolean; error?: string } | undefined;

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Zadajte dátum.");
const dateFields = { submitFrom: date, submitTo: date, editTo: date, appealTo: date };

type Dates = { submitFrom: string; submitTo: string; editTo: string; appealTo: string };

/** Pravidlá poradia termínov – spoločné pre úpravu aj nové konanie. */
function checkOrder(v: Dates): string | null {
  if (v.submitFrom > v.submitTo) return "Koniec podávania musí byť po jeho začiatku.";
  if (v.editTo < v.submitTo) return "Úpravy nemôžu skončiť skôr ako podávanie.";
  if (v.appealTo <= v.editTo) return "Lehota na odvolania musí byť po termíne úprav.";
  return null;
}

const toDeadlines = (v: Dates) => ({
  submitFrom: zonedDate(v.submitFrom, "00:00"),
  submitTo: zonedDate(v.submitTo, "23:59"),
  editTo: zonedDate(v.editTo, "23:59"),
  appealTo: zonedDate(v.appealTo, "23:59"),
});

const deadlinesSchema = z.object({ periodId: z.string().min(1), ...dateFields });

/** Nastavenie termínov konania (S.11, UC.10). */
export async function saveDeadlines(_: DeadlinesState, formData: FormData): Promise<DeadlinesState> {
  const user = await requireUser(["REFERENT"]);
  const parsed = deadlinesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;
  const orderError = checkOrder(v);
  if (orderError) return { error: orderError };

  const period = await db.period.findUnique({ where: { id: v.periodId } });
  if (!period) return { error: "Konanie neexistuje." };

  await db.period.update({ where: { id: period.id }, data: toDeadlines(v) });
  await audit({
    actorId: user.id,
    action: "TERMINY_ZMENENE",
    entityType: "Period",
    entityId: period.id,
    detail: {
      from: {
        submitFrom: toDateInput(period.submitFrom),
        submitTo: toDateInput(period.submitTo),
        editTo: toDateInput(period.editTo),
        appealTo: toDateInput(period.appealTo),
      },
      to: { submitFrom: v.submitFrom, submitTo: v.submitTo, editTo: v.editTo, appealTo: v.appealTo },
    },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

const periodSchema = z.object({
  academicYear: z
    .string()
    .trim()
    .regex(/^\d{4}\/\d{2}$/, "Akademický rok zadajte v tvare 2028/29."),
  ...dateFields,
});

/**
 * Nové konanie na ďalší akademický rok. Kritériá a váhy sa prevezmú z aktuálneho
 * konania, ale komisia ich musí znova schváliť (E.03). Nové konanie sa stane aktívnym.
 */
export async function createPeriod(_: DeadlinesState, formData: FormData): Promise<DeadlinesState> {
  const user = await requireUser(["REFERENT"]);
  const parsed = periodSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;
  const orderError = checkOrder(v);
  if (orderError) return { error: orderError };

  const [start, end] = v.academicYear.split("/").map(Number);
  if ((start + 1) % 100 !== end) {
    return { error: "Roky nenasledujú po sebe, napríklad 2028/29." };
  }
  if (await db.period.findUnique({ where: { academicYear: v.academicYear } })) {
    return { error: `Konanie na rok ${v.academicYear} už existuje.` };
  }

  const current = await db.period.findFirst({
    where: { isActive: true },
    include: { criteria: true },
  });

  const created = await db.$transaction(async (tx) => {
    await tx.period.updateMany({ where: { isActive: true }, data: { isActive: false } });
    return tx.period.create({
      data: {
        academicYear: v.academicYear,
        ...toDeadlines(v),
        isActive: true,
        criteria: {
          create: (current?.criteria ?? []).map((c) => ({
            key: c.key,
            name: c.name,
            description: c.description,
            weight: c.weight,
          })),
        },
      },
    });
  });

  await audit({
    actorId: user.id,
    action: "KONANIE_ZALOZENE",
    entityType: "Period",
    entityId: created.id,
    detail: { academicYear: v.academicYear, previous: current?.academicYear ?? null },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Prepnutie aktívneho konania, napríklad na dokončenie odvolaní v starom roku. */
export async function activatePeriod(periodId: string): Promise<DeadlinesState> {
  const user = await requireUser(["REFERENT"]);
  const period = await db.period.findUnique({ where: { id: periodId } });
  if (!period) return { error: "Konanie neexistuje." };

  await db.$transaction([
    db.period.updateMany({ where: { isActive: true }, data: { isActive: false } }),
    db.period.update({ where: { id: periodId }, data: { isActive: true } }),
  ]);
  await audit({
    actorId: user.id,
    action: "KONANIE_AKTIVOVANE",
    entityType: "Period",
    entityId: periodId,
    detail: { academicYear: period.academicYear },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
