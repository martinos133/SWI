import type { ReactNode } from "react";
import { signOut } from "@/app/login/actions";
import type { CurrentUser } from "@/lib/auth";
import { NAV, ROLE_HOME, ROLE_LABEL } from "@/lib/roles";
import { BrandBar } from "./brand-bar";
import { NavLinks } from "./nav-links";

export function AppShell({ user, children }: { user: CurrentUser; children: ReactNode }) {
  const initials = user.name
    .replace(/^(prof|doc|Ing|Mgr|PhDr)\.\s*/i, "")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#obsah"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-field focus:border focus:border-line-strong focus:bg-surface focus:px-3 focus:py-2 focus:font-semibold"
      >
        Preskočiť na obsah
      </a>
      <header>
        <BrandBar href={ROLE_HOME[user.role]}>
          <div className="hidden text-right leading-tight sm:block">
            <p className="text-sm font-semibold">{user.name}</p>
            <p className="text-xs text-white/75">{ROLE_LABEL[user.role]}</p>
          </div>
          <span
            title={`${user.name}, ${ROLE_LABEL[user.role]}`}
            className="grid size-8 place-items-center rounded-full border border-white/30 bg-white/10 text-[0.8125rem] font-semibold sm:hidden"
          >
            <span aria-hidden>{initials}</span>
            <span className="sr-only">
              {user.name}, {ROLE_LABEL[user.role]}
            </span>
          </span>
          <span aria-hidden className="hidden h-8 w-px bg-white/20 sm:block" />
          <form action={signOut}>
            <button
              type="submit"
              className="inline-flex h-8 items-center gap-1.5 rounded-field border border-white/30 px-3 text-sm font-medium text-white transition-colors hover:border-white/60 hover:bg-white/10"
            >
              <svg viewBox="0 0 16 16" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2.75H3.75a1 1 0 0 0-1 1v8.5a1 1 0 0 0 1 1H6M10.5 11l3-3-3-3M13.25 8H6.5" />
              </svg>
              Odhlásiť
            </button>
          </form>
        </BrandBar>

        <div className="border-b border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <NavLinks items={NAV[user.role]} />
          </div>
        </div>
      </header>

      <main id="obsah" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
