import clsx from "clsx";
import type { Document } from "@/generated/prisma/client";
import { formatDateTime, formatFileSize } from "@/lib/format";
import { DOCUMENT_STATUS } from "@/lib/status";
import { Badge } from "./ui/badge";

export function DocumentRow({ doc, compact = false }: { doc: Document; compact?: boolean }) {
  const ext = doc.fileName.split(".").pop()?.toUpperCase().slice(0, 4) ?? "SÚBOR";
  return (
    <div
      className={clsx(
        "flex items-center gap-3",
        compact ? "" : "rounded-field bg-paper px-3.5 py-3",
      )}
    >
      <span
        aria-hidden
        className={clsx(
          "grid shrink-0 place-items-center rounded-[0.35rem] bg-surface font-bold text-muted ring-1 ring-line",
          compact ? "h-7 w-6 text-[0.5rem]" : "h-10 w-8 text-[0.625rem]",
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
            className="block truncate font-medium underline-offset-2 hover:underline"
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
