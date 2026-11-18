import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DocumentRow } from "@/components/document-row";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader, Section } from "@/components/ui/page-header";
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

      <div className="flex max-w-3xl flex-col gap-6">
        {canAppeal ? (
          <Section
            title="Nové odvolanie"
            description={
              app?.allocation
                ? `Máte pridelené miesto v internáte ${app.allocation.roomType.dorm.name}. Napíšte, s čím nesúhlasíte a prečo.`
                : "Miesto vám v prvom kole nevyšlo. Napíšte, prečo by mala komisia rozhodnutie zmeniť."
            }
          >
            <AppealForm />
          </Section>
        ) : app?.appeals.length ? null : (
          <EmptyState title="Odvolanie zatiaľ nemôžete podať">
            {decided
              ? "Lehota na odvolanie už uplynula."
              : "Odvolať sa dá až po tom, čo vám oznámime rozhodnutie o pridelení miesta."}
          </EmptyState>
        )}

        {app?.appeals.length ? (
          <Section title="Vaše odvolania" flush>
            <ul className="divide-y divide-line">
              {app.appeals.map((appeal) => (
                <li key={appeal.id} className="flex flex-col gap-4 px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-muted">Podané {formatDateTime(appeal.createdAt)}</p>
                    <Badge tone={APPEAL_STATUS[appeal.status].tone}>{APPEAL_STATUS[appeal.status].label}</Badge>
                  </div>
                  <p className="whitespace-pre-line">{appeal.text}</p>
                  {appeal.documents.map((doc) => (
                    <DocumentRow key={doc.id} doc={doc} />
                  ))}
                  {appeal.decidedAt ? (
                    <Alert
                      tone={appeal.status === "UZNANE" ? "ok" : "bad"}
                      title={`Rozhodnutie komisie z ${formatDate(appeal.decidedAt)}`}
                    >
                      <p>{appeal.decisionNote}</p>
                      {appeal.pointsAdjustment ? (
                        <p className="mt-1">
                          Úprava bodov: {appeal.pointsAdjustment > 0 ? "+" : ""}
                          {formatNumber(appeal.pointsAdjustment)}
                        </p>
                      ) : null}
                    </Alert>
                  ) : (
                    <p className="text-sm text-muted">
                      Komisia odvolanie posudzuje. O rozhodnutí vám pošleme e-mail.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}
      </div>
    </>
  );
}
