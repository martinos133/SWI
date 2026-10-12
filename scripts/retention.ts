import "dotenv/config";
import { createPrismaClient } from "../src/lib/prisma";
import { purgeExpiredDocuments } from "../src/lib/retention";

const db = createPrismaClient();

purgeExpiredDocuments(db)
  .then((count) => console.log(`Zmazaných dokladov: ${count}`))
  .finally(() => db.$disconnect());
