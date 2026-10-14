import "dotenv/config";
import type {
  ApplicationStatus,
  DocumentStatus,
  DocumentType,
} from "../src/generated/prisma/enums";
import { generateSecret } from "otplib";
import { randomBytes } from "node:crypto";
import { aisRecordFor } from "../src/lib/ais";
import {
  allocate,
  CRITERIA_ORDER,
  rank,
  type Candidate,
  type CriterionWeight,
} from "../src/lib/ranking";
import { getPrisma } from "../src/lib/prisma";
import { storeEncrypted } from "../src/lib/storage";

const db = getPrisma();

// Deterministický generátor, aby seed dal vždy rovnaké dáta.
let state = 20262027;
const rand = () => {
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  return state / 2 ** 32;
};
const pick = <T,>(items: T[]) => items[Math.floor(rand() * items.length)];
const shuffle = <T,>(items: T[]) => [...items].sort(() => rand() - 0.5);

// Termíny sú relatívne k dnešku, aby ukážka fungovala kedykoľvek: podávanie práve prebieha.
const today = new Date();
today.setHours(12, 0, 0, 0);
const days = (n: number) => new Date(today.getTime() + n * 86_400_000);
const academicYear = `${today.getFullYear() + 1}/${String((today.getFullYear() + 2) % 100).padStart(2, "0")}`;

const FEMALE = [
  ["Lucia", "Nováková"],
  ["Zuzana", "Horváthová"],
  ["Petra", "Vargová"],
  ["Simona", "Tóthová"],
  ["Katarína", "Baloghová"],
  ["Michaela", "Molnárová"],
  ["Veronika", "Šimková"],
  ["Natália", "Kováčová"],
  ["Barbora", "Lukáčová"],
  ["Ema", "Kráľová"],
  ["Laura", "Hudáková"],
  ["Nina", "Polláková"],
  ["Tereza", "Gajdošová"],
  ["Alžbeta", "Mišíková"],
  ["Klára", "Ďuricová"],
  ["Viktória", "Kolesárová"],
  ["Diana", "Ševčíková"],
  ["Sofia", "Bartošová"],
  ["Lenka", "Hrušková"],
  ["Monika", "Čierna"],
];

const MALE = [
  ["Tomáš", "Kollár"],
  ["Matej", "Novotný"],
  ["Jakub", "Hudec"],
  ["Samuel", "Oravec"],
  ["Filip", "Krajčír"],
  ["Adam", "Mihálik"],
  ["Lukáš", "Šoltés"],
  ["Peter", "Bednár"],
  ["Marek", "Hronec"],
  ["Dominik", "Fabian"],
  ["Richard", "Ďurica"],
  ["Michal", "Kučera"],
  ["Daniel", "Sloboda"],
  ["Patrik", "Rusnák"],
  ["Erik", "Benko"],
  ["Martin", "Ondrejka"],
  ["Juraj", "Pavlík"],
  ["Oliver", "Vavro"],
  ["Andrej", "Kuruc"],
  ["Ján", "Paulík"],
];

const strip = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Minimálne platné PDF – obsah dokladov v demo dátach.
function demoPdf(title: string) {
  const body = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 60>>stream
BT /F1 18 Tf 72 760 Td (${strip(title)} - demo doklad) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R>>
%%EOF`;
  return Buffer.from(body, "latin1");
}

async function main() {
  console.log("Čistím databázu…");
  await db.storedFile.deleteMany();
  await db.auditLog.deleteMany();
  await db.emailLog.deleteMany();
  await db.allocation.deleteMany();
  await db.rankingEntry.deleteMany();
  await db.rankingRun.deleteMany();
  await db.document.deleteMany();
  await db.appeal.deleteMany();
  await db.preference.deleteMany();
  await db.application.deleteMany();
  await db.criterion.deleteMany();
  await db.period.deleteMany();
  await db.roomType.deleteMany();
  await db.dorm.deleteMany();
  await db.session.deleteMany();
  await db.user.deleteMany();

  console.log("Zamestnanci (projektový tím)…");
  // Referent ubytovacieho oddelenia je v zadaní označený ako „administrátor“.
  const referent = await db.user.create({
    data: {
      login: "muha",
      email: "muha@becode.sk",
      name: "Martin Muha",
      role: "REFERENT",
      totpSecret: generateSecret(),
    },
  });
  const komisia = await db.user.create({
    data: {
      login: "galova",
      email: "dora.galova@uniba.example",
      name: "Dóra Gálová",
      role: "KOMISIA",
      totpSecret: generateSecret(),
    },
  });
  await db.user.create({
    data: {
      login: "francisci",
      email: "adrian.francisci@uniba.example",
      name: "Adrián Francisci",
      role: "SPRAVCA",
      totpSecret: generateSecret(),
    },
  });

  // Pomocníci na históriu: auditný záznam a odoslané e-maily s dátumom v minulosti.
  const log = (
    actorId: string | null,
    action: string,
    entityType: string,
    entityId: string,
    createdAt: Date,
    detail: Record<string, unknown> = {},
  ) =>
    db.auditLog.create({
      data: { actorId, action, entityType, entityId, createdAt, detail: JSON.stringify(detail) },
    });
  const statusMail = (to: string, name: string, label: string, text: string, createdAt: Date) =>
    db.emailLog.create({
      data: {
        to,
        subject: `Stav vašej žiadosti o ubytovanie: ${label}`,
        body: `Dobrý deň, ${name},\n\nstav vašej žiadosti o ubytovanie sa zmenil na „${label}“.\n${text}\n\nUbytovacie oddelenie`,
        status: "LOG",
        createdAt,
      },
    });

  console.log("Internáty…");
  const dormData = [
    {
      code: "ML",
      name: "Mladosť",
      address: "Staré Grunty 53, Bratislava",
      rooms: [
        [2, 4],
        [3, 3],
      ],
    },
    {
      code: "DR",
      name: "Družba",
      address: "Botanická 25, Bratislava",
      rooms: [
        [1, 1],
        [2, 2],
      ],
    },
    {
      code: "LS",
      name: "Ľudovít Štúr",
      address: "Mlynská dolina, Bratislava",
      rooms: [[2, 2]],
    },
    {
      code: "HP",
      name: "Horský park",
      address: "Jaskový rad 9, Bratislava",
      rooms: [
        [1, 1],
        [2, 1],
      ],
    },
  ];
  const label = (beds: number) =>
    ({ 1: "Jednolôžková izba", 2: "Dvojlôžková izba", 3: "Trojlôžková izba" })[
      beds
    ]!;
  const dorms = [];
  for (const d of dormData) {
    dorms.push(
      await db.dorm.create({
        data: {
          code: d.code,
          name: d.name,
          address: d.address,
          roomTypes: {
            create: d.rooms.map(([beds, capacity]) => ({
              beds,
              capacity,
              label: label(beds),
            })),
          },
        },
      }),
    );
  }

  console.log("Konanie a kritériá…");
  const period = await db.period.create({
    data: {
      academicYear,
      submitFrom: days(-12),
      submitTo: days(48),
      editTo: days(48),
      appealTo: days(95),
      isActive: true,
      criteriaApprovedAt: days(-21),
      criteriaApprovedBy: komisia.id,
      criteria: {
        create: [
          {
            key: "PROSPECH",
            name: "Študijný prospech",
            description:
              "Vážený študijný priemer z akademického IS. Priemer 1,0 dáva plný počet bodov, 4,0 žiadne.",
            weight: 40,
          },
          {
            key: "VZDIALENOST",
            name: "Vzdialenosť bydliska",
            description:
              "Vzdialenosť trvalého bydliska od univerzity. Plný počet bodov od 400 km.",
            weight: 30,
          },
          {
            key: "SOCIALNA",
            name: "Sociálna situácia",
            description:
              "Posúdenie referenta na stupnici 0–3 podľa overeného potvrdenia o príjme.",
            weight: 20,
          },
          {
            key: "ZDRAVOTNA",
            name: "Osobitné potreby",
            description:
              "Plný počet bodov pri overenom zdravotnom doklade.",
            weight: 10,
          },
        ],
      },
    },
  });
  await db.auditLog.create({
    data: {
      actorId: komisia.id,
      action: "KRITERIA_SCHVALENE",
      entityType: "Period",
      entityId: period.id,
      detail: JSON.stringify({ PROSPECH: 40, VZDIALENOST: 30, SOCIALNA: 20, ZDRAVOTNA: 10 }),
      createdAt: days(-21),
    },
  });

  console.log("Študenti a žiadosti…");
  const people = shuffle([
    ...FEMALE.slice(1).map(([f, l]) => [f, l]),
    ...MALE.slice(1).map(([f, l]) => [f, l]),
  ]);
  // Demo účty sú na začiatku, aby mali stabilné AIS ID.
  people.unshift(MALE[0], FEMALE[0]);

  const statusPlan: ApplicationStatus[] = [
    ...Array<ApplicationStatus>(16).fill("VYHODNOCUJE_SA"),
    ...Array<ApplicationStatus>(8).fill("OVERUJE_SA"),
    ...Array<ApplicationStatus>(5).fill("PODANA"),
    ...Array<ApplicationStatus>(3).fill("CAKA_NA_DOPLNENIE"),
    ...Array<ApplicationStatus>(2).fill("ROZPRACOVANA"),
    "ZRUSENA",
  ];

  const students: { id: string; aisId: string; name: string; email: string; index: number }[] = [];
  const NOTES = [
    "Chcel by som bývať s Jakubom Hudcom, sme spolužiaci z ročníka.",
    "Mám alergiu na prach, prosím o izbu bez kobercov, ak je to možné.",
    "Popri štúdiu pracujem v noci, uvítam jednolôžkovú izbu.",
    null,
    null,
    null,
  ];

  for (const [index, [first, last]] of people.entries()) {
    const aisId = `AIS-${410000 + (index === 1 ? 1 : index === 0 ? 2 : index + 10)}`;
    const login =
      index < 2 ? strip(last) : `${strip(last).slice(0, 7)}${index + 3}`;
    const student = await db.user.create({
      data: {
        login,
        email: `${strip(first)}.${strip(last)}@student.uniba.example`,
        name: `${first} ${last}`,
        role: "STUDENT",
        aisId,
        totpSecret: generateSecret(),
      },
    });

    students.push({ id: student.id, aisId, name: student.name, email: student.email, index });

    // Lucia (index 1) je čistý demo účet bez žiadosti.
    if (index === 1) continue;

    const status: ApplicationStatus =
      index === 0 ? "CAKA_NA_DOPLNENIE" : (statusPlan[index - 2] ?? "PODANA");
    const ais = aisRecordFor(aisId);
    const claimsSocial = index === 0 || rand() < 0.45;
    const claimsHealth = rand() < 0.15;
    const submittedAt =
      status === "ROZPRACOVANA"
        ? null
        : days(-10 + Math.floor(rand() * 9));
    const reviewed = ["VYHODNOCUJE_SA"].includes(status);

    const application = await db.application.create({
      data: {
        studentId: student.id,
        periodId: period.id,
        status,
        aisYear: ais.year,
        aisProgram: ais.program,
        aisFaculty: ais.faculty,
        aisGpa: ais.gpa,
        aisDistanceKm: ais.distanceKm,
        aisSyncedAt: submittedAt ?? days(-8),
        phone: `+421 9${Math.floor(10 + rand() * 89)} ${Math.floor(100 + rand() * 899)} ${Math.floor(100 + rand() * 899)}`,
        preferredBeds: pick([1, 2, 2, 2, 3, null]),
        note: pick(NOTES),
        claimsSocial,
        claimsHealth,
        socialLevel: reviewed && claimsSocial ? 1 + Math.floor(rand() * 3) : null,
        submittedAt,
        cancelledAt: status === "ZRUSENA" ? days(-4) : null,
        preferences: {
          create: shuffle(dorms)
            .slice(0, 2 + Math.floor(rand() * 3))
            .map((dorm, i) => ({ dormId: dorm.id, rank: i + 1 })),
        },
      },
    });

    // História žiadosti v auditnom zázname a e-mailoch.
    if (submittedAt) {
      const name = `${first} ${last}`;
      const email = student.email;
      await log(student.id, "ZIADOST_PODANA", "Application", application.id, submittedAt);
      await log(student.id, "STAV_ZMENENY", "Application", application.id, submittedAt, {
        from: "ROZPRACOVANA",
        to: "PODANA",
      });
      await statusMail(email, name, "Podaná", "Žiadosť sme prijali. Referent ju čoskoro začne overovať.", submittedAt);
      const reviewStart = new Date(Math.min(submittedAt.getTime() + 86_400_000, days(-2).getTime()));
      if (["OVERUJE_SA", "CAKA_NA_DOPLNENIE", "VYHODNOCUJE_SA"].includes(status)) {
        await log(referent.id, "STAV_ZMENENY", "Application", application.id, reviewStart, {
          from: "PODANA",
          to: "OVERUJE_SA",
        });
        await statusMail(email, name, "Overuje sa", "Referent kontroluje vaše doklady.", reviewStart);
      }
      if (status === "CAKA_NA_DOPLNENIE") {
        await log(referent.id, "STAV_ZMENENY", "Application", application.id, days(-1), {
          from: "OVERUJE_SA",
          to: "CAKA_NA_DOPLNENIE",
        });
      }
      if (status === "VYHODNOCUJE_SA") {
        await log(referent.id, "STAV_ZMENENY", "Application", application.id, days(-1), {
          from: "OVERUJE_SA",
          to: "VYHODNOCUJE_SA",
        });
        await statusMail(email, name, "Vyhodnocuje sa", "Doklady sú v poriadku. Žiadosť čaká na výpočet poradia.", days(-1));
      }
      if (status === "ZRUSENA") {
        await log(student.id, "ZIADOST_ZRUSENA", "Application", application.id, days(-4));
        await log(student.id, "STAV_ZMENENY", "Application", application.id, days(-4), {
          from: "PODANA",
          to: "ZRUSENA",
        });
      }
    }

    const docs: [DocumentType, DocumentStatus, string | null][] = [];
    if (claimsSocial) {
      if (index === 0) {
        docs.push([
          "PRIJEM",
          "DOPLNIT",
          "Na potvrdení chýba pečiatka zamestnávateľa. Nahrajte prosím potvrdenú verziu.",
        ]);
      } else if (status === "CAKA_NA_DOPLNENIE") {
        docs.push(["PRIJEM", "DOPLNIT", "Potvrdenie je za rok 2024, potrebujeme rok 2025."]);
      } else if (reviewed) {
        docs.push(["PRIJEM", "OVERENY", null]);
      } else if (status !== "ROZPRACOVANA") {
        docs.push(["PRIJEM", "NAHRANY", null]);
      }
    }
    if (claimsHealth && status !== "ROZPRACOVANA") {
      docs.push(["ZDRAVOTNY", reviewed ? "OVERENY" : "NAHRANY", null]);
    }

    for (const [type, docStatus, note] of docs) {
      const fileName =
        type === "PRIJEM" ? "potvrdenie-o-prijme.pdf" : "lekarska-sprava.pdf";
      const pdf = demoPdf(`${first} ${last} ${type}`);
      const doc = await db.document.create({
        data: {
          applicationId: application.id,
          type,
          status: docStatus,
          fileName,
          mimeType: "application/pdf",
          size: pdf.length,
          storageKey: await storeEncrypted(pdf),
          reviewNote: note,
          reviewedBy: docStatus === "NAHRANY" ? null : referent.id,
          reviewedAt: docStatus === "NAHRANY" ? null : days(-1),
          retainUntil: days(350),
          uploadedAt: submittedAt ?? days(-8),
        },
      });
      await log(student.id, "DOKLAD_NAHRANY", "Document", doc.id, doc.uploadedAt, {
        applicationId: application.id,
        type,
        fileName,
      });
      if (docStatus === "DOPLNIT") {
        await db.emailLog.create({
          data: {
            to: student.email,
            subject: `Doplňte doklad: ${type === "PRIJEM" ? "Potvrdenie o príjme" : "Zdravotný doklad"}`,
            body: `Dobrý deň, ${first} ${last},\n\nk vašej žiadosti o ubytovanie potrebujeme doplniť doklad.\n\nPoznámka referenta: ${note}\n\nUbytovacie oddelenie`,
            status: "LOG",
            createdAt: days(-1),
          },
        });
      }
      if (docStatus === "OVERENY" && type === "PRIJEM") {
        await log(referent.id, "SOCIALNA_SITUACIA_POSUDENA", "Application", application.id, days(-1), {
          from: null,
          to: application.socialLevel,
        });
      }
      if (docStatus !== "NAHRANY") {
        await db.auditLog.create({
          data: {
            actorId: referent.id,
            action:
              docStatus === "OVERENY" ? "DOKLAD_SCHVALENY" : "DOKLAD_VYZIADANE_DOPLNENIE",
            entityType: "Document",
            entityId: doc.id,
            detail: JSON.stringify({ applicationId: application.id, type, note }),
            createdAt: days(-1),
          },
        });
      }
    }
  }

  await seedPreviousYear({ students, dorms: dorms.map((d) => d.id), referentId: referent.id, komisiaId: komisia.id, log });

  const counts = {
    users: await db.user.count(),
    applications: await db.application.count(),
    documents: await db.document.count(),
    places: (await db.roomType.aggregate({ _sum: { capacity: true } }))._sum.capacity,
  };
  console.log("Hotovo:", counts);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

type Log = (
  actorId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  createdAt: Date,
  detail?: Record<string, unknown>,
) => Promise<unknown>;

/**
 * Minulý akademický rok – uzavreté konanie s potvrdeným výpočtom poradia,
 * prideleniami, náhradníkmi, odvolaniami a dokladmi zmazanými po uplynutí doby uchovávania.
 */
async function seedPreviousYear({
  students,
  dorms,
  referentId,
  komisiaId,
  log,
}: {
  students: { id: string; aisId: string; name: string; email: string; index: number }[];
  dorms: string[];
  referentId: string;
  komisiaId: string;
  log: Log;
}) {
  console.log("Minulý akademický rok…");
  const year = today.getFullYear();
  const current = await db.criterion.findMany({ where: { period: { isActive: true } } });
  const prev = await db.period.create({
    data: {
      academicYear: `${year}/${String((year + 1) % 100).padStart(2, "0")}`,
      submitFrom: days(-377),
      submitTo: days(-317),
      editTo: days(-317),
      appealTo: days(-270),
      isActive: false,
      criteriaApprovedAt: days(-390),
      criteriaApprovedBy: komisiaId,
      criteria: {
        create: current.map(({ key, name, description, weight }) => ({ key, name, description, weight })),
      },
    },
    include: { criteria: true },
  });
  await log(komisiaId, "KRITERIA_SCHVALENE", "Period", prev.id, days(-390), Object.fromEntries(prev.criteria.map((c) => [c.key, c.weight])));

  const participants = students.filter((s) => s.index >= 2).slice(0, 22);
  const owner = new Map<string, (typeof participants)[number]>();
  const candidates: Candidate[] = [];

  for (const student of participants) {
    const ais = aisRecordFor(student.aisId);
    const gpa = Math.round(Math.min(4, Math.max(1, ais.gpa + (rand() - 0.5) * 0.4)) * 100) / 100;
    const claimsSocial = rand() < 0.4;
    const claimsHealth = rand() < 0.12;
    const socialLevel = claimsSocial ? 1 + Math.floor(rand() * 3) : null;
    const submittedAt = days(-376 + Math.floor(rand() * 50));
    const preferences = shuffle(dorms).slice(0, 2 + Math.floor(rand() * 3));
    const preferredBeds = pick([1, 2, 2, 3, null]);

    const app = await db.application.create({
      data: {
        studentId: student.id,
        periodId: prev.id,
        status: "VYHODNOCUJE_SA",
        aisYear: Math.max(1, ais.year - 1),
        aisProgram: ais.program,
        aisFaculty: ais.faculty,
        aisGpa: gpa,
        aisDistanceKm: ais.distanceKm,
        aisSyncedAt: days(-316),
        phone: `+421 9${Math.floor(10 + rand() * 89)} ${Math.floor(100 + rand() * 899)} ${Math.floor(100 + rand() * 899)}`,
        preferredBeds,
        claimsSocial,
        claimsHealth,
        socialLevel,
        submittedAt,
        createdAt: submittedAt,
        preferences: { create: preferences.map((dormId, i) => ({ dormId, rank: i + 1 })) },
      },
    });
    owner.set(app.id, student);
    await log(student.id, "ZIADOST_PODANA", "Application", app.id, submittedAt);

    // Doklady minulého roka sú už po uplynutí doby uchovávania zmazané (E.04).
    const types: DocumentType[] = [...(claimsSocial ? ["PRIJEM" as const] : []), ...(claimsHealth ? ["ZDRAVOTNY" as const] : [])];
    for (const type of types) {
      const doc = await db.document.create({
        data: {
          applicationId: app.id,
          type,
          status: "OVERENY",
          fileName: type === "PRIJEM" ? "potvrdenie-o-prijme.pdf" : "lekarska-sprava.pdf",
          mimeType: "application/pdf",
          size: 48_000 + Math.floor(rand() * 200_000),
          storageKey: randomBytes(16).toString("hex"),
          reviewedBy: referentId,
          reviewedAt: days(-322),
          retainUntil: days(-4),
          purgedAt: days(-3),
          uploadedAt: submittedAt,
        },
      });
      await log(referentId, "DOKLAD_SCHVALENY", "Document", doc.id, days(-322), { applicationId: app.id, type });
      await log(null, "DOKLAD_ZMAZANY_RETENCIA", "Document", doc.id, days(-3), { applicationId: app.id, type });
    }

    candidates.push({
      applicationId: app.id,
      gpa,
      distanceKm: ais.distanceKm,
      socialLevel,
      healthApproved: claimsHealth,
      submittedAt,
      preferredBeds,
      preferences,
    });
  }

  const criteria: CriterionWeight[] = prev.criteria
    .map((c) => ({ key: c.key, name: c.name, weight: c.weight }))
    .sort((a, b) => CRITERIA_ORDER.indexOf(a.key) - CRITERIA_ORDER.indexOf(b.key));
  const rooms = await db.roomType.findMany();
  const ranked = rank(criteria, candidates);
  const proposal = allocate(
    ranked,
    rooms.map((r) => ({ roomTypeId: r.id, dormId: r.dormId, beds: r.beds, free: r.capacity })),
  );

  const run = await db.rankingRun.create({
    data: {
      periodId: prev.id,
      createdBy: referentId,
      createdAt: days(-316),
      criteriaSnapshot: JSON.stringify(criteria),
      confirmedAt: days(-315),
      confirmedBy: referentId,
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
  const assigned = ranked.filter((r) => proposal.get(r.applicationId));
  const waitlisted = ranked.filter((r) => !proposal.get(r.applicationId));
  await log(referentId, "PORADIE_VYPOCITANE", "RankingRun", run.id, days(-316), {
    applications: ranked.length,
    proposed: assigned.length,
  });
  await log(referentId, "PRIDELENIE_POTVRDENE", "RankingRun", run.id, days(-315), {
    assigned: assigned.length,
    waitlisted: waitlisted.length,
  });

  for (const r of ranked) {
    const roomTypeId = proposal.get(r.applicationId);
    const student = owner.get(r.applicationId)!;
    const to = roomTypeId ? "PRIDELENA" : "NEPRIDELENA";
    if (roomTypeId) {
      await db.allocation.create({
        data: {
          applicationId: r.applicationId,
          roomTypeId,
          runId: run.id,
          confirmedBy: referentId,
          confirmedAt: days(-315),
        },
      });
    }
    await db.application.update({ where: { id: r.applicationId }, data: { status: to } });
    await log(referentId, "STAV_ZMENENY", "Application", r.applicationId, days(-315), { from: "VYHODNOCUJE_SA", to });
    await db.emailLog.create({
      data: {
        to: student.email,
        subject: `Stav vašej žiadosti o ubytovanie: ${roomTypeId ? "Miesto pridelené" : "Náhradník"}`,
        body: `Dobrý deň, ${student.name},\n\n${roomTypeId ? "máte pridelené miesto na internáte." : "miesto vám v prvom kole nevyšlo, ste v poradí náhradníkov a môžete sa odvolať."}\n\nUbytovacie oddelenie`,
        status: "LOG",
        createdAt: days(-315),
      },
    });
  }

  const appeals = [
    {
      text: "Od leta sa zmenila finančná situácia našej rodiny, mama prišla o prácu. Prikladám potvrdenie z úradu práce, ktoré som v čase podania žiadosti ešte nemal(a).",
      upheld: true,
      adjustment: 4,
      note: "Komisia uznala zmenu sociálnej situácie a pripočítala 4 body. Voľné miesto zatiaľ nie je, ostávate prvý medzi náhradníkmi.",
    },
    {
      text: "Nesúhlasím s výsledkom, kamarát s horším priemerom miesto dostal.",
      upheld: false,
      adjustment: null,
      note: "Pridelenie zohľadňuje aj vzdialenosť bydliska a preferencie internátov. Výpočet je v poriadku, odvolanie zamietame.",
    },
  ];
  for (const [i, a] of appeals.entries()) {
    const r = waitlisted[i];
    if (!r) break;
    const student = owner.get(r.applicationId)!;
    const appeal = await db.appeal.create({
      data: {
        applicationId: r.applicationId,
        text: a.text,
        status: a.upheld ? "UZNANE" : "ZAMIETNUTE",
        pointsAdjustment: a.adjustment,
        decisionNote: a.note,
        decidedBy: komisiaId,
        decidedAt: days(-290 + i),
        createdAt: days(-305 + i),
      },
    });
    await log(student.id, "ODVOLANIE_PODANE", "Appeal", appeal.id, days(-305 + i), { applicationId: r.applicationId });
    await log(student.id, "STAV_ZMENENY", "Application", r.applicationId, days(-305 + i), { from: "NEPRIDELENA", to: "ODVOLANIE" });
    if (a.adjustment) {
      await log(komisiaId, "BODY_ZMENENE", "Application", r.applicationId, days(-290 + i), { appealId: appeal.id, adjustment: a.adjustment });
    }
    await log(komisiaId, "ODVOLANIE_ROZHODNUTE", "Appeal", appeal.id, days(-290 + i), {
      applicationId: r.applicationId,
      upheld: a.upheld,
    });
    await log(komisiaId, "STAV_ZMENENY", "Application", r.applicationId, days(-290 + i), { from: "ODVOLANIE", to: "NEPRIDELENA" });
    await db.emailLog.create({
      data: {
        to: student.email,
        subject: a.upheld ? "Odvolaniu sa vyhovelo" : "Odvolanie bolo zamietnuté",
        body: `Dobrý deň, ${student.name},\n\nubytovacia komisia rozhodla o vašom odvolaní.\n\nOdôvodnenie: ${a.note}\n\nUbytovacie oddelenie`,
        status: "LOG",
        createdAt: days(-290 + i),
      },
    });
  }
}
