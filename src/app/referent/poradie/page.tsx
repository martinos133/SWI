import clsx from "clsx";
import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, EmptyState, PageHeader, Section } from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import type { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { freeRooms, verifyRun } from "@/lib/evaluation";
import { formatDateTime, formatNumber } from "@/lib/format";
import { getActivePeriod } from "@/lib/period";
import type { BreakdownItem, CriterionWeight } from "@/lib/ranking";
import { CalculateButton, ConfirmButton } from "./buttons";

export const metadata: Metadata = { title: "Poradie a pridelenie" };

/** Odtiene značkovej farby pre podiel kritérií na bodoch. */
const SHADES = ["bg-pine", "bg-pine/70", "bg-pine/45", "bg-pine/25"];

const runInclude = {
  entries: {
    orderBy: { rank: "asc" },
    include: {
      application: { include: { student: { select: { name: true, login: true } } } },
    },
  },
} satisfies Prisma.RankingRunInclude;

export default async function RankingPage({ searchParams }: PageProps<"/referent/poradie">) {
  await requireUser(["REFERENT"]);
  const period = await getActivePeriod();
  if (!period) return <EmptyState title="Nie je aktívne žiadne konanie" />;

  const { beh } = await searchParams;
  const [waiting, inReview, rooms, runs, dorms] = await Promise.all([
    db.application.count({ where: { periodId: period.id, status: "VYHODNOCUJE_SA" } }),
    db.application.count({
      where: { periodId: period.id, status: { in: ["PODANA", "OVERUJE_SA", "CAKA_NA_DOPLNENIE"] } },
    }),
    freeRooms(period.id),
    db.rankingRun.findMany({
      where: { periodId: period.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { entries: true } } },
    }),
    db.dorm.findMany({ include: { roomTypes: true }, orderBy: { name: "asc" } }),
  ]);
  const free = rooms.reduce((s, r) => s + r.free, 0);
  const selectedId = typeof beh === "string" ? beh : runs[0]?.id;
  const run = selectedId
    ? await db.rankingRun.findUnique({ where: { id: selectedId }, include: runInclude })
    : null;

  const users = await db.user.findMany({
    where: { id: { in: runs.flatMap((r) => [r.createdBy, r.confirmedBy ?? ""]) } },
    select: { id: true, name: true },
  });
  const userName = (id: string | null) => users.find((u) => u.id === id)?.name ?? "–";
  const roomLabel = new Map(
    dorms.flatMap((d) => d.roomTypes.map((r) => [r.id, { dorm: d.name, room: r.label }] as const)),
  );

  return (
    <>
      <PageHeader
        title="Poradie a pridelenie"
        description="Systém zoradí žiadosti podľa schválených kritérií a navrhne pridelenie do voľných miest. Návrh potvrdzujete vy."
      />

      <div className="flex flex-col gap-6">
        {period.criteriaApprovedAt ? null : (
          <Alert tone="wait">Kritériá zatiaľ nie sú schválené komisiou.</Alert>
        )}

        <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <p>
              <strong className="font-semibold tabular-nums">{waiting}</strong> {waiting === 1 ? "žiadosť čaká" : waiting >= 2 && waiting <= 4 ? "žiadosti čakajú" : "žiadostí čaká"} na vyhodnotenie,
              voľných je <strong className="font-semibold tabular-nums">{free}</strong> miest.
            </p>
            <p className="mt-1 text-sm text-muted">
              {inReview > 0
                ? `${inReview} žiadostí sa ešte overuje. Do výpočtu vstúpia, keď ich posuniete na vyhodnotenie.`
                : "Všetky podané žiadosti sú overené."}
            </p>
          </div>
          <CalculateButton disabled={waiting === 0 || !period.criteriaApprovedAt} />
        </Card>

        {!run ? (
          <EmptyState title="Poradie ešte nebolo vypočítané">
            Keď budú žiadosti overené, spustite výpočet. Každý výpočet sa uloží a dá sa neskôr doložiť.
          </EmptyState>
        ) : (
          <RunView
            run={run}
            isLatest={run.id === runs[0]?.id}
            author={userName(run.createdBy)}
            confirmer={userName(run.confirmedBy)}
            roomLabel={roomLabel}
            mismatches={await verifyRun(run.id)}
          />
        )}

        {runs.length > 1 ? (
          <Section title="Predchádzajúce výpočty" flush>
            <ul className="divide-y divide-line">
              {runs.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/referent/poradie?beh=${r.id}`}
                    aria-current={r.id === run?.id ? "true" : undefined}
                    className={clsx(
                      "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3 transition-colors",
                      r.id === run?.id ? "bg-pine-tint" : "hover:bg-hover",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="font-medium text-ink tabular-nums">{formatDateTime(r.createdAt)}</span>
                      <span className="text-sm text-muted">, {userName(r.createdBy)}, {r._count.entries} žiadostí</span>
                    </span>
                    {r.confirmedAt ? <Badge tone="ok">Potvrdený</Badge> : <Badge>Návrh</Badge>}
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}
      </div>
    </>
  );
}

type Run = Prisma.RankingRunGetPayload<{ include: typeof runInclude }>;

function RunView({
  run,
  isLatest,
  author,
  confirmer,
  roomLabel,
  mismatches,
}: {
  run: Run;
  isLatest: boolean;
  author: string;
  confirmer: string;
  roomLabel: Map<string, { dorm: string; room: string }>;
  mismatches: string[];
}) {
  const criteria = JSON.parse(run.criteriaSnapshot) as CriterionWeight[];
  const proposed = run.entries.filter((e) => e.proposedRoomTypeId).length;
  const waitlist = run.entries.length - proposed;

  return (
    <Section
      title={
        <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="tabular-nums">Výpočet z {formatDateTime(run.createdAt)}</span>
          {run.confirmedAt ? <Badge tone="ok">Potvrdený</Badge> : <Badge>Návrh</Badge>}
        </span>
      }
      description={
        <>
          Výpočet spustil používateľ {author}. Navrhnutých miest {proposed}, náhradníkov {waitlist}.
          {run.confirmedAt ? ` Pridelenie potvrdené ${formatDateTime(run.confirmedAt)}, ${confirmer}.` : ""}
        </>
      }
      actions={!run.confirmedAt && isLatest ? <ConfirmButton runId={run.id} count={proposed} /> : undefined}
      flush
    >
      <div className="flex flex-col gap-3 border-b border-line px-5 py-3.5">
        <p className={clsx("flex items-start gap-1.5 text-sm font-medium", mismatches.length ? "text-bad" : "text-ok")}>
          <svg viewBox="0 0 16 16" className="mt-0.5 size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            {mismatches.length ? <path d="M8 4.5v4m0 3v.01" strokeLinecap="round" /> : <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />}
          </svg>
          {mismatches.length
            ? `Pri ${mismatches.length} žiadostiach sa výpočet nedá zopakovať.`
            : "Výpočet sme zopakovali z uložených vstupov, body sa zhodujú."}
        </p>
        <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted">
          {criteria.map((c, i) => (
            <li key={c.key} className="inline-flex items-center gap-1.5">
              <span aria-hidden className={clsx("size-2.5 shrink-0", SHADES[i % SHADES.length])} />
              {c.name} ({c.weight})
            </li>
          ))}
        </ul>
      </div>

      <Table bordered={false} minWidth="46rem">
        <THead>
          <tr>
            <TH align="right" className="w-20">
              Poradie
            </TH>
            <TH>Študent</TH>
            <TH align="right" className="w-48">
              Body
            </TH>
            <TH>{run.confirmedAt ? "Výsledok" : "Návrh"}</TH>
          </tr>
        </THead>
        <TBody>
          {run.entries.map((entry) => {
            const breakdown = JSON.parse(entry.breakdown) as Record<string, BreakdownItem>;
            const target = entry.proposedRoomTypeId ? roomLabel.get(entry.proposedRoomTypeId) : null;
            return (
              <TR key={entry.id}>
                <TD align="right" className="font-semibold">
                  {entry.rank}.
                </TD>
                <TD>
                  <Link
                    href={`/referent/ziadosti/${entry.applicationId}`}
                    className="font-semibold text-ink hover:text-pine hover:underline"
                  >
                    {entry.application.student.name}
                  </Link>
                  <p className="text-sm text-muted">{entry.application.student.login}</p>
                </TD>
                <TD align="right">
                  <div className="flex items-center justify-end gap-3">
                    <span
                      aria-hidden
                      className="flex h-2 w-24 overflow-hidden bg-sunken"
                      title={criteria.map((c) => `${c.name}: ${formatNumber(breakdown[c.key]?.points ?? 0)}`).join("\n")}
                    >
                      {criteria.map((c, i) => (
                        <span
                          key={c.key}
                          className={SHADES[i % SHADES.length]}
                          style={{ width: `${breakdown[c.key]?.points ?? 0}%` }}
                        />
                      ))}
                    </span>
                    <span className="w-12 font-semibold">{formatNumber(entry.points)}</span>
                  </div>
                </TD>
                <TD>
                  {target ? (
                    <span>
                      <span className="font-medium">{target.dorm}</span>
                      <span className="text-sm text-muted">, {target.room.toLowerCase()}</span>
                    </span>
                  ) : (
                    <Badge tone="wait">Náhradník</Badge>
                  )}
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </Section>
  );
}
