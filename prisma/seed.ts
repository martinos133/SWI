import "dotenv/config";
import { rm } from "node:fs/promises";
import path from "node:path";
import type {
  ApplicationStatus,
  DocumentStatus,
  DocumentType,
} from "../src/generated/prisma/enums";
import { generateSecret } from "otplib";
import { aisRecordFor } from "../src/lib/ais";
import { createPrismaClient } from "../src/lib/prisma";
import { storeEncrypted } from "../src/lib/storage";

const db = createPrismaClient();

// Deterministický generátor, aby seed dal vždy rovnaké dáta.
let state = 20262027;
const rand = () => {
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  return state / 2 ** 32;
};
const pick = <T,>(items: T[]) => items[Math.floor(rand() * items.length)];
const shuffle = <T,>(items: T[]) => [...items].sort(() => rand() - 0.5);

const day = (iso: string) => new Date(`${iso}T12:00:00+02:00`);

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
  await rm(path.join(process.cwd(), "storage", "documents"), {
    recursive: true,
    force: true,
  });
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

  console.log("Zamestnanci…");
  const referent = await db.user.create({
    data: {
      login: "kovacova",
      email: "jana.kovacova@uniba.example",
      name: "Jana Kováčová",
      role: "REFERENT",
      totpSecret: generateSecret(),
    },
  });
  const komisia = await db.user.create({
    data: {
      login: "horvath",
      email: "peter.horvath@uniba.example",
      name: "prof. Peter Horváth",
      role: "KOMISIA",
      totpSecret: generateSecret(),
    },
  });
  await db.user.create({
    data: {
      login: "balaz",
      email: "milan.balaz@uniba.example",
      name: "Milan Baláž",
      role: "SPRAVCA",
      totpSecret: generateSecret(),
    },
  });

  console.log("Internáty…");
  const dormData = [
    {
      code: "ML",
      name: "Mladosť",
      address: "Staré Grunty 53, Bratislava",
      rooms: [
        [2, 6],
        [3, 6],
      ],
    },
    {
      code: "DR",
      name: "Družba",
      address: "Botanická 25, Bratislava",
      rooms: [
        [1, 2],
        [2, 6],
      ],
    },
    {
      code: "LS",
      name: "Ľudovít Štúr",
      address: "Mlynská dolina, Bratislava",
      rooms: [[2, 4]],
    },
    {
      code: "HP",
      name: "Horský park",
      address: "Jaskový rad 9, Bratislava",
      rooms: [
        [1, 2],
        [2, 4],
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
      academicYear: "2027/28",
      submitFrom: day("2026-10-01"),
      submitTo: day("2026-11-30"),
      editTo: day("2026-11-30"),
      appealTo: day("2027-01-15"),
      isActive: true,
      criteriaApprovedAt: day("2026-09-22"),
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
      createdAt: day("2026-09-22"),
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
        : day(`2026-10-${String(2 + Math.floor(rand() * 9)).padStart(2, "0")}`);
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
        aisSyncedAt: submittedAt ?? day("2026-10-05"),
        phone: `+421 9${Math.floor(10 + rand() * 89)} ${Math.floor(100 + rand() * 899)} ${Math.floor(100 + rand() * 899)}`,
        preferredBeds: pick([1, 2, 2, 2, 3, null]),
        claimsSocial,
        claimsHealth,
        socialLevel: reviewed && claimsSocial ? 1 + Math.floor(rand() * 3) : null,
        submittedAt,
        cancelledAt: status === "ZRUSENA" ? day("2026-10-09") : null,
        preferences: {
          create: shuffle(dorms)
            .slice(0, 2 + Math.floor(rand() * 3))
            .map((dorm, i) => ({ dormId: dorm.id, rank: i + 1 })),
        },
      },
    });

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
          reviewedAt: docStatus === "NAHRANY" ? null : day("2026-10-11"),
          retainUntil: day("2027-09-30"),
          uploadedAt: submittedAt ?? day("2026-10-05"),
        },
      });
      if (docStatus !== "NAHRANY") {
        await db.auditLog.create({
          data: {
            actorId: referent.id,
            action:
              docStatus === "OVERENY" ? "DOKLAD_SCHVALENY" : "DOKLAD_VYZIADANE_DOPLNENIE",
            entityType: "Document",
            entityId: doc.id,
            detail: JSON.stringify({ applicationId: application.id, note }),
            createdAt: day("2026-10-11"),
          },
        });
      }
    }
  }

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
