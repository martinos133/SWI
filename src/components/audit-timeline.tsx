import type { AuditLog, User } from "@/generated/prisma/client";
import { AUDIT_LABEL } from "@/lib/audit";
import { formatDateTime } from "@/lib/format";
import { DOCUMENT_TYPE, STATUS } from "@/lib/status";

type Entry = AuditLog & { actor: Pick<User, "name"> | null };

/** Ľudsky čitateľné zhrnutie detailu auditného záznamu. */
export function describe(entry: Entry): string | null {
  let d: Record<string, unknown> = {};
  try {
    d = JSON.parse(entry.detail);
  } catch {
    return null;
  }
  switch (entry.action) {
    case "STAV_ZMENENY": {
      const from = STATUS[d.from as keyof typeof STATUS]?.label;
      const to = STATUS[d.to as keyof typeof STATUS]?.label;
      return from && to ? `${from} na ${to.toLowerCase()}` : null;
    }
    case "DOKLAD_NAHRANY":
    case "DOKLAD_SCHVALENY":
    case "DOKLAD_ZAMIETNUTY":
    case "DOKLAD_VYZIADANE_DOPLNENIE": {
      const type = DOCUMENT_TYPE[d.type as keyof typeof DOCUMENT_TYPE]?.label;
      return [type, d.note ? `„${d.note}“` : null].filter(Boolean).join(": ") || null;
    }
    case "SOCIALNA_SITUACIA_POSUDENA":
      return `stupeň ${d.from ?? "–"} na ${d.to ?? "–"}`;
    case "AIS_SYNCHRONIZACIA":
      return d.gpa != null ? `priemer ${d.gpa}, ${d.year}. ročník, ${d.distanceKm} km` : null;
    case "BODY_ZMENENE":
      return d.from != null ? `${d.from} na ${d.to} bodov` : null;
    case "ODVOLANIE_ROZHODNUTE":
      return d.upheld ? "vyhovené" : "zamietnuté";
    default:
      return null;
  }
}

export function AuditTimeline({ entries }: { entries: Entry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted">Zatiaľ bez záznamov.</p>;
  }
  return (
    <ol className="relative flex flex-col gap-5 border-l border-line pl-5">
      {entries.map((entry) => {
        const detail = describe(entry);
        return (
          <li key={entry.id} className="relative">
            <span
              aria-hidden
              className="absolute top-1.5 -left-[1.5625rem] size-2 rounded-full bg-line-strong ring-4 ring-paper"
            />
            <p className="text-sm font-semibold">{AUDIT_LABEL[entry.action] ?? entry.action}</p>
            {detail ? <p className="text-sm text-ink-soft">{detail}</p> : null}
            <p className="mt-0.5 text-xs text-muted">
              {formatDateTime(entry.createdAt)}, {entry.actor?.name ?? "systém"}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
