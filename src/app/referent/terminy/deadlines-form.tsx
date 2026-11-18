"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { describedBy } from "@/components/ui/field";
import { saveDeadlines, type DeadlinesState } from "./actions";

type Values = { submitFrom: string; submitTo: string; editTo: string; appealTo: string };

const ROWS: { name: keyof Values; label: string; hint: string }[] = [
  { name: "submitFrom", label: "Začiatok podávania", hint: "Od tohto dňa môžu študenti zakladať a podávať žiadosti." },
  { name: "submitTo", label: "Koniec podávania", hint: "Posledný deň, keď sa dá žiadosť podať." },
  { name: "editTo", label: "Koniec úprav", hint: "Dovtedy môžu študenti meniť podanú žiadosť alebo ju zrušiť." },
  { name: "appealTo", label: "Lehota na odvolania", hint: "Posledný deň na odvolanie proti rozhodnutiu o pridelení." },
];

export function DeadlinesForm({ periodId, initial }: { periodId: string; initial: Values }) {
  const [state, action, pending] = useActionState<DeadlinesState, FormData>(saveDeadlines, undefined);

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="periodId" value={periodId} />
      <ol className="divide-y divide-line rounded-panel border border-line bg-surface">
        {ROWS.map((row, i) => (
          <li key={row.name} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_11rem] sm:items-center">
            <div className="flex gap-3.5">
              <span
                aria-hidden
                className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-line-strong text-xs font-semibold text-ink-soft tabular-nums"
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <label htmlFor={row.name} className="font-semibold text-ink">
                  {row.label}
                </label>
                <p id={`${row.name}-hint`} className="text-sm text-muted">
                  {row.hint}
                </p>
              </div>
            </div>
            <DateInput
              id={row.name}
              name={row.name}
              defaultValue={initial[row.name]}
              required
              aria-describedby={describedBy(row.name, { hint: row.hint })}
            />
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Ukladám…" : "Uložiť termíny"}
        </Button>
        <p aria-live="polite" className={state?.error ? "text-sm font-medium text-bad" : "text-sm font-medium text-ok"}>
          {state?.error ?? (state?.ok ? "Termíny sú uložené." : "")}
        </p>
      </div>
    </form>
  );
}
