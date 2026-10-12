"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
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
    <div className="grid items-start gap-10 lg:grid-cols-[1fr_19rem]">
      <div className="flex flex-col gap-12">
        <FormSection
          title="Údaje z akademického IS"
          description="Tieto údaje nemeníte. Ak nesedia, obráťte sa na študijné oddelenie fakulty."
        >
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <Fact label="Študijný program" value={props.ais.program} />
            <Fact label="Fakulta" value={props.ais.faculty} />
            <Fact label="Ročník" value={props.ais.year ? `${props.ais.year}.` : null} />
            <Fact label="Vážený študijný priemer" value={formatNumber(props.ais.gpa)} />
            <Fact
              label="Vzdialenosť trvalého bydliska"
              value={props.ais.distanceKm != null ? `${props.ais.distanceKm} km` : null}
            />
          </dl>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
            <span>Načítané {formatDateTime(props.ais.syncedAt)}</span>
            {editable ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(async () => void (await refreshFromAis(), router.refresh()))}
                className="font-medium text-ink underline underline-offset-2 disabled:opacity-50"
              >
                Načítať znova
              </button>
            ) : null}
          </div>
        </FormSection>

        <FormSection title="Kontakt">
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
              onChange={(e) => update("phone", e.target.value)}
            />
          </Field>
        </FormSection>

        <FormSection
          title="Kde chcete bývať"
          description="Zoraďte internáty od najžiadanejšieho. Miesto dostanete v prvom, kde bude pre vás voľno."
        >
          {chosen.length > 0 ? (
            <ol className="divide-y divide-line rounded-panel bg-surface ring-1 ring-line">
              {chosen.map((dorm, i) => (
                <li key={dorm.id} className="flex items-center gap-4 px-4 py-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-pine text-sm font-bold text-white tabular-nums">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{dorm.name}</p>
                    <p className="truncate text-sm text-muted">{dorm.address}</p>
                  </div>
                  {editable ? (
                    <div className="flex shrink-0 items-center gap-1">
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
            <p className="rounded-panel border border-dashed border-line-strong px-4 py-5 text-muted">
              Zatiaľ ste nevybrali žiadny internát.
            </p>
          )}
          {editable && available.length > 0 ? (
            <div className="mt-4">
              <p className="text-sm font-semibold">Pridať internát</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {available.map((dorm) => (
                  <button
                    key={dorm.id}
                    type="button"
                    onClick={() => update("preferences", [...draft.preferences, dorm.id])}
                    className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3.5 py-1.5 text-sm font-medium ring-1 ring-line-strong transition-colors hover:bg-pine-tint hover:ring-pine/40"
                  >
                    <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
                      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    {dorm.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </FormSection>

        <FormSection title="Typ izby" description="Ak preferovaný typ nebude voľný, dostanete iný v tom istom internáte.">
          <div role="radiogroup" aria-label="Typ izby" className="grid gap-2 sm:grid-cols-4">
            {[...props.bedOptions, null].map((beds) => {
              const checked = draft.preferredBeds === beds;
              return (
                <label
                  key={beds ?? "any"}
                  className={clsx(
                    "flex cursor-pointer flex-col rounded-field px-4 py-3 ring-1 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brass",
                    checked ? "bg-pine-tint ring-2 ring-pine" : "bg-surface ring-line-strong hover:bg-sunken",
                    !editable && "pointer-events-none opacity-60",
                  )}
                >
                  <input
                    type="radio"
                    name="beds"
                    className="sr-only"
                    checked={checked}
                    disabled={!editable}
                    onChange={() => update("preferredBeds", beds)}
                  />
                  <span className="font-semibold">{beds ? BEDS_LABEL[beds] : "Nezáleží mi"}</span>
                  <span className="text-sm text-muted">{beds ? `${beds} ${beds === 1 ? "lôžko" : "lôžka"}` : "akákoľvek izba"}</span>
                </label>
              );
            })}
          </div>
        </FormSection>

        <FormSection
          title="Osobitné okolnosti"
          description="Zohľadníme ich v poradí, ak ich doložíte. Doklady nahráte v časti Doklady."
        >
          <div className="flex flex-col gap-3">
            <Check
              checked={draft.claimsSocial}
              disabled={!editable}
              onChange={(v) => update("claimsSocial", v)}
              title="Žiadam o zohľadnenie sociálnej situácie"
              text="Priložíte potvrdenie o príjmoch domácnosti za minulý rok."
            />
            <Check
              checked={draft.claimsHealth}
              disabled={!editable}
              onChange={(v) => update("claimsHealth", v)}
              title="Žiadam o zohľadnenie zdravotného stavu"
              text="Priložíte lekársku správu alebo preukaz ŤZP. Doklad uvidí iba referent."
            />
          </div>
        </FormSection>

        <FormSection title="Poznámka pre ubytovacie oddelenie">
          <Field label="Poznámka" htmlFor="note" hint="Nepovinné. Napríklad s kým by ste chceli bývať.">
            <Textarea
              id="note"
              maxLength={1000}
              value={draft.note}
              disabled={!editable}
              onChange={(e) => update("note", e.target.value)}
            />
          </Field>
        </FormSection>
      </div>

      <aside className="lg:sticky lg:top-28">
        <div className="rounded-panel bg-surface p-5 ring-1 ring-line">
          <SaveIndicator state={save} editable={editable} />

          {props.canSubmit ? (
            <>
              <p className="mt-4 text-sm text-muted">
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
            <p className="mt-4 text-sm text-muted">
              Žiadosť je podaná. Zmeny, ktoré urobíte do termínu úprav, sa započítajú.
            </p>
          ) : null}

          {submitError ? (
            <p role="alert" className="mt-3 rounded-field bg-bad-tint px-3 py-2.5 text-sm text-bad">
              {submitError}
            </p>
          ) : null}

          {editable ? (
            <div className="mt-5 border-t border-line pt-4">
              {confirmCancel ? (
                <div>
                  <p className="text-sm font-semibold">Naozaj zrušiť žiadosť?</p>
                  <p className="mt-1 text-sm text-muted">Zrušenú žiadosť už neobnovíte.</p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={pending}
                      onClick={() => flushAnd(cancelApplication, () => setConfirmCancel(false))}
                    >
                      Zrušiť žiadosť
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmCancel(false)}>
                      Ponechať
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmCancel(true)}
                  className="text-sm font-medium text-muted underline underline-offset-2 hover:text-bad"
                >
                  Zrušiť žiadosť
                </button>
              )}
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4 border-t border-line pt-6 first:border-0 first:pt-0">
      <div className="max-w-xl">
        <h2 className="text-lg font-bold">{title}</h2>
        {description ? <p className="mt-1 text-muted">{description}</p> : null}
      </div>
      <div>{children}</div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold">{value ?? "–"}</dd>
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
      className="grid size-8 place-items-center rounded-field text-muted transition-colors hover:bg-sunken hover:text-ink disabled:opacity-30"
    >
      <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
    </button>
  );
}

function Check({
  checked,
  disabled,
  onChange,
  title,
  text,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
  title: string;
  text: string;
}) {
  return (
    <label
      className={clsx(
        "flex cursor-pointer gap-3 rounded-field bg-surface px-4 py-3.5 ring-1 transition-colors",
        checked ? "ring-2 ring-pine" : "ring-line-strong hover:bg-sunken",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4.5 shrink-0 accent-pine"
      />
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="mt-0.5 block text-sm text-muted">{text}</span>
      </span>
    </label>
  );
}

function SaveIndicator({ state, editable }: { state: SaveState; editable: boolean }) {
  if (!editable) {
    return <p className="text-sm font-semibold">Žiadosť je uzamknutá</p>;
  }
  const map = {
    idle: { dot: "bg-line-strong", text: "Zmeny sa ukladajú automaticky" },
    saving: { dot: "bg-wait animate-pulse", text: "Ukladám…" },
    saved: {
      dot: "bg-ok",
      text: state.kind === "saved" ? `Uložené o ${state.at.toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" })}` : "",
    },
    error: { dot: "bg-bad", text: state.kind === "error" ? state.message : "" },
  }[state.kind];
  return (
    <p aria-live="polite" className="flex items-center gap-2 text-sm font-semibold">
      <span aria-hidden className={clsx("size-2 rounded-full", map.dot)} />
      {map.text}
    </p>
  );
}
