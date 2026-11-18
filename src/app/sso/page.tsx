import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { SsoForm } from "./sso-form";

export const metadata: Metadata = { title: "Univerzitné prihlásenie" };

// Demo účty sa čítajú z databázy pri každej požiadavke, nie pri builde.
export const dynamic = "force-dynamic";

/**
 * Simulácia univerzitného poskytovateľa identity (API.02).
 * Zámerne vyzerá ako cudzí systém – v produkcii ho nahradí presmerovanie na SSO.
 */
export default async function SsoPage() {
  const accounts = await db.user.findMany({
    where: { login: { in: ["kollar", "novakova", "muha", "galova", "francisci"] } },
    select: { login: true, name: true, role: true },
  });
  const order = ["muha", "novakova", "kollar", "galova", "francisci"];
  const notes: Record<string, string> = {
    muha: "Referent ubytovacieho oddelenia – administrátor",
    novakova: "Študentka – ešte nemá žiadosť",
    kollar: "Študent – žiadosť čaká na doplnenie",
  };
  const demo = accounts
    .sort((a, b) => order.indexOf(a.login) - order.indexOf(b.login))
    .map((a) => ({ ...a, note: notes[a.login] }));

  return (
    <div className="flex min-h-dvh flex-col bg-[#e9ebef]">
      <header className="border-b border-[#d5d9e0] bg-white">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-4 sm:px-6">
          <span className="grid size-8 place-items-center rounded-md bg-[#26324a] text-sm font-bold text-white">
            U
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-[#26324a]">Centrálne prihlásenie univerzity</p>
            <p className="text-xs text-[#6b7385]">Simulácia pre vývoj a ukážky</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 py-10 sm:px-6">
        <div className="rounded-md border border-[#d5d9e0] bg-white p-6 sm:p-8">
          <h1 className="text-xl font-semibold text-[#26324a]">Prihlásenie do služby Ubytovanie</h1>
          <p className="mt-1 mb-6 text-sm text-[#6b7385]">
            Použite rovnaké meno ako do akademického informačného systému.
          </p>
          <SsoForm demo={demo} />
        </div>
        <p className="mt-6 text-center text-sm">
          <Link
            href="/login"
            className="text-[#3d4963] underline decoration-[#3d4963]/40 underline-offset-4 hover:decoration-[#3d4963] focus-visible:outline-[#26324a]"
          >
            Späť do aplikácie Ubytovanie
          </Link>
        </p>
      </main>
    </div>
  );
}
