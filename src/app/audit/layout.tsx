import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

export default async function AuditLayout({ children }: LayoutProps<"/audit">) {
  const user = await requireUser(["REFERENT", "KOMISIA"]);
  return <AppShell user={user}>{children}</AppShell>;
}
