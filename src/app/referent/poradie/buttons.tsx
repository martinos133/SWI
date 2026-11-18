"use client";

import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { calculate, confirm } from "./actions";

export function CalculateButton({ disabled }: { disabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
      <Button
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
        <Alert tone="bad" role="alert" className="max-w-sm">
          {error}
        </Alert>
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
      <Button onClick={() => setAsking(true)}>
        Potvrdiť pridelenie
      </Button>
    );
  }
  return (
    <div className="flex w-full max-w-sm flex-col gap-3 rounded-panel border border-line-strong bg-surface p-4">
      <p className="text-sm">
        Pridelíte <strong className="font-semibold">{count}</strong> miest. Študentom odíde e-mail s výsledkom a body uvidia v
        aplikácii. Potvrdené pridelenie sa už nedá vrátiť týmto výpočtom.
      </p>
      <div className="flex flex-wrap gap-2">
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
        <Alert tone="bad" role="alert">
          {error}
        </Alert>
      ) : null}
    </div>
  );
}
