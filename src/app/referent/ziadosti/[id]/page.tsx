import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AuditTimeline } from "@/components/audit-timeline";
import { Badge } from "@/components/ui/badge";
import { applicationInclude, documentChecklist } from "@/lib/applications";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { freeRoomOptions } from "@/lib/evaluation";
import { formatDate, formatNumber } from "@/lib/format";
import { DOCUMENT_TYPE, STATUS } from "@/lib/status";
import { ApplicationActions, DocumentReview } from "./review";

export const metadata: Metadata = { title: "Detail žiadosti" };

const SOCIAL_LABEL = ["bez zohľadnenia", "mierne zhoršená", "zhoršená", "ťažká"];

export default async function ApplicationDetail({ params }: PageProps<"/referent/ziadosti/[id]">) {
  await requireUser(["REFERENT"]);
  const { id } = await params;
  const app = await db.application.findUnique({ where: { id }, include: applicationInclude });
  if (!app) notFound();

  const checklist = documentChecklist(app);
  const reviewable = ["PODANA", "OVERUJE_SA", "CAKA_NA_DOPLNENIE"].includes(app.status);
  const history = await db.auditLog.findMany({
    where: {
      OR: [
        { entityType: "Application", entityId: app.id },
        { entityType: "Document", entityId: { in: app.documents.map((d) => d.id) } },
        { entityType: "Appeal", entityId: { in: app.appeals.map((a) => a.id) } },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { name: true } } },
    take: 50,
  });

  const freeRoomList = app.status === "NEPRIDELENA" ? await freeRoomOptions() : [];

  return (
    <>
      <Link
        href="/referent"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
      >
        <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
          <path d="m10 3.5-4.5 4.5 4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Žiadosti
      </Link>

      <header className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold sm:text-4xl">{app.student.name}</h1>
            <Badge tone={STATUS[app.status].tone}>{STATUS[app.status].label}</Badge>
          </div>
          <p className="mt-2 text-muted">
            {app.student.login}, {app.student.email}
            {app.submittedAt ? `, podaná ${formatDate(app.submittedAt)}` : ""}
          </p>
        </div>
        <ApplicationActions applicationId={app.id} status={app.status} freeRooms={freeRoomList} />
      </header>

      <div className="grid items-start gap-12 lg:grid-cols-[1fr_20rem]">
        <div className="flex min-w-0 flex-col gap-12">
          <section aria-labelledby="doklady">
            <h2 id="doklady" className="text-lg font-bold">
              Doklady
            </h2>
            {checklist.length === 0 ? (
              <p className="mt-2 text-muted">Študent nežiada o zohľadnenie osobitných okolností.</p>
            ) : (
              <div className="mt-4 flex flex-col gap-4">
                {checklist.map(({ type, doc }) => (
                  <DocumentReview
                    key={type}
                    type={type}
                    label={DOCUMENT_TYPE[type].label}
                    doc={
                      doc && {
                        id: doc.id,
                        fileName: doc.fileName,
                        size: doc.size,
                        uploadedAt: doc.uploadedAt.toISOString(),
                        status: doc.status,
                        reviewNote: doc.reviewNote,
                      }
                    }
                    reviewable={reviewable}
                    socialLevel={app.socialLevel}
                  />
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="ziadost">
            <h2 id="ziadost" className="text-lg font-bold">
              Údaje žiadosti
            </h2>
            <dl className="mt-4 grid gap-x-8 gap-y-5 rounded-panel bg-surface p-5 ring-1 ring-line sm:grid-cols-2 sm:p-6">
              <Fact label="Študijný program">{app.aisProgram ?? "–"}</Fact>
              <Fact label="Ročník">{app.aisYear ? `${app.aisYear}.` : "–"}</Fact>
              <Fact label="Vážený priemer">{formatNumber(app.aisGpa)}</Fact>
              <Fact label="Vzdialenosť bydliska">
                {app.aisDistanceKm != null ? `${app.aisDistanceKm} km` : "–"}
              </Fact>
              <Fact label="Sociálna situácia">
                {app.claimsSocial
                  ? app.socialLevel != null
                    ? `${app.socialLevel}, ${SOCIAL_LABEL[app.socialLevel]}`
                    : "uplatnená, neposúdená"
                  : "neuplatnená"}
              </Fact>
              <Fact label="Zdravotný stav">{app.claimsHealth ? "uplatnený" : "neuplatnený"}</Fact>
              <Fact label="Typ izby">
                {app.preferredBeds ? `${app.preferredBeds}-lôžková` : "nezáleží"}
              </Fact>
              <Fact label="Telefón">{app.phone ?? "–"}</Fact>
              <Fact label="Preferované internáty" wide>
                {app.preferences.length > 0
                  ? app.preferences.map((p) => `${p.rank}. ${p.dorm.name}`).join(", ")
                  : "–"}
              </Fact>
              {app.note ? (
                <Fact label="Poznámka študenta" wide>
                  {app.note}
                </Fact>
              ) : null}
              {app.allocation ? (
                <Fact label="Pridelené miesto" wide>
                  {app.allocation.roomType.dorm.name}, {app.allocation.roomType.label.toLowerCase()}
                </Fact>
              ) : null}
            </dl>
          </section>
        </div>

        <aside aria-labelledby="historia" className="lg:sticky lg:top-28">
          <h2 id="historia" className="mb-4 text-lg font-bold">
            História
          </h2>
          <AuditTimeline entries={history} />
        </aside>
      </div>
    </>
  );
}

function Fact({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium">{children}</dd>
    </div>
  );
}
