# Žiadosť o ubytovanie B – plán implementácie

Webová aplikácia podľa dokumentu *Detailný návrh riešenia (DNR) – Žiadosť o ubytovanie B*
(Gálová, Francisci, Muha). Pokrýva Must požiadavky S.01–S.16 a use casy UC.01–UC.10;
Won't (SW.01–SW.12) sa zámerne nerobí.

## Stack (kapitola 6.1)

| Oblasť | Výber | Zdôvodnenie |
|---|---|---|
| Jazyk a framework | TypeScript, Next.js 16 (App Router, Server Actions) | Frontend aj backend v jednom projekte, typová bezpečnosť |
| UI | Tailwind CSS 4, vlastné komponenty | Plná kontrola nad vzhľadom, prístupnosť (E.06), mobil |
| Databáza | SQLite/libSQL cez Prisma 7 | Lokálne bez inštalácie, v produkcii Turso; transakcie pre kapacitu (E.07) |
| Prihlásenie | Simulované univerzitné SSO + 2FA kód | Reálne SSO nie je k dispozícii, rozhranie API.02 je izolované |
| AIS | Mock modul `src/lib/ais.ts` | Rozhranie API.01, dá sa vymeniť za reálne napojenie |
| E-mail | Nodemailer (SMTP / výpis do konzoly) | Rozhranie API.03, každý e-mail sa loguje |
| Doklady | Šifrované AES-256-GCM na disku | S.12, GDPR (E.04) |
| Testy | Vitest | Výpočet poradia a stavový automat |
| Hosting | Vercel + Turso | Bezplatný tier, nasadenie z GitHubu |
| Repozitár / IDE | GitHub, VS Code | |

## Fázy

- [x] **0. Kostra** – Next.js, dizajn systém (tokeny, písmo, komponenty, kľúčenka)
- [ ] **1. Dáta** – Prisma schéma, seed, mock AIS, stavový automat
- [ ] **2. Prihlásenie** – SSO + 2FA, session, roly, proxy, app shell
- [ ] **3. Študent** – žiadosť s priebežným ukladaním, preferencie, doklady, prehľad
- [ ] **4. Referent** – zoznam žiadostí, posúdenie dokladov, výzva na doplnenie
- [ ] **5. Správa** – termíny, kritériá a váhy, kapacity internátov
- [ ] **6. Vyhodnotenie** – výpočet poradia, návrh a potvrdenie pridelenia, náhradníci
- [ ] **7. Odvolania** – podanie s prílohou, rozhodnutie komisie
- [ ] **8. Prierezové** – auditný záznam, e-maily, retencia dokladov
- [ ] **9. Kvalita** – testy, prístupnosť, mobil
- [ ] **10. Nasadenie** – Vercel, screenshoty do kapitoly 6.2

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

Téma *internát*: borovicová zelená (`#0F2E2A`) pre text a akcie, mosadz (`#C9A24B`)
ako jediný akcent – patrí kľúčom. Písmo Schibsted Grotesk. Podpisový prvok je
**kľúčenka**: stav žiadosti zobrazený ako visačka kľúča od izby, ktorá je prázdna,
kým študent nedostane miesto.
