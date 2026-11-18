"use client";

import { useActionState, useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Section } from "@/components/ui/page-header";
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
    <Section
      title="Konania"
      description="Študenti a celé ubytovacie oddelenie pracujú s aktívnym konaním."
      actions={
        !open ? (
          <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
            Založiť nové konanie
          </Button>
        ) : undefined
      }
      flush
    >
      <ul className="divide-y divide-line">
        {periods.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
            <div className="min-w-0">
              <p className="font-semibold text-ink">Akademický rok {p.academicYear}</p>
              <p className="text-sm text-muted">
                {p.range}, {p.applications} {p.applications === 1 ? "žiadosť" : p.applications >= 2 && p.applications <= 4 ? "žiadosti" : "žiadostí"}
              </p>
            </div>
            {p.isActive ? (
              <Badge tone="ok">Aktívne</Badge>
            ) : (
              <Button
                variant="secondary"
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
        <div className="border-t border-line px-5 py-4">
          <Alert tone="bad" role="alert">
            {switchError}
          </Alert>
        </div>
      ) : null}

      {open ? (
        <form action={action} className="border-t border-line px-5 py-5">
          <h3 className="text-[0.9375rem] leading-6 font-semibold">Nové konanie</h3>
          <p className="mt-0.5 text-sm text-muted">
            Kritériá a váhy prevezmeme z aktuálneho konania. Pred výpočtom poradia ich musí ubytovacia
            komisia znova schváliť.
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
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
          {state?.error ? (
            <Alert tone="bad" role="alert" className="mt-5">
              {state.error}
            </Alert>
          ) : null}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Zakladám…" : "Založiť a aktivovať"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Zrušiť
            </Button>
          </div>
        </form>
      ) : null}
    </Section>
  );
}
