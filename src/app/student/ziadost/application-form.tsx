"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ChoiceCard, describedBy, Field, Input, Textarea } from "@/components/ui/field";
import { Card, DataList, EmptyState, Section } from "@/components/ui/page-header";
import { cn } from "@/lib/cn";
import { formatDateTime, formatNumber } from "@/lib/format";
import {
  cancelApplication,
  refreshFromAis,
  saveDraft,
  submitApplication,
  type DraftInput,
} from "../actions";

type Dorm = { id: string; name: string; address: string; rooms: string[] };

type Props = {
  editable: boolean;
  canSubmit: boolean;
  submitted: boolean;
  submitTo: string;
  ais: {
    year: number | null;
    program: string | null;
    faculty: string | null;
    gpa: number | null;
    distanceKm: number | null;
    syncedAt: string | null;
  };
  dorms: Dorm[];
  bedOptions: number[];
  initial: DraftInput;
};

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: Date }
  | { kind: "error"; message: string };

const BEDS_LABEL: Record<number, string> = {
  1: "Jednolôžková",
  2: "Dvojlôžková",
  3: "Trojlôžková",
};

export function ApplicationForm(props: Props) {
  const { editable, dorms } = props;
  const router = useRouter();
  const [draft, setDraft] = useState<DraftInput>(props.initial);
  const [save, setSave] = useState<SaveState>({ kind: "idle" });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [pending, startTransition] = useTransition();
  const firstRender = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(draft);

  const persist = async (value: DraftInput) => {
    setSave({ kind: "saving" });
    const result = await saveDraft(value);
    if (result.ok) setSave({ kind: "saved", at: new Date(result.savedAt ?? Date.now()) });
    else setSave({ kind: "error", message: result.error });
    return result.ok;
  };

  // Priebežné ukladanie (S.09) – 700 ms po poslednej zmene.
  useEffect(() => {
    latest.current = draft;
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (!editable) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void persist(draft), 700);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [draft, editable]);

  const update = <K extends keyof DraftInput>(key: K, value: DraftInput[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const move = (index: number, delta: number) => {
    const next = [...draft.preferences];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    update("preferences", next);
  };

  const flushAnd = (action: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    startTransition(async () => {
      if (timer.current) clearTimeout(timer.current);
      const saved = await persist(latest.current);
      if (!saved) return;
      const result = await action();
      if (!result.ok) setSubmitError(result.error ?? "Akcia sa nepodarila.");
      else {
        setSubmitError(null);
        after?.();
        router.refresh();
      }
    });

  const chosen = draft.preferences
    .map((id) => dorms.find((d) => d.id === id))
    .filter((d): d is Dorm => Boolean(d));
  const available = dorms.filter((d) => !draft.preferences.includes(d.id));

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <div className="flex min-w-0 flex-col gap-6">
        <Section
          title="Údaje z akademického IS"
          description="Tieto údaje nemeníte. Ak nesedia, obráťte sa na študijné oddelenie fakulty."
        >
          <DataList
            items={[
              { label: "Študijný program", value: props.ais.program ?? "–" },
              { label: "Fakulta", value: props.ais.faculty ?? "–" },
              { label: "Ročník", value: props.ais.year ? `${props.ais.year}.` : "–" },
              { label: "Vážený študijný priemer", value: formatNumber(props.ais.gpa) },
              {
                label: "Vzdialenosť trvalého bydliska",
                value: props.ais.distanceKm != null ? `${props.ais.distanceKm} km` : "–",
              },
            ]}
          />
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4 text-sm text-muted">
            <span>Načítané {formatDateTime(props.ais.syncedAt)}</span>
            {editable ? (
              <Button
                type="button"
                variant="link"
                size="sm"
                disabled={pending}
                onClick={() => startTransition(async () => void (await refreshFromAis(), router.refresh()))}
              >
                Načítať znova
              </Button>
            ) : null}
          </div>
        </Section>

        <Section title="Kontakt">
          <Field
            label="Telefón"
            htmlFor="phone"
            hint="Ozveme sa, len ak vás nezastihneme e-mailom."
            className="max-w-xs"
          >
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+421 900 123 456"
              value={draft.phone}
              disabled={!editable}
              aria-describedby={describedBy("phone", { hint: true })}
              onChange={(e) => update("phone", e.target.value)}
            />
          </Field>
        </Section>

        <Section
          title="Kde chcete bývať"
          description="Zoraďte internáty od najžiadanejšieho. Miesto dostanete v prvom, kde bude pre vás voľno."
        >
          {chosen.length > 0 ? (
            <ol className="divide-y divide-line rounded-panel border border-line">
              {chosen.map((dorm, i) => (
                <li key={dorm.id} className="flex items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-4">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-pine text-sm font-semibold text-white tabular-nums">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{dorm.name}</p>
                    <p className="truncate text-sm text-muted">{dorm.address}</p>
                  </div>
                  {editable ? (
                    <div className="flex shrink-0 items-center gap-0.5">
                      <IconButton label={`Posunúť ${dorm.name} vyššie`} disabled={i === 0} onClick={() => move(i, -1)}>
                        <path d="m4 10 4-4 4 4" />
                      </IconButton>
                      <IconButton
                        label={`Posunúť ${dorm.name} nižšie`}
                        disabled={i === chosen.length - 1}
                        onClick={() => move(i, 1)}
                      >
                        <path d="m4 6 4 4 4-4" />
                      </IconButton>
                      <IconButton
                        label={`Odobrať ${dorm.name}`}
                        onClick={() =>
                          update(
                            "preferences",
                            draft.preferences.filter((id) => id !== dorm.id),
                          )
                        }
                      >
                        <path d="m4.5 4.5 7 7m0-7-7 7" />
                      </IconButton>
                    </div>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState title="Zatiaľ ste nevybrali žiadny internát." />
          )}
          {editable && available.length > 0 ? (
            <div className="mt-5">
              <p id="add-dorm" className="text-sm font-semibold">
                Pridať internát
              </p>
              <div role="group" aria-labelledby="add-dorm" className="mt-2 flex flex-wrap gap-2">
                {available.map((dorm) => (
                  <Button
                    key={dorm.id}
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => update("preferences", [...draft.preferences, dorm.id])}
                  >
                    <svg viewBox="0 0 16 16" className="size-3.5 text-muted" aria-hidden>
                      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    {dorm.name}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </Section>

        <Section title="Typ izby" description="Ak preferovaný typ nebude voľný, dostanete iný v tom istom internáte.">
          <fieldset className="min-w-0">
            <legend className="sr-only">Typ izby</legend>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {[...props.bedOptions, null].map((beds) => (
                <ChoiceCard
                  key={beds ?? "any"}
                  name="beds"
                  checked={draft.preferredBeds === beds}
                  disabled={!editable}
                  onChange={() => update("preferredBeds", beds)}
                  label={beds ? BEDS_LABEL[beds] : "Nezáleží mi"}
                  description={beds ? `${beds} ${beds === 1 ? "lôžko" : "lôžka"}` : "akákoľvek izba"}
                />
              ))}
            </div>
          </fieldset>
        </Section>

        <Section
          title="Osobitné okolnosti"
          description="Zohľadníme ich v poradí, ak ich doložíte. Doklady nahráte v časti Doklady."
        >
          <div className="flex flex-col gap-2">
            <ChoiceCard
              type="checkbox"
              checked={draft.claimsSocial}
              disabled={!editable}
              onChange={(e) => update("claimsSocial", e.target.checked)}
              label="Žiadam o zohľadnenie sociálnej situácie"
              description="Priložíte potvrdenie o príjmoch domácnosti za minulý rok."
            />
            <ChoiceCard
              type="checkbox"
              checked={draft.claimsHealth}
              disabled={!editable}
              onChange={(e) => update("claimsHealth", e.target.checked)}
              label="Žiadam o zohľadnenie zdravotného stavu"
              description="Priložíte lekársku správu alebo preukaz ŤZP. Doklad uvidí iba referent."
            />
          </div>
        </Section>

        <Section title="Poznámka pre ubytovacie oddelenie">
          <Field label="Poznámka" htmlFor="note" hint="Nepovinné. Napríklad s kým by ste chceli bývať.">
            <Textarea
              id="note"
              maxLength={1000}
              value={draft.note}
              disabled={!editable}
              aria-describedby={describedBy("note", { hint: true })}
              onChange={(e) => update("note", e.target.value)}
            />
          </Field>
        </Section>
      </div>

      <aside aria-label="Uloženie a podanie žiadosti" className="lg:sticky lg:top-28">
        <Card>
          <SaveIndicator state={save} editable={editable} />

          {props.canSubmit ? (
            <>
              <p className="mt-3 text-sm text-muted">
                Žiadosť zaradíme do poradia až po podaní. Termín je {props.submitTo}.
              </p>
              <Button
                size="lg"
                className="mt-4 w-full"
                disabled={pending}
                onClick={() => flushAnd(submitApplication, () => router.push("/student"))}
              >
                {pending ? "Podávam…" : "Podať žiadosť"}
              </Button>
            </>
          ) : props.submitted ? (
            <p className="mt-3 text-sm text-muted">
              Žiadosť je podaná. Zmeny, ktoré urobíte do termínu úprav, sa započítajú.
            </p>
          ) : null}

          {submitError ? (
            <Alert tone="bad" role="alert" className="mt-4">
              {submitError}
            </Alert>
          ) : null}

          {editable ? (
            <div className="mt-5 border-t border-line pt-4">
              {confirmCancel ? (
                <div>
                  <p className="text-sm font-semibold">Naozaj zrušiť žiadosť?</p>
                  <p className="mt-1 text-sm text-muted">Zrušenú žiadosť už neobnovíte.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={pending}
                      onClick={() => flushAnd(cancelApplication, () => setConfirmCancel(false))}
                    >
                      Zrušiť žiadosť
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setConfirmCancel(false)}>
                      Ponechať
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => setConfirmCancel(true)}
                  className="font-medium text-muted decoration-line-strong hover:text-bad hover:decoration-bad"
                >
                  Zrušiť žiadosť
                </Button>
              )}
            </div>
          ) : null}
        </Card>
      </aside>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-field border border-transparent text-ink-soft transition-colors hover:border-line hover:bg-sunken hover:text-ink disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-transparent disabled:hover:bg-transparent"
    >
      <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
    </button>
  );
}

function SaveIndicator({ state, editable }: { state: SaveState; editable: boolean }) {
  if (!editable) {
    return <p className="text-sm font-semibold">Žiadosť je uzamknutá</p>;
  }
  const map = {
    idle: { tone: "text-ink-soft", text: "Zmeny sa ukladajú automaticky" },
    saving: { tone: "text-ink-soft", text: "Ukladám…" },
    saved: {
      tone: "text-ok",
      text: state.kind === "saved" ? `Uložené o ${state.at.toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" })}` : "",
    },
    error: { tone: "text-bad", text: state.kind === "error" ? state.message : "" },
  }[state.kind];
  return (
    <p aria-live="polite" className={cn("text-sm font-semibold", map.tone)}>
      {map.text}
    </p>
  );
}
