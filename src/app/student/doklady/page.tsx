import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DocumentRow } from "@/components/document-row";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader, Section } from "@/components/ui/page-header";
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
              <Section
                key={type}
                title={DOCUMENT_TYPE[type].label}
                description={DOCUMENT_TYPE[type].hint}
                actions={
                  state === "CHYBA" ? (
                    <Badge tone="bad">Chýba</Badge>
                  ) : (
                    <Badge tone={DOCUMENT_STATUS[state].tone}>{DOCUMENT_STATUS[state].label}</Badge>
                  )
                }
              >
                <div className="flex flex-col gap-4">
                  {doc?.reviewNote && (state === "DOPLNIT" || state === "ZAMIETNUTY") ? (
                    <Alert tone={state === "DOPLNIT" ? "wait" : "bad"} title="Poznámka referenta">
                      {doc.reviewNote}
                    </Alert>
                  ) : null}

                  {doc ? <DocumentRow doc={doc} /> : null}

                  {editable && needsUpload ? (
                    <UploadForm type={type} replacing={Boolean(doc)} />
                  ) : null}

                  {history.length > 0 ? (
                    <details className="text-sm">
                      <summary className="cursor-pointer font-medium text-ink-soft hover:text-ink">
                        Staršie verzie ({history.length})
                      </summary>
                      <ul className="mt-3 flex flex-col divide-y divide-line rounded-panel border border-line">
                        {history.map((h) => (
                          <li key={h.id} className="px-3.5 py-2.5">
                            <DocumentRow doc={h} compact />
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </div>
              </Section>
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
