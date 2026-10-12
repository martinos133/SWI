import { KeyTag } from "@/components/key-tag";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { PageHeader, Section } from "@/components/ui/page-header";

// Dočasná ukážka dizajn systému – v ďalšej fáze ju nahradí presmerovanie na prihlásenie.
export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <PageHeader
        title="Ubytovanie 2026/27"
        description="Ukážka dizajn systému: kľúčenka, tlačidlá a formulárové polia."
        actions={<Button>Podať žiadosť</Button>}
      />
      <div className="grid gap-10 md:grid-cols-[1fr_16rem]">
        <Section title="Osobné údaje" description="Prevzaté z akademického informačného systému.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Študijný program" htmlFor="program">
              <Input id="program" defaultValue="Aplikovaná informatika" disabled />
            </Field>
            <Field label="Telefón" htmlFor="phone" hint="Len pre prípad, že nás e-mail nezastihne.">
              <Input id="phone" placeholder="+421 900 000 000" />
            </Field>
          </div>
          <div className="mt-6 flex gap-2">
            <Button>Uložiť</Button>
            <Button variant="secondary">Zrušiť</Button>
            <Button variant="ghost">Späť</Button>
          </div>
        </Section>
        <div className="flex flex-col gap-16 pt-8">
          <KeyTag overline="Pridelené" title="Internát Mladosť" figure="C-214" detail="Dvojlôžková izba" />
          <KeyTag blank overline="Zatiaľ bez kľúča" title="Žiadosť sa posudzuje" figure="—" />
        </div>
      </div>
    </main>
  );
}
