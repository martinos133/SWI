# Nasadenie (Vercel + Turso)

Aplikácia nepotrebuje disk – databáza aj šifrované doklady sú v libSQL, takže beží na
serverless hostingu. Kroky, ktoré vyžadujú prihlásenie do tvojich účtov:

## 1. Databáza Turso

```bash
brew install tursodatabase/tap/turso
turso auth login
turso db create ubytovanie
turso db show ubytovanie --url          # libsql://ubytovanie-<user>.turso.io
turso db tokens create ubytovanie       # DATABASE_AUTH_TOKEN
```

Vytvorenie tabuliek a ukážkových dát (z tohto repozitára):

```bash
DATABASE_URL="libsql://…" DATABASE_AUTH_TOKEN="…" npm run db:deploy
DATABASE_URL="libsql://…" DATABASE_AUTH_TOKEN="…" APP_SECRET="…" npm run db:seed
```

`APP_SECRET` pri seede musí byť rovnaký ako na Verceli, inak sa ukážkové doklady nedajú dešifrovať.

## 2. Vercel

1. Na <https://vercel.com/new> importuj repozitár `martinos133/SWI` (framework Next.js sa rozpozná sám).
2. V *Environment Variables* nastav:

| Premenná | Hodnota |
|---|---|
| `DATABASE_URL` | `libsql://…` z Turso |
| `DATABASE_AUTH_TOKEN` | token z Turso |
| `APP_SECRET` | `openssl rand -base64 36` |
| `CRON_SECRET` | `openssl rand -hex 24` |
| `APP_URL` | `https://<projekt>.vercel.app` |

3. Deploy. Denný cron na mazanie dokladov po uplynutí doby uchovávania je v `vercel.json`.

Pri ďalších zmenách schémy stačí po pushnutí spustiť `npm run db:deploy` proti Turso.

## Kontrola po nasadení

- `/login` ukáže termíny konania z databázy,
- prihlásenie `novakova` cez *Prihlásiť sa univerzitným kontom* → 2FA → prehľad študenta,
- `/doklad/<id>` bez prihlásenia presmeruje na prihlásenie.
