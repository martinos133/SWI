import { KeyTag } from "@/components/key-tag";
import { Wordmark } from "@/components/logo";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col px-6 py-8 sm:px-10">
      <Wordmark />
      <main className="mx-auto grid w-full max-w-4xl flex-1 items-center gap-12 py-16 md:grid-cols-[1fr_15rem]">
        <div>
          <h1 className="text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">Táto stránka neexistuje</h1>
          <p className="mt-4 max-w-md text-lg text-ink-soft">
            Odkaz je zrejme starý alebo neúplný. Pokračujte na úvodnú stránku, odtiaľ sa dostanete
            ku všetkému, čo potrebujete.
          </p>
          <ButtonLink href="/" size="lg" className="mt-8">
            Prejsť na úvod
          </ButtonLink>
        </div>
        <KeyTag blank overline="Kľúč nesedí" title="Chyba 404" figure="404" />
      </main>
    </div>
  );
}
