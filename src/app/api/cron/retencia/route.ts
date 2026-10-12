import { db } from "@/lib/db";
import { purgeExpiredDocuments } from "@/lib/retention";

/** Denná úloha (napr. Vercel Cron) – maže doklady po uplynutí doby uchovávania. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Neautorizované", { status: 401 });
  }
  const purged = await purgeExpiredDocuments(db);
  return Response.json({ purged });
}
