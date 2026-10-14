import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { getPrisma } from "./prisma";

/**
 * Šifrované úložisko dokladov (S.12, E.04).
 * Súbory sú v databáze (tabuľka StoredFile), aby aplikácia fungovala aj na
 * serverless hostingu bez trvalého disku. Formát: IV (12 B) | auth tag (16 B) | ciphertext.
 */

function key() {
  const secret = process.env.APP_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("APP_SECRET musí mať aspoň 32 znakov");
  }
  return createHash("sha256").update(`documents:${secret}`).digest();
}

export async function storeEncrypted(data: Buffer): Promise<string> {
  const storageKey = randomBytes(16).toString("hex");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  await getPrisma().storedFile.create({
    data: { key: storageKey, data: Buffer.concat([iv, cipher.getAuthTag(), encrypted]) },
  });
  return storageKey;
}

export async function readDecrypted(storageKey: string): Promise<Buffer> {
  const file = await getPrisma().storedFile.findUniqueOrThrow({ where: { key: storageKey } });
  const raw = Buffer.from(file.data);
  const decipher = createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]);
}

export async function purgeFile(storageKey: string) {
  await getPrisma().storedFile.deleteMany({ where: { key: storageKey } });
}
