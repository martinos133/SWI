import "dotenv/config";
import { getPrisma } from "../src/lib/prisma";
import { purgeExpiredDocuments } from "../src/lib/retention";

const db = getPrisma();

purgeExpiredDocuments(db)
  .then((count) => console.log(`Zmazaných dokladov: ${count}`))
  .finally(() => db.$disconnect());
