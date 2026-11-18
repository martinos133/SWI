import type { Metadata } from "next";
import Link from "next/link";
import { describe } from "@/components/audit-timeline";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
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

      <Tabs
        label="Záložky"
        className="mb-6"
        items={[
          { key: "zaznamy", label: "Záznamy" },
          { key: "emaily", label: "Odoslané e-maily" },
        ].map((t) => ({
          key: t.key,
          href: { pathname: "/audit", query: { zalozka: t.key } },
          label: t.label,
          active: tab === t.key,
        }))}
      />

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
      <Tabs
        label="Filtrovať podľa typu udalosti"
        className="mb-5"
        items={GROUPS.map((g) => ({
          key: g.key,
          href: { pathname: "/audit", query: { typ: g.key } },
          label: g.label,
          active: g.key === group.key,
        }))}
      />

      {entries.length === 0 ? (
        <EmptyState title="V tejto kategórii zatiaľ nie sú žiadne záznamy" />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Čas</TH>
              <TH>Udalosť</TH>
              <TH>Týka sa</TH>
              <TH>Kto</TH>
            </tr>
          </THead>
          <TBody>
            {entries.map((entry) => {
              const detail = describe(entry);
              const appId = applicationOf(entry);
              const owner = appId ? owners.get(appId) : null;
              return (
                <TR key={entry.id}>
                  <TD className="align-top text-sm whitespace-nowrap text-muted tabular-nums">
                    {formatDateTime(entry.createdAt)}
                  </TD>
                  <TD className="align-top">
                    <p className="font-semibold">{AUDIT_LABEL[entry.action] ?? entry.action}</p>
                    {detail ? <p className="max-w-lg text-sm text-ink-soft">{detail}</p> : null}
                  </TD>
                  <TD className="align-top whitespace-nowrap">
                    {owner && canOpen ? (
                      <Link
                        href={`/referent/ziadosti/${appId}`}
                        className="font-medium text-pine underline decoration-pine/30 underline-offset-4 hover:decoration-pine"
                      >
                        {owner}
                      </Link>
                    ) : (
                      (owner ?? <span className="text-muted">–</span>)
                    )}
                  </TD>
                  <TD className="align-top whitespace-nowrap">{entry.actor?.name ?? "systém"}</TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
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
          <details className="group rounded-panel border border-line bg-surface">
            <summary className="flex cursor-pointer list-none flex-col gap-1 rounded-panel px-5 py-3.5 transition-colors group-open:rounded-b-none hover:bg-hover sm:flex-row sm:items-center sm:justify-between">
              <span className="min-w-0">
                <span className="block truncate font-semibold">{mail.subject}</span>
                <span className="block truncate text-sm text-muted">{mail.to}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2 text-sm text-muted tabular-nums">
                {formatDateTime(mail.createdAt)}
                {mail.status === "CHYBA" ? <Badge tone="bad">neodoslané</Badge> : null}
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
