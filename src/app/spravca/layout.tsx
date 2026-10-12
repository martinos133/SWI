import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

export default async function SpravcaLayout({ children }: LayoutProps<"/spravca">) {
  const user = await requireUser(["SPRAVCA"]);
  return <AppShell user={user}>{children}</AppShell>;
}
