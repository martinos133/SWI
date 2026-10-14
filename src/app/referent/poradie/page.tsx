import clsx from "clsx";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { Prisma } from "@/generated/prisma/client";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { freeRooms, verifyRun } from "@/lib/evaluation";
import { formatDateTime, formatNumber } from "@/lib/format";
import { getActivePeriod } from "@/lib/period";
import type { BreakdownItem, CriterionWeight } from "@/lib/ranking";
import { CalculateButton, ConfirmButton } from "./buttons";

export const metadata: Metadata = { title: "Poradie a pridelenie" };

const SHADES = ["bg-pine", "bg-[#2f6a5f]", "bg-[#5f978a]", "bg-[#9cc2b8]"];

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

      <section className="mb-12 flex flex-col gap-5 rounded-panel bg-surface p-5 ring-1 ring-line sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="max-w-2xl">
          <p className="text-lg">
            <strong className="font-bold">{waiting}</strong> {waiting === 1 ? "žiadosť čaká" : waiting >= 2 && waiting <= 4 ? "žiadosti čakajú" : "žiadostí čaká"} na vyhodnotenie,
            voľných je <strong className="font-bold">{free}</strong> miest.
          </p>
          <p className="mt-1 text-sm text-muted">
            {inReview > 0
              ? `${inReview} žiadostí sa ešte overuje. Do výpočtu vstúpia, keď ich posuniete na vyhodnotenie.`
              : "Všetky podané žiadosti sú overené."}{" "}
            {period.criteriaApprovedAt ? null : (
              <span className="font-semibold text-bad">Kritériá zatiaľ nie sú schválené komisiou.</span>
            )}
          </p>
        </div>
        <CalculateButton disabled={waiting === 0 || !period.criteriaApprovedAt} />
      </section>

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
        <section aria-labelledby="historia" className="mt-14">
          <h2 id="historia" className="text-lg font-bold">
            Predchádzajúce výpočty
          </h2>
          <ul className="mt-3 divide-y divide-line rounded-panel bg-surface ring-1 ring-line">
            {runs.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/referent/poradie?beh=${r.id}`}
                  aria-current={r.id === run?.id ? "true" : undefined}
                  className={clsx(
                    "flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-paper",
                    r.id === run?.id && "bg-pine-tint/50",
                  )}
                >
                  <span>
                    <span className="font-medium">{formatDateTime(r.createdAt)}</span>
                    <span className="text-sm text-muted">, {userName(r.createdBy)}, {r._count.entries} žiadostí</span>
                  </span>
                  {r.confirmedAt ? <Badge tone="ok">Potvrdený</Badge> : <Badge>Návrh</Badge>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
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
    <section aria-labelledby="vypocet">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="vypocet" className="text-2xl font-bold">
              Výpočet z {formatDateTime(run.createdAt)}
            </h2>
            {run.confirmedAt ? <Badge tone="ok">Potvrdený</Badge> : <Badge>Návrh</Badge>}
          </div>
          <p className="mt-1 text-muted">
            Výpočet spustil používateľ {author}. Navrhnutých miest {proposed}, náhradníkov {waitlist}.
            {run.confirmedAt ? ` Pridelenie potvrdené ${formatDateTime(run.confirmedAt)}, ${confirmer}.` : ""}
          </p>
          <p className={clsx("mt-1 flex items-center gap-1.5 text-sm font-medium", mismatches.length ? "text-bad" : "text-ok")}>
            <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              {mismatches.length ? <path d="M8 4.5v4m0 3v.01" strokeLinecap="round" /> : <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />}
            </svg>
            {mismatches.length
              ? `Pri ${mismatches.length} žiadostiach sa výpočet nedá zopakovať.`
              : "Výpočet sme zopakovali z uložených vstupov, body sa zhodujú."}
          </p>
        </div>
        {!run.confirmedAt && isLatest ? <ConfirmButton runId={run.id} count={proposed} /> : null}
      </div>

      <div className="mb-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
        {criteria.map((c, i) => (
          <span key={c.key} className="inline-flex items-center gap-1.5">
            <span aria-hidden className={clsx("size-2.5 rounded-full", SHADES[i % SHADES.length])} />
            {c.name} ({c.weight})
          </span>
        ))}
      </div>

      <div className="overflow-x-auto rounded-panel bg-surface ring-1 ring-line">
        <table className="w-full min-w-[46rem] text-left">
          <thead className="border-b border-line text-sm text-muted">
            <tr>
              <th className="w-16 px-5 py-3 font-medium">Poradie</th>
              <th className="px-5 py-3 font-medium">Študent</th>
              <th className="px-5 py-3 font-medium">Body</th>
              <th className="px-5 py-3 font-medium">{run.confirmedAt ? "Výsledok" : "Návrh"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {run.entries.map((entry) => {
              const breakdown = JSON.parse(entry.breakdown) as Record<string, BreakdownItem>;
              const target = entry.proposedRoomTypeId ? roomLabel.get(entry.proposedRoomTypeId) : null;
              return (
                <tr key={entry.id}>
                  <td className="px-5 py-3 text-lg font-bold">{entry.rank}.</td>
                  <td className="px-5 py-3">
                    <Link href={`/referent/ziadosti/${entry.applicationId}`} className="font-semibold hover:underline">
                      {entry.application.student.name}
                    </Link>
                    <p className="text-sm text-muted">{entry.application.student.login}</p>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="w-14 text-lg font-bold">{formatNumber(entry.points)}</span>
                      <span
                        className="flex h-2 w-28 overflow-hidden rounded-full bg-sunken"
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
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {target ? (
                      <span>
                        <span className="font-medium">{target.dorm}</span>
                        <span className="text-sm text-muted">, {target.room.toLowerCase()}</span>
                      </span>
                    ) : (
                      <Badge tone="wait">Náhradník</Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
