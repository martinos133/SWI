const TZ = "Europe/Bratislava";

const parts = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(d)
    .replace(",", "");

/** "2026-11-30" → Date v danom čase podľa bratislavského pásma (rieši letný čas). */
export function zonedDate(date: string, time: "00:00" | "23:59") {
  for (const offset of ["+01:00", "+02:00"]) {
    const d = new Date(`${date}T${time}:00${offset}`);
    if (parts(d) === `${date} ${time}`) return d;
  }
  return new Date(`${date}T${time}:00+01:00`);
}

/** Date → "YYYY-MM-DD" pre <input type="date"> v bratislavskom pásme. */
export function toDateInput(d: Date) {
  return parts(d).slice(0, 10);
}
