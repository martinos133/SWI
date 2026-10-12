import { describe, expect, it } from "vitest";
import { toDateInput, zonedDate } from "./dates";

describe("dátumy v bratislavskom pásme", () => {
  it("koniec dňa v zime aj v lete", () => {
    expect(zonedDate("2026-11-30", "23:59").toISOString()).toBe("2026-11-30T22:59:00.000Z");
    expect(zonedDate("2026-07-01", "23:59").toISOString()).toBe("2026-07-01T21:59:00.000Z");
    expect(toDateInput(zonedDate("2026-11-30", "23:59"))).toBe("2026-11-30");
  });
});
