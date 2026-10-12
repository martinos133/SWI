"use client";

import clsx from "clsx";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import type { ApplicationStatus, DocumentStatus, DocumentType } from "@/generated/prisma/enums";
import { formatDateTime, formatFileSize } from "@/lib/format";
import { DOCUMENT_STATUS } from "@/lib/status";
import { finishReview, reviewDocument, startReview, type ActionResult } from "../../actions";

type Doc = {
  id: string;
  fileName: string;
  size: number;
  uploadedAt: string;
  status: DocumentStatus;
  reviewNote: string | null;
};

type Decision = "OVERENY" | "DOPLNIT" | "ZAMIETNUTY";

const DECISIONS: { value: Decision; label: string }[] = [
  { value: "OVERENY", label: "Schváliť" },
  { value: "DOPLNIT", label: "Vyžiadať doplnenie" },
  { value: "ZAMIETNUTY", label: "Zamietnuť" },
];

const SOCIAL = [
  { value: 0, label: "0", text: "Bez zohľadnenia" },
  { value: 1, label: "1", text: "Mierne zhoršená" },
  { value: 2, label: "2", text: "Zhoršená" },
  { value: 3, label: "3", text: "Ťažká" },
];

export function DocumentReview({
  type,
  label,
  doc,
  reviewable,
  socialLevel,
}: {
  type: DocumentType;
  label: string;
  doc: Doc | null;
  reviewable: boolean;
  socialLevel: number | null;
}) {
  const [open, setOpen] = useState(doc?.status === "NAHRANY");
  const [decision, setDecision] = useState<Decision>("OVERENY");
  const [note, setNote] = useState("");
  const [level, setLevel] = useState<number | null>(socialLevel);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      if (!doc) return;
      const result = await reviewDocument({
        documentId: doc.id,
        decision,
        note,
        socialLevel: type === "PRIJEM" && decision === "OVERENY" ? level : null,
      });
      if (result.ok) {
        setError(null);
        setOpen(false);
        setNote("");
      } else setError(result.error);
    });

  return (
    <article className="rounded-panel bg-surface ring-1 ring-line">
      <header className="flex items-center justify-between gap-3 px-5 pt-4 sm:px-6">
        <h3 className="font-bold">{label}</h3>
        {doc ? (
          <Badge tone={DOCUMENT_STATUS[doc.status].tone}>{DOCUMENT_STATUS[doc.status].label}</Badge>
        ) : (
          <Badge tone="bad">Chýba</Badge>
        )}
      </header>

      <div className="flex flex-col gap-4 px-5 pt-3 pb-5 sm:px-6">
        {doc ? (
          <a
            href={`/doklad/${doc.id}`}
            target="_blank"
            rel="noopener"
            className="group flex items-center gap-3 rounded-field bg-paper px-3.5 py-3 transition-colors hover:bg-sunken"
          >
            <span aria-hidden className="grid h-10 w-8 place-items-center rounded-[0.35rem] bg-surface text-[0.625rem] font-bold text-muted ring-1 ring-line">
              {doc.fileName.split(".").pop()?.toUpperCase().slice(0, 4)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium group-hover:underline">{doc.fileName}</span>
              <span className="block text-sm text-muted">
                {formatFileSize(doc.size)}, nahrané {formatDateTime(doc.uploadedAt)}
              </span>
            </span>
            <span className="shrink-0 text-sm font-medium text-muted">Otvoriť</span>
          </a>
        ) : (
          <p className="text-sm text-muted">Študent doklad ešte nenahral.</p>
        )}

        {doc?.reviewNote && doc.status !== "NAHRANY" ? (
          <p className="text-sm">
            <span className="text-muted">Poznámka pre študenta: </span>
            {doc.reviewNote}
          </p>
        ) : null}

        {doc && reviewable && !open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="self-start text-sm font-medium text-muted underline underline-offset-2 hover:text-ink"
          >
            Zmeniť posúdenie
          </button>
        ) : null}

        {doc && reviewable && open ? (
          <div className="flex flex-col gap-4 border-t border-line pt-4">
            <div role="radiogroup" aria-label="Rozhodnutie" className="flex flex-wrap gap-2">
              {DECISIONS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  role="radio"
                  aria-checked={decision === d.value}
                  onClick={() => setDecision(d.value)}
                  className={clsx(
                    "rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 transition-colors",
                    decision === d.value
                      ? d.value === "OVERENY"
                        ? "bg-ok text-white ring-ok"
                        : d.value === "DOPLNIT"
                          ? "bg-wait text-white ring-wait"
                          : "bg-bad text-white ring-bad"
                      : "bg-surface text-ink-soft ring-line-strong hover:bg-sunken",
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {decision === "OVERENY" && type === "PRIJEM" ? (
              <fieldset>
                <legend className="text-sm font-semibold">Stupeň sociálnej situácie</legend>
                <p className="text-sm text-muted">Určuje body za kritérium sociálnej situácie.</p>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {SOCIAL.map((s) => (
                    <label
                      key={s.value}
                      className={clsx(
                        "cursor-pointer rounded-field px-3 py-2.5 ring-1 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brass",
                        level === s.value ? "bg-pine-tint ring-2 ring-pine" : "ring-line-strong hover:bg-sunken",
                      )}
                    >
                      <input
                        type="radio"
                        name={`level-${doc.id}`}
                        className="sr-only"
                        checked={level === s.value}
                        onChange={() => setLevel(s.value)}
                      />
                      <span className="block text-lg font-bold">{s.label}</span>
                      <span className="block text-sm text-muted">{s.text}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}

            {decision !== "OVERENY" ? (
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`note-${doc.id}`} className="text-sm font-semibold">
                  {decision === "DOPLNIT" ? "Čo má študent doplniť" : "Dôvod zamietnutia"}
                </label>
                <Textarea
                  id={`note-${doc.id}`}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={
                    decision === "DOPLNIT"
                      ? "Napríklad: Na potvrdení chýba pečiatka zamestnávateľa."
                      : "Napríklad: Doklad nepatrí študentovi ani členovi jeho domácnosti."
                  }
                  rows={3}
                />
                <p className="text-sm text-muted">Študentovi to pošleme e-mailom a uvidí to aj v aplikácii.</p>
              </div>
            ) : null}

            {error ? (
              <p role="alert" className="text-sm text-bad">
                {error}
              </p>
            ) : null}

            <div className="flex gap-2">
              <Button
                onClick={submit}
                disabled={pending}
                variant={decision === "ZAMIETNUTY" ? "danger" : "primary"}
              >
                {pending ? "Ukladám…" : DECISIONS.find((d) => d.value === decision)!.label}
              </Button>
              {doc.status !== "NAHRANY" ? (
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Zrušiť
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function ApplicationActions({
  applicationId,
  status,
}: {
  applicationId: string;
  status: ApplicationStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (action: (id: string) => Promise<ActionResult>) =>
    startTransition(async () => {
      const result = await action(applicationId);
      setError(result.ok ? null : result.error);
    });

  if (status !== "PODANA" && status !== "OVERUJE_SA") return null;

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      {status === "PODANA" ? (
        <Button onClick={() => run(startReview)} disabled={pending}>
          Začať overovať
        </Button>
      ) : (
        <Button onClick={() => run(finishReview)} disabled={pending}>
          Posunúť na vyhodnotenie
        </Button>
      )}
      {error ? (
        <p role="alert" className="max-w-xs text-sm text-bad sm:text-right">
          {error}
        </p>
      ) : null}
    </div>
  );
}
