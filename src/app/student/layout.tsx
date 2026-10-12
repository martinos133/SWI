import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

export default async function StudentLayout({ children }: LayoutProps<"/student">) {
  const user = await requireUser(["STUDENT"]);
  return <AppShell user={user}>{children}</AppShell>;
}
