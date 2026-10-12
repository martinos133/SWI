import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DocumentRow } from "@/components/document-row";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { freeRooms } from "@/lib/evaluation";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { getActivePeriod } from "@/lib/period";
import { APPEAL_STATUS } from "@/lib/status";
import { AppealDecision } from "./appeal-decision";

export const metadata: Metadata = { title: "Odvolania" };

export default async function AppealsPage() {
  await requireUser(["KOMISIA"]);
  const period = await getActivePeriod();
  if (!period) return <EmptyState title="Nie je aktívne žiadne konanie" />;

  const appeals = await db.appeal.findMany({
    where: { application: { periodId: period.id } },
    orderBy: { createdAt: "asc" },
    include: {
      documents: true,
      application: {
        include: {
          student: { select: { name: true, login: true } },
          preferences: { include: { dorm: true }, orderBy: { rank: "asc" } },
          allocation: { include: { roomType: { include: { dorm: true } } } },
          rankingEntries: {
            where: { run: { confirmedAt: { not: null } } },
            orderBy: { run: { confirmedAt: "desc" } },
            take: 1,
          },
        },
      },
    },
  });
  const pending = appeals.filter((a) => a.status === "PODANE");
  const decided = appeals.filter((a) => a.status !== "PODANE").reverse();

  const [rooms, dorms] = await Promise.all([
    freeRooms(),
    db.dorm.findMany({ include: { roomTypes: true } }),
  ]);
  const roomOptions = rooms
    .filter((r) => r.free > 0)
    .map((r) => {
      const dorm = dorms.find((d) => d.id === r.dormId)!;
      const type = dorm.roomTypes.find((t) => t.id === r.roomTypeId)!;
      return { id: r.roomTypeId, label: `${dorm.name}, ${type.label.toLowerCase()}`, free: r.free };
    });

  return (
    <>
      <PageHeader
        title="Odvolania"
        description={`Odvolania proti rozhodnutiu o pridelení, lehota do ${formatDate(period.appealTo)}. Rozhodnutie sa študentovi oznámi e-mailom.`}
      />

      {pending.length === 0 ? (
        <EmptyState title="Žiadne odvolanie nečaká na rozhodnutie">
          Keď študent podá odvolanie, objaví sa tu.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-6">
          {pending.map((appeal) => {
            const app = appeal.application;
            const entry = app.rankingEntries[0];
            return (
              <article key={appeal.id} className="rounded-panel bg-surface ring-1 ring-line">
                <header className="flex flex-col gap-2 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div>
                    <h2 className="text-lg font-bold">{app.student.name}</h2>
                    <p className="text-sm text-muted">
                      {app.student.login}, podané {formatDateTime(appeal.createdAt)}
                    </p>
                  </div>
                  {app.allocation ? (
                    <Badge tone="ok">
                      {app.allocation.roomType.dorm.name}, {app.allocation.roomType.label.toLowerCase()}
                    </Badge>
                  ) : (
                    <Badge tone="wait">Náhradník</Badge>
                  )}
                </header>

                <div className="grid gap-8 px-5 py-5 sm:px-6 lg:grid-cols-[1fr_22rem]">
                  <div className="flex flex-col gap-5">
                    <blockquote className="border-l-2 border-brass pl-4 text-[1.0625rem] leading-relaxed whitespace-pre-line">
                      {appeal.text}
                    </blockquote>
                    {appeal.documents.map((doc) => (
                      <DocumentRow key={doc.id} doc={doc} />
                    ))}
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
                      <Fact label="Poradie">{entry ? `${entry.rank}.` : "–"}</Fact>
                      <Fact label="Body">{entry ? formatNumber(entry.points) : "–"}</Fact>
                      <Fact label="Priemer">{formatNumber(app.aisGpa)}</Fact>
                      <Fact label="Vzdialenosť">{app.aisDistanceKm != null ? `${app.aisDistanceKm} km` : "–"}</Fact>
                      <Fact label="Preferencie" wide>
                        {app.preferences.map((p) => p.dorm.name).join(", ") || "–"}
                      </Fact>
                    </dl>
                  </div>
                  <AppealDecision appealId={appeal.id} rooms={roomOptions} hasPlace={Boolean(app.allocation)} />
                </div>
              </article>
            );
          })}
        </div>
      )}

      {decided.length > 0 ? (
        <section aria-labelledby="rozhodnute" className="mt-14">
          <h2 id="rozhodnute" className="text-lg font-bold">
            Rozhodnuté
          </h2>
          <ul className="mt-3 divide-y divide-line rounded-panel bg-surface ring-1 ring-line">
            {decided.map((appeal) => (
              <li key={appeal.id} className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                <div className="min-w-0">
                  <p className="font-semibold">{appeal.application.student.name}</p>
                  <p className="text-sm text-muted">{appeal.decisionNote}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm text-muted">{formatDate(appeal.decidedAt)}</span>
                  <Badge tone={APPEAL_STATUS[appeal.status].tone}>{APPEAL_STATUS[appeal.status].label}</Badge>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function Fact({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2 sm:col-span-4" : undefined}>
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold">{children}</dd>
    </div>
  );
}
