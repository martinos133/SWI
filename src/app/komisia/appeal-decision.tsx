"use client";

import clsx from "clsx";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { decideAppeal } from "./actions";

type Room = { id: string; label: string; free: number };

export function AppealDecision({
  appealId,
  rooms,
  hasPlace,
}: {
  appealId: string;
  rooms: Room[];
  hasPlace: boolean;
}) {
  const [upheld, setUpheld] = useState<boolean | null>(null);
  const [roomTypeId, setRoomTypeId] = useState("");
  const [adjustment, setAdjustment] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      if (upheld === null) return;
      const points = adjustment.trim() ? Number(adjustment.replace(",", ".")) : null;
      if (points !== null && !Number.isFinite(points)) {
        setError("Úprava bodov musí byť číslo.");
        return;
      }
      const result = await decideAppeal({
        appealId,
        upheld,
        note,
        roomTypeId: upheld && roomTypeId ? roomTypeId : null,
        pointsAdjustment: upheld ? points : null,
      });
      if (!result.ok) setError(result.error);
    });

  return (
    <div className="flex flex-col gap-4 rounded-panel bg-paper p-4">
      <p className="font-semibold">Rozhodnutie komisie</p>
      <div role="radiogroup" aria-label="Rozhodnutie" className="grid grid-cols-2 gap-2">
        {[
          { value: true, label: "Vyhovieť" },
          { value: false, label: "Zamietnuť" },
        ].map((option) => (
          <button
            key={option.label}
            type="button"
            role="radio"
            aria-checked={upheld === option.value}
            onClick={() => setUpheld(option.value)}
            className={clsx(
              "rounded-field px-3 py-2 text-sm font-semibold ring-1 transition-colors",
              upheld === option.value
                ? option.value
                  ? "bg-ok text-white ring-ok"
                  : "bg-bad text-white ring-bad"
                : "bg-surface ring-line-strong hover:bg-sunken",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {upheld ? (
        <>
          <Field
            label={hasPlace ? "Presunúť na iné miesto" : "Prideliť miesto"}
            htmlFor={`room-${appealId}`}
            hint={rooms.length === 0 ? "Momentálne nie je voľné žiadne miesto." : undefined}
          >
            <Select
              id={`room-${appealId}`}
              value={roomTypeId}
              onChange={(e) => setRoomTypeId(e.target.value)}
              disabled={rooms.length === 0}
            >
              <option value="">{hasPlace ? "Ponechať súčasné miesto" : "Bez pridelenia miesta"}</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.label} (voľné {room.free})
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Úprava bodov"
            htmlFor={`points-${appealId}`}
            hint="Nepovinné. Napríklad 5 alebo -2,5. Pôvodný výpočet sa nemení."
          >
            <Input
              id={`points-${appealId}`}
              inputMode="decimal"
              value={adjustment}
              onChange={(e) => setAdjustment(e.target.value)}
              className="w-28"
            />
          </Field>
        </>
      ) : null}

      {upheld !== null ? (
        <>
          <Field label="Odôvodnenie pre študenta" htmlFor={`note-${appealId}`}>
            <Textarea id={`note-${appealId}`} rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          {error ? (
            <p role="alert" className="text-sm text-bad">
              {error}
            </p>
          ) : null}
          <Button onClick={submit} disabled={pending} variant={upheld ? "primary" : "danger"}>
            {pending ? "Ukladám…" : upheld ? "Vyhovieť odvolaniu" : "Zamietnuť odvolanie"}
          </Button>
        </>
      ) : null}
    </div>
  );
}
