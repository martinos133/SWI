# Dizajnový systém

Aplikácia je pracovný nástroj úradu a študentov, nie marketingová stránka. Vzhľad má byť
vecný, čitateľný a konzistentný: neutrálny podklad, jedna značková farba, stavové farby iba
na stav, žiadne dekorácie bez informačnej hodnoty.

Tokeny sú v [src/app/globals.css](../src/app/globals.css) (`@theme`), komponenty
v [src/components/ui](../src/components/ui).

## Základ

| Oblasť | Pravidlo |
| --- | --- |
| Písmo | IBM Plex Sans (400/500/600/700), čísla a kódy IBM Plex Mono. Základ 15 px, riadkovanie 1,5. |
| Nadpisy | `h1` 24–28 px semibold (`PageHeader`), `h2` v paneli 16 px semibold, `h3` 15 px semibold. Nikdy `font-extrabold`, žiadne obrie titulky. |
| Farby | Plochy `paper` (podklad stránky), `surface` (panely), `sunken` (hlavičky tabuliek, neaktívne plochy), `hover`. Text `ink`, `ink-soft`, `muted`. Čiary `line`, `line-strong` (rámy polí), `line-hover`. |
| Značka | `pine` – primárne tlačidlá, odkazy, aktívne záložky, fokus, zaškrtnuté voľby. `pine-tint` pre zvýraznenú voľbu. |
| Akcent | `brass` iba v logu. Nepoužívať na tlačidlá, štítky ani pozadia. |
| Stavy | `ok`, `wait`, `bad`, `info` – každý má `-tint` (podklad) a `-line` (rám). Len pre stav, nie pre dekoráciu. |
| Rohy | `rounded-field` 4 px (polia, tlačidlá, štítky), `rounded-panel` 6 px (panely, tabuľky, upozornenia). `rounded-full` iba avatar a číslované kroky. |
| Tiene | Žiadne. Panely sa oddeľujú rámom `border border-line`. `shadow-overlay` iba pre plávajúce vrstvy. |
| Pohyb | Iba `transition-colors` 120 ms. Žiadne animácie, gradienty, rozmazanie pozadia. |
| Rozostupy | Medzi panelmi `gap-6`, vnútri panelu `p-5`, medzi poliami formulára `gap-5`, medzi popisom a poľom 6 px (`Field`). |

## Formulárové prvky

Všetky polia majú výšku 40 px (malé 32 px), rám 1 px `line-strong`, pri hoveri tmavší,
pri fokuse `pine` rám + 3 px prstenec, pri chybe `bad` rám. Nepoužívať `ring-*` triedy
ani vlastné štýly polí – iba komponenty alebo triedy `.control`, `.check`, `.radio`, `.choice`.

| Potreba | Komponent |
| --- | --- |
| Textové pole, číslo, dátum, súbor | `<Input>` (`size="sm"` pre kompaktné tabuľky) |
| Výber z možností | `<Select>` |
| Dlhší text | `<Textarea>` |
| Popis + nápoveda + chyba | `<Field label hint error htmlFor required optional>`; na poli `aria-invalid` a `aria-describedby={describedBy(id, {hint, error})}` |
| Skupina volieb | `<Fieldset legend hint error>` |
| Zaškrtávacie políčko / prepínač s textom | `<CheckField label description type="checkbox"\|"radio">` |
| Holé políčko (napr. v tabuľke) | `<Checkbox>` / `<Radio>` |
| Dôležitá voľba ako karta | `<ChoiceCard label description aside>` |

Chyba poľa sa zobrazí pod ním s ikonou a `role="alert"`. Povinné polia označuje hviezdička
(`required` na `Field`), nepovinné text „(nepovinné)“ – v jednom formulári používať len jedno z toho.

## Tlačidlá

`<Button>` / `<ButtonLink>` / `buttonClass()`. Výšky `sm` 32, `md` 40, `lg` 44 px.

- `primary` – jedna hlavná akcia na obrazovku alebo formulár.
- `secondary` – ostatné akcie (biele s rámom).
- `ghost` – málo dôležité akcie v hlavičkách a riadkoch.
- `danger` – nevratné akcie (zamietnuť, zrušiť).
- `link` – akcia v texte.

Text tlačidla je sloveso („Uložiť“, „Podať žiadosť“). Počas odosielania sa tlačidlo zablokuje
a text sa zmení („Ukladám…“).

## Obsah

| Potreba | Komponent |
| --- | --- |
| Hlavička stránky | `<PageHeader title description meta actions>` – oddelená linkou |
| Panel s nadpisom | `<Section title description actions flush>` (`flush` pre tabuľky a zoznamy po okraj) |
| Panel bez nadpisu | `<Card>` |
| Prázdny stav | `<EmptyState title action>` |
| Údaje popis – hodnota | `<DataList items columns>` |
| Upozornenie | `<Alert tone title action role>` – ľavý farebný pruh, ikona |
| Stav | `<Badge tone>` – obdĺžnik s rámom, bez bodky |
| Tabuľka | `<Table> <THead> <TBody> <TR interactive> <TH align> <TD align>`; odkaz na detail v prvej bunke s `rowLinkClass` |
| Filter / záložky | `<Tabs label items>` – podčiarknutie, počet v sivom štítku. Žiadne „pilulky“. |

## Čo nepoužívať

- Pilulkové filtre a štítky (`rounded-full` mimo avatara), bodky v štítkoch.
- Gradienty, tiene na kartách, `backdrop-blur`, dekoratívne SVG, animácie.
- Obrie titulky (`text-4xl` a väčšie), `font-extrabold`, veľké „hero“ čísla.
- `brass` mimo loga.
- Ručne štýlované `<input>`, `<select>`, `<textarea>` s `ring-*`.
