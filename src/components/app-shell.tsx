import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/login/actions";
import type { CurrentUser } from "@/lib/auth";
import { NAV, ROLE_HOME, ROLE_LABEL } from "@/lib/roles";
import { Wordmark } from "./logo";
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
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-field focus:bg-surface focus:px-3 focus:py-2"
      >
        Preskočiť na obsah
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 px-4 sm:px-6">
          <Link href={ROLE_HOME[user.role]} className="py-3.5" aria-label="Ubytovanie – domov">
            <Wordmark />
          </Link>

          <div className="order-last -mx-4 w-[calc(100%+2rem)] border-t border-line px-3 sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-5 lg:order-none lg:mx-0 lg:w-auto lg:flex-1 lg:border-0 lg:px-0">
            <NavLinks items={NAV[user.role]} />
          </div>

          <div className="ml-auto flex items-center gap-3 py-2.5">
            <div className="hidden text-right leading-tight xl:block">
              <p className="text-sm font-semibold">{user.name}</p>
              <p className="text-xs text-muted">{ROLE_LABEL[user.role]}</p>
            </div>
            <span
              title={`${user.name}, ${ROLE_LABEL[user.role]}`}
              className="grid size-9 place-items-center rounded-full bg-pine-tint text-sm font-bold text-pine"
            >
              <span aria-hidden>{initials}</span>
              <span className="sr-only xl:hidden">
                {user.name}, {ROLE_LABEL[user.role]}
              </span>
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-field px-2.5 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-sunken hover:text-ink"
              >
                Odhlásiť
              </button>
            </form>
          </div>
        </div>
      </header>

      <main id="obsah" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>
    </div>
  );
}
