"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckField, Field, Input, Textarea } from "@/components/ui/field";
import { Section } from "@/components/ui/page-header";
import type { CriterionKey } from "@/generated/prisma/enums";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import { MAX_DISTANCE_KM, score } from "@/lib/ranking";
import { approveCriteria, saveCriteria } from "../actions";

type Criterion = {
  id: string;
  key: CriterionKey;
  name: string;
  description: string;
  weight: number;
};

// Farby segmentov pruhu s podielmi kritérií (odtiene primárnej farby).
const SHADES = ["bg-pine", "bg-[#2f6a5f]", "bg-[#5f978a]", "bg-[#9cc2b8]"];

export function CriteriaEditor({
  periodId,
  approved,
  criteria: initial,
}: {
  periodId: string;
  approved: string | null;
  criteria: Criterion[];
}) {
  const router = useRouter();
  const [criteria, setCriteria] = useState(initial);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const sum = criteria.reduce((s, c) => s + (Number.isFinite(c.weight) ? c.weight : 0), 0);
  const dirty = criteria.some((c, i) => c.weight !== initial[i].weight || c.description !== initial[i].description);

  const set = (id: string, patch: Partial<Criterion>) =>
    setCriteria((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const run = (fn: () => Promise<{ ok: true } | { ok: false; error: string }>, okText: string) =>
    startTransition(async () => {
      const result = await fn();
      setMessage(result.ok ? { ok: true, text: okText } : { ok: false, text: result.error });
      if (result.ok) router.refresh();
    });

  const isApproved = Boolean(approved) && !dirty;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="flex min-w-0 flex-col gap-6">
        <Alert
          tone={isApproved ? "ok" : "wait"}
          title={isApproved ? "Kritériá sú schválené" : "Kritériá čakajú na schválenie"}
        >
          <p>
            {isApproved
              ? approved
              : dirty
                ? "Najprv uložte zmeny. Po uložení ich treba znova schváliť."
                : "Bez schválenia nemôže referent vypočítať poradie."}
          </p>
          {!approved && !dirty ? (
            <Button
              size="sm"
              className="mt-3"
              disabled={pending || sum !== 100}
              onClick={() => run(() => approveCriteria(periodId), "Kritériá sú schválené.")}
            >
              Schváliť kritériá
            </Button>
          ) : null}
        </Alert>

        <div>
          <div aria-hidden className="flex h-2.5 overflow-hidden rounded-field bg-sunken">
            {criteria.map((c, i) => (
              <span
                key={c.id}
                className={cn("h-full", SHADES[i % SHADES.length])}
                style={{ width: `${Math.max(0, Math.min(100, c.weight || 0))}%` }}
              />
            ))}
          </div>
          <p className={cn("mt-2 text-sm font-semibold tabular-nums", sum === 100 ? "text-muted" : "text-bad")}>
            Súčet váh {sum} zo 100
          </p>
        </div>

        <ul className="flex flex-col divide-y divide-line rounded-panel border border-line bg-surface">
          {criteria.map((c, i) => (
            <li key={c.id} className="grid gap-4 p-5 sm:grid-cols-[1fr_7rem]">
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex items-center gap-2.5">
                  <span aria-hidden className={cn("size-2.5 shrink-0", SHADES[i % SHADES.length])} />
                  <h2 className="text-base font-semibold">{c.name}</h2>
                </div>
                <label htmlFor={`desc-${c.id}`} className="sr-only">
                  Popis kritéria {c.name}
                </label>
                <Textarea
                  id={`desc-${c.id}`}
                  value={c.description}
                  onChange={(e) => set(c.id, { description: e.target.value })}
                  rows={2}
                  className="text-sm"
                />
              </div>
              <Field label="Váha" htmlFor={`weight-${c.id}`}>
                <Input
                  id={`weight-${c.id}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  value={Number.isFinite(c.weight) ? c.weight : ""}
                  onChange={(e) => set(c.id, { weight: e.target.valueAsNumber })}
                  className="w-28 font-semibold sm:w-full"
                />
              </Field>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            disabled={pending || !dirty}
            onClick={() =>
              run(
                () =>
                  saveCriteria({
                    periodId,
                    criteria: criteria.map(({ id, weight, description }) => ({ id, weight, description })),
                  }),
                "Zmeny sú uložené. Teraz ich schváľte.",
              )
            }
          >
            {pending ? "Ukladám…" : "Uložiť zmeny"}
          </Button>
          {dirty ? (
            <Button variant="ghost" onClick={() => setCriteria(initial)}>
              Vrátiť zmeny
            </Button>
          ) : null}
          {message ? (
            <p aria-live="polite" className={cn("text-sm font-medium", message.ok ? "text-ok" : "text-bad")}>
              {message.text}
            </p>
          ) : null}
        </div>
      </div>

      <Preview criteria={criteria} />
    </div>
  );
}

function Preview({ criteria }: { criteria: Criterion[] }) {
  const [gpa, setGpa] = useState(1.8);
  const [km, setKm] = useState(250);
  const [social, setSocial] = useState(1);
  const [health, setHealth] = useState(false);

  const result = score(
    criteria.map((c) => ({ key: c.key, name: c.name, weight: c.weight || 0 })),
    {
      applicationId: "ukazka",
      gpa,
      distanceKm: km,
      socialLevel: social,
      healthApproved: health,
      submittedAt: new Date(0),
      preferredBeds: null,
      preferences: [],
    },
  );

  return (
    <aside className="lg:sticky lg:top-28">
      <Section
        title="Vyskúšajte výpočet"
        description="Koľko bodov by s aktuálnymi váhami získal takýto študent."
      >
        <div className="flex flex-col gap-5">
          <Slider label="Vážený priemer" value={formatNumber(gpa)} min={1} max={4} step={0.1} current={gpa} onChange={setGpa} />
          <Slider label="Vzdialenosť bydliska" value={`${km} km`} min={0} max={MAX_DISTANCE_KM + 100} step={10} current={km} onChange={setKm} />
          <Slider label="Sociálna situácia" value={`stupeň ${social}`} min={0} max={3} step={1} current={social} onChange={setSocial} />
          <CheckField
            label="Overený zdravotný doklad"
            checked={health}
            onChange={(e) => setHealth(e.target.checked)}
          />
        </div>

        <dl className="mt-5 flex flex-col gap-1.5 border-t border-line pt-4 text-sm tabular-nums">
          {criteria.map((c) => (
            <div key={c.key} className="flex justify-between gap-3">
              <dt className="text-muted">{c.name}</dt>
              <dd className="font-medium">{formatNumber(result.breakdown[c.key]?.points ?? 0)}</dd>
            </div>
          ))}
          <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-line pt-3">
            <dt className="font-semibold">Spolu</dt>
            <dd className="text-lg font-semibold">{formatNumber(result.points)}</dd>
          </div>
        </dl>
      </Section>
    </aside>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  current,
  onChange,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  current: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex justify-between gap-3 text-sm">
        <span className="font-semibold">{label}</span>
        <span className="text-muted tabular-nums">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={current}
        onChange={(e) => onChange(Math.round(e.target.valueAsNumber * 10) / 10)}
        className="w-full accent-pine"
      />
    </label>
  );
}
