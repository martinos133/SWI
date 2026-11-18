"use server";

import { verify } from "otplib";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  attemptsLabel,
  evaluateFailure,
  lockMinutesLeft,
  minutesLabel,
} from "@/lib/otp-lockout";
import { ROLE_HOME } from "@/lib/roles";
import { createSession, destroySession, getSession } from "@/lib/session";

export type FormState = { error?: string } | undefined;

/** Simulované univerzitné SSO (API.02): overí univerzitné konto a založí session. */
export async function ssoSignIn(_: FormState, formData: FormData): Promise<FormState> {
  const login = String(formData.get("login") ?? "").trim().toLowerCase();
  if (!login) return { error: "Zadajte používateľské meno." };

  const user = await db.user.findUnique({ where: { login } });
  if (!user) {
    return { error: `Konto „${login}“ v univerzitnom adresári neexistuje.` };
  }

  const wait = lockMinutesLeft(user.otpLockedUntil, new Date());
  if (wait > 0) {
    return {
      error: `Konto je pre opakovane nesprávny overovací kód dočasne zablokované. Skúste to znova o ${minutesLabel(wait)}.`,
    };
  }

  await createSession(user.id);
  redirect("/login/overenie");
}

/** Druhý faktor – 6-miestny kód z aplikácie Authenticator (S.07). */
export async function verifySecondFactor(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.verified) redirect(ROLE_HOME[session.user.role]);

  const { user } = session;
  const now = new Date();
  if (lockMinutesLeft(user.otpLockedUntil, now) > 0) {
    await destroySession();
    redirect("/login?dovod=pokusy");
  }

  const token = String(formData.get("code") ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(token)) {
    return { error: "Kód má 6 číslic." };
  }

  const result = await verify({
    secret: user.totpSecret,
    token,
    epochTolerance: 30,
  });

  if (!result.valid) {
    // Atomické zvýšenie, aby súbežné pokusy nemohli limit obísť.
    const { otpFailures } = await db.user.update({
      where: { id: user.id },
      data: { otpFailures: { increment: 1 } },
      select: { otpFailures: true },
    });
    const outcome = evaluateFailure(otpFailures, now);

    if (outcome.lockedUntil) {
      await db.$transaction([
        db.user.update({
          where: { id: user.id },
          data: { otpFailures: 0, otpLockedUntil: outcome.lockedUntil },
        }),
        // Zablokovanie ruší aj ostatné neoverené prihlásenia toho istého konta.
        db.session.deleteMany({ where: { userId: user.id, verified: false } }),
      ]);
      await audit({
        actorId: user.id,
        action: "PRIHLASENIE_ZABLOKOVANE",
        entityType: "User",
        entityId: user.id,
        detail: { until: outcome.lockedUntil.toISOString() },
      });
      await destroySession();
      redirect("/login?dovod=pokusy");
    }

    return { error: `Kód nesedí. Zostávajú ${attemptsLabel(outcome.attemptsLeft)}.` };
  }

  await db.$transaction([
    db.session.update({ where: { id: session.id }, data: { verified: true } }),
    db.user.update({
      where: { id: user.id },
      data: { otpFailures: 0, otpLockedUntil: null },
    }),
  ]);
  redirect(ROLE_HOME[user.role]);
}

export async function signOut() {
  await destroySession();
  redirect("/login");
}
