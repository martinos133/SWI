"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { describedBy, Field, Input } from "@/components/ui/field";
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
  const error = state && !state.ok ? state.error : undefined;
  const hint = file
    ? `Vybraný súbor: ${formatFileSize(file.size)}. PDF, JPG alebo PNG, najviac 5 MB.`
    : "PDF, JPG alebo PNG, najviac 5 MB";

  return (
    <form
      action={(formData) => {
        action(formData);
        setFile(null);
      }}
      className="flex max-w-md flex-col gap-4"
    >
      <input type="hidden" name="type" value={type} />
      <Field label={replacing ? "Vybrať novú verziu" : "Vybrať súbor"} htmlFor={id} hint={hint} error={error}>
        <Input
          id={id}
          name="file"
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, { hint, error })}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </Field>
      <div>
        <Button type="submit" disabled={pending || !file}>
          {pending ? "Nahrávam…" : "Nahrať doklad"}
        </Button>
      </div>
    </form>
  );
}
