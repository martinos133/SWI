"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
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
      className="flex flex-col gap-1"
    >
      <div className="flex items-center gap-2">
        <Input
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
          className="w-20 font-semibold"
        />
        {dirty ? (
          <Button type="submit" size="sm" disabled={pending}>
            Uložiť
          </Button>
        ) : saved ? (
          <span className="text-sm text-ok">Uložené</span>
        ) : null}
      </div>
      {error ? <p className="max-w-56 text-sm text-bad">{error}</p> : null}
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-muted underline underline-offset-2 hover:text-ink"
      >
        Pridať typ izby
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
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
      {state && !state.ok ? <p className="w-full text-sm text-bad">{state.error}</p> : null}
    </form>
  );
}

export function AddDormForm() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(addDorm, null);

  return (
    <section aria-labelledby="novy-internat" className="rounded-panel border border-dashed border-line-strong px-5 py-5 sm:px-6">
      <h2 id="novy-internat" className="font-bold">
        Nový internát
      </h2>
      <p className="mt-0.5 text-sm text-muted">Typy izieb a kapacity doplníte po pridaní.</p>
      <form action={action} className="mt-4 grid gap-4 sm:grid-cols-[1fr_7rem_1.4fr_auto] sm:items-end">
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
      {state && !state.ok ? <p className="mt-3 text-sm text-bad">{state.error}</p> : null}
    </section>
  );
}
