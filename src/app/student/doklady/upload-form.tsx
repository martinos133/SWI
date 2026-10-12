"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import type { DocumentType } from "@/generated/prisma/enums";
import { formatFileSize } from "@/lib/format";
import { uploadDocument, type ActionResult } from "../actions";

export function UploadForm({ type, replacing }: { type: DocumentType; replacing: boolean }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    uploadDocument,
    null,
  );
  const [file, setFile] = useState<File | null>(null);
  const id = `file-${type}`;

  return (
    <form
      action={(formData) => {
        action(formData);
        setFile(null);
      }}
      className="flex flex-col gap-3"
    >
      <input type="hidden" name="type" value={type} />
      <label
        htmlFor={id}
        className="flex cursor-pointer flex-col items-center gap-1 rounded-field border-2 border-dashed border-line-strong px-4 py-6 text-center transition-colors hover:border-pine/50 hover:bg-pine-tint/40 has-[:focus-visible]:border-brass"
      >
        <svg viewBox="0 0 24 24" className="size-6 text-muted" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M12 15V4m0 0-4 4m4-4 4 4M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {file ? (
          <span className="font-semibold">
            {file.name} <span className="font-normal text-muted">({formatFileSize(file.size)})</span>
          </span>
        ) : (
          <span className="font-semibold">{replacing ? "Vybrať novú verziu" : "Vybrať súbor"}</span>
        )}
        <span className="text-sm text-muted">PDF, JPG alebo PNG, najviac 5 MB</span>
        <input
          id={id}
          name="file"
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          required
          className="sr-only"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending || !file}>
          {pending ? "Nahrávam…" : "Nahrať doklad"}
        </Button>
        {state && !state.ok ? (
          <p role="alert" className="text-sm text-bad">
            {state.error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
