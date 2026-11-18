"use client";

import { useActionState } from "react";
import { verifySecondFactor, type FormState } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { describedBy, Field, Input } from "@/components/ui/field";

export function OtpForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    verifySecondFactor,
    undefined,
  );

  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <Field label="Overovací kód" htmlFor="code" error={state?.error} hint="Šesť číslic">
        <Input
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
          aria-describedby={describedBy("code", { hint: true, error: state?.error })}
          className="h-12 text-center font-mono text-2xl tracking-[0.3em]"
        />
      </Field>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Overujem…" : "Overiť a pokračovať"}
      </Button>
    </form>
  );
}
