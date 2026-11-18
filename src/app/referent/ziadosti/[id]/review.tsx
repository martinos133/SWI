"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { ChoiceCard, describedBy, Field, Fieldset, Radio, Select, Textarea } from "@/components/ui/field";
import type { ApplicationStatus, DocumentStatus, DocumentType } from "@/generated/prisma/enums";
import { formatDateTime, formatFileSize } from "@/lib/format";
import { DOCUMENT_STATUS } from "@/lib/status";
import { assignFreePlace, finishReview, reviewDocument, startReview, type ActionResult } from "../../actions";

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

  const noteId = doc ? `note-${doc.id}` : "";
  const noteHint = "Študentovi to pošleme e-mailom a uvidí to aj v aplikácii.";

  return (
    <article className="px-5 py-5">
      <header className="flex items-center justify-between gap-3">
        <h3 className="text-[0.9375rem] leading-6 font-semibold">{label}</h3>
        {doc ? (
          <Badge tone={DOCUMENT_STATUS[doc.status].tone}>{DOCUMENT_STATUS[doc.status].label}</Badge>
        ) : (
          <Badge tone="bad">Chýba</Badge>
        )}
      </header>

      <div className="mt-3 flex flex-col gap-4">
        {doc ? (
          <a
            href={`/doklad/${doc.id}`}
            target="_blank"
            rel="noopener"
            className="group flex items-center gap-3 rounded-field border border-line bg-surface px-3 py-2.5 transition-colors hover:border-line-hover hover:bg-hover"
          >
            <span
              aria-hidden
              className="grid h-9 w-8 shrink-0 place-items-center rounded-field border border-line bg-sunken font-mono text-[0.625rem] font-semibold text-ink-soft"
            >
              {doc.fileName.split(".").pop()?.toUpperCase().slice(0, 4)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-ink group-hover:underline">{doc.fileName}</span>
              <span className="block text-sm text-muted">
                {formatFileSize(doc.size)}, nahrané {formatDateTime(doc.uploadedAt)}
              </span>
            </span>
            <span className="shrink-0 text-sm font-semibold text-pine">Otvoriť</span>
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
          <Button variant="link" size="sm" className="self-start" onClick={() => setOpen(true)}>
            Zmeniť posúdenie
          </Button>
        ) : null}

        {doc && reviewable && open ? (
          <div className="flex flex-col gap-5 border-t border-line pt-4">
            <Fieldset legend="Rozhodnutie">
              <div className="flex flex-wrap gap-2">
                {DECISIONS.map((d) => (
                  <label key={d.value} className="choice items-center py-2 pr-3.5 pl-3 text-[0.9375rem] font-medium">
                    <Radio
                      name={`decision-${doc.id}`}
                      value={d.value}
                      className="mt-0"
                      checked={decision === d.value}
                      onChange={() => setDecision(d.value)}
                    />
                    {d.label}
                  </label>
                ))}
              </div>
            </Fieldset>

            {decision === "OVERENY" && type === "PRIJEM" ? (
              <Fieldset
                legend="Stupeň sociálnej situácie"
                hint="Určuje body za kritérium sociálnej situácie."
                id={`level-${doc.id}`}
              >
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {SOCIAL.map((s) => (
                    <ChoiceCard
                      key={s.value}
                      name={`level-${doc.id}`}
                      label={s.label}
                      description={s.text}
                      checked={level === s.value}
                      onChange={() => setLevel(s.value)}
                    />
                  ))}
                </div>
              </Fieldset>
            ) : null}

            {decision !== "OVERENY" ? (
              <Field
                label={decision === "DOPLNIT" ? "Čo má študent doplniť" : "Dôvod zamietnutia"}
                htmlFor={noteId}
                hint={noteHint}
              >
                <Textarea
                  id={noteId}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  aria-describedby={describedBy(noteId, { hint: noteHint })}
                  placeholder={
                    decision === "DOPLNIT"
                      ? "Napríklad: Na potvrdení chýba pečiatka zamestnávateľa."
                      : "Napríklad: Doklad nepatrí študentovi ani členovi jeho domácnosti."
                  }
                  rows={3}
                />
              </Field>
            ) : null}

            {error ? (
              <Alert tone="bad" role="alert">
                {error}
              </Alert>
            ) : null}

            <div className="flex flex-wrap gap-2">
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
  freeRooms = [],
}: {
  applicationId: string;
  status: ApplicationStatus;
  freeRooms?: { id: string; label: string; free: number }[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [room, setRoom] = useState("");

  if (status === "NEPRIDELENA") {
    if (freeRooms.length === 0) return null;
    return (
      <div className="flex w-full flex-col items-start gap-2 sm:w-auto sm:items-end">
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <label htmlFor="free-room" className="sr-only">
            Uvoľnené miesto
          </label>
          <Select
            id="free-room"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            className="w-full sm:w-64"
          >
            <option value="">Vyberte uvoľnené miesto</option>
            {freeRooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label} (voľné {r.free})
              </option>
            ))}
          </Select>
          <Button
            disabled={!room || pending}
            onClick={() =>
              startTransition(async () => {
                const result = await assignFreePlace(applicationId, room);
                setError(result.ok ? null : result.error);
              })
            }
          >
            Prideliť miesto
          </Button>
        </div>
        {error ? (
          <Alert tone="bad" role="alert" className="max-w-sm">
            {error}
          </Alert>
        ) : null}
      </div>
    );
  }

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
        <Alert tone="bad" role="alert" className="max-w-sm">
          {error}
        </Alert>
      ) : null}
    </div>
  );
}
