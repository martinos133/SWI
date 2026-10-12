import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DocumentRow } from "@/components/document-row";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { applicationInclude } from "@/lib/applications";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { getActivePeriod, windows } from "@/lib/period";
import { APPEAL_STATUS } from "@/lib/status";
import { AppealForm } from "./appeal-form";

export const metadata: Metadata = { title: "Odvolanie" };

export default async function AppealPage() {
  const user = await requireUser(["STUDENT"]);
  const period = await getActivePeriod();
  if (!period) redirect("/student");
  const app = await db.application.findUnique({
    where: { studentId_periodId: { studentId: user.id, periodId: period.id } },
    include: applicationInclude,
  });

  const decided = app && (app.status === "PRIDELENA" || app.status === "NEPRIDELENA");
  const pending = app?.appeals.some((a) => a.status === "PODANE");
  const canAppeal = Boolean(decided && !pending && windows(period).canAppeal);

  return (
    <>
      <PageHeader
        title="Odvolanie"
        description={`Ak nesúhlasíte s rozhodnutím o pridelení, podajte odvolanie do ${formatDate(period.appealTo)}. Rozhoduje o ňom ubytovacia komisia.`}
      />

      <div className="flex max-w-3xl flex-col gap-10">
        {canAppeal ? (
          <section aria-labelledby="nove" className="rounded-panel bg-surface p-5 ring-1 ring-line sm:p-6">
            <h2 id="nove" className="text-lg font-bold">
              Nové odvolanie
            </h2>
            <p className="mt-1 text-muted">
              {app?.allocation
                ? `Máte pridelené miesto v internáte ${app.allocation.roomType.dorm.name}. Napíšte, s čím nesúhlasíte a prečo.`
                : "Miesto vám v prvom kole nevyšlo. Napíšte, prečo by mala komisia rozhodnutie zmeniť."}
            </p>
            <AppealForm />
          </section>
        ) : app?.appeals.length ? null : (
          <EmptyState title="Odvolanie zatiaľ nemôžete podať">
            {decided
              ? "Lehota na odvolanie už uplynula."
              : "Odvolať sa dá až po tom, čo vám oznámime rozhodnutie o pridelení miesta."}
          </EmptyState>
        )}

        {app?.appeals.length ? (
          <section aria-labelledby="podane">
            <h2 id="podane" className="text-lg font-bold">
              Vaše odvolania
            </h2>
            <ul className="mt-4 flex flex-col gap-4">
              {app.appeals.map((appeal) => (
                <li key={appeal.id} className="rounded-panel bg-surface ring-1 ring-line">
                  <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3 sm:px-6">
                    <p className="text-sm text-muted">Podané {formatDateTime(appeal.createdAt)}</p>
                    <Badge tone={APPEAL_STATUS[appeal.status].tone}>{APPEAL_STATUS[appeal.status].label}</Badge>
                  </div>
                  <div className="flex flex-col gap-4 px-5 py-4 sm:px-6">
                    <p className="whitespace-pre-line">{appeal.text}</p>
                    {appeal.documents.map((doc) => (
                      <DocumentRow key={doc.id} doc={doc} />
                    ))}
                    {appeal.decidedAt ? (
                      <div className={appeal.status === "UZNANE" ? "rounded-field bg-ok-tint px-4 py-3" : "rounded-field bg-bad-tint px-4 py-3"}>
                        <p className="font-semibold">
                          Rozhodnutie komisie z {formatDate(appeal.decidedAt)}
                        </p>
                        <p className="mt-1">{appeal.decisionNote}</p>
                        {appeal.pointsAdjustment ? (
                          <p className="mt-1 text-sm">
                            Úprava bodov: {appeal.pointsAdjustment > 0 ? "+" : ""}
                            {formatNumber(appeal.pointsAdjustment)}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-sm text-muted">
                        Komisia odvolanie posudzuje. O rozhodnutí vám pošleme e-mail.
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  );
}
