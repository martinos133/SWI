import { Wordmark } from "@/components/logo";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line bg-surface px-4 py-3 sm:px-6">
        <Wordmark />
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-16 sm:px-6">
        <p className="text-sm font-semibold text-muted">Chyba 404</p>
        <h1 className="mt-1 text-2xl font-semibold sm:text-[1.75rem]">Táto stránka neexistuje</h1>
        <p className="mt-3 text-ink-soft">
          Odkaz je zrejme starý alebo neúplný. Pokračujte na úvodnú stránku, odtiaľ sa dostanete ku
          všetkému, čo potrebujete.
        </p>
        <ButtonLink href="/" className="mt-6 self-start">
          Prejsť na úvod
        </ButtonLink>
      </main>
    </div>
  );
}
