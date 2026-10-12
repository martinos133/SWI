"use client";

import { useActionState } from "react";
import { ssoSignIn, type FormState } from "@/app/login/actions";
import { Field, Input } from "@/components/ui/field";
import { ROLE_LABEL } from "@/lib/roles";
import type { Role } from "@/generated/prisma/enums";

type DemoAccount = { login: string; name: string; role: Role; note?: string };

export function SsoForm({ demo }: { demo: DemoAccount[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(ssoSignIn, undefined);

  return (
    <>
      <form action={action} className="flex flex-col gap-4">
        <Field label="Používateľské meno" htmlFor="login" error={state?.error}>
          <Input
            id="login"
            name="login"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={Boolean(state?.error)}
            aria-describedby={state?.error ? "login-error" : undefined}
            required
          />
        </Field>
        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-md bg-[#26324a] font-semibold text-white transition-colors hover:bg-[#1b2438] disabled:opacity-60"
        >
          {pending ? "Prihlasujem…" : "Prihlásiť"}
        </button>
      </form>

      <div className="mt-8 border-t border-line pt-6">
        <h2 className="text-sm font-semibold">Demo účty</h2>
        <p className="mt-1 text-sm text-muted">
          V simulácii sa netreba prihlasovať heslom, stačí vybrať konto.
        </p>
        <form action={action}>
          <ul className="mt-3 divide-y divide-line rounded-field ring-1 ring-line">
            {demo.map((account) => (
              <li key={account.login}>
                <button
                  type="submit"
                  name="login"
                  value={account.login}
                  disabled={pending}
                  className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-sunken disabled:opacity-60"
                >
                  <span>
                    <span className="block text-[0.9375rem] font-semibold">{account.name}</span>
                    <span className="block text-sm text-muted">
                      {account.note ?? ROLE_LABEL[account.role]}
                    </span>
                  </span>
                  <span className="text-sm text-muted">{account.login}</span>
                </button>
              </li>
            ))}
          </ul>
        </form>
      </div>
    </>
  );
}
