import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DocumentRow } from "@/components/document-row";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { applicationInclude, documentChecklist, STUDENT_EDITABLE } from "@/lib/applications";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { getActivePeriod } from "@/lib/period";
import { DOCUMENT_STATUS, DOCUMENT_TYPE } from "@/lib/status";
import { UploadForm } from "./upload-form";

export const metadata: Metadata = { title: "Doklady" };

export default async function DocumentsPage() {
  const user = await requireUser(["STUDENT"]);
  const period = await getActivePeriod();
  if (!period) redirect("/student");
  const app = await db.application.findUnique({
    where: { studentId_periodId: { studentId: user.id, periodId: period.id } },
    include: applicationInclude,
  });
  if (!app) redirect("/student");

  const checklist = documentChecklist(app);
  const editable = STUDENT_EDITABLE.includes(app.status);

  return (
    <>
      <PageHeader
        title="Doklady"
        description="Súbory ukladáme šifrovane a vidí ich iba ubytovacie oddelenie. Po skončení konania ich zmažeme."
      />

      {checklist.length === 0 ? (
        <EmptyState
          title="K žiadosti netreba prikladať doklady"
          action={
            editable ? (
              <ButtonLink href="/student/ziadost" variant="secondary" size="sm">
                Upraviť žiadosť
              </ButtonLink>
            ) : null
          }
        >
          Ak chcete, aby sme zohľadnili vašu sociálnu situáciu alebo zdravotný stav, označte to v
          žiadosti. Potom sa tu objaví miesto na nahranie dokladu.
        </EmptyState>
      ) : (
        <div className="flex max-w-3xl flex-col gap-6">
          {checklist.map(({ type, doc, state }) => {
            const history = app.documents.filter((d) => d.type === type && !d.appealId && d.id !== doc?.id);
            const needsUpload = state === "CHYBA" || state === "DOPLNIT" || state === "ZAMIETNUTY";
            return (
              <section key={type} className="rounded-panel bg-surface ring-1 ring-line">
                <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6">
                  <div className="max-w-lg">
                    <h2 className="text-lg font-bold">{DOCUMENT_TYPE[type].label}</h2>
                    <p className="mt-0.5 text-sm text-muted">{DOCUMENT_TYPE[type].hint}</p>
                  </div>
                  {state === "CHYBA" ? (
                    <Badge tone="bad">Chýba</Badge>
                  ) : (
                    <Badge tone={DOCUMENT_STATUS[state].tone}>{DOCUMENT_STATUS[state].label}</Badge>
                  )}
                </header>

                <div className="flex flex-col gap-4 px-5 pt-4 pb-5 sm:px-6">
                  {doc?.reviewNote && (state === "DOPLNIT" || state === "ZAMIETNUTY") ? (
                    <div
                      className={
                        state === "DOPLNIT"
                          ? "rounded-field bg-wait-tint px-4 py-3 text-sm"
                          : "rounded-field bg-bad-tint px-4 py-3 text-sm"
                      }
                    >
                      <p className="font-semibold">Poznámka referenta</p>
                      <p className="mt-0.5">{doc.reviewNote}</p>
                    </div>
                  ) : null}

                  {doc ? <DocumentRow doc={doc} /> : null}

                  {editable && needsUpload ? (
                    <UploadForm type={type} replacing={Boolean(doc)} />
                  ) : null}

                  {history.length > 0 ? (
                    <details className="group text-sm">
                      <summary className="cursor-pointer font-medium text-muted hover:text-ink">
                        Staršie verzie ({history.length})
                      </summary>
                      <ul className="mt-3 flex flex-col gap-2">
                        {history.map((h) => (
                          <li key={h.id}>
                            <DocumentRow doc={h} compact />
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </div>
              </section>
            );
          })}
          <p className="text-sm text-muted">
            Doklady uchovávame do {formatDate(checklist.find((c) => c.doc)?.doc?.retainUntil)}, potom
            sa automaticky zmažú.
          </p>
        </div>
      )}
    </>
  );
}
