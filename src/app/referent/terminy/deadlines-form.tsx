"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
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
    <form action={action} className="max-w-2xl">
      <input type="hidden" name="periodId" value={periodId} />
      <ol className="divide-y divide-line rounded-panel bg-surface ring-1 ring-line">
        {ROWS.map((row, i) => (
          <li key={row.name} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_11rem] sm:items-center sm:px-6">
            <div className="flex gap-4">
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold text-muted ring-1 ring-line-strong">
                {i + 1}
              </span>
              <div>
                <label htmlFor={row.name} className="font-semibold">
                  {row.label}
                </label>
                <p className="text-sm text-muted">{row.hint}</p>
              </div>
            </div>
            <Input id={row.name} name={row.name} type="date" defaultValue={initial[row.name]} required />
          </li>
        ))}
      </ol>
      <div className="mt-5 flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Ukladám…" : "Uložiť termíny"}
        </Button>
        <p aria-live="polite" className={state?.error ? "text-sm text-bad" : "text-sm text-ok"}>
          {state?.error ?? (state?.ok ? "Termíny sú uložené." : "")}
        </p>
      </div>
    </form>
  );
}
