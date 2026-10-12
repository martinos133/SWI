import clsx from "clsx";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
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
    ...(q
      ? {
          student: {
            OR: [{ name: { contains: q } }, { login: { contains: q.toLowerCase() } }],
          },
        }
      : {}),
  };

  const applications = await db.application.findMany({
    where,
    orderBy: [{ submittedAt: "asc" }, { createdAt: "asc" }],
    include: {
      student: { select: { name: true, login: true } },
      documents: { where: { appealId: null }, orderBy: { uploadedAt: "desc" } },
    },
  });

  return (
    <>
      <PageHeader
        title="Žiadosti"
        description={`Akademický rok ${period.academicYear}, spolu ${countFor(null)} žiadostí.`}
      />

      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <nav aria-label="Filtrovať podľa stavu" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
          {FILTERS.map((f) => {
            const active = f.key === filter.key;
            return (
              <Link
                key={f.key}
                href={{ pathname: "/referent", query: { stav: f.key, ...(q ? { q } : {}) } }}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  active ? "bg-pine text-white" : "text-ink-soft hover:bg-sunken",
                )}
              >
                {f.label}
                <span className={clsx("tabular-nums", active ? "text-white/70" : "text-muted")}>
                  {countFor(f.statuses)}
                </span>
              </Link>
            );
          })}
        </nav>
        <form className="w-full xl:w-72" role="search">
          <input type="hidden" name="stav" value={filter.key} />
          <label htmlFor="q" className="sr-only">
            Hľadať študenta
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Hľadať meno alebo login"
            className="h-10 w-full rounded-field bg-surface px-3 text-[0.9375rem] ring-1 ring-inset ring-line-strong placeholder:text-muted/70 focus:ring-2 focus:ring-pine focus:outline-none"
          />
        </form>
      </div>

      {applications.length === 0 ? (
        <EmptyState title={q ? `Nič sa nenašlo pre „${q}“` : "V tomto stave nie sú žiadne žiadosti"}>
          {q ? "Skúste iné meno alebo login." : "Skúste iný filter."}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-panel bg-surface ring-1 ring-line">
          <table className="w-full min-w-[44rem] text-left">
            <thead className="border-b border-line text-sm text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Študent</th>
                <th className="px-5 py-3 font-medium">Podaná</th>
                <th className="px-5 py-3 font-medium">Doklady</th>
                <th className="px-5 py-3 font-medium">Stav</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {applications.map((app) => {
                const latest = new Map<string, (typeof app.documents)[number]>();
                for (const d of app.documents) if (!latest.has(d.type)) latest.set(d.type, d);
                const docs = [...latest.values()];
                const waiting = docs.filter((d) => d.status === "NAHRANY").length;
                const missing =
                  Number(app.claimsSocial && !latest.has("PRIJEM")) +
                  Number(app.claimsHealth && !latest.has("ZDRAVOTNY"));
                return (
                  <tr key={app.id} className="group relative transition-colors hover:bg-paper">
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/referent/ziadosti/${app.id}`}
                        className="font-semibold after:absolute after:inset-0 group-hover:underline"
                      >
                        {app.student.name}
                      </Link>
                      <p className="text-sm text-muted">
                        {app.student.login}, {app.aisProgram ?? "program neznámy"}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-sm">
                      {app.submittedAt ? formatShortDate(app.submittedAt) : <span className="text-muted">–</span>}
                    </td>
                    <td className="px-5 py-3.5 text-sm">
                      {docs.length === 0 && missing === 0 ? (
                        <span className="text-muted">netreba</span>
                      ) : (
                        <span className="flex flex-wrap gap-x-3 gap-y-1">
                          {waiting > 0 ? <span className="font-semibold text-info">{waiting} na posúdenie</span> : null}
                          {missing > 0 ? <span className="font-semibold text-bad">{missing} chýba</span> : null}
                          {waiting === 0 && missing === 0 ? <span className="text-muted">posúdené</span> : null}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge tone={STATUS[app.status].tone}>{STATUS[app.status].label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
