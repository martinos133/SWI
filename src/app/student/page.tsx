import clsx from "clsx";
import type { Metadata } from "next";
import Link from "next/link";
import { KeyTag } from "@/components/key-tag";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/page-header";
import { applicationInclude, documentChecklist, type FullApplication } from "@/lib/applications";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { daysUntil, formatDate, formatNumber, pluralDays } from "@/lib/format";
import { getActivePeriod, windows } from "@/lib/period";
import type { BreakdownItem } from "@/lib/ranking";
import { DOCUMENT_STATUS, DOCUMENT_TYPE, JOURNEY, STATUS } from "@/lib/status";
import { StartApplicationButton } from "./start-button";

export const metadata: Metadata = { title: "Prehľad" };

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
      <div className="grid gap-16 lg:grid-cols-[1fr_16rem] lg:gap-20">
        <div className="max-w-xl">
          <p className="text-muted">Akademický rok {period.academicYear}</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">
            Dobrý deň, {firstName}.
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-soft">
            {w.canSubmit
              ? `Žiadosti o ubytovanie prijímame do ${formatDate(period.submitTo)}, zostáva ${pluralDays(left)}.`
              : w.beforeSubmit
                ? `Podávanie žiadostí sa začne ${formatDate(period.submitFrom)}.`
                : "Termín na podávanie žiadostí už uplynul."}
          </p>

          <ol className="mt-10 flex flex-col gap-6 border-l border-line pl-6">
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
              <li key={title} className="relative">
                <span className="absolute top-0.5 -left-[2.0625rem] grid size-5 place-items-center rounded-full bg-paper text-xs font-bold text-muted ring-1 ring-line-strong">
                  {i + 1}
                </span>
                <p className="font-semibold">{title}</p>
                <p className="mt-1 text-muted">{text}</p>
              </li>
            ))}
          </ol>

          {w.canSubmit ? <StartApplicationButton /> : null}
        </div>

        <KeyTag
          blank
          overline="Zatiaľ bez kľúča"
          title="Žiadosť ste ešte nepodali"
          figure="–"
          className="order-first mt-6 lg:order-none lg:mt-10"
        />
      </div>
    );
  }

  const status = STATUS[app.status];
  const checklist = documentChecklist(app);
  const todo = buildTodo(app, checklist, w);
  const entry = await latestConfirmedEntry(app.id);
  const journeyIndex = JOURNEY.findIndex((s) => s.covers.includes(app.status));

  return (
    <div className="grid gap-14 lg:grid-cols-[1fr_16rem] lg:gap-20">
      <div className="min-w-0">
        <p className="text-muted">Žiadosť o ubytovanie {period.academicYear}</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">
          {status.label}
        </h1>
        <p className="mt-3 max-w-xl text-lg leading-relaxed text-ink-soft">{status.forStudent}</p>

        {todo.length > 0 ? (
          <section aria-labelledby="todo" className="mt-10">
            <h2 id="todo" className="text-lg font-bold">
              Čo treba urobiť
            </h2>
            <ul className="mt-3 divide-y divide-line rounded-panel bg-surface ring-1 ring-line">
              {todo.map((item) => (
                <li
                  key={item.title}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    {item.detail ? <p className="mt-0.5 text-sm text-muted">{item.detail}</p> : null}
                  </div>
                  <ButtonLink href={item.href} size="sm" className="self-start sm:self-auto">
                    {item.action}
                  </ButtonLink>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {app.status !== "ZRUSENA" ? (
          <section aria-labelledby="priebeh" className="mt-12">
            <h2 id="priebeh" className="text-lg font-bold">
              Priebeh konania
            </h2>
            <ol className="mt-4 grid gap-px overflow-hidden rounded-panel bg-line ring-1 ring-line sm:grid-cols-5">
              {JOURNEY.map((step, i) => {
                const state = i < journeyIndex ? "done" : i === journeyIndex ? "current" : "next";
                return (
                  <li
                    key={step.key}
                    aria-current={state === "current" ? "step" : undefined}
                    className={clsx(
                      "flex items-center gap-3 px-4 py-3.5 sm:flex-col sm:items-start sm:gap-2",
                      state === "current" ? "bg-pine text-white" : "bg-surface",
                    )}
                  >
                    <span
                      className={clsx(
                        "grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold",
                        state === "done" && "bg-pine-tint text-pine",
                        state === "current" && "bg-brass text-pine",
                        state === "next" && "text-muted ring-1 ring-line-strong",
                      )}
                    >
                      {state === "done" ? (
                        <svg viewBox="0 0 12 12" className="size-3" aria-label="hotovo">
                          <path d="m2.5 6.2 2.3 2.3 4.7-5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </span>
                    <span
                      className={clsx(
                        "text-sm font-semibold",
                        state === "next" && "text-muted",
                      )}
                    >
                      {step.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        ) : null}

        {entry ? <Points entry={entry} /> : null}

        <section aria-labelledby="suhrn" className="mt-12 grid gap-8 sm:grid-cols-2">
          <div>
            <div className="flex items-baseline justify-between">
              <h2 id="suhrn" className="text-lg font-bold">
                Preferované internáty
              </h2>
              <Link href="/student/ziadost" className="text-sm font-medium text-muted underline underline-offset-2 hover:text-ink">
                Žiadosť
              </Link>
            </div>
            {app.preferences.length > 0 ? (
              <ol className="mt-3 flex flex-col gap-2">
                {app.preferences.map((p) => (
                  <li key={p.id} className="flex items-baseline gap-3">
                    <span className="w-4 text-sm text-muted">{p.rank}.</span>
                    <span className="font-medium">{p.dorm.name}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-muted">Zatiaľ ste nevybrali žiadny internát.</p>
            )}
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-bold">Doklady</h2>
              <Link href="/student/doklady" className="text-sm font-medium text-muted underline underline-offset-2 hover:text-ink">
                Doklady
              </Link>
            </div>
            {checklist.length > 0 ? (
              <ul className="mt-3 flex flex-col gap-2.5">
                {checklist.map((item) => (
                  <li key={item.type} className="flex items-center justify-between gap-3">
                    <span className="font-medium">{DOCUMENT_TYPE[item.type].label}</span>
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
              <p className="mt-3 text-muted">K žiadosti netreba prikladať doklady.</p>
            )}
          </div>
        </section>
      </div>

      <aside className="order-first pt-6 lg:order-none lg:pt-10">
        <div className="lg:sticky lg:top-28">
          <StatusTag app={app} rank={entry?.rank ?? null} />
        </div>
      </aside>
    </div>
  );
}

function StatusTag({ app, rank }: { app: FullApplication; rank: number | null }) {
  if (app.status === "PRIDELENA" && app.allocation) {
    const { roomType } = app.allocation;
    return (
      <KeyTag
        overline="Pridelené miesto"
        title={`Internát ${roomType.dorm.name}`}
        figure={roomType.dorm.code}
        detail={`${roomType.label}, akademický rok ${app.period.academicYear}`}
      />
    );
  }
  const status = STATUS[app.status];
  return (
    <KeyTag
      blank
      overline="Zatiaľ bez kľúča"
      title={status.label}
      figure={rank ? `${rank}.` : "–"}
      detail={rank ? "miesto v poradí" : "Poradie uvidíte po vyhodnotení."}
    />
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

function Points({ entry }: { entry: NonNullable<Awaited<ReturnType<typeof latestConfirmedEntry>>> }) {
  return (
    <section aria-labelledby="body" className="mt-12">
      <div className="flex items-baseline justify-between">
        <h2 id="body" className="text-lg font-bold">
          Vaše body
        </h2>
        <p className="text-sm text-muted">
          {entry.rank}. miesto v poradí
        </p>
      </div>
      <table className="mt-3 w-full overflow-hidden rounded-panel bg-surface text-left ring-1 ring-line">
        <thead className="border-b border-line text-sm text-muted">
          <tr>
            <th className="px-5 py-2.5 font-medium">Kritérium</th>
            <th className="px-5 py-2.5 text-right font-medium">Váha</th>
            <th className="px-5 py-2.5 text-right font-medium">Body</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {entry.criteria.map((c) => (
            <tr key={c.key}>
              <td className="px-5 py-3">{c.name}</td>
              <td className="px-5 py-3 text-right text-muted">{c.weight}</td>
              <td className="px-5 py-3 text-right font-semibold">
                {formatNumber(entry.breakdown[c.key]?.points ?? 0)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-line-strong">
          <tr>
            <td className="px-5 py-3 font-bold" colSpan={2}>
              Spolu
            </td>
            <td className="px-5 py-3 text-right text-lg font-extrabold">
              {formatNumber(entry.points)}
            </td>
          </tr>
        </tfoot>
      </table>
    </section>
  );
}
