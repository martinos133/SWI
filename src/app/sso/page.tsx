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
    where: { login: { in: ["kollar", "novakova", "kovacova", "horvath", "balaz"] } },
    select: { login: true, name: true, role: true },
  });
  const order = ["novakova", "kollar", "kovacova", "horvath", "balaz"];
  const notes: Record<string, string> = {
    novakova: "Študentka – ešte nemá žiadosť",
    kollar: "Študent – žiadosť čaká na doplnenie",
  };
  const demo = accounts
    .sort((a, b) => order.indexOf(a.login) - order.indexOf(b.login))
    .map((a) => ({ ...a, note: notes[a.login] }));

  return (
    <div className="flex min-h-dvh flex-col bg-[#e9ebef]">
      <header className="border-b border-[#d5d9e0] bg-white">
        <div className="mx-auto flex max-w-md items-center gap-3 px-6 py-4">
          <span className="grid size-8 place-items-center rounded-md bg-[#26324a] text-sm font-bold text-white">
            U
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-[#26324a]">Centrálne prihlásenie univerzity</p>
            <p className="text-xs text-[#6b7385]">Simulácia pre vývoj a ukážky</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-6 py-10">
        <div className="rounded-xl bg-white p-6 shadow-[0_1px_2px_rgba(38,50,74,0.08)] ring-1 ring-[#d5d9e0] sm:p-8">
          <h1 className="text-xl font-bold text-[#26324a]">Prihlásenie do služby Ubytovanie</h1>
          <p className="mt-1 mb-6 text-sm text-[#6b7385]">
            Použite rovnaké meno ako do akademického informačného systému.
          </p>
          <SsoForm demo={demo} />
        </div>
        <p className="mt-6 text-center text-sm">
          <Link href="/login" className="text-[#4a5670] underline underline-offset-2">
            Späť do aplikácie Ubytovanie
          </Link>
        </p>
      </main>
    </div>
  );
}
