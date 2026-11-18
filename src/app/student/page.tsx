import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { DataList, EmptyState, PageHeader, Section } from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { applicationInclude, documentChecklist, type FullApplication } from "@/lib/applications";
import { requireUser } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { db } from "@/lib/db";
import { daysUntil, formatDate, formatNumber, pluralDays } from "@/lib/format";
import { getActivePeriod, windows } from "@/lib/period";
import type { BreakdownItem } from "@/lib/ranking";
import { DOCUMENT_STATUS, DOCUMENT_TYPE, JOURNEY, STATUS } from "@/lib/status";
import { StartApplicationButton } from "./start-button";

export const metadata: Metadata = { title: "Prehľad" };

const sectionLinkClass =
  "text-sm font-medium text-pine underline decoration-pine/30 underline-offset-4 hover:decoration-pine";

export default async function StudentDashboard() {
  const user = await requireUser(["STUDENT"]);
  const period = await getActivePeriod();

  if (!period) {
    return (
      <EmptyState title="Momentálne neprebieha žiadne konanie">
        Termíny na podávanie žiadostí zverejní ubytovacie oddelenie.
      </EmptyState>
    );
  }

  const app = await db.application.findUnique({
    where: { studentId_periodId: { studentId: user.id, periodId: period.id } },
    include: applicationInclude,
  });

  const firstName = user.name.split(" ")[0];
  const w = windows(period);

  if (!app) {
    const left = daysUntil(period.submitTo);
    return (
      <>
        <PageHeader
          meta={`Akademický rok ${period.academicYear}`}
          title={`Dobrý deň, ${firstName}.`}
          description={
            w.canSubmit
              ? `Žiadosti o ubytovanie prijímame do ${formatDate(period.submitTo)}, zostáva ${pluralDays(left)}.`
              : w.beforeSubmit
                ? `Podávanie žiadostí sa začne ${formatDate(period.submitFrom)}.`
                : "Termín na podávanie žiadostí už uplynul."
          }
        />

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Section title="Ako podať žiadosť">
            <ol className="flex flex-col gap-5">
              {[
                [
                  "Vyplníte žiadosť",
                  "Ročník, študijný program a prospech doplníme z akademického IS. Vy vyberiete internáty a typ izby.",
                ],
                [
                  "Nahráte doklady, ak ich potrebujete",
                  "Potvrdenie o príjme alebo zdravotný doklad, ak chcete, aby sme zohľadnili vašu situáciu.",
                ],
                [
                  "Sledujete stav",
                  "Kedykoľvek uvidíte, v akom stave je žiadosť, čo ešte chýba a po vyhodnotení aj svoje body.",
                ],
              ].map(([title, text], i) => (
                <li key={title} className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full border border-line-strong text-xs font-semibold text-ink-soft tabular-nums">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold">{title}</p>
                    <p className="mt-0.5 text-muted">{text}</p>
                  </div>
                </li>
              ))}
            </ol>

            {w.canSubmit ? <StartApplicationButton /> : null}
          </Section>

          <Section title="Stav žiadosti" actions={<Badge>Nepodaná</Badge>}>
            <p className="text-ink-soft">Žiadosť ste ešte nepodali.</p>
            <DataList
              columns={1}
              className="mt-4"
              items={[
                { label: "Akademický rok", value: period.academicYear },
                { label: "Termín podania", value: formatDate(period.submitTo) },
              ]}
            />
          </Section>
        </div>
      </>
    );
  }

  const status = STATUS[app.status];
  const checklist = documentChecklist(app);
  const todo = buildTodo(app, checklist, w);
  const entry = await latestConfirmedEntry(app.id);
  const journeyIndex = JOURNEY.findIndex((s) => s.covers.includes(app.status));
  const adjustment = app.appeals.reduce(
    (sum, a) => sum + (a.status === "UZNANE" ? (a.pointsAdjustment ?? 0) : 0),
    0,
  );

  return (
    <>
      <PageHeader
        meta={`Žiadosť o ubytovanie ${period.academicYear}`}
        title={status.label}
        description={status.forStudent}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {todo.length > 0 ? (
            <Section title="Čo treba urobiť" flush>
              <ul className="divide-y divide-line">
                {todo.map((item, i) => (
                  <li
                    key={item.title}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold">{item.title}</p>
                      {item.detail ? <p className="mt-0.5 text-sm text-muted">{item.detail}</p> : null}
                    </div>
                    <ButtonLink
                      href={item.href}
                      size="sm"
                      variant={i === 0 ? "primary" : "secondary"}
                      className="self-start sm:self-auto"
                    >
                      {item.action}
                    </ButtonLink>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {app.status !== "ZRUSENA" ? (
            <Section title="Priebeh konania" flush className="overflow-hidden">
              <ol className="grid divide-y divide-line sm:grid-cols-5 sm:divide-x sm:divide-y-0">
                {JOURNEY.map((step, i) => {
                  const state = i < journeyIndex ? "done" : i === journeyIndex ? "current" : "next";
                  return (
                    <li
                      key={step.key}
                      aria-current={state === "current" ? "step" : undefined}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3.5 sm:flex-col sm:items-start sm:gap-2",
                        state === "current" && "bg-pine-tint",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-6 shrink-0 place-items-center rounded-full border text-xs font-semibold tabular-nums",
                          state === "done" && "border-pine bg-surface text-pine",
                          state === "current" && "border-pine bg-pine text-white",
                          state === "next" && "border-line-strong text-muted",
                        )}
                      >
                        {state === "done" ? (
                          <svg viewBox="0 0 12 12" className="size-3" role="img" aria-label="hotovo">
                            <path d="m2.5 6.2 2.3 2.3 4.7-5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                          </svg>
                        ) : (
                          i + 1
                        )}
                      </span>
                      <span className={cn("text-sm font-semibold", state === "next" && "font-medium text-muted")}>
                        {step.label}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </Section>
          ) : null}

          {entry ? <Points entry={entry} adjustment={adjustment} /> : null}

          <div className="grid gap-6 sm:grid-cols-2">
            <Section
              title="Preferované internáty"
              actions={
                <Link href="/student/ziadost" className={sectionLinkClass}>
                  Žiadosť
                </Link>
              }
            >
              {app.preferences.length > 0 ? (
                <ol className="flex flex-col gap-2">
                  {app.preferences.map((p) => (
                    <li key={p.id} className="flex items-baseline gap-3">
                      <span className="w-4 text-sm text-muted tabular-nums">{p.rank}.</span>
                      <span className="font-medium">{p.dorm.name}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-muted">Zatiaľ ste nevybrali žiadny internát.</p>
              )}
            </Section>

            <Section
              title="Doklady"
              actions={
                <Link href="/student/doklady" className={sectionLinkClass}>
                  Doklady
                </Link>
              }
            >
              {checklist.length > 0 ? (
                <ul className="flex flex-col gap-2.5">
                  {checklist.map((item) => (
                    <li key={item.type} className="flex items-center justify-between gap-3">
                      <span className="min-w-0 font-medium">{DOCUMENT_TYPE[item.type].label}</span>
                      {item.state === "CHYBA" ? (
                        <Badge tone="bad">Chýba</Badge>
                      ) : (
                        <Badge tone={DOCUMENT_STATUS[item.state].tone}>
                          {DOCUMENT_STATUS[item.state].label}
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted">K žiadosti netreba prikladať doklady.</p>
              )}
            </Section>
          </div>
        </div>

        <aside
          aria-label="Súhrn žiadosti"
          className={cn("lg:sticky lg:top-28", app.status === "PRIDELENA" && "order-first lg:order-none")}
        >
          <StatusSummary
            app={app}
            rank={entry?.rank ?? null}
            points={entry ? entry.points + adjustment : null}
          />
        </aside>
      </div>
    </>
  );
}

/** Súhrn stavu žiadosti v bočnom paneli: štítok stavu, kľúčové údaje a vysvetlenie. */
function StatusSummary({
  app,
  rank,
  points,
}: {
  app: FullApplication;
  rank: number | null;
  points: number | null;
}) {
  const status = STATUS[app.status];
  const badge = <Badge tone={status.tone}>{status.label}</Badge>;
  const ranking = [
    ...(rank ? [{ label: "Poradie", value: `${rank}. miesto` }] : []),
    ...(points !== null ? [{ label: "Body", value: formatNumber(points) }] : []),
  ];

  if (app.status === "PRIDELENA" && app.allocation) {
    const { roomType } = app.allocation;
    return (
      <Section title="Pridelené miesto" actions={badge}>
        <DataList
          columns={1}
          items={[
            { label: "Internát", value: `${roomType.dorm.name} (${roomType.dorm.code})` },
            { label: "Adresa", value: roomType.dorm.address },
            { label: "Typ izby", value: roomType.label },
            { label: "Akademický rok", value: app.period.academicYear },
            ...ranking,
          ]}
        />
      </Section>
    );
  }

  return (
    <Section title="Stav žiadosti" actions={badge}>
      <DataList
        columns={1}
        items={[
          { label: "Akademický rok", value: app.period.academicYear },
          { label: "Dátum podania", value: app.submittedAt ? formatDate(app.submittedAt) : "–" },
          ...ranking,
        ]}
      />
      {rank ? null : <p className="mt-4 text-sm text-muted">Poradie uvidíte po vyhodnotení.</p>}
    </Section>
  );
}

type Todo = { title: string; detail?: string; action: string; href: string };

function buildTodo(
  app: FullApplication,
  checklist: ReturnType<typeof documentChecklist>,
  w: ReturnType<typeof windows>,
): Todo[] {
  const todo: Todo[] = [];
  for (const item of checklist) {
    const label = DOCUMENT_TYPE[item.type].label;
    if (item.state === "CHYBA" && app.status !== "ZRUSENA") {
      todo.push({ title: `Nahrajte doklad: ${label.toLowerCase()}`, action: "Nahrať", href: "/student/doklady" });
    } else if (item.state === "DOPLNIT" || item.state === "ZAMIETNUTY") {
      todo.push({
        title: `${item.state === "DOPLNIT" ? "Doplňte" : "Nahrajte nový"} doklad: ${label.toLowerCase()}`,
        detail: item.doc?.reviewNote ?? undefined,
        action: "Doplniť",
        href: "/student/doklady",
      });
    }
  }
  if (app.status === "ROZPRACOVANA" && w.canSubmit) {
    todo.push({
      title: "Dokončite a podajte žiadosť",
      detail: `Žiadosť je uložená, ale bez podania ju nezaradíme do poradia. Termín je ${formatDate(app.period.submitTo)}.`,
      action: "Pokračovať",
      href: "/student/ziadost",
    });
  }
  if ((app.status === "NEPRIDELENA" || app.status === "PRIDELENA") && w.canAppeal && app.appeals.length === 0) {
    todo.push({
      title: app.status === "NEPRIDELENA" ? "Môžete sa odvolať" : "Nesúhlasíte s pridelením?",
      detail: `Odvolanie podáte do ${formatDate(app.period.appealTo)}.`,
      action: "Podať odvolanie",
      href: "/student/odvolanie",
    });
  }
  return todo;
}

async function latestConfirmedEntry(applicationId: string) {
  const entry = await db.rankingEntry.findFirst({
    where: { applicationId, run: { confirmedAt: { not: null } } },
    orderBy: { run: { confirmedAt: "desc" } },
    include: { run: true },
  });
  if (!entry) return null;
  return {
    rank: entry.rank,
    points: entry.points,
    breakdown: JSON.parse(entry.breakdown) as Record<string, BreakdownItem>,
    criteria: JSON.parse(entry.run.criteriaSnapshot) as { key: string; name: string; weight: number }[],
  };
}

function Points({
  entry,
  adjustment,
}: {
  entry: NonNullable<Awaited<ReturnType<typeof latestConfirmedEntry>>>;
  adjustment: number;
}) {
  return (
    <Section title="Vaše body" description={`${entry.rank}. miesto v poradí`} flush>
      <Table minWidth="18rem" bordered={false}>
        <THead>
          <tr>
            <TH>Kritérium</TH>
            <TH align="right">Váha</TH>
            <TH align="right">Body</TH>
          </tr>
        </THead>
        <TBody>
          {entry.criteria.map((c) => (
            <tr key={c.key}>
              <TD>{c.name}</TD>
              <TD align="right" className="text-muted">
                {c.weight}
              </TD>
              <TD align="right" className="font-medium">
                {formatNumber(entry.breakdown[c.key]?.points ?? 0)}
              </TD>
            </tr>
          ))}
          {adjustment ? (
            <tr>
              <TD colSpan={2}>Úprava po odvolaní</TD>
              <TD align="right" className="font-medium">
                {adjustment > 0 ? "+" : ""}
                {formatNumber(adjustment)}
              </TD>
            </tr>
          ) : null}
        </TBody>
        <tfoot className="border-t border-line-strong">
          <tr>
            <TD colSpan={2} className="font-semibold">
              Spolu
            </TD>
            <TD align="right" className="font-semibold">
              {formatNumber(entry.points + adjustment)}
            </TD>
          </tr>
        </tfoot>
      </Table>
    </Section>
  );
}
