import type { Document } from "@/generated/prisma/client";
import { cn } from "@/lib/cn";
import { formatDateTime, formatFileSize } from "@/lib/format";
import { DOCUMENT_STATUS } from "@/lib/status";
import { Badge } from "./ui/badge";

export function DocumentRow({ doc, compact = false }: { doc: Document; compact?: boolean }) {
  const ext = doc.fileName.split(".").pop()?.toUpperCase().slice(0, 4) ?? "SÚBOR";
  return (
    <div
      className={cn(
        "flex items-center gap-3",
        !compact && "rounded-field border border-line bg-surface px-3.5 py-3",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid shrink-0 place-items-center rounded-tag border border-line-strong bg-surface font-mono font-semibold text-ink-soft",
          compact ? "h-7 w-8 text-[0.5625rem]" : "h-9 w-10 text-[0.625rem]",
        )}
      >
        {ext}
      </span>
      <div className="min-w-0 flex-1">
        {doc.purgedAt ? (
          <p className="truncate font-medium text-muted line-through">{doc.fileName}</p>
        ) : (
          <a
            href={`/doklad/${doc.id}`}
            target="_blank"
            rel="noopener"
            className="block truncate font-medium text-pine underline decoration-pine/30 underline-offset-4 hover:decoration-pine"
          >
            {doc.fileName}
          </a>
        )}
        <p className="text-sm text-muted">
          {formatFileSize(doc.size)}, nahrané {formatDateTime(doc.uploadedAt)}
        </p>
      </div>
      {compact ? (
        <Badge tone={DOCUMENT_STATUS[doc.status].tone}>{DOCUMENT_STATUS[doc.status].label}</Badge>
      ) : null}
    </div>
  );
}
