"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { computeRun, confirmRun, EvaluationError } from "@/lib/evaluation";
import { getActivePeriod } from "@/lib/period";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function calculate(): Promise<ActionResult> {
  const user = await requireUser(["REFERENT"]);
  const period = await getActivePeriod();
  if (!period) return { ok: false, error: "Nie je aktívne žiadne konanie." };
  let runId: string;
  try {
    runId = (await computeRun(period.id, user.id)).id;
  } catch (error) {
    if (error instanceof EvaluationError) return { ok: false, error: error.message };
    throw error;
  }
  revalidatePath("/referent", "layout");
  redirect(`/referent/poradie?beh=${runId}`);
}

export async function confirm(runId: string): Promise<ActionResult> {
  const user = await requireUser(["REFERENT"]);
  try {
    await confirmRun(runId, user.id);
  } catch (error) {
    if (error instanceof EvaluationError) return { ok: false, error: error.message };
    throw error;
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
