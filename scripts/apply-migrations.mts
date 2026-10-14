import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@libsql/client";

/**
 * Aplikuje Prisma migrácie na vzdialenú libSQL databázu (Turso), kam
 * `prisma migrate deploy` nevie zapisovať. Použité migrácie si pamätá v tabuľke _app_migrations.
 */
const url = process.env.DATABASE_URL;
if (!url) throw new Error("Chýba DATABASE_URL");

const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || undefined });
const dir = path.join(process.cwd(), "prisma", "migrations");

await client.execute(
  "CREATE TABLE IF NOT EXISTS _app_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)",
);
const applied = new Set(
  (await client.execute("SELECT name FROM _app_migrations")).rows.map((r) => String(r.name)),
);

const migrations = (await readdir(dir, { withFileTypes: true }))
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

for (const name of migrations) {
  if (applied.has(name)) continue;
  const sql = await readFile(path.join(dir, name, "migration.sql"), "utf8");
  await client.executeMultiple(sql);
  await client.execute({
    sql: "INSERT INTO _app_migrations (name, applied_at) VALUES (?, ?)",
    args: [name, new Date().toISOString()],
  });
  console.log(`✓ ${name}`);
}
console.log("Databáza je aktuálna.");
client.close();
