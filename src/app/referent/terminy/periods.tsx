"use client";

import { useActionState, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { activatePeriod, createPeriod, type DeadlinesState } from "./actions";

type PeriodRow = {
  id: string;
  academicYear: string;
  range: string;
  isActive: boolean;
  applications: number;
};

type Defaults = {
  academicYear: string;
  submitFrom: string;
  submitTo: string;
  editTo: string;
  appealTo: string;
};

export function Periods({ periods, defaults }: { periods: PeriodRow[]; defaults: Defaults }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<DeadlinesState, FormData>(
    async (prev, formData) => {
      const result = await createPeriod(prev, formData);
      if (result?.ok) setOpen(false);
      return result;
    },
    undefined,
  );
  const [switching, startTransition] = useTransition();
  const [switchError, setSwitchError] = useState<string | null>(null);

  return (
    <section aria-labelledby="konania" className="mt-14 max-w-2xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id="konania" className="text-lg font-bold">
            Konania
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Študenti a celé ubytovacie oddelenie pracujú s aktívnym konaním.
          </p>
        </div>
        {!open ? (
          <Button variant="secondary" onClick={() => setOpen(true)}>
            Založiť nové konanie
          </Button>
        ) : null}
      </div>

      <ul className="mt-4 divide-y divide-line rounded-panel bg-surface ring-1 ring-line">
        {periods.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 sm:px-6">
            <div>
              <p className="font-semibold">Akademický rok {p.academicYear}</p>
              <p className="text-sm text-muted">
                {p.range}, {p.applications} {p.applications === 1 ? "žiadosť" : p.applications >= 2 && p.applications <= 4 ? "žiadosti" : "žiadostí"}
              </p>
            </div>
            {p.isActive ? (
              <Badge tone="ok">Aktívne</Badge>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                disabled={switching}
                onClick={() =>
                  startTransition(async () => {
                    const result = await activatePeriod(p.id);
                    setSwitchError(result?.error ?? null);
                  })
                }
              >
                Nastaviť ako aktívne
              </Button>
            )}
          </li>
        ))}
      </ul>
      {switchError ? (
        <p role="alert" className="mt-2 text-sm text-bad">
          {switchError}
        </p>
      ) : null}

      {open ? (
        <form action={action} className="mt-6 rounded-panel bg-surface p-5 ring-1 ring-line sm:p-6">
          <h3 className="font-bold">Nové konanie</h3>
          <p className="mt-1 text-sm text-muted">
            Kritériá a váhy prevezmeme z aktuálneho konania. Pred výpočtom poradia ich musí ubytovacia
            komisia znova schváliť.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Akademický rok" htmlFor="academicYear" className="sm:col-span-2 sm:max-w-48">
              <Input id="academicYear" name="academicYear" defaultValue={defaults.academicYear} required />
            </Field>
            <Field label="Začiatok podávania" htmlFor="new-submitFrom">
              <Input id="new-submitFrom" name="submitFrom" type="date" defaultValue={defaults.submitFrom} required />
            </Field>
            <Field label="Koniec podávania" htmlFor="new-submitTo">
              <Input id="new-submitTo" name="submitTo" type="date" defaultValue={defaults.submitTo} required />
            </Field>
            <Field label="Koniec úprav" htmlFor="new-editTo">
              <Input id="new-editTo" name="editTo" type="date" defaultValue={defaults.editTo} required />
            </Field>
            <Field label="Lehota na odvolania" htmlFor="new-appealTo">
              <Input id="new-appealTo" name="appealTo" type="date" defaultValue={defaults.appealTo} required />
            </Field>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Zakladám…" : "Založiť a aktivovať"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Zrušiť
            </Button>
            {state?.error ? (
              <p role="alert" className="text-sm text-bad">
                {state.error}
              </p>
            ) : null}
          </div>
        </form>
      ) : null}
    </section>
  );
}
