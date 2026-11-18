# Nasadenie

Produkcia beží na VPS (Eternyx, Ubuntu 26.04, 2 GB RAM):

- **https://swi.becode.sk** – po nasmerovaní DNS záznamu A `swi` na `5.22.158.143` (Cloudflare, *DNS only*)
- **https://5-22-158-143.sslip.io** – funguje hneď, bez úpravy DNS

Aplikácia beží ako služba `ubytovanie` (Next.js na 127.0.0.1:3000), pred ňou je Caddy
s automatickým HTTPS (Let's Encrypt). Databáza aj šifrované doklady sú v SQLite
`/var/lib/ubytovanie/app.db`, tajné kľúče v `/opt/ubytovanie/.env`.

## Nasadenie novej verzie

Z koreňa repozitára (vyžaduje SSH kľúč pridaný na serveri):

```bash
./deploy/deploy.sh
```

Skript skopíruje zdrojové súbory cez `rsync`, na serveri spustí `npm ci`, migrácie, build a reštart.
`./deploy/deploy.sh --seed` navyše **prepíše databázu** ukážkovými dátami (napr. pred prezentáciou).

## Príprava nového servera

```bash
ssh root@IP 'bash -s' < deploy/server-setup.sh
```

Nainštaluje Node.js 24, Caddy, 2 GB swap, firewall (SSH, 80, 443), systemd službu,
vygeneruje tajné kľúče a nastaví denné úlohy: mazanie dokladov po uplynutí doby
uchovávania (03:00) a zálohu databázy do `/var/backups/ubytovanie` (14 dní).

## Užitočné príkazy na serveri

```bash
systemctl status ubytovanie        # stav aplikácie
journalctl -u ubytovanie -f        # logy aplikácie
journalctl -u caddy -f             # logy webového servera a certifikátov
ls /var/backups/ubytovanie         # zálohy databázy
```

---

## Alternatíva: Vercel + Turso

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
