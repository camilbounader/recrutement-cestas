import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "./prisma";

// Le mot de passe choisi dans l'appli est stocké « haché » (illisible, même dans la base)
export function hacher(motDePasse: string): string {
  const sel = randomBytes(16).toString("hex");
  return `scrypt$${sel}$${scryptSync(motDePasse, sel, 32).toString("hex")}`;
}

function egal(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function lireSecurite() {
  return prisma.securite.findUnique({ where: { id: "unique" } }).catch(() => null);
}

// Mot de passe de l'appli s'il a été changé, sinon APP_PASSWORD (Vercel)
export async function motDePasseCorrect(saisi: string): Promise<boolean> {
  const s = await lireSecurite();
  if (s?.motDePasseHash) {
    const [, sel, attendu] = s.motDePasseHash.split("$");
    return egal(scryptSync(saisi, sel, 32).toString("hex"), attendu);
  }
  return !!process.env.APP_PASSWORD && egal(saisi, process.env.APP_PASSWORD);
}
