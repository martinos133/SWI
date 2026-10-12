import { redirect } from "next/navigation";
import { ROLE_HOME } from "@/lib/roles";
import { getSession } from "@/lib/session";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.verified) redirect("/login/overenie");
  redirect(ROLE_HOME[session.user.role]);
}
