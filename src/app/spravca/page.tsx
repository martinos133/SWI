import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Section } from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { allocationsInPeriod } from "@/lib/evaluation";
import { getActivePeriod } from "@/lib/period";
import { AddDormForm, AddRoomForm, CapacityInput } from "./capacity";

export const metadata: Metadata = { title: "Internáty a kapacity" };

export default async function CapacityPage() {
  await requireUser(["SPRAVCA"]);
  const period = await getActivePeriod();
  const dorms = await db.dorm.findMany({
    orderBy: { name: "asc" },
    include: {
      roomTypes: {
        orderBy: { beds: "asc" },
        include: allocationsInPeriod(period?.id ?? ""),
      },
    },
  });

  const total = dorms.flatMap((d) => d.roomTypes).reduce((s, r) => s + r.capacity, 0);
  const taken = dorms.flatMap((d) => d.roomTypes).reduce((s, r) => s + r._count.allocations, 0);

  return (
    <>
      <PageHeader
        title="Internáty a kapacity"
        description={`Spolu ${total} miest na prideľovanie, v akademickom roku ${period?.academicYear ?? "–"} je z nich pridelených ${taken}. Kapacitu nemožno znížiť pod počet pridelených miest.`}
      />

      <div className="flex flex-col gap-6">
        {dorms.map((dorm) => {
          const cap = dorm.roomTypes.reduce((s, r) => s + r.capacity, 0);
          const used = dorm.roomTypes.reduce((s, r) => s + r._count.allocations, 0);
          return (
            <Section
              key={dorm.id}
              id={`dorm-${dorm.id}`}
              flush
              title={
                <span className="flex items-center gap-2.5">
                  <Badge className="font-mono">{dorm.code}</Badge>
                  {dorm.name}
                </span>
              }
              description={dorm.address}
              actions={
                <p className="text-sm text-muted tabular-nums">
                  <span className="font-semibold text-ink">{cap}</span> miest, {used} pridelených
                </p>
              }
            >
              <Table bordered={false} minWidth="32rem">
                <THead>
                  <tr>
                    <TH className="pl-5">Typ izby</TH>
                    <TH align="right">Obsadenosť</TH>
                    <TH className="pr-5">Kapacita</TH>
                  </tr>
                </THead>
                <TBody>
                  {dorm.roomTypes.map((room) => {
                    const pct = room.capacity ? Math.round((room._count.allocations / room.capacity) * 100) : 0;
                    return (
                      <TR key={room.id}>
                        <TD className="pl-5 font-medium">{room.label}</TD>
                        <TD align="right">
                          <div className="flex items-center justify-end gap-3">
                            <span className="text-sm text-ink-soft">
                              {room._count.allocations} z {room.capacity}
                            </span>
                            <span aria-hidden className="h-1.5 w-24 overflow-hidden bg-sunken">
                              <span className="block h-full bg-pine" style={{ width: `${Math.min(100, pct)}%` }} />
                            </span>
                          </div>
                        </TD>
                        <TD className="pr-5">
                          <CapacityInput
                            roomTypeId={room.id}
                            label={`Kapacita, ${dorm.name}, ${room.label.toLowerCase()}`}
                            capacity={room.capacity}
                            min={room._count.allocations}
                          />
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>

              <div className="border-t border-line px-5 py-4">
                <AddRoomForm dormId={dorm.id} existing={dorm.roomTypes.map((r) => r.beds)} />
              </div>
            </Section>
          );
        })}

        <AddDormForm />
      </div>
    </>
  );
}
