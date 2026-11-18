"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import type { CriterionKey } from "@/generated/prisma/enums";
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

  return (
    <div className="grid items-start gap-12 lg:grid-cols-[1fr_20rem]">
      <div className="min-w-0">
        <div
          className={clsx(
            "mb-8 flex flex-col gap-3 rounded-panel px-5 py-4 sm:flex-row sm:items-center sm:justify-between",
            approved && !dirty ? "bg-ok-tint" : "bg-wait-tint",
          )}
        >
          <div>
            <p className="font-semibold">
              {approved && !dirty ? "Kritériá sú schválené" : "Kritériá čakajú na schválenie"}
            </p>
            <p className="text-sm text-ink-soft">
              {approved && !dirty
                ? approved
                : dirty
                  ? "Najprv uložte zmeny. Po uložení ich treba znova schváliť."
                  : "Bez schválenia nemôže referent vypočítať poradie."}
            </p>
          </div>
          {!approved && !dirty ? (
            <Button
              disabled={pending || sum !== 100}
              onClick={() => run(() => approveCriteria(periodId), "Kritériá sú schválené.")}
            >
              Schváliť kritériá
            </Button>
          ) : null}
        </div>

        <div aria-hidden className="flex h-3 overflow-hidden rounded-full bg-sunken">
          {criteria.map((c, i) => (
            <span
              key={c.id}
              className={clsx("h-full transition-[width] duration-300", SHADES[i % SHADES.length])}
              style={{ width: `${Math.max(0, Math.min(100, c.weight || 0))}%` }}
            />
          ))}
        </div>
        <p className={clsx("mt-2 text-sm font-semibold", sum === 100 ? "text-muted" : "text-bad")}>
          Súčet váh {sum} zo 100
        </p>

        <ul className="mt-6 flex flex-col divide-y divide-line rounded-panel bg-surface ring-1 ring-line">
          {criteria.map((c, i) => (
            <li key={c.id} className="grid gap-4 px-5 py-5 sm:grid-cols-[1fr_7rem] sm:px-6">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2.5">
                  <span aria-hidden className={clsx("size-2.5 rounded-full", SHADES[i % SHADES.length])} />
                  <h2 className="font-bold">{c.name}</h2>
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
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`weight-${c.id}`} className="text-sm font-semibold">
                  Váha
                </label>
                <Input
                  id={`weight-${c.id}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  value={Number.isFinite(c.weight) ? c.weight : ""}
                  onChange={(e) => set(c.id, { weight: e.target.valueAsNumber })}
                  className="text-lg font-bold"
                />
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap items-center gap-4">
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
            <p aria-live="polite" className={clsx("text-sm", message.ok ? "text-ok" : "text-bad")}>
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
    <aside className="rounded-panel bg-surface p-5 ring-1 ring-line lg:sticky lg:top-28">
      <h2 className="font-bold">Vyskúšajte výpočet</h2>
      <p className="mt-1 text-sm text-muted">Koľko bodov by s aktuálnymi váhami získal takýto študent.</p>

      <div className="mt-5 flex flex-col gap-4">
        <Slider label="Vážený priemer" value={formatNumber(gpa)} min={1} max={4} step={0.1} current={gpa} onChange={setGpa} />
        <Slider label="Vzdialenosť bydliska" value={`${km} km`} min={0} max={MAX_DISTANCE_KM + 100} step={10} current={km} onChange={setKm} />
        <Slider label="Sociálna situácia" value={`stupeň ${social}`} min={0} max={3} step={1} current={social} onChange={setSocial} />
        <label className="flex items-center gap-2.5 text-sm font-semibold">
          <input type="checkbox" className="size-4 accent-pine" checked={health} onChange={(e) => setHealth(e.target.checked)} />
          Overený zdravotný doklad
        </label>
      </div>

      <dl className="mt-6 flex flex-col gap-1.5 border-t border-line pt-4 text-sm">
        {criteria.map((c) => (
          <div key={c.key} className="flex justify-between gap-3">
            <dt className="text-muted">{c.name}</dt>
            <dd className="font-semibold">{formatNumber(result.breakdown[c.key]?.points ?? 0)}</dd>
          </div>
        ))}
        <div className="mt-2 flex items-baseline justify-between border-t border-line pt-3">
          <dt className="font-bold">Spolu</dt>
          <dd className="text-2xl font-extrabold">{formatNumber(result.points)}</dd>
        </div>
      </dl>
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
      <span className="flex justify-between text-sm">
        <span className="font-semibold">{label}</span>
        <span className="text-muted">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={current}
        onChange={(e) => onChange(Math.round(e.target.valueAsNumber * 10) / 10)}
        className="accent-pine"
      />
    </label>
  );
}
