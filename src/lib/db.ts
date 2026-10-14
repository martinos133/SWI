import "server-only";
import { getPrisma } from "./prisma";

export const db = getPrisma();
