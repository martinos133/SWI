import { describe, expect, it } from "vitest";
import {
  attemptsLabel,
  evaluateFailure,
  lockMinutesLeft,
  MAX_OTP_FAILURES,
  minutesLabel,
  OTP_LOCK_MINUTES,
} from "./otp-lockout";

const now = new Date("2026-11-18T10:00:00Z");

describe("evaluateFailure", () => {
  it("pred dosiahnutím limitu iba ubúdajú pokusy", () => {
    expect(evaluateFailure(1, now)).toEqual({ lockedUntil: null, attemptsLeft: MAX_OTP_FAILURES - 1 });
    expect(evaluateFailure(MAX_OTP_FAILURES - 1, now)).toEqual({ lockedUntil: null, attemptsLeft: 1 });
  });

  it("pri dosiahnutí limitu zablokuje konto na stanovený čas", () => {
    const { lockedUntil, attemptsLeft } = evaluateFailure(MAX_OTP_FAILURES, now);
    expect(attemptsLeft).toBe(0);
    expect(lockedUntil?.getTime()).toBe(now.getTime() + OTP_LOCK_MINUTES * 60_000);
  });

  it("zablokuje aj vtedy, keď súbežné pokusy limit prekročia", () => {
    expect(evaluateFailure(MAX_OTP_FAILURES + 2, now).lockedUntil).not.toBeNull();
  });
});

describe("lockMinutesLeft", () => {
  it("nezablokované alebo uplynuté blokovanie vráti 0", () => {
    expect(lockMinutesLeft(null, now)).toBe(0);
    expect(lockMinutesLeft(new Date(now.getTime() - 1), now)).toBe(0);
    expect(lockMinutesLeft(now, now)).toBe(0);
  });

  it("zvyšný čas zaokrúhľuje nahor na celé minúty", () => {
    expect(lockMinutesLeft(new Date(now.getTime() + 1_000), now)).toBe(1);
    expect(lockMinutesLeft(new Date(now.getTime() + 14 * 60_000 + 1), now)).toBe(15);
  });
});

describe("slovenské tvary", () => {
  it("skloňuje pokusy a minúty", () => {
    expect([1, 2, 4, 5].map(attemptsLabel)).toEqual(["1 pokus", "2 pokusy", "4 pokusy", "5 pokusov"]);
    expect([1, 3, 15].map(minutesLabel)).toEqual(["1 minútu", "3 minúty", "15 minút"]);
  });
});
