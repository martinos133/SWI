import { describe, expect, it } from "vitest";
import { assertTransition, canTransition, TRANSITIONS, TransitionError } from "./status";

describe("stavový automat žiadosti", () => {
  it("povoľuje bežný priebeh konania", () => {
    const path = [
      "ROZPRACOVANA",
      "PODANA",
      "OVERUJE_SA",
      "CAKA_NA_DOPLNENIE",
      "OVERUJE_SA",
      "VYHODNOCUJE_SA",
      "NEPRIDELENA",
      "ODVOLANIE",
      "PRIDELENA",
    ] as const;
    for (let i = 1; i < path.length; i++) {
      expect(canTransition(path[i - 1], path[i])).toBe(true);
    }
  });

  it("zrušená žiadosť je konečný stav", () => {
    expect(TRANSITIONS.ZRUSENA).toEqual([]);
    expect(() => assertTransition("ZRUSENA", "PODANA")).toThrow(TransitionError);
  });

  it("nedovolí preskočiť overenie dokladov", () => {
    expect(canTransition("PODANA", "PRIDELENA")).toBe(false);
  });

  it("po vyhodnotení sa už nedá zrušiť", () => {
    expect(canTransition("PRIDELENA", "ZRUSENA")).toBe(false);
  });
});
