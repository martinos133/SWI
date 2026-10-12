"use client";

import { useActionState } from "react";
import { verifySecondFactor, type FormState } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

export function OtpForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    verifySecondFactor,
    undefined,
  );

  return (
    <form action={action} className="mt-8 flex flex-col gap-4">
      <label htmlFor="code" className="text-sm font-semibold">
        Overovací kód
      </label>
      <input
        id="code"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9 ]{6,7}"
        maxLength={7}
        placeholder="000 000"
        autoFocus
        required
        aria-invalid={Boolean(state?.error)}
        aria-describedby={state?.error ? "code-error" : undefined}
        className="-mt-2 h-16 w-full rounded-field bg-surface text-center text-3xl font-bold tracking-[0.35em] ring-1 ring-inset ring-line-strong placeholder:text-line-strong focus:outline-none focus:ring-2 focus:ring-pine aria-[invalid=true]:ring-bad"
      />
      {state?.error ? (
        <p id="code-error" role="alert" className="-mt-1 text-sm text-bad">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Overujem…" : "Overiť a pokračovať"}
      </Button>
    </form>
  );
}
