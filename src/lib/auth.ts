import "server-only";
import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/enums";
import { ROLE_HOME } from "./roles";
import { getSession } from "./session";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  login: string;
  role: Role;
  aisId: string | null;
};

/**
 * Overí prihlásenie s druhým faktorom a rolu (S.07). Volá sa v každom layoute,
 * stránke aj server action – proxy robí iba optimistickú kontrolu cookie.
 */
export async function requireUser(roles?: Role[]): Promise<CurrentUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.verified) redirect("/login/overenie");

  const { user } = session;
  if (roles && !roles.includes(user.role)) redirect(ROLE_HOME[user.role]);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    login: user.login,
    role: user.role,
    aisId: user.aisId,
  };
}
