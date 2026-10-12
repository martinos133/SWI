import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { applicationInclude, STUDENT_EDITABLE } from "@/lib/applications";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { getActivePeriod, windows } from "@/lib/period";
import { ApplicationForm } from "./application-form";

export const metadata: Metadata = { title: "Žiadosť" };

export default async function ApplicationPage() {
  const user = await requireUser(["STUDENT"]);
  const period = await getActivePeriod();
  if (!period) redirect("/student");

  const app = await db.application.findUnique({
    where: { studentId_periodId: { studentId: user.id, periodId: period.id } },
    include: applicationInclude,
  });
  if (!app) redirect("/student");

  if (app.status === "ZRUSENA") {
    return (
      <>
        <PageHeader title="Žiadosť o ubytovanie" />
        <EmptyState title="Žiadosť je zrušená">
          Zrušili ste ju {formatDate(app.cancelledAt)}. Ak chcete požiadať znova, napíšte na{" "}
          <a className="underline" href="mailto:ubytovanie@uniba.example">
            ubytovanie@uniba.example
          </a>
          .
        </EmptyState>
      </>
    );
  }

  const dorms = await db.dorm.findMany({
    orderBy: { name: "asc" },
    include: { roomTypes: { orderBy: { beds: "asc" } } },
  });
  const w = windows(period);
  const editable = STUDENT_EDITABLE.includes(app.status) && w.canEdit;
  const bedOptions = [...new Set(dorms.flatMap((d) => d.roomTypes.map((r) => r.beds)))].sort();

  return (
    <>
      <PageHeader
        title="Žiadosť o ubytovanie"
        description={
          editable
            ? `Zmeny sa ukladajú priebežne. Upravovať môžete do ${formatDate(period.editTo)}.`
            : "Žiadosť sa už nedá upravovať."
        }
      />
      <ApplicationForm
        editable={editable}
        canSubmit={app.status === "ROZPRACOVANA" && w.canSubmit}
        submitted={app.status !== "ROZPRACOVANA"}
        submitTo={formatDate(period.submitTo)}
        ais={{
          year: app.aisYear,
          program: app.aisProgram,
          faculty: app.aisFaculty,
          gpa: app.aisGpa,
          distanceKm: app.aisDistanceKm,
          syncedAt: app.aisSyncedAt?.toISOString() ?? null,
        }}
        dorms={dorms.map((d) => ({
          id: d.id,
          name: d.name,
          address: d.address,
          rooms: d.roomTypes.map((r) => r.label),
        }))}
        bedOptions={bedOptions}
        initial={{
          phone: app.phone ?? "",
          preferredBeds: app.preferredBeds,
          claimsSocial: app.claimsSocial,
          claimsHealth: app.claimsHealth,
          note: app.note ?? "",
          preferences: app.preferences.map((p) => p.dormId),
        }}
      />
    </>
  );
}
