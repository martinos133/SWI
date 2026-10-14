import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth";
import { toDateInput } from "@/lib/dates";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { getActivePeriod, windows } from "@/lib/period";
import { DeadlinesForm } from "./deadlines-form";
import { Periods } from "./periods";

export const metadata: Metadata = { title: "Termíny" };

export default async function DeadlinesPage() {
  await requireUser(["REFERENT"]);
  const period = await getActivePeriod();
  if (!period) return <EmptyState title="Nie je aktívne žiadne konanie" />;

  const periods = await db.period.findMany({
    orderBy: { academicYear: "desc" },
    include: { _count: { select: { applications: true } } },
  });
  const [start] = period.academicYear.split("/").map(Number);
  const nextYear = (d: Date) => {
    const copy = new Date(d);
    copy.setFullYear(copy.getFullYear() + 1);
    return toDateInput(copy);
  };

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
        key={period.id}
        periodId={period.id}
        initial={{
          submitFrom: toDateInput(period.submitFrom),
          submitTo: toDateInput(period.submitTo),
          editTo: toDateInput(period.editTo),
          appealTo: toDateInput(period.appealTo),
        }}
      />
      <Periods
        periods={periods.map((p) => ({
          id: p.id,
          academicYear: p.academicYear,
          range: `podávanie ${formatDate(p.submitFrom)} – ${formatDate(p.submitTo)}`,
          isActive: p.isActive,
          applications: p._count.applications,
        }))}
        defaults={{
          academicYear: `${start + 1}/${String((start + 2) % 100).padStart(2, "0")}`,
          submitFrom: nextYear(period.submitFrom),
          submitTo: nextYear(period.submitTo),
          editTo: nextYear(period.editTo),
          appealTo: nextYear(period.appealTo),
        }}
      />
    </>
  );
}
