import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { readDecrypted } from "@/lib/storage";

/** Stiahnutie dokladu – študent iba vlastné, zamestnanci všetky (S.07, E.04). */
export async function GET(_: Request, { params }: RouteContext<"/doklad/[id]">) {
  const session = await getSession();
  if (!session?.verified) return new Response("Neprihlásený", { status: 401 });

  const { id } = await params;
  const doc = await db.document.findUnique({
    where: { id },
    include: { application: { select: { studentId: true } } },
  });
  if (!doc || doc.purgedAt) return new Response("Doklad neexistuje", { status: 404 });

  const { user } = session;
  const allowed =
    user.role === "REFERENT" ||
    user.role === "KOMISIA" ||
    (user.role === "STUDENT" && doc.application.studentId === user.id);
  if (!allowed) return new Response("Prístup zamietnutý", { status: 403 });

  const data = await readDecrypted(doc.storageKey);
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(doc.fileName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
