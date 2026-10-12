const TZ = "Europe/Bratislava";

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "–";
  return new Intl.DateTimeFormat("sk-SK", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TZ,
  }).format(new Date(date));
}

export function formatShortDate(date: Date | string | null | undefined) {
  if (!date) return "–";
  return new Intl.DateTimeFormat("sk-SK", {
    day: "numeric",
    month: "numeric",
    timeZone: TZ,
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) return "–";
  return new Intl.DateTimeFormat("sk-SK", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(new Date(date));
}

export function formatNumber(n: number | null | undefined, digits = 2) {
  if (n == null) return "–";
  return new Intl.NumberFormat("sk-SK", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${formatNumber(bytes / 1024 / 1024, 1)} MB`;
}

/** "o 3 dni", "dnes", "pred 2 dňami" */
export function daysUntil(date: Date, now = new Date()) {
  const ms = new Date(date).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0);
  return Math.round(ms / 86_400_000);
}

export function pluralDays(n: number) {
  if (n === 1) return "1 deň";
  if (n >= 2 && n <= 4) return `${n} dni`;
  return `${n} dní`;
}
