"use client";

import { useActionState, useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { describedBy, Field, FieldError, Input, Select } from "@/components/ui/field";
import { Section } from "@/components/ui/page-header";
import { addDorm, addRoomType, updateCapacity, type ActionResult } from "./actions";

export function CapacityInput({
  roomTypeId,
  label,
  capacity,
  min,
}: {
  roomTypeId: string;
  label: string;
  capacity: number;
  min: number;
}) {
  const [value, setValue] = useState(String(capacity));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const dirty = value !== String(capacity);
  const inputId = `capacity-${roomTypeId}`;

  const save = () =>
    startTransition(async () => {
      const result = await updateCapacity(roomTypeId, Number(value));
      if (result.ok) {
        setError(null);
        setSaved(true);
      } else setError(result.error);
    });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="flex flex-col gap-1.5"
    >
      <div className="flex items-center gap-2">
        <Input
          id={inputId}
          size="sm"
          aria-label={label}
          type="number"
          inputMode="numeric"
          min={min}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(inputId, { error })}
          className="w-20"
        />
        {dirty ? (
          <Button type="submit" size="sm" disabled={pending}>
            Uložiť
          </Button>
        ) : saved ? (
          <span role="status" className="text-sm font-medium text-ok">
            Uložené
          </span>
        ) : null}
      </div>
      {error ? (
        <div className="max-w-56">
          <FieldError id={`${inputId}-error`} role="alert">
            {error}
          </FieldError>
        </div>
      ) : null}
    </form>
  );
}

export function AddRoomForm({ dormId, existing }: { dormId: string; existing: number[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(addRoomType, null);
  const options = [1, 2, 3, 4].filter((b) => !existing.includes(b));
  if (options.length === 0) return null;

  if (!open) {
    return (
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Pridať typ izby
      </Button>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-end gap-x-4 gap-y-3">
      <input type="hidden" name="dormId" value={dormId} />
      <Field label="Typ izby" htmlFor={`beds-${dormId}`}>
        <Select id={`beds-${dormId}`} name="beds" className="w-44">
          {options.map((b) => (
            <option key={b} value={b}>
              {b}-lôžková
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Kapacita" htmlFor={`cap-${dormId}`}>
        <Input id={`cap-${dormId}`} name="capacity" type="number" min={0} defaultValue={0} className="w-24" />
      </Field>
      <Button type="submit" disabled={pending}>
        Pridať
      </Button>
      <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
        Zrušiť
      </Button>
      {state && !state.ok ? (
        <div className="w-full">
          <FieldError role="alert">{state.error}</FieldError>
        </div>
      ) : null}
    </form>
  );
}

export function AddDormForm() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(addDorm, null);

  return (
    <Section id="novy-internat" title="Nový internát" description="Typy izieb a kapacity doplníte po pridaní.">
      <form action={action} className="grid gap-5 sm:grid-cols-[1fr_7rem_1.4fr_auto] sm:items-end sm:gap-4">
        <Field label="Názov" htmlFor="dorm-name">
          <Input id="dorm-name" name="name" required placeholder="Napríklad Mladosť" />
        </Field>
        <Field label="Skratka" htmlFor="dorm-code">
          <Input id="dorm-code" name="code" required maxLength={4} placeholder="ML" className="uppercase" />
        </Field>
        <Field label="Adresa" htmlFor="dorm-address">
          <Input id="dorm-address" name="address" required />
        </Field>
        <Button type="submit" disabled={pending}>
          Pridať internát
        </Button>
      </form>
      {state && !state.ok ? (
        <Alert tone="bad" role="alert" className="mt-4">
          {state.error}
        </Alert>
      ) : null}
    </Section>
  );
}
