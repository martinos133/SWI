# Nasadenie

Produkcia beží na **https://swi.becode.sk** – VPS Hetzner (Ubuntu 24.04, 2 GB RAM, `89.167.0.160`),
DNS záznam A `swi` v Cloudflare (*DNS only*).

Na serveri beží Dokploy s Traefikom a ďalšie aplikácie. SWI je samostatný Docker kontajner
`swi` v sieti `dokploy-network` s obmedzenou pamäťou (384 MB), takže ostatnú prevádzku
neovplyvní. Traefik ho sprístupňuje podľa súboru `/etc/dokploy/traefik/dynamic/swi.yml`
a sám vybaví certifikát Let's Encrypt.

| Čo | Kde |
|---|---|
| SQLite databáza (aj šifrované doklady) | zväzok `swi-data` → `/data/app.db` v kontajneri |
| Tajné kľúče (`APP_SECRET`, `CRON_SECRET`, …) | `/opt/swi/swi.env` |
| Denná údržba 03:15 (mazanie dokladov, záloha) | `/opt/swi/daily.sh`, `/etc/cron.d/swi` |
| Zálohy databázy (14 dní) | `/var/backups/swi` |

Pri štarte kontajnera sa automaticky aplikujú chýbajúce migrácie (`scripts/apply-migrations.mts`).

## Nasadenie novej verzie

Z koreňa repozitára (vyžaduje Docker a SSH kľúč pridaný na serveri):

```bash
./deploy/deploy.sh
```

Skript zostaví image lokálne (server má málo pamäte na build), prenesie ho cez SSH
a kontajner reštartuje. `./deploy/deploy.sh --seed` navyše **prepíše databázu** ukážkovými dátami.

## Príprava nového servera

Server s Dokploy (Docker Swarm + Traefik) stačí raz pripraviť:

```bash
ssh root@IP 'bash -s' < deploy/server-setup.sh
```

Vygeneruje tajné kľúče, vytvorí dátový zväzok, smerovanie v Traefiku a denné úlohy.

## Užitočné príkazy na serveri

```bash
docker ps --filter name=swi          # stav aplikácie
docker logs -f swi                   # logy aplikácie
docker stats --no-stream swi         # spotreba pamäte
cat /var/log/swi-daily.log           # výsledok dennej údržby
ls /var/backups/swi                  # zálohy databázy
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
