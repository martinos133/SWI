import "server-only";
import { fetchStudentRecord } from "./ais";
import { changeStatus, currentDocument } from "./applications";
import { audit } from "./audit";
import { db } from "./db";
import {
  allocate,
  CRITERIA_ORDER,
  rank,
  score,
  type BreakdownItem,
  type Candidate,
  type CriterionWeight,
} from "./ranking";

export class EvaluationError extends Error {}

/** Vstupy kandidáta z aktuálneho stavu žiadosti (overené doklady + AIS). */
export function candidateFrom(app: {
  id: string;
  aisGpa: number | null;
  aisDistanceKm: number | null;
  socialLevel: number | null;
  submittedAt: Date | null;
  createdAt: Date;
  preferredBeds: number | null;
  preferences: { dormId: string; rank: number }[];
  documents: Parameters<typeof currentDocument>[0];
}): Candidate {
  const income = currentDocument(app.documents, "PRIJEM");
  const health = currentDocument(app.documents, "ZDRAVOTNY");
  return {
    applicationId: app.id,
    gpa: app.aisGpa,
    distanceKm: app.aisDistanceKm,
    socialLevel: income?.status === "OVERENY" ? app.socialLevel : null,
    healthApproved: health?.status === "OVERENY",
    submittedAt: app.submittedAt ?? app.createdAt,
    preferredBeds: app.preferredBeds,
    preferences: [...app.preferences].sort((a, b) => a.rank - b.rank).map((p) => p.dormId),
  };
}

/**
 * Vypočíta poradie žiadostí vo vyhodnocovaní a navrhne pridelenie do voľnej
 * kapacity (UC.07). Výsledok sa uloží ako nový beh so snímkou kritérií.
 */
export async function computeRun(periodId: string, actorId: string) {
  const period = await db.period.findUniqueOrThrow({
    where: { id: periodId },
    include: { criteria: true },
  });
  if (!period.criteriaApprovedAt) {
    throw new EvaluationError("Kritériá ešte neschválila ubytovacia komisia.");
  }

  const apps = await db.application.findMany({
    where: { periodId, status: "VYHODNOCUJE_SA" },
    include: {
      student: { select: { aisId: true } },
      preferences: true,
      documents: { orderBy: { uploadedAt: "desc" } },
    },
  });
  if (apps.length === 0) {
    throw new EvaluationError("Žiadna žiadosť nečaká na vyhodnotenie.");
  }

  // Aktuálny prospech a údaje z AIS v čase vyhodnotenia (E.02).
  await Promise.all(
    apps.map(async (app) => {
      if (!app.student.aisId) return;
      const record = await fetchStudentRecord(app.student.aisId);
      if (record.gpa !== app.aisGpa || record.distanceKm !== app.aisDistanceKm || record.year !== app.aisYear) {
        await db.application.update({
          where: { id: app.id },
          data: {
            aisGpa: record.gpa,
            aisDistanceKm: record.distanceKm,
            aisYear: record.year,
            aisSyncedAt: new Date(),
          },
        });
        await audit({
          actorId: null,
          action: "AIS_SYNCHRONIZACIA",
          entityType: "Application",
          entityId: app.id,
          detail: { gpa: record.gpa, year: record.year, distanceKm: record.distanceKm },
        });
      }
      app.aisGpa = record.gpa;
      app.aisDistanceKm = record.distanceKm;
    }),
  );

  const criteria: CriterionWeight[] = period.criteria
    .map((c) => ({ key: c.key, name: c.name, weight: c.weight }))
    .sort((a, b) => CRITERIA_ORDER.indexOf(a.key) - CRITERIA_ORDER.indexOf(b.key));
  const ranked = rank(criteria, apps.map(candidateFrom));
  const rooms = await freeRooms();
  const proposal = allocate(ranked, rooms);

  const run = await db.rankingRun.create({
    data: {
      periodId,
      createdBy: actorId,
      criteriaSnapshot: JSON.stringify(criteria),
      entries: {
        create: ranked.map((r) => ({
          applicationId: r.applicationId,
          rank: r.rank,
          points: r.points,
          breakdown: JSON.stringify({
            ...r.breakdown,
            _meta: {
              preferences: r.preferences,
              preferredBeds: r.preferredBeds,
              submittedAt: r.submittedAt.toISOString(),
              gpa: r.gpa,
            },
          }),
          proposedRoomTypeId: proposal.get(r.applicationId) ?? null,
        })),
      },
    },
  });
  await audit({
    actorId,
    action: "PORADIE_VYPOCITANE",
    entityType: "RankingRun",
    entityId: run.id,
    detail: {
      applications: ranked.length,
      proposed: [...proposal.values()].filter(Boolean).length,
      criteria: Object.fromEntries(criteria.map((c) => [c.key, c.weight])),
    },
  });
  return run;
}

/** Voľné miesta podľa typu izby = kapacita mínus potvrdené pridelenia. */
export async function freeRooms() {
  const rooms = await db.roomType.findMany({
    include: { _count: { select: { allocations: true } } },
  });
  return rooms.map((r) => ({
    roomTypeId: r.id,
    dormId: r.dormId,
    beds: r.beds,
    free: Math.max(0, r.capacity - r._count.allocations),
  }));
}

/**
 * Overí, že uložený beh sa dá zo zapamätaných vstupov presne zopakovať (G.04).
 * Vráti zoznam žiadostí, ktorých body sa nezhodujú.
 */
export async function verifyRun(runId: string) {
  const run = await db.rankingRun.findUniqueOrThrow({
    where: { id: runId },
    include: { entries: true },
  });
  const criteria = JSON.parse(run.criteriaSnapshot) as CriterionWeight[];
  const mismatches: string[] = [];
  for (const entry of run.entries) {
    const b = JSON.parse(entry.breakdown) as Record<string, BreakdownItem> & {
      _meta: { submittedAt: string; gpa: number | null };
    };
    const replay = score(criteria, {
      applicationId: entry.applicationId,
      gpa: b.PROSPECH?.input ?? b._meta.gpa,
      distanceKm: b.VZDIALENOST?.input ?? null,
      socialLevel: b.SOCIALNA?.input ?? null,
      healthApproved: b.ZDRAVOTNA?.input === 1,
      submittedAt: new Date(b._meta.submittedAt),
      preferredBeds: null,
      preferences: [],
    });
    if (Math.abs(replay.points - entry.points) > 0.001) mismatches.push(entry.applicationId);
  }
  return mismatches;
}

/**
 * Potvrdí návrh pridelenia (SW.03 – rozhoduje referent). V jednej transakcii
 * znova overí kapacitu, takže sa neprekročí ani pri súbežnom potvrdení (E.07, S.08).
 */
export async function confirmRun(runId: string, actorId: string) {
  const run = await db.rankingRun.findUniqueOrThrow({
    where: { id: runId },
    include: { entries: { include: { application: true }, orderBy: { rank: "asc" } } },
  });
  if (run.confirmedAt) throw new EvaluationError("Tento výpočet je už potvrdený.");
  const latest = await db.rankingRun.findFirst({
    where: { periodId: run.periodId },
    orderBy: { createdAt: "desc" },
  });
  if (latest?.id !== run.id) {
    throw new EvaluationError("Potvrdiť sa dá iba posledný výpočet. Vypočítajte poradie znova.");
  }
  const stale = run.entries.filter((e) => e.application.status !== "VYHODNOCUJE_SA");
  if (stale.length > 0) {
    throw new EvaluationError("Niektoré žiadosti medzičasom zmenili stav. Vypočítajte poradie znova.");
  }

  const outcome = await db.$transaction(async (tx) => {
    const claimed = await tx.rankingRun.updateMany({
      where: { id: run.id, confirmedAt: null },
      data: { confirmedAt: new Date(), confirmedBy: actorId },
    });
    if (claimed.count === 0) throw new EvaluationError("Tento výpočet už potvrdil niekto iný.");

    const assigned: string[] = [];
    const waitlisted: string[] = [];
    for (const entry of run.entries) {
      if (entry.proposedRoomTypeId) {
        const room = await tx.roomType.findUniqueOrThrow({
          where: { id: entry.proposedRoomTypeId },
          include: { _count: { select: { allocations: true } } },
        });
        if (room._count.allocations >= room.capacity) {
          throw new EvaluationError(
            `Kapacita typu izby „${room.label}“ sa medzičasom naplnila. Vypočítajte poradie znova.`,
          );
        }
        await tx.allocation.create({
          data: {
            applicationId: entry.applicationId,
            roomTypeId: room.id,
            runId: run.id,
            confirmedBy: actorId,
          },
        });
        assigned.push(entry.applicationId);
      } else {
        waitlisted.push(entry.applicationId);
      }
    }
    await audit(
      {
        actorId,
        action: "PRIDELENIE_POTVRDENE",
        entityType: "RankingRun",
        entityId: run.id,
        detail: { assigned: assigned.length, waitlisted: waitlisted.length },
      },
      tx,
    );
    return { assigned, waitlisted };
  });

  // Stavy a e-maily až po úspešnej transakcii.
  for (const id of outcome.assigned) await changeStatus(id, "PRIDELENA", actorId);
  for (const id of outcome.waitlisted) await changeStatus(id, "NEPRIDELENA", actorId);
  return outcome;
}

/** Voľné typy izieb s popisom pre výber (odvolania, uvoľnené miesta). */
export async function freeRoomOptions() {
  const [rooms, dorms] = await Promise.all([
    freeRooms(),
    db.dorm.findMany({ include: { roomTypes: true } }),
  ]);
  return rooms
    .filter((r) => r.free > 0)
    .map((r) => {
      const dorm = dorms.find((d) => d.id === r.dormId)!;
      const type = dorm.roomTypes.find((t) => t.id === r.roomTypeId)!;
      return { id: r.roomTypeId, label: `${dorm.name}, ${type.label.toLowerCase()}`, free: r.free };
    });
}
