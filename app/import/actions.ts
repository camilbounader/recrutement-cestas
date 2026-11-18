"use server";
import { prisma } from "@/lib/prisma";
import { exigerConnexion } from "@/lib/garde";
import { revalidatePath } from "next/cache";
import { lireClasseur, analyserFeuilles } from "@/lib/importExcel";

export async function analyserExcel(base64: string) {
  await exigerConnexion();
  const feuilles = analyserFeuilles(await lireClasseur(base64), new Date().getFullYear());
  const dejaImportees = await prisma.poste.findMany({ where: { importeDe: { not: null } }, distinct: ["importeDe"], select: { importeDe: true } });
  const deja = new Set(dejaImportees.map((d) => d.importeDe));
  return feuilles.map((f) => ({ nom: f.nom, annee: f.annee, nbPostes: f.postes.length, nbCandidats: f.nbCandidats, nbRetenus: f.nbRetenus, nbRecrutes: f.nbRecrutes, dejaImportee: deja.has(f.nom) }));
}

// Importe les feuilles choisies. Une feuille déjà importée est remplacée (pas de doublon).
export async function importerExcel(base64: string, choix: { nom: string; annee: number }[]) {
  await exigerConnexion();
  const feuilles = analyserFeuilles(await lireClasseur(base64), new Date().getFullYear());
  let nbPostes = 0, nbCandidats = 0;
  for (const c of choix) {
    const f = feuilles.find((x) => x.nom === c.nom);
    if (!f) continue;
    await prisma.poste.deleteMany({ where: { importeDe: f.nom } });
    for (const p of f.postes) {
      const poste = await prisma.poste.create({
        data: {
          annee: c.annee,
          intitule: p.intitule,
          motif: p.motif,
          dateDemande: p.dateDemande,
          numeroOffre: p.numeroOffre,
          service: p.service,
          filiere: p.filiere,
          categorie: p.categorie,
          collectivite: p.collectivite,
          observations: p.observations,
          etat: p.candidats.some((x) => x.statut === "recrutee") ? "pourvu" : "archive",
          importeDe: f.nom,
        },
      });
      if (p.candidats.length) {
        await prisma.candidature.createMany({
          data: p.candidats.map((x) => ({ ...x, annee: c.annee, posteId: poste.id, origine: "directe", dateReception: p.dateDemande || new Date(c.annee, 0, 1) })),
        });
      }
      nbPostes++;
      nbCandidats += p.candidats.length;
    }
  }
  revalidatePath("/");
  revalidatePath("/postes");
  return { nbPostes, nbCandidats };
}
