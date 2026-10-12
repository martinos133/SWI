"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { toDateInput, zonedDate } from "@/lib/dates";

export type DeadlinesState = { ok?: boolean; error?: string } | undefined;

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Zadajte dátum.");

const schema = z
  .object({
    periodId: z.string().min(1),
    submitFrom: date,
    submitTo: date,
    editTo: date,
    appealTo: date,
  })
  .refine((v) => v.submitFrom <= v.submitTo, {
    message: "Koniec podávania musí byť po jeho začiatku.",
  })
  .refine((v) => v.editTo >= v.submitTo, {
    message: "Úpravy nemôžu skončiť skôr ako podávanie.",
  })
  .refine((v) => v.appealTo > v.editTo, {
    message: "Lehota na odvolania musí byť po termíne úprav.",
  });

/** Nastavenie termínov konania (S.11, UC.10). */
export async function saveDeadlines(_: DeadlinesState, formData: FormData): Promise<DeadlinesState> {
  const user = await requireUser(["REFERENT"]);
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;

  const period = await db.period.findUnique({ where: { id: v.periodId } });
  if (!period) return { error: "Konanie neexistuje." };

  const next = {
    submitFrom: zonedDate(v.submitFrom, "00:00"),
    submitTo: zonedDate(v.submitTo, "23:59"),
    editTo: zonedDate(v.editTo, "23:59"),
    appealTo: zonedDate(v.appealTo, "23:59"),
  };

  await db.period.update({ where: { id: period.id }, data: next });
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
