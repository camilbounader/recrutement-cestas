"use server";
import { prisma } from "@/lib/prisma";
import { exigerConnexion } from "@/lib/garde";
import { revalidatePath } from "next/cache";

export async function enregistrerGraphique(nom: string, config: string) {
  await exigerConnexion();
  const dernier = await prisma.graphique.findFirst({ orderBy: { ordre: "desc" }, select: { ordre: true } });
  await prisma.graphique.create({ data: { nom: nom || "Graphique", config, ordre: (dernier?.ordre || 0) + 1 } });
  revalidatePath("/statistiques");
}

export async function supprimerGraphique(id: string) {
  await exigerConnexion();
  await prisma.graphique.delete({ where: { id } });
  revalidatePath("/statistiques");
}
