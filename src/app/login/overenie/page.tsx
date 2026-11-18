import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { generate } from "otplib";
import { Wordmark } from "@/components/logo";
import { buttonClass } from "@/components/ui/button";
import { ROLE_HOME } from "@/lib/roles";
import { getSession } from "@/lib/session";
import { signOut } from "../actions";
import { OtpForm } from "./otp-form";

export const metadata: Metadata = { title: "Overenie totožnosti" };

export default async function SecondFactorPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.verified) redirect(ROLE_HOME[session.user.role]);

  // V ukážkovom režime zobrazíme kód, ktorý by inak ukázala aplikácia v mobile.
  const demoCode =
    process.env.DEMO_MODE === "off"
      ? null
      : await generate({ secret: session.user.totpSecret });

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center px-4 py-3 sm:px-6">
          <Wordmark />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-8 sm:py-14">
        <div className="rounded-panel border border-line bg-surface p-6 sm:p-7">
          <h1 className="text-xl font-semibold">Overenie totožnosti</h1>
          <p className="mt-1.5 text-[0.9375rem] text-muted">
            Otvorte aplikáciu Authenticator a zadajte kód pre konto{" "}
            <strong className="font-semibold text-ink">{session.user.login}</strong>.
          </p>

          <OtpForm />

          <form action={signOut} className="mt-5 border-t border-line pt-4">
            <button type="submit" className={buttonClass({ variant: "link", size: "sm" })}>
              Prihlásiť sa iným kontom
            </button>
          </form>
        </div>

        {demoCode ? (
          <aside className="mt-4 rounded-panel border border-dashed border-line-strong bg-surface p-4">
            <p className="text-sm font-semibold">Ukážkový režim</p>
            <p className="mt-0.5 text-sm text-muted">
              Takto by kód ukázala aplikácia v mobile. Platí približne 30 sekúnd.
            </p>
            <p className="mt-2 font-mono text-xl font-medium tracking-[0.2em]">
              {demoCode.slice(0, 3)} {demoCode.slice(3)}
            </p>
          </aside>
        ) : null}
      </main>
    </div>
  );
}
