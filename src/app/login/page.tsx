import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/logo";
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
    <div className="grid min-h-dvh lg:grid-cols-[1.15fr_1fr]">
      <section className="relative flex flex-col overflow-hidden bg-pine px-6 py-8 text-white sm:px-10 lg:px-14 lg:py-12">
        <Wordmark inverted />

        <div className="mt-10 max-w-xl lg:mt-auto">
          <h1 className="text-[2.25rem] leading-[1.02] font-extrabold tracking-[-0.035em] sm:text-display">
            Miesto na internáte na akademický rok {period?.academicYear ?? ""}
          </h1>
          <p className="mt-5 hidden max-w-md text-lg leading-relaxed text-white/70 sm:block">
            Žiadosť podáte online, stav a chýbajúce doklady vidíte priebežne.
            Poradie počíta systém podľa kritérií, ktoré schválila ubytovacia
            komisia.
          </p>
        </div>

        {milestones.length > 0 ? (
          <ol className="mt-12 hidden gap-px overflow-hidden rounded-panel bg-white/10 sm:grid sm:grid-cols-3 lg:mt-16">
            {milestones.map((m, i) => (
              <li key={m.label} className="bg-pine p-4 sm:p-5">
                <p className="flex items-center gap-2 text-sm text-white/55">
                  {i + 1}
                  {m.current ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brass px-2 py-0.5 text-xs font-semibold text-pine">
                      prebieha
                    </span>
                  ) : null}
                </p>
                <p className="mt-2 font-semibold">{m.label}</p>
                <p className="mt-1 text-sm text-white/70">{m.when}</p>
              </li>
            ))}
          </ol>
        ) : null}

        {/* Dekoratívny obrys kľúčenky v pravom hornom rohu */}
        <svg
          aria-hidden
          viewBox="0 0 24 30"
          className="pointer-events-none absolute -top-16 -right-20 h-[26rem] w-auto opacity-[0.07]"
        >
          <path
            d="M12 1.5c5.8 0 10.5 4.2 10.5 9.6V24a4.5 4.5 0 0 1-4.5 4.5H6A4.5 4.5 0 0 1 1.5 24V11.1C1.5 5.7 6.2 1.5 12 1.5Z"
            fill="none"
            stroke="#fff"
            strokeWidth="0.35"
          />
          <circle cx="12" cy="8" r="2.4" fill="none" stroke="#fff" strokeWidth="0.35" />
        </svg>
      </section>

      <section className="flex items-center px-6 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <h2 className="text-2xl font-bold">Prihlásenie</h2>
          <p className="mt-2 text-muted">
            Prihláste sa univerzitným kontom. Potom potvrdíte totožnosť kódom
            z aplikácie Authenticator.
          </p>

          {dovod === "pokusy" ? (
            <p role="alert" className="mt-6 rounded-field bg-bad-tint px-4 py-3 text-sm text-bad">
              Kód ste zadali nesprávne priveľakrát. Konto je na {minutesLabel(OTP_LOCK_MINUTES)} zablokované.
            </p>
          ) : null}

          <ButtonLink href="/sso" size="lg" className="mt-8 w-full">
            Prihlásiť sa univerzitným kontom
          </ButtonLink>

          {milestones.length > 0 ? (
            <ol className="mt-10 flex flex-col gap-3 border-t border-line pt-6 sm:hidden">
              {milestones.map((m) => (
                <li key={m.label} className="flex flex-col text-sm">
                  <span className="font-semibold">
                    {m.label}
                    {m.current ? (
                      <span className="ml-2 rounded-full bg-brass px-2 py-0.5 text-xs text-pine">prebieha</span>
                    ) : null}
                  </span>
                  <span className="text-muted">{m.when}</span>
                </li>
              ))}
            </ol>
          ) : null}

          <p className="mt-6 text-sm text-muted">
            Systém nemá vlastné heslá. S prístupom vám pomôže IT oddelenie,
            s otázkami k ubytovaniu{" "}
            <a className="font-medium text-ink underline underline-offset-2" href="mailto:ubytovanie@uniba.example">
              ubytovacie oddelenie
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
