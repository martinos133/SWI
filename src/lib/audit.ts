import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "./db";

export type AuditAction =
  | "ZIADOST_PODANA"
  | "ZIADOST_UPRAVENA"
  | "ZIADOST_ZRUSENA"
  | "STAV_ZMENENY"
  | "AIS_SYNCHRONIZACIA"
  | "DOKLAD_NAHRANY"
  | "DOKLAD_SCHVALENY"
  | "DOKLAD_ZAMIETNUTY"
  | "DOKLAD_VYZIADANE_DOPLNENIE"
  | "DOKLAD_ZMAZANY_RETENCIA"
  | "SOCIALNA_SITUACIA_POSUDENA"
  | "PORADIE_VYPOCITANE"
  | "PRIDELENIE_POTVRDENE"
  | "ODVOLANIE_PODANE"
  | "ODVOLANIE_ROZHODNUTE"
  | "BODY_ZMENENE"
  | "TERMINY_ZMENENE"
  | "KONANIE_ZALOZENE"
  | "KONANIE_AKTIVOVANE"
  | "KRITERIA_ZMENENE"
  | "KRITERIA_SCHVALENE"
  | "KAPACITA_ZMENENA";

type Client = Prisma.TransactionClient | typeof db;

/** Zapíše auditný záznam (S.13). V transakcii odovzdajte `tx`. */
export async function audit(
  entry: {
    actorId: string | null;
    action: AuditAction;
    entityType: string;
    entityId: string;
    detail?: Record<string, unknown>;
  },
  client: Client = db,
) {
  await client.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      detail: JSON.stringify(entry.detail ?? {}),
    },
  });
}

export const AUDIT_LABEL: Record<string, string> = {
  ZIADOST_PODANA: "Žiadosť podaná",
  ZIADOST_UPRAVENA: "Žiadosť upravená",
  ZIADOST_ZRUSENA: "Žiadosť zrušená",
  STAV_ZMENENY: "Zmena stavu žiadosti",
  AIS_SYNCHRONIZACIA: "Údaje prevzaté z AIS",
  DOKLAD_NAHRANY: "Doklad nahraný",
  DOKLAD_SCHVALENY: "Doklad schválený",
  DOKLAD_ZAMIETNUTY: "Doklad zamietnutý",
  DOKLAD_VYZIADANE_DOPLNENIE: "Vyžiadané doplnenie dokladu",
  DOKLAD_ZMAZANY_RETENCIA: "Doklad zmazaný po uplynutí doby uchovávania",
  SOCIALNA_SITUACIA_POSUDENA: "Posúdená sociálna situácia",
  PORADIE_VYPOCITANE: "Vypočítané poradie",
  PRIDELENIE_POTVRDENE: "Potvrdené pridelenie miest",
  ODVOLANIE_PODANE: "Podané odvolanie",
  ODVOLANIE_ROZHODNUTE: "Rozhodnutie o odvolaní",
  BODY_ZMENENE: "Zmena bodov",
  TERMINY_ZMENENE: "Zmena termínov",
  KONANIE_ZALOZENE: "Založené nové konanie",
  KONANIE_AKTIVOVANE: "Zmena aktívneho konania",
  KRITERIA_ZMENENE: "Zmena kritérií",
  KRITERIA_SCHVALENE: "Kritériá schválené",
  KAPACITA_ZMENENA: "Zmena kapacity",
};
