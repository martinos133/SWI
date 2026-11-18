"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60dvh] w-full max-w-xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-semibold text-muted">Chyba</p>
      <h1 className="mt-1 text-2xl font-semibold sm:text-[1.75rem]">Niečo sa pokazilo</h1>
      <p className="mt-3 text-ink-soft">
        Požiadavku sa nepodarilo dokončiť. Vaše uložené údaje sú v poriadku. Skúste to znova, a ak
        chyba pretrváva, napíšte na{" "}
        <a className="font-medium text-pine underline underline-offset-4" href="mailto:ubytovanie@uniba.example">
          ubytovanie@uniba.example
        </a>
        .
      </p>
      <Button className="mt-6 self-start" onClick={reset}>
        Skúsiť znova
      </Button>
    </main>
  );
}
