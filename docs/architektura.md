# Žiadosť o ubytovanie – architektúra a rozsah riešenia

Webová aplikácia podľa dokumentu *Detailný návrh riešenia (DNR) – Žiadosť o ubytovanie B*
(Gálová, Francisci, Muha). Pokrýva požiadavky s prioritou Must S.01–S.16 a prípady použitia UC.01–UC.10;
požiadavky s prioritou Won't (SW.01–SW.12) nie sú predmetom riešenia.

## Technológie (kapitola 6.1)

| Oblasť | Výber | Zdôvodnenie |
|---|---|---|
| Jazyk a framework | TypeScript, Next.js 16 (App Router, Server Actions) | Frontend aj backend v jednom projekte, typová bezpečnosť |
| UI | Tailwind CSS 4, vlastné komponenty | Plná kontrola nad vzhľadom, prístupnosť (E.06), mobil |
| Databáza | SQLite/libSQL cez Prisma 7 | Lokálne bez inštalácie, v produkcii Turso; transakcie pre kapacitu (E.07) |
| Prihlásenie | Simulované univerzitné SSO + 2FA kód | Reálne SSO nie je k dispozícii, rozhranie API.02 je izolované |
| AIS | Simulovaný modul `src/lib/ais.ts` | Rozhranie API.01, dá sa vymeniť za reálne napojenie |
| E-mail | Nodemailer (SMTP / výpis do konzoly) | Rozhranie API.03, každý e-mail sa loguje |
| Doklady | Šifrované AES-256-GCM v databáze | S.12, GDPR (E.04), funguje aj bez disku |
| Testy | Vitest, Playwright, axe-core | Výpočet poradia, stavy, celé toky rolí, WCAG 2.2 AA |
| Hosting | VPS (Eternyx), Caddy, systemd | https://swi.becode.sk, HTTPS cez Let's Encrypt, zálohy |
| Repozitár / IDE | GitHub, VS Code | |

## Rozsah

| Oblasť | Obsah |
|---|---|
| Prihlásenie | Univerzitné SSO s druhým faktorom, roly a oprávnenia |
| Študent | Žiadosť s priebežným ukladaním, preferencie, doklady, prehľad stavu |
| Referent | Zoznam žiadostí, posúdenie dokladov, výzva na doplnenie |
| Správa | Termíny konania, kritériá a váhy, kapacity internátov |
| Vyhodnotenie | Výpočet poradia, návrh a potvrdenie pridelenia, náhradníci |
| Odvolania | Podanie s prílohou, rozhodnutie komisie |
| Prierezové funkcie | Auditný záznam, e-mailové upozornenia, retencia dokladov |
| Kvalita | Unit a E2E testy, prístupnosť WCAG 2.2 AA, mobilné zobrazenie |
| Prevádzka | Nasadenie na VPS s HTTPS a zálohovaním ([DEPLOY.md](../DEPLOY.md)) |

## Stavový automat žiadosti (E.09)

```
ROZPRACOVANA ─► PODANA ─► OVERUJE_SA ⇄ CAKA_NA_DOPLNENIE
                                 │
                                 ▼
                          VYHODNOCUJE_SA ─► PRIDELENA
                                        └─► NEPRIDELENA (náhradník)
PRIDELENA / NEPRIDELENA ─► ODVOLANIE ─► PRIDELENA / NEPRIDELENA
ROZPRACOVANA / PODANA / OVERUJE_SA / CAKA_NA_DOPLNENIE ─► ZRUSENA
```

## Dizajn

Vecný úradný vzhľad: neutrálny sivý podklad, jedna značková farba (tmavozelená `#14473F`)
pre akcie a aktívne stavy, stavové farby iba na stav. Písmo IBM Plex Sans, rohy 4–6 px,
bez tieňov a animácií. Všetky formulárové prvky, tlačidlá, tabuľky a upozornenia sú
spoločné komponenty v `src/components/ui`. Pravidlá a použitie: [dizajn-system.md](dizajn-system.md).
