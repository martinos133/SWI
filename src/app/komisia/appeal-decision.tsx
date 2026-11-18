"use client";

import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ChoiceCard, describedBy, Field, Fieldset, Input, Select, Textarea } from "@/components/ui/field";
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

  const roomId = `room-${appealId}`;
  const roomHint = rooms.length === 0 ? "Momentálne nie je voľné žiadne miesto." : undefined;
  const pointsId = `points-${appealId}`;
  const pointsHint = "Nepovinné. Napríklad 5 alebo -2,5. Pôvodný výpočet sa nemení.";
  const noteId = `note-${appealId}`;

  return (
    <div className="flex flex-col gap-5 rounded-panel border border-line bg-paper p-4">
      <Fieldset legend="Rozhodnutie komisie">
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: true, label: "Vyhovieť" },
            { value: false, label: "Zamietnuť" },
          ].map((option) => (
            <ChoiceCard
              key={option.label}
              name={`decision-${appealId}`}
              value={option.value ? "vyhoviet" : "zamietnut"}
              label={option.label}
              checked={upheld === option.value}
              onChange={() => setUpheld(option.value)}
              className="py-2.5"
            />
          ))}
        </div>
      </Fieldset>

      {upheld ? (
        <>
          <Field label={hasPlace ? "Presunúť na iné miesto" : "Prideliť miesto"} htmlFor={roomId} hint={roomHint}>
            <Select
              id={roomId}
              value={roomTypeId}
              onChange={(e) => setRoomTypeId(e.target.value)}
              disabled={rooms.length === 0}
              aria-describedby={describedBy(roomId, { hint: roomHint })}
            >
              <option value="">{hasPlace ? "Ponechať súčasné miesto" : "Bez pridelenia miesta"}</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.label} (voľné {room.free})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Úprava bodov" htmlFor={pointsId} hint={pointsHint}>
            <Input
              id={pointsId}
              inputMode="decimal"
              value={adjustment}
              onChange={(e) => setAdjustment(e.target.value)}
              aria-describedby={describedBy(pointsId, { hint: pointsHint })}
              className="w-28"
            />
          </Field>
        </>
      ) : null}

      {upheld !== null ? (
        <>
          <Field label="Odôvodnenie pre študenta" htmlFor={noteId}>
            <Textarea id={noteId} rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          {error ? (
            <Alert tone="bad" role="alert">
              {error}
            </Alert>
          ) : null}
          <Button onClick={submit} disabled={pending} variant={upheld ? "primary" : "danger"}>
            {pending ? "Ukladám…" : upheld ? "Vyhovieť odvolaniu" : "Zamietnuť odvolanie"}
          </Button>
        </>
      ) : null}
    </div>
  );
}
