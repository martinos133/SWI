"use server";

import { verify } from "otplib";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ROLE_HOME } from "@/lib/roles";
import { createSession, destroySession, getSession } from "@/lib/session";

export type FormState = { error?: string } | undefined;

const MAX_OTP_ATTEMPTS = 5;

/** Simulované univerzitné SSO (API.02): overí univerzitné konto a založí session. */
export async function ssoSignIn(_: FormState, formData: FormData): Promise<FormState> {
  const login = String(formData.get("login") ?? "").trim().toLowerCase();
  if (!login) return { error: "Zadajte používateľské meno." };

  const user = await db.user.findUnique({ where: { login } });
  if (!user) {
    return { error: `Konto „${login}“ v univerzitnom adresári neexistuje.` };
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

  const token = String(formData.get("code") ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(token)) {
    return { error: "Kód má 6 číslic." };
  }

  const result = await verify({
    secret: session.user.totpSecret,
    token,
    epochTolerance: 30,
  });

  if (!result.valid) {
    const attempts = session.otpAttempts + 1;
    if (attempts >= MAX_OTP_ATTEMPTS) {
      await destroySession();
      redirect("/login?dovod=pokusy");
    }
    await db.session.update({
      where: { id: session.id },
      data: { otpAttempts: attempts },
    });
    const left = MAX_OTP_ATTEMPTS - attempts;
    return {
      error: `Kód nesedí. Zostávajú ${left} ${left === 1 ? "pokus" : left < 5 ? "pokusy" : "pokusov"}.`,
    };
  }

  await db.session.update({
    where: { id: session.id },
    data: { verified: true, otpAttempts: 0 },
  });
  redirect(ROLE_HOME[session.user.role]);
}

export async function signOut() {
  await destroySession();
  redirect("/login");
}
