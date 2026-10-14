import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
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

      <div className="flex flex-col gap-8">
        {dorms.map((dorm) => {
          const cap = dorm.roomTypes.reduce((s, r) => s + r.capacity, 0);
          const used = dorm.roomTypes.reduce((s, r) => s + r._count.allocations, 0);
          return (
            <section key={dorm.id} aria-labelledby={`dorm-${dorm.id}`} className="rounded-panel bg-surface ring-1 ring-line">
              <header className="flex flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
                <div className="flex items-start gap-4">
                  <span className="grid h-12 w-11 shrink-0 place-items-center rounded-t-[1.1rem] rounded-b-[0.6rem] bg-brass-tint text-sm font-extrabold text-brass-deep">
                    {dorm.code}
                  </span>
                  <div>
                    <h2 id={`dorm-${dorm.id}`} className="text-lg font-bold">
                      {dorm.name}
                    </h2>
                    <p className="text-sm text-muted">{dorm.address}</p>
                  </div>
                </div>
                <p className="text-sm text-muted sm:text-right">
                  <span className="text-2xl font-extrabold text-ink">{cap}</span> miest
                  <br />
                  {used} pridelených
                </p>
              </header>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[32rem] text-left">
                  <thead className="border-y border-line text-sm text-muted">
                    <tr>
                      <th className="px-5 py-2.5 font-medium sm:px-6">Typ izby</th>
                      <th className="px-5 py-2.5 font-medium">Obsadenosť</th>
                      <th className="px-5 py-2.5 font-medium sm:px-6">Kapacita</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {dorm.roomTypes.map((room) => {
                      const pct = room.capacity ? Math.round((room._count.allocations / room.capacity) * 100) : 0;
                      return (
                        <tr key={room.id}>
                          <td className="px-5 py-3 font-medium sm:px-6">{room.label}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <span aria-hidden className="h-1.5 w-24 overflow-hidden rounded-full bg-sunken">
                                <span className="block h-full rounded-full bg-pine" style={{ width: `${pct}%` }} />
                              </span>
                              <span className="text-sm text-muted">
                                {room._count.allocations} z {room.capacity}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3 sm:px-6">
                            <CapacityInput
                              roomTypeId={room.id}
                              label={`Kapacita, ${dorm.name}, ${room.label.toLowerCase()}`}
                              capacity={room.capacity}
                              min={room._count.allocations}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-line px-5 py-4 sm:px-6">
                <AddRoomForm dormId={dorm.id} existing={dorm.roomTypes.map((r) => r.beds)} />
              </div>
            </section>
          );
        })}

        <AddDormForm />
      </div>
    </>
  );
}
