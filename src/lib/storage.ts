import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Šifrované úložisko dokladov (S.12, E.04).
 * Formát súboru: IV (12 B) | auth tag (16 B) | ciphertext, AES-256-GCM.
 */

const ROOT = path.join(process.cwd(), "storage", "documents");

function key() {
  const secret = process.env.APP_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("APP_SECRET musí mať aspoň 32 znakov");
  }
  return createHash("sha256").update(`documents:${secret}`).digest();
}

function filePath(storageKey: string) {
  if (!/^[a-z0-9]+$/i.test(storageKey)) throw new Error("Neplatný kľúč súboru");
  return path.join(ROOT, `${storageKey}.bin`);
}

export async function storeEncrypted(data: Buffer): Promise<string> {
  const storageKey = randomBytes(16).toString("hex");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  await mkdir(ROOT, { recursive: true });
  await writeFile(
    filePath(storageKey),
    Buffer.concat([iv, cipher.getAuthTag(), encrypted]),
  );
  return storageKey;
}

export async function readDecrypted(storageKey: string): Promise<Buffer> {
  const raw = await readFile(filePath(storageKey));
  const decipher = createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]);
}

export async function purgeFile(storageKey: string) {
  await rm(filePath(storageKey), { force: true });
}
