import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

export default async function ReferentLayout({ children }: LayoutProps<"/referent">) {
  const user = await requireUser(["REFERENT"]);
  return <AppShell user={user}>{children}</AppShell>;
}
