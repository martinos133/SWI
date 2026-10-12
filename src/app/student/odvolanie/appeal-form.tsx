"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { formatFileSize } from "@/lib/format";
import { submitAppeal, type ActionResult } from "../actions";

export function AppealForm() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(submitAppeal, null);
  const [file, setFile] = useState<File | null>(null);
  const [length, setLength] = useState(0);

  return (
    <form action={action} className="mt-5 flex flex-col gap-5">
      <Field
        label="Dôvod odvolania"
        htmlFor="text"
        hint={`${length} / 3000 znakov. Uveďte skutočnosti, ktoré komisia nemusela poznať.`}
      >
        <Textarea
          id="text"
          name="text"
          rows={6}
          maxLength={3000}
          required
          onChange={(e) => setLength(e.target.value.length)}
        />
      </Field>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">Príloha (nepovinná)</span>
        <label
          htmlFor="appeal-file"
          className="flex cursor-pointer items-center gap-3 rounded-field border-2 border-dashed border-line-strong px-4 py-3 transition-colors hover:border-pine/50 hover:bg-pine-tint/40 has-[:focus-visible]:border-brass"
        >
          <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <path d="m20 11.5-7.8 7.8a5 5 0 0 1-7.1-7.1l7.8-7.8a3.3 3.3 0 0 1 4.7 4.7l-7.8 7.8a1.7 1.7 0 0 1-2.4-2.4l7.1-7.1" strokeLinecap="round" />
          </svg>
          <span className="text-sm">
            {file ? (
              <>
                <span className="font-semibold">{file.name}</span>{" "}
                <span className="text-muted">({formatFileSize(file.size)})</span>
              </>
            ) : (
              <span className="text-muted">Pripojiť doklad – PDF, JPG alebo PNG do 5 MB</span>
            )}
          </span>
          <input
            id="appeal-file"
            name="file"
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            className="sr-only"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Podávam…" : "Podať odvolanie"}
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
