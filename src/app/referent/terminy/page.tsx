import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth";
import { toDateInput } from "@/lib/dates";
import { getActivePeriod, windows } from "@/lib/period";
import { DeadlinesForm } from "./deadlines-form";

export const metadata: Metadata = { title: "Termíny" };

export default async function DeadlinesPage() {
  await requireUser(["REFERENT"]);
  const period = await getActivePeriod();
  if (!period) return <EmptyState title="Nie je aktívne žiadne konanie" />;

  const w = windows(period);
  const phase = w.beforeSubmit
    ? "Podávanie sa ešte nezačalo."
    : w.canSubmit
      ? "Študenti práve podávajú žiadosti."
      : w.canEdit
        ? "Podávanie skončilo, študenti ešte môžu upravovať."
        : w.canAppeal
          ? "Žiadosti sú uzavreté, plynie lehota na odvolania."
          : "Konanie je uzavreté.";

  return (
    <>
      <PageHeader
        title="Termíny"
        description={`Akademický rok ${period.academicYear}. ${phase} Po termíne systém danú akciu študentom nedovolí.`}
      />
      <DeadlinesForm
        periodId={period.id}
        initial={{
          submitFrom: toDateInput(period.submitFrom),
          submitTo: toDateInput(period.submitTo),
          editTo: toDateInput(period.editTo),
          appealTo: toDateInput(period.appealTo),
        }}
      />
    </>
  );
}
