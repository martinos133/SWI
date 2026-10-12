import type { CriterionKey } from "@/generated/prisma/enums";

/**
 * Výpočet poradia a návrh pridelenia (S.05, S.08, FR-09, FR-10).
 * Čisté funkcie bez prístupu k databáze – rovnaký vstup dá vždy rovnaký výsledok,
 * preto sa dá každý beh spätne zopakovať a doložiť (G.04).
 */

/** Pevné poradie kritérií pri zobrazovaní a ukladaní snímok. */
export const CRITERIA_ORDER: CriterionKey[] = ["PROSPECH", "VZDIALENOST", "SOCIALNA", "ZDRAVOTNA"];

export type CriterionWeight = { key: CriterionKey; name: string; weight: number };

export type Candidate = {
  applicationId: string;
  gpa: number | null;
  distanceKm: number | null;
  /** Posúdenie referenta 0–3; null, ak príjmový doklad nie je overený. */
  socialLevel: number | null;
  /** Zdravotný doklad bol overený. */
  healthApproved: boolean;
  submittedAt: Date;
  preferredBeds: number | null;
  /** ID internátov v poradí preferencie. */
  preferences: string[];
};

export type BreakdownItem = {
  input: number | null;
  normalized: number;
  points: number;
};

export type Scored = Candidate & {
  points: number;
  breakdown: Partial<Record<CriterionKey, BreakdownItem>>;
};

export type Ranked = Scored & { rank: number };

export const MAX_DISTANCE_KM = 400;

const round = (n: number, digits = 2) => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Prevedie vstup kritéria na hodnotu 0–1 (1 = najviac bodov). */
export function normalize(
  key: CriterionKey,
  c: Candidate,
): { input: number | null; normalized: number } {
  switch (key) {
    case "PROSPECH":
      // Priemer 1,0 je najlepší, 4,0 najhorší.
      return {
        input: c.gpa,
        normalized: c.gpa == null ? 0 : clamp01((4 - c.gpa) / 3),
      };
    case "VZDIALENOST":
      return {
        input: c.distanceKm,
        normalized:
          c.distanceKm == null ? 0 : clamp01(c.distanceKm / MAX_DISTANCE_KM),
      };
    case "SOCIALNA":
      return {
        input: c.socialLevel,
        normalized: c.socialLevel == null ? 0 : clamp01(c.socialLevel / 3),
      };
    case "ZDRAVOTNA":
      return {
        input: c.healthApproved ? 1 : 0,
        normalized: c.healthApproved ? 1 : 0,
      };
  }
}

export function score(criteria: CriterionWeight[], c: Candidate): Scored {
  const breakdown: Scored["breakdown"] = {};
  let total = 0;
  for (const criterion of criteria) {
    const { input, normalized } = normalize(criterion.key, c);
    const points = round(normalized * criterion.weight);
    breakdown[criterion.key] = { input, normalized: round(normalized, 4), points };
    total += points;
  }
  return { ...c, points: round(total), breakdown };
}

/**
 * Zoradí žiadosti. Pri rovnosti bodov rozhoduje lepší priemer, potom skoršie
 * podanie a nakoniec ID – poradie je tak vždy jednoznačné.
 */
export function rank(criteria: CriterionWeight[], candidates: Candidate[]): Ranked[] {
  return candidates
    .map((c) => score(criteria, c))
    .sort(
      (a, b) =>
        b.points - a.points ||
        (a.gpa ?? 5) - (b.gpa ?? 5) ||
        a.submittedAt.getTime() - b.submittedAt.getTime() ||
        a.applicationId.localeCompare(b.applicationId),
    )
    .map((s, i) => ({ ...s, rank: i + 1 }));
}

export type RoomSlot = {
  roomTypeId: string;
  dormId: string;
  beds: number;
  /** Voľné miesta (kapacita mínus už potvrdené pridelenia). */
  free: number;
};

/**
 * Navrhne pridelenie podľa poradia a preferencií. Kapacita sa nikdy neprekročí (E.07):
 * študent dostane prvý preferovaný internát s voľným miestom, inak ide medzi náhradníkov.
 */
export function allocate(
  ranked: Ranked[],
  rooms: RoomSlot[],
): Map<string, string | null> {
  const free = new Map(rooms.map((r) => [r.roomTypeId, r.free]));
  const result = new Map<string, string | null>();

  for (const candidate of ranked) {
    let assigned: string | null = null;
    for (const dormId of candidate.preferences) {
      const options = rooms
        .filter((r) => r.dormId === dormId && (free.get(r.roomTypeId) ?? 0) > 0)
        .sort(
          (a, b) =>
            Number(b.beds === candidate.preferredBeds) -
              Number(a.beds === candidate.preferredBeds) ||
            (free.get(b.roomTypeId) ?? 0) - (free.get(a.roomTypeId) ?? 0),
        );
      if (options.length > 0) {
        assigned = options[0].roomTypeId;
        free.set(assigned, (free.get(assigned) ?? 0) - 1);
        break;
      }
    }
    result.set(candidate.applicationId, assigned);
  }

  return result;
}
