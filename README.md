# Žiadosť o ubytovanie

Webová aplikácia na podávanie a spracovanie žiadostí o ubytovanie na univerzitných
internátoch. Návrh vychádza z dokumentu *Detailný návrh riešenia – Žiadosť o ubytovanie B*,
plán a stav prác je v [PLAN.md](PLAN.md).

## Spustenie

```bash
npm install
cp .env.example .env      # nastav APP_SECRET (aspoň 32 znakov)
npm run db:migrate        # vytvorí SQLite databázu
npm run db:seed           # naplní ukážkové dáta
npm run dev
```

Aplikácia beží na <http://localhost:3000>. Po zmene Prisma schémy reštartuj `npm run dev`,
inak dev server drží starého Prisma klienta.

## Demo účty

Prihlásenie je simulované univerzitné SSO, heslo netreba. Druhý faktor (6-miestny kód)
sa v ukážkovom režime zobrazí priamo na stránke overenia.

| Konto | Rola | Čo ukázať |
|---|---|---|
| `novakova` | Študentka | Ešte nemá žiadosť – celý postup od vyplnenia po podanie |
| `kollar` | Študent | Žiadosť čaká na doplnenie dokladu |
| `kovacova` | Referentka | Posúdenie dokladov, termíny, výpočet poradia a pridelenie |
| `horvath` | Ubytovacia komisia | Kritériá a váhy, rozhodovanie o odvolaniach |
| `balaz` | Správca internátov | Kapacity internátov a typy izieb |

Prihlásiť sa dá aj ľubovoľným študentom zo seedu, ak do poľa zadáš jeho login (napr. `benko18`).

## Skripty

| Príkaz | Účel |
|---|---|
| `npm run dev` | vývojový server |
| `npm run build` | produkčný build |
| `npm test` | unit testy (výpočet poradia, stavový automat, dátumy) |
| `npm run test:e2e` | E2E testy v Playwright (Google Chrome) vrátane kontroly prístupnosti a mobilu |
| `npm run screenshots` | screenshoty celého konania do `docs/screenshots` |
| `npm run db:deploy` | migrácie na vzdialenú libSQL/Turso databázu |
| `npm run db:seed` | znova naplní databázu ukážkovými dátami |
| `npm run retencia` | zmaže doklady po uplynutí doby uchovávania |

## Štruktúra

```
prisma/              schéma, migrácie, seed
src/app/
  login, sso         prihlásenie (SSO + 2FA)
  student/           prehľad, žiadosť, doklady, odvolanie
  referent/          žiadosti, poradie a pridelenie, termíny
  komisia/           odvolania, kritériá
  spravca/           internáty a kapacity
  audit/             auditný záznam a odoslané e-maily
  doklad/[id]        stiahnutie dešifrovaného dokladu
src/lib/
  ranking.ts         výpočet bodov, poradia a návrh pridelenia (čisté funkcie)
  evaluation.ts      beh výpočtu, overenie zopakovateľnosti, potvrdenie s kontrolou kapacity
  status.ts          stavový automat žiadosti
  applications.ts    zmena stavu s auditom a e-mailom
  storage.ts         šifrované doklady v databáze (AES-256-GCM)
  ais.ts             simulácia akademického IS
```

## Dokumentácia

- [docs/DNR-kapitoly-5-6.md](docs/DNR-kapitoly-5-6.md) – dátový model a prototyp pre dokument DNR
- [docs/screenshots](docs/screenshots) – ER diagram a screenshoty
- [DEPLOY.md](DEPLOY.md) – nasadenie na Vercel a Turso
