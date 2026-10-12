/**
 * Simulácia akademického informačného systému (API.01).
 * Reálne napojenie nahradí iba telo `fetchStudentRecord` – zvyšok aplikácie
 * pracuje s typom `AisRecord`.
 */

export type AisRecord = {
  aisId: string;
  year: number;
  program: string;
  faculty: string;
  /** Vážený študijný priemer 1,0 – 4,0 (nižší je lepší). */
  gpa: number;
  /** Vzdialenosť trvalého bydliska od univerzity v km. */
  distanceKm: number;
  hometown: string;
};

const PROGRAMS: [string, string][] = [
  ["Aplikovaná informatika", "Fakulta matematiky, fyziky a informatiky"],
  ["Informatika", "Fakulta matematiky, fyziky a informatiky"],
  ["Biológia", "Prírodovedecká fakulta"],
  ["Psychológia", "Filozofická fakulta"],
  ["Právo", "Právnická fakulta"],
  ["Všeobecné lekárstvo", "Lekárska fakulta"],
  ["Manažment", "Fakulta managementu"],
  ["Žurnalistika", "Filozofická fakulta"],
];

const TOWNS: [string, number][] = [
  ["Košice", 400],
  ["Prešov", 410],
  ["Humenné", 470],
  ["Banská Bystrica", 210],
  ["Žilina", 200],
  ["Poprad", 330],
  ["Lučenec", 260],
  ["Nitra", 90],
  ["Trnava", 50],
  ["Trenčín", 125],
  ["Rožňava", 330],
  ["Martin", 220],
  ["Bardejov", 450],
  ["Senica", 80],
];

/** Pevne nastavené záznamy pre demo účty, aby sa dali ľahko ukazovať. */
const OVERRIDES: Record<string, Partial<AisRecord>> = {
  "AIS-410001": {
    year: 2,
    program: "Aplikovaná informatika",
    faculty: "Fakulta matematiky, fyziky a informatiky",
    gpa: 1.42,
    distanceKm: 400,
    hometown: "Košice",
  },
};

function hash(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function aisRecordFor(aisId: string): AisRecord {
  const h = hash(aisId);
  const [program, faculty] = PROGRAMS[h % PROGRAMS.length];
  const [hometown, distanceKm] = TOWNS[(h >>> 4) % TOWNS.length];
  const gpa = Math.round((1 + ((h >>> 8) % 2000) / 1000) * 100) / 100;
  return {
    aisId,
    year: 1 + ((h >>> 12) % 5),
    program,
    faculty,
    gpa,
    distanceKm,
    hometown,
    ...OVERRIDES[aisId],
  };
}

export async function fetchStudentRecord(aisId: string): Promise<AisRecord> {
  // Simulovaná latencia vzdialeného systému.
  await new Promise((resolve) => setTimeout(resolve, 120));
  return aisRecordFor(aisId);
}
