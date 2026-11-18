import { prisma } from "./prisma";

// La ligne unique des paramètres de paie (créée avec les valeurs des fichiers Excel si elle manque)
export async function lireParametres() {
  return prisma.parametresPaie.upsert({ where: { id: "unique" }, update: {}, create: { id: "unique" } });
}
