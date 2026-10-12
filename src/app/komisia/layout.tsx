import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

export default async function KomisiaLayout({ children }: LayoutProps<"/komisia">) {
  const user = await requireUser(["KOMISIA"]);
  return <AppShell user={user}>{children}</AppShell>;
}
