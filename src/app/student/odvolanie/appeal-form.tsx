"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { describedBy, Field, Input, Textarea } from "@/components/ui/field";
import { formatFileSize } from "@/lib/format";
import { submitAppeal, type ActionResult } from "../actions";

export function AppealForm() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(submitAppeal, null);
  const [file, setFile] = useState<File | null>(null);
  const [length, setLength] = useState(0);
  const textHint = `${length} / 3000 znakov. Uveďte skutočnosti, ktoré komisia nemusela poznať.`;
  const fileHint = file
    ? `Vybraný súbor: ${formatFileSize(file.size)}. PDF, JPG alebo PNG do 5 MB.`
    : "Doklad, ktorý podporuje odvolanie. PDF, JPG alebo PNG do 5 MB.";

  return (
    <form action={action} className="flex flex-col gap-5">
      <Field label="Dôvod odvolania" htmlFor="text" hint={textHint}>
        <Textarea
          id="text"
          name="text"
          rows={6}
          maxLength={3000}
          required
          aria-describedby={describedBy("text", { hint: textHint })}
          onChange={(e) => setLength(e.target.value.length)}
        />
      </Field>

      <Field label="Príloha (nepovinná)" htmlFor="appeal-file" hint={fileHint} className="max-w-md">
        <Input
          id="appeal-file"
          name="file"
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          aria-describedby={describedBy("appeal-file", { hint: fileHint })}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </Field>

      {state && !state.ok ? (
        <Alert tone="bad" role="alert">
          {state.error}
        </Alert>
      ) : null}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Podávam…" : "Podať odvolanie"}
        </Button>
      </div>
    </form>
  );
}
