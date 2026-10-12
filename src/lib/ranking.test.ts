import { describe, expect, it } from "vitest";
import { allocate, rank, type Candidate, type CriterionWeight } from "./ranking";

const criteria: CriterionWeight[] = [
  { key: "PROSPECH", name: "Prospech", weight: 40 },
  { key: "VZDIALENOST", name: "Vzdialenosť", weight: 30 },
  { key: "SOCIALNA", name: "Sociálna situácia", weight: 20 },
  { key: "ZDRAVOTNA", name: "Osobitné potreby", weight: 10 },
];

const candidate = (id: string, over: Partial<Candidate> = {}): Candidate => ({
  applicationId: id,
  gpa: 2.5,
  distanceKm: 200,
  socialLevel: null,
  healthApproved: false,
  submittedAt: new Date("2026-10-05T10:00:00Z"),
  preferredBeds: null,
  preferences: ["A"],
  ...over,
});

describe("rank", () => {
  it("počíta body podľa váh", () => {
    const [r] = rank(criteria, [
      candidate("x", { gpa: 1, distanceKm: 400, socialLevel: 3, healthApproved: true }),
    ]);
    expect(r.points).toBe(100);
    expect(r.breakdown.PROSPECH?.points).toBe(40);
  });

  it("neoverený doklad nedáva body", () => {
    const [r] = rank(criteria, [candidate("x", { gpa: 4, distanceKm: 0 })]);
    expect(r.points).toBe(0);
  });

  it("vzdialenosť nad limit sa zastropuje", () => {
    const [r] = rank(criteria, [candidate("x", { gpa: 4, distanceKm: 900 })]);
    expect(r.breakdown.VZDIALENOST?.points).toBe(30);
  });

  it("pri rovnosti rozhoduje priemer, potom čas podania", () => {
    const ranked = rank(
      [{ key: "VZDIALENOST", name: "V", weight: 100 }],
      [
        candidate("late", { gpa: 1.5, submittedAt: new Date("2026-10-09") }),
        candidate("worse", { gpa: 2.0 }),
        candidate("early", { gpa: 1.5, submittedAt: new Date("2026-10-02") }),
      ],
    );
    expect(ranked.map((r) => r.applicationId)).toEqual(["early", "late", "worse"]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("je deterministický – rovnaký vstup, rovnaký výsledok", () => {
    const input = [candidate("a", { gpa: 1.2 }), candidate("b"), candidate("c", { gpa: 3 })];
    expect(rank(criteria, input)).toEqual(rank(criteria, [...input].reverse()));
  });
});

describe("allocate", () => {
  const rooms = [
    { roomTypeId: "A1", dormId: "A", beds: 1, free: 1 },
    { roomTypeId: "A2", dormId: "A", beds: 2, free: 1 },
    { roomTypeId: "B2", dormId: "B", beds: 2, free: 1 },
  ];

  it("nikdy neprekročí kapacitu", () => {
    const ranked = rank(
      criteria,
      Array.from({ length: 10 }, (_, i) =>
        candidate(`s${i}`, { gpa: 1 + i / 10, preferences: ["A", "B"] }),
      ),
    );
    const result = allocate(ranked, rooms);
    const assigned = [...result.values()].filter(Boolean);
    expect(assigned).toHaveLength(3);
    expect(new Set(assigned).size).toBe(3);
    expect(result.get("s3")).toBeNull();
  });

  it("rešpektuje poradie preferencií a typ izby", () => {
    const ranked = rank(criteria, [
      candidate("first", { gpa: 1, preferences: ["B", "A"] }),
      candidate("second", { gpa: 2, preferredBeds: 2, preferences: ["A"] }),
    ]);
    const result = allocate(ranked, rooms);
    expect(result.get("first")).toBe("B2");
    expect(result.get("second")).toBe("A2");
  });

  it("študent bez voľného miesta v preferovaných internátoch je náhradník", () => {
    const ranked = rank(criteria, [candidate("x", { preferences: ["C"] })]);
    expect(allocate(ranked, rooms).get("x")).toBeNull();
  });
});
