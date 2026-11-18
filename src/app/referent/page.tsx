import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/field";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { rowLinkClass, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import type { Prisma } from "@/generated/prisma/client";
import type { ApplicationStatus } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatShortDate } from "@/lib/format";
import { getActivePeriod } from "@/lib/period";
import { STATUS } from "@/lib/status";

export const metadata: Metadata = { title: "Žiadosti" };

const FILTERS: { key: string; label: string; statuses: ApplicationStatus[] | null }[] = [
  { key: "vsetky", label: "Všetky", statuses: null },
  { key: "overit", label: "Na overenie", statuses: ["PODANA", "OVERUJE_SA"] },
  { key: "doplnenie", label: "Čakajú na doplnenie", statuses: ["CAKA_NA_DOPLNENIE"] },
  { key: "vyhodnotenie", label: "Na vyhodnotenie", statuses: ["VYHODNOCUJE_SA"] },
  { key: "rozhodnute", label: "Rozhodnuté", statuses: ["PRIDELENA", "NEPRIDELENA", "ODVOLANIE"] },
  { key: "rozpracovane", label: "Rozpracované", statuses: ["ROZPRACOVANA"] },
  { key: "zrusene", label: "Zrušené", statuses: ["ZRUSENA"] },
];

export default async function ApplicationsPage({ searchParams }: PageProps<"/referent">) {
  await requireUser(["REFERENT"]);
  const period = await getActivePeriod();
  if (!period) return <EmptyState title="Nie je aktívne žiadne konanie" />;

  const params = await searchParams;
  const filterKey = typeof params.stav === "string" ? params.stav : "overit";
  const filter = FILTERS.find((f) => f.key === filterKey) ?? FILTERS[1];
  const q = typeof params.q === "string" ? params.q.trim() : "";

  const grouped = await db.application.groupBy({
    by: ["status"],
    where: { periodId: period.id },
    _count: true,
  });
  const countFor = (statuses: ApplicationStatus[] | null) =>
    grouped
      .filter((g) => !statuses || statuses.includes(g.status))
      .reduce((sum, g) => sum + g._count, 0);

  const where: Prisma.ApplicationWhereInput = {
    periodId: period.id,
    ...(filter.statuses ? { status: { in: filter.statuses } } : {}),
  };

  // SQLite LIKE nerozlišuje veľkosť iba pri ASCII, preto hľadáme v aplikácii
  // bez diakritiky a veľkosti písmen („cierna“ nájde „Čierna“).
  const needle = normalize(q);
  const all = await db.application.findMany({
    where,
    orderBy: [{ submittedAt: "asc" }, { createdAt: "asc" }],
    include: {
      student: { select: { name: true, login: true } },
      documents: { where: { appealId: null }, orderBy: { uploadedAt: "desc" } },
    },
  });
  const applications = needle
    ? all.filter(
        (app) =>
          normalize(app.student.name).includes(needle) || normalize(app.student.login).includes(needle),
      )
    : all;

  return (
    <>
      <PageHeader
        title="Žiadosti"
        description={`Akademický rok ${period.academicYear}, spolu ${countFor(null)} žiadostí.`}
      />

      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <Tabs
          label="Filtrovať podľa stavu"
          className="min-w-0 xl:flex-1"
          items={FILTERS.map((f) => ({
            key: f.key,
            href: { pathname: "/referent", query: { stav: f.key, ...(q ? { q } : {}) } },
            label: f.label,
            count: countFor(f.statuses),
            active: f.key === filter.key,
          }))}
        />
        <form className="w-full xl:w-72" role="search">
          <input type="hidden" name="stav" value={filter.key} />
          <label htmlFor="q" className="sr-only">
            Hľadať študenta
          </label>
          <Input id="q" name="q" type="search" defaultValue={q} placeholder="Hľadať meno alebo login" />
        </form>
      </div>

      {applications.length === 0 ? (
        <EmptyState title={q ? `Nič sa nenašlo pre „${q}“` : "V tomto stave nie sú žiadne žiadosti"}>
          {q ? "Skúste iné meno alebo login." : "Skúste iný filter."}
        </EmptyState>
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Študent</TH>
              <TH>Podaná</TH>
              <TH>Doklady</TH>
              <TH>Stav</TH>
            </tr>
          </THead>
          <TBody>
            {applications.map((app) => {
              const latest = new Map<string, (typeof app.documents)[number]>();
              for (const d of app.documents) if (!latest.has(d.type)) latest.set(d.type, d);
              const docs = [...latest.values()];
              const waiting = docs.filter((d) => d.status === "NAHRANY").length;
              const missing =
                Number(app.claimsSocial && !latest.has("PRIJEM")) +
                Number(app.claimsHealth && !latest.has("ZDRAVOTNY"));
              return (
                <TR key={app.id} interactive>
                  <TD>
                    <Link href={`/referent/ziadosti/${app.id}`} className={rowLinkClass}>
                      {app.student.name}
                    </Link>
                    <p className="text-sm text-muted">
                      {app.student.login}, {app.aisProgram ?? "program neznámy"}
                    </p>
                  </TD>
                  <TD className="text-sm tabular-nums">
                    {app.submittedAt ? formatShortDate(app.submittedAt) : <span className="text-muted">–</span>}
                  </TD>
                  <TD className="text-sm">
                    {docs.length === 0 && missing === 0 ? (
                      <span className="text-muted">netreba</span>
                    ) : (
                      <span className="flex flex-wrap gap-x-3 gap-y-1">
                        {waiting > 0 ? <span className="font-semibold text-info">{waiting} na posúdenie</span> : null}
                        {missing > 0 ? <span className="font-semibold text-bad">{missing} chýba</span> : null}
                        {waiting === 0 && missing === 0 ? <span className="text-muted">posúdené</span> : null}
                      </span>
                    )}
                  </TD>
                  <TD>
                    <Badge tone={STATUS[app.status].tone}>{STATUS[app.status].label}</Badge>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}
    </>
  );
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
