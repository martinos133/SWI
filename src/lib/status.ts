import type {
  ApplicationStatus,
  AppealStatus,
  DocumentStatus,
  DocumentType,
} from "@/generated/prisma/enums";

/** Stavový automat žiadosti (E.09) – jediné miesto, kde sú povolené prechody. */
export const TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  ROZPRACOVANA: ["PODANA", "ZRUSENA"],
  PODANA: ["OVERUJE_SA", "ROZPRACOVANA", "ZRUSENA"],
  OVERUJE_SA: ["CAKA_NA_DOPLNENIE", "VYHODNOCUJE_SA", "ZRUSENA"],
  CAKA_NA_DOPLNENIE: ["OVERUJE_SA", "ZRUSENA"],
  VYHODNOCUJE_SA: ["PRIDELENA", "NEPRIDELENA", "OVERUJE_SA"],
  PRIDELENA: ["ODVOLANIE", "VYHODNOCUJE_SA"],
  NEPRIDELENA: ["ODVOLANIE", "PRIDELENA", "VYHODNOCUJE_SA"],
  ODVOLANIE: ["PRIDELENA", "NEPRIDELENA"],
  ZRUSENA: [],
};

export function canTransition(from: ApplicationStatus, to: ApplicationStatus) {
  return from === to || TRANSITIONS[from].includes(to);
}

export class TransitionError extends Error {}

export function assertTransition(from: ApplicationStatus, to: ApplicationStatus) {
  if (!canTransition(from, to)) {
    throw new TransitionError(
      `Žiadosť v stave „${STATUS[from].label}“ sa nedá zmeniť na „${STATUS[to].label}“.`,
    );
  }
}

export type Tone = "neutral" | "info" | "wait" | "ok" | "bad";

export const STATUS: Record<
  ApplicationStatus,
  { label: string; tone: Tone; forStudent: string }
> = {
  ROZPRACOVANA: {
    label: "Rozpracovaná",
    tone: "neutral",
    forStudent: "Žiadosť je uložená, ale ešte ste ju nepodali.",
  },
  PODANA: {
    label: "Podaná",
    tone: "info",
    forStudent: "Žiadosť sme prijali. Referent ju čoskoro začne overovať.",
  },
  OVERUJE_SA: {
    label: "Overuje sa",
    tone: "info",
    forStudent: "Referent kontroluje vaše doklady.",
  },
  CAKA_NA_DOPLNENIE: {
    label: "Čaká na doplnenie",
    tone: "wait",
    forStudent: "Niektorý doklad treba doplniť. Pozrite si poznámku referenta.",
  },
  VYHODNOCUJE_SA: {
    label: "Vyhodnocuje sa",
    tone: "info",
    forStudent: "Doklady sú v poriadku. Žiadosť čaká na výpočet poradia.",
  },
  PRIDELENA: {
    label: "Miesto pridelené",
    tone: "ok",
    forStudent: "Máte pridelené miesto na internáte.",
  },
  NEPRIDELENA: {
    label: "Náhradník",
    tone: "bad",
    forStudent:
      "Miesto vám v prvom kole nevyšlo. Ste v poradí náhradníkov a môžete sa odvolať.",
  },
  ODVOLANIE: {
    label: "Odvolanie",
    tone: "wait",
    forStudent: "Ubytovacia komisia posudzuje vaše odvolanie.",
  },
  ZRUSENA: {
    label: "Zrušená",
    tone: "neutral",
    forStudent: "Žiadosť ste zrušili.",
  },
};

/** Poradie krokov pre časovú os na prehľade študenta. */
export const JOURNEY: { key: string; label: string; covers: ApplicationStatus[] }[] = [
  { key: "draft", label: "Vyplnenie žiadosti", covers: ["ROZPRACOVANA"] },
  { key: "submitted", label: "Podanie", covers: ["PODANA"] },
  {
    key: "review",
    label: "Overenie dokladov",
    covers: ["OVERUJE_SA", "CAKA_NA_DOPLNENIE"],
  },
  { key: "ranking", label: "Výpočet poradia", covers: ["VYHODNOCUJE_SA"] },
  {
    key: "decision",
    label: "Rozhodnutie",
    covers: ["PRIDELENA", "NEPRIDELENA", "ODVOLANIE"],
  },
];

export const DOCUMENT_TYPE: Record<DocumentType, { label: string; hint: string }> = {
  PRIJEM: {
    label: "Potvrdenie o príjme",
    hint: "Potvrdenie o príjmoch domácnosti za posledný kalendárny rok.",
  },
  ZDRAVOTNY: {
    label: "Zdravotný doklad",
    hint: "Lekárska správa alebo preukaz ŤZP, ak žiadate o zohľadnenie zdravotného stavu.",
  },
  ODVOLANIE: {
    label: "Príloha k odvolaniu",
    hint: "Doklad, ktorý podporuje vaše odvolanie.",
  },
};

export const DOCUMENT_STATUS: Record<DocumentStatus, { label: string; tone: Tone }> = {
  NAHRANY: { label: "Čaká na overenie", tone: "info" },
  OVERENY: { label: "Overený", tone: "ok" },
  ZAMIETNUTY: { label: "Zamietnutý", tone: "bad" },
  DOPLNIT: { label: "Treba doplniť", tone: "wait" },
};

export const APPEAL_STATUS: Record<AppealStatus, { label: string; tone: Tone }> = {
  PODANE: { label: "Posudzuje sa", tone: "wait" },
  UZNANE: { label: "Vyhovené", tone: "ok" },
  ZAMIETNUTE: { label: "Zamietnuté", tone: "bad" },
};
