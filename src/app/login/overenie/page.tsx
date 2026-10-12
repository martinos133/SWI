import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { generate } from "otplib";
import { Wordmark } from "@/components/logo";
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
    <div className="flex min-h-dvh flex-col px-6 py-8 sm:px-10">
      <Wordmark />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
        <h1 className="text-2xl font-bold">Overenie totožnosti</h1>
        <p className="mt-2 text-muted">
          Otvorte aplikáciu Authenticator a zadajte kód pre konto{" "}
          <strong className="font-semibold text-ink">{session.user.login}</strong>.
        </p>

        <OtpForm />

        <form action={signOut} className="mt-6">
          <button type="submit" className="text-sm font-medium text-muted underline underline-offset-2 hover:text-ink">
            Prihlásiť sa iným kontom
          </button>
        </form>

        {demoCode ? (
          <aside className="mt-12 rounded-panel bg-sunken p-4">
            <p className="text-sm font-semibold">Ukážkový režim</p>
            <p className="mt-0.5 text-sm text-muted">
              Takto by kód ukázala aplikácia v mobile. Platí približne 30 sekúnd.
            </p>
            <p className="mt-3 text-2xl font-bold tracking-[0.2em]">
              {demoCode.slice(0, 3)} {demoCode.slice(3)}
            </p>
          </aside>
        ) : null}
      </main>
    </div>
  );
}
