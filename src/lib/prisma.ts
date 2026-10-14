import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/generated/prisma/client";

export function createPrismaClient() {
  const adapter = new PrismaLibSql({
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** Jeden klient na proces (v dev režime prežije aj hot reload). */
export function getPrisma() {
  globalForPrisma.prisma ??= createPrismaClient();
  return globalForPrisma.prisma;
}
