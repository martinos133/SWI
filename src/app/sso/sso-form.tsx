"use client";

import { useActionState } from "react";
import { ssoSignIn, type FormState } from "@/app/login/actions";
import { describedBy, Field, Input } from "@/components/ui/field";
import { ROLE_LABEL } from "@/lib/roles";
import type { Role } from "@/generated/prisma/enums";

type DemoAccount = { login: string; name: string; role: Role; note?: string };

export function SsoForm({ demo }: { demo: DemoAccount[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(ssoSignIn, undefined);

  return (
    <>
      <form action={action} className="flex flex-col gap-5">
        <Field label="Používateľské meno" htmlFor="login" error={state?.error}>
          <Input
            id="login"
            name="login"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={Boolean(state?.error)}
            aria-describedby={describedBy("login", { error: state?.error })}
            required
          />
        </Field>
        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-[0.3125rem] border border-[#26324a] bg-[#26324a] font-semibold text-white transition-colors hover:border-[#1b2438] hover:bg-[#1b2438] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#26324a] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Prihlasujem…" : "Prihlásiť"}
        </button>
      </form>

      <div className="mt-8 border-t border-[#d5d9e0] pt-6">
        <h2 className="text-sm font-semibold text-[#26324a]">Demo účty</h2>
        <p className="mt-1 text-sm text-[#5b6377]">
          V simulácii sa netreba prihlasovať heslom, stačí vybrať konto.
        </p>
        <form action={action}>
          <ul className="mt-3 divide-y divide-[#d5d9e0] overflow-hidden rounded-[0.3125rem] border border-[#d5d9e0]">
            {demo.map((account) => (
              <li key={account.login}>
                <button
                  type="submit"
                  name="login"
                  value={account.login}
                  disabled={pending}
                  className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-[#f2f4f7] focus-visible:-outline-offset-2 focus-visible:outline-[#26324a] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="min-w-0">
                    <span className="block text-[0.9375rem] font-semibold text-[#1f2737]">{account.name}</span>
                    <span className="block text-sm text-[#5b6377]">
                      {account.note ?? ROLE_LABEL[account.role]}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-sm text-[#5b6377]">{account.login}</span>
                </button>
              </li>
            ))}
          </ul>
        </form>
      </div>
    </>
  );
}
