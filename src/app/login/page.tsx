import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/logo";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { minutesLabel, OTP_LOCK_MINUTES } from "@/lib/otp-lockout";
import { getActivePeriod } from "@/lib/period";
import { ROLE_HOME } from "@/lib/roles";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Prihlásenie" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const session = await getSession();
  if (session?.verified) redirect(ROLE_HOME[session.user.role]);

  const { dovod } = await searchParams;
  const period = await getActivePeriod();
  const now = new Date();

  const milestones = period
    ? [
        {
          label: "Podávanie žiadostí",
          when: `${formatDate(period.submitFrom)} – ${formatDate(period.submitTo)}`,
          current: now >= period.submitFrom && now <= period.submitTo,
        },
        {
          label: "Overenie dokladov a výpočet poradia",
          when: "po uzávierke",
          current: now > period.submitTo && now <= period.appealTo,
        },
        {
          label: "Odvolania",
          when: `do ${formatDate(period.appealTo)}`,
          current: false,
        },
      ]
    : [];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center px-4 py-3 sm:px-6">
          <Wordmark />
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-5xl flex-1 content-start gap-8 px-4 py-8 sm:px-6 sm:py-14 lg:grid-cols-[1fr_24rem] lg:gap-12">
        <div className="lg:order-last">
          <div className="rounded-panel border border-line bg-surface p-6 sm:p-7">
            <h2 className="text-xl font-semibold">Prihlásenie</h2>
            <p className="mt-1.5 text-[0.9375rem] text-muted">
              Prihláste sa univerzitným kontom. Potom potvrdíte totožnosť kódom z aplikácie
              Authenticator.
            </p>

            {dovod === "pokusy" ? (
              <Alert tone="bad" role="alert" className="mt-5">
                Kód ste zadali nesprávne priveľakrát. Konto je na {minutesLabel(OTP_LOCK_MINUTES)}{" "}
                zablokované.
              </Alert>
            ) : null}

            <ButtonLink href="/sso" size="lg" className="mt-6 w-full">
              Prihlásiť sa univerzitným kontom
            </ButtonLink>

            <p className="mt-6 border-t border-line pt-5 text-sm text-muted">
              Systém nemá vlastné heslá. S prístupom vám pomôže IT oddelenie, s otázkami
              k ubytovaniu{" "}
              <a
                className="font-medium text-pine underline underline-offset-4"
                href="mailto:ubytovanie@uniba.example"
              >
                ubytovacie oddelenie
              </a>
              .
            </p>
          </div>
        </div>

        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-muted">
            Akademický rok {period?.academicYear ?? "–"}
          </p>
          <h1 className="mt-1 text-2xl leading-tight font-semibold sm:text-[2rem]">
            Ubytovanie v&nbsp;študentských domovoch
          </h1>
          <p className="mt-3 text-ink-soft">
            Žiadosť o miesto na internáte podáte online, stav a chýbajúce doklady vidíte priebežne.
            Poradie počíta systém podľa kritérií, ktoré schválila ubytovacia komisia.
          </p>

          {milestones.length > 0 ? (
            <section className="mt-8" aria-labelledby="harmonogram">
              <h2 id="harmonogram" className="text-base font-semibold">
                Harmonogram
              </h2>
              <ol className="mt-3 divide-y divide-line rounded-panel border border-line bg-surface">
                {milestones.map((m, i) => (
                  <li key={m.label} className="flex items-start gap-4 px-4 py-3.5">
                    <span
                      className={
                        m.current
                          ? "grid size-6 shrink-0 place-items-center rounded-full bg-pine text-xs font-semibold text-white"
                          : "grid size-6 shrink-0 place-items-center rounded-full border border-line-strong text-xs font-semibold text-ink-soft"
                      }
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{m.label}</p>
                      <p className="text-sm text-muted">{m.when}</p>
                    </div>
                    {m.current ? <Badge tone="ok">Prebieha</Badge> : null}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>
      </main>

      <footer className="border-t border-line bg-surface">
        <p className="mx-auto max-w-5xl px-4 py-4 text-sm text-muted sm:px-6">
          Ubytovacie oddelenie univerzity
        </p>
      </footer>
    </div>
  );
}
