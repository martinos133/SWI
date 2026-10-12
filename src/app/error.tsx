"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60dvh] w-full max-w-xl flex-col justify-center px-6 py-16">
      <h1 className="text-3xl font-bold">Niečo sa pokazilo</h1>
      <p className="mt-3 text-lg text-ink-soft">
        Požiadavku sa nepodarilo dokončiť. Vaše uložené údaje sú v poriadku. Skúste to znova, a ak
        chyba pretrváva, napíšte na{" "}
        <a className="underline" href="mailto:ubytovanie@uniba.example">
          ubytovanie@uniba.example
        </a>
        .
      </p>
      <Button className="mt-8 self-start" onClick={reset}>
        Skúsiť znova
      </Button>
    </main>
  );
}
