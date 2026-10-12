"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { calculate, confirm } from "./actions";

export function CalculateButton({ disabled }: { disabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
      <Button
        size="lg"
        disabled={disabled || pending}
        onClick={() =>
          startTransition(async () => {
            const result = await calculate();
            if (result && !result.ok) setError(result.error);
          })
        }
      >
        {pending ? "Počítam poradie…" : "Vypočítať poradie"}
      </Button>
      {error ? (
        <p role="alert" className="max-w-xs text-sm text-bad sm:text-right">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function ConfirmButton({ runId, count }: { runId: string; count: number }) {
  const [pending, startTransition] = useTransition();
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!asking) {
    return (
      <Button size="lg" onClick={() => setAsking(true)}>
        Potvrdiť pridelenie
      </Button>
    );
  }
  return (
    <div className="flex max-w-sm flex-col gap-3 rounded-panel bg-surface p-4 ring-1 ring-line">
      <p className="text-sm">
        Pridelíte <strong>{count}</strong> miest. Študentom odíde e-mail s výsledkom a body uvidia v
        aplikácii. Potvrdené pridelenie sa už nedá vrátiť týmto výpočtom.
      </p>
      <div className="flex gap-2">
        <Button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await confirm(runId);
              if (!result.ok) setError(result.error);
              else setAsking(false);
            })
          }
        >
          {pending ? "Prideľujem…" : `Prideliť ${count} miest`}
        </Button>
        <Button variant="ghost" onClick={() => setAsking(false)} disabled={pending}>
          Späť
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      ) : null}
    </div>
  );
}
