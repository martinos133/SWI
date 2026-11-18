import clsx from "clsx";
import type { Metadata } from "next";
import Link from "next/link";
import { describe } from "@/components/audit-timeline";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { AUDIT_LABEL } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Auditný záznam" };

const GROUPS: { key: string; label: string; actions: string[] | null }[] = [
  { key: "vsetko", label: "Všetko", actions: null },
  {
    key: "doklady",
    label: "Doklady",
    actions: ["DOKLAD_NAHRANY", "DOKLAD_SCHVALENY", "DOKLAD_ZAMIETNUTY", "DOKLAD_VYZIADANE_DOPLNENIE", "DOKLAD_ZMAZANY_RETENCIA", "SOCIALNA_SITUACIA_POSUDENA"],
  },
  { key: "body", label: "Body a pridelenie", actions: ["PORADIE_VYPOCITANE", "PRIDELENIE_POTVRDENE", "BODY_ZMENENE", "AIS_SYNCHRONIZACIA"] },
  { key: "odvolania", label: "Odvolania", actions: ["ODVOLANIE_PODANE", "ODVOLANIE_ROZHODNUTE"] },
  { key: "ziadosti", label: "Žiadosti", actions: ["ZIADOST_PODANA", "ZIADOST_UPRAVENA", "ZIADOST_ZRUSENA", "STAV_ZMENENY"] },
  { key: "nastavenia", label: "Nastavenia", actions: ["TERMINY_ZMENENE", "KRITERIA_ZMENENE", "KRITERIA_SCHVALENE", "KAPACITA_ZMENENA"] },
  { key: "prihlasenie", label: "Prihlásenie", actions: ["PRIHLASENIE_ZABLOKOVANE"] },
];

export default async function AuditPage({ searchParams }: PageProps<"/audit">) {
  const user = await requireUser(["REFERENT", "KOMISIA"]);
  const params = await searchParams;
  const tab = params.zalozka === "emaily" ? "emaily" : "zaznamy";
  const group = GROUPS.find((g) => g.key === params.typ) ?? GROUPS[0];

  return (
    <>
      <PageHeader
        title="Auditný záznam"
        description="Každá zmena bodov, posúdenie dokladu a rozhodnutie je zapísané a nedá sa upraviť ani zmazať."
      />

      <nav aria-label="Záložky" className="mb-6 flex gap-6 border-b border-line">
        {[
          { key: "zaznamy", label: "Záznamy" },
          { key: "emaily", label: "Odoslané e-maily" },
        ].map((t) => (
          <Link
            key={t.key}
            href={{ pathname: "/audit", query: { zalozka: t.key } }}
            aria-current={tab === t.key ? "page" : undefined}
            className={clsx(
              "-mb-px border-b-2 pb-3 font-medium transition-colors",
              tab === t.key ? "border-pine text-ink" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "emaily" ? <Emails /> : <Entries group={group} canOpen={user.role === "REFERENT"} />}
    </>
  );
}

async function Entries({ group, canOpen }: { group: (typeof GROUPS)[number]; canOpen: boolean }) {
  const entries = await db.auditLog.findMany({
    where: group.actions ? { action: { in: group.actions } } : {},
    orderBy: { createdAt: "desc" },
    take: 150,
    include: { actor: { select: { name: true } } },
  });

  const applicationOf = (entry: (typeof entries)[number]): string | null => {
    if (entry.entityType === "Application") return entry.entityId;
    try {
      const d = JSON.parse(entry.detail) as { applicationId?: string };
      return d.applicationId ?? null;
    } catch {
      return null;
    }
  };

  const appIds = [...new Set(entries.map(applicationOf).filter((id): id is string => Boolean(id)))];
  const owners = new Map(
    (
      await db.application.findMany({
        where: { id: { in: appIds } },
        select: { id: true, student: { select: { name: true } } },
      })
    ).map((a) => [a.id, a.student.name]),
  );

  return (
    <>
      <div className="-mx-1 mb-5 flex gap-1 overflow-x-auto px-1 pb-1">
        {GROUPS.map((g) => (
          <Link
            key={g.key}
            href={{ pathname: "/audit", query: { typ: g.key } }}
            aria-current={g.key === group.key ? "page" : undefined}
            className={clsx(
              "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              g.key === group.key ? "bg-pine text-white" : "text-ink-soft hover:bg-sunken",
            )}
          >
            {g.label}
          </Link>
        ))}
      </div>

      {entries.length === 0 ? (
        <EmptyState title="V tejto kategórii zatiaľ nie sú žiadne záznamy" />
      ) : (
        <div className="overflow-x-auto rounded-panel bg-surface ring-1 ring-line">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Čas</th>
                <th className="px-5 py-3 font-medium">Udalosť</th>
                <th className="px-5 py-3 font-medium">Týka sa</th>
                <th className="px-5 py-3 font-medium">Kto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {entries.map((entry) => {
                const detail = describe(entry);
                const appId = applicationOf(entry);
                const owner = appId ? owners.get(appId) : null;
                return (
                  <tr key={entry.id} className="align-top">
                    <td className="px-5 py-3 whitespace-nowrap text-muted">{formatDateTime(entry.createdAt)}</td>
                    <td className="px-5 py-3">
                      <p className="font-semibold">{AUDIT_LABEL[entry.action] ?? entry.action}</p>
                      {detail ? <p className="max-w-lg text-ink-soft">{detail}</p> : null}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {owner && canOpen ? (
                        <Link href={`/referent/ziadosti/${appId}`} className="font-medium underline-offset-2 hover:underline">
                          {owner}
                        </Link>
                      ) : (
                        (owner ?? <span className="text-muted">–</span>)
                      )}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">{entry.actor?.name ?? "systém"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-sm text-muted">Zobrazených je najviac 150 najnovších záznamov.</p>
    </>
  );
}

async function Emails() {
  const emails = await db.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  if (emails.length === 0) return <EmptyState title="Zatiaľ sme neposlali žiadny e-mail" />;
  return (
    <ul className="flex flex-col gap-3">
      {emails.map((mail) => (
        <li key={mail.id}>
          <details className="group rounded-panel bg-surface ring-1 ring-line">
            <summary className="flex cursor-pointer list-none flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <span className="min-w-0">
                <span className="block truncate font-semibold">{mail.subject}</span>
                <span className="block truncate text-sm text-muted">{mail.to}</span>
              </span>
              <span className="shrink-0 text-sm text-muted">
                {formatDateTime(mail.createdAt)}
                {mail.status === "CHYBA" ? <span className="ml-2 font-semibold text-bad">neodoslané</span> : null}
              </span>
            </summary>
            <pre className="border-t border-line px-5 py-4 font-sans text-sm leading-relaxed whitespace-pre-wrap text-ink-soft">
              {mail.body}
            </pre>
          </details>
        </li>
      ))}
    </ul>
  );
}
