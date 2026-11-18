/**
 * Ochrana druhého faktora pred hádaním kódu (S.07). Nesprávne kódy sa počítajú
 * na konto, nie na session, takže ich nové prihlásenie cez SSO nevynuluje.
 * Po vyčerpaní pokusov sa konto na určitý čas zablokuje.
 */

export const MAX_OTP_FAILURES = 5;
export const OTP_LOCK_MINUTES = 15;

/** Počet celých minút do odblokovania; 0, ak konto nie je zablokované. */
export function lockMinutesLeft(lockedUntil: Date | null, now: Date): number {
  if (!lockedUntil) return 0;
  const ms = lockedUntil.getTime() - now.getTime();
  return ms > 0 ? Math.ceil(ms / 60_000) : 0;
}

/**
 * Vyhodnotí nesprávny kód. `failures` je počet chýb vrátane práve zadaného kódu.
 * Pri dosiahnutí limitu vráti čas, do ktorého sa má konto zablokovať.
 */
export function evaluateFailure(
  failures: number,
  now: Date,
): { lockedUntil: Date; attemptsLeft: 0 } | { lockedUntil: null; attemptsLeft: number } {
  if (failures >= MAX_OTP_FAILURES) {
    return { lockedUntil: new Date(now.getTime() + OTP_LOCK_MINUTES * 60_000), attemptsLeft: 0 };
  }
  return { lockedUntil: null, attemptsLeft: MAX_OTP_FAILURES - failures };
}

/** „1 pokus“, „2 pokusy“, „5 pokusov“. */
export function attemptsLabel(n: number): string {
  return `${n} ${n === 1 ? "pokus" : n >= 2 && n <= 4 ? "pokusy" : "pokusov"}`;
}

/** „1 minútu“, „2 minúty“, „15 minút“. */
export function minutesLabel(n: number): string {
  return `${n} ${n === 1 ? "minútu" : n >= 2 && n <= 4 ? "minúty" : "minút"}`;
}
