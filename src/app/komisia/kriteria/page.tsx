import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { getActivePeriod } from "@/lib/period";
import { CriteriaEditor } from "./criteria-editor";

export const metadata: Metadata = { title: "Kritériá" };

const ORDER = ["PROSPECH", "VZDIALENOST", "SOCIALNA", "ZDRAVOTNA"];

export default async function CriteriaPage() {
  await requireUser(["KOMISIA"]);
  const period = await getActivePeriod();
  if (!period) return <EmptyState title="Nie je aktívne žiadne konanie" />;

  const criteria = (await db.criterion.findMany({ where: { periodId: period.id } })).sort(
    (a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key),
  );
  const approver = period.criteriaApprovedBy
    ? await db.user.findUnique({ where: { id: period.criteriaApprovedBy }, select: { name: true } })
    : null;

  return (
    <>
      <PageHeader
        title="Kritériá a váhy"
        description={`Podľa nich systém počíta poradie žiadostí na akademický rok ${period.academicYear}. Súčet váh je 100 bodov.`}
      />
      <CriteriaEditor
        periodId={period.id}
        approved={
          period.criteriaApprovedAt
            ? `Schválila ubytovacia komisia ${formatDate(period.criteriaApprovedAt)}${approver ? `, ${approver.name}` : ""}.`
            : null
        }
        criteria={criteria.map((c) => ({
          id: c.id,
          key: c.key,
          name: c.name,
          description: c.description,
          weight: c.weight,
        }))}
      />
    </>
  );
}
