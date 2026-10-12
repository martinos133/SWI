"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export type ActionResult = { ok: true } | { ok: false; error: string };

const BEDS_LABEL: Record<number, string> = {
  1: "Jednolôžková izba",
  2: "Dvojlôžková izba",
  3: "Trojlôžková izba",
  4: "Štvorlôžková izba",
};

/** Zmena kapacity typu izby (S.16). Nikdy nie pod počet už pridelených miest (E.07). */
export async function updateCapacity(roomTypeId: string, capacity: number): Promise<ActionResult> {
  const user = await requireUser(["SPRAVCA"]);
  if (!Number.isInteger(capacity) || capacity < 0 || capacity > 2000) {
    return { ok: false, error: "Zadajte celé číslo od 0 do 2000." };
  }
  const room = await db.roomType.findUnique({
    where: { id: roomTypeId },
    include: { _count: { select: { allocations: true } }, dorm: true },
  });
  if (!room) return { ok: false, error: "Typ izby neexistuje." };
  if (capacity < room._count.allocations) {
    return {
      ok: false,
      error: `Pridelených je už ${room._count.allocations} miest, kapacita nemôže byť menšia.`,
    };
  }
  await db.roomType.update({ where: { id: roomTypeId }, data: { capacity } });
  await audit({
    actorId: user.id,
    action: "KAPACITA_ZMENENA",
    entityType: "RoomType",
    entityId: roomTypeId,
    detail: { dorm: room.dorm.name, room: room.label, from: room.capacity, to: capacity },
  });
  revalidatePath("/spravca");
  return { ok: true };
}

const roomSchema = z.object({
  dormId: z.string().min(1),
  beds: z.coerce.number().int().min(1).max(4),
  capacity: z.coerce.number().int().min(0).max(2000),
});

export async function addRoomType(_: unknown, formData: FormData): Promise<ActionResult> {
  const user = await requireUser(["SPRAVCA"]);
  const parsed = roomSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Skontrolujte typ izby a kapacitu." };
  const { dormId, beds, capacity } = parsed.data;

  const exists = await db.roomType.findUnique({ where: { dormId_beds: { dormId, beds } } });
  if (exists) return { ok: false, error: "Tento typ izby už internát má." };

  const room = await db.roomType.create({
    data: { dormId, beds, capacity, label: BEDS_LABEL[beds] },
  });
  await audit({
    actorId: user.id,
    action: "KAPACITA_ZMENENA",
    entityType: "RoomType",
    entityId: room.id,
    detail: { room: room.label, from: 0, to: capacity },
  });
  revalidatePath("/spravca");
  return { ok: true };
}

const dormSchema = z.object({
  name: z.string().trim().min(2, "Vyplňte názov internátu.").max(80),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2,4}$/, "Skratka má 2 až 4 písmená."),
  address: z.string().trim().min(5, "Vyplňte adresu internátu.").max(160),
});

export async function addDorm(_: unknown, formData: FormData): Promise<ActionResult> {
  const user = await requireUser(["SPRAVCA"]);
  const parsed = dormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const exists = await db.dorm.findUnique({ where: { code: parsed.data.code } });
  if (exists) return { ok: false, error: `Skratku ${parsed.data.code} už používa internát ${exists.name}.` };

  const dorm = await db.dorm.create({ data: parsed.data });
  await audit({
    actorId: user.id,
    action: "KAPACITA_ZMENENA",
    entityType: "Dorm",
    entityId: dorm.id,
    detail: { created: dorm.name },
  });
  revalidatePath("/spravca");
  return { ok: true };
}
