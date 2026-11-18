import { prisma } from "./prisma";
import { STATUTS, ETATS_POSTE } from "./format";
import type { LigneStat } from "./stats";

const tranche = (s: number | null) => (s === null ? null : s < 40 ? "0-39" : s < 60 ? "40-59" : s < 80 ? "60-79" : "80-100");
const trancheCandidatures = (n: number) => (n === 0 ? "0" : n <= 5 ? "1-5" : n <= 10 ? "06-10" : n <= 20 ? "11-20" : n <= 40 ? "21-40" : "41 et +");

// Données « à plat » pour la page Statistiques (aucune donnée nominative : pas de nom, ni de mail)
export async function lignesStatistiques(): Promise<{ candidatures: LigneStat[]; postes: LigneStat[] }> {
  const [candidatures, postes] = await Promise.all([
    prisma.candidature.findMany({
      select: { annee: true, dateReception: true, sexe: true, departement: true, ville: true, statut: true, origine: true, score: true, noteAssessfirst: true, posteId: true, poste: { select: { intitule: true, service: true, filiere: true, categorie: true, collectivite: true } } },
    }),
    prisma.poste.findMany({ select: { annee: true, service: true, filiere: true, categorie: true, collectivite: true, etat: true, _count: { select: { candidatures: true } } } }),
  ]);
  return {
    candidatures: candidatures.map((c) => ({
      annee: c.annee,
      mois: `${c.dateReception.getFullYear()}-${String(c.dateReception.getMonth() + 1).padStart(2, "0")}`,
      poste: c.poste ? `${c.poste.intitule} (${c.annee})` : null,
      service: c.poste?.service || null,
      filiere: c.poste?.filiere || null,
      categorie: c.poste?.categorie || null,
      collectivite: c.poste?.collectivite || null,
      provenance: c.posteId ? "Candidature à un poste" : "Spontanée",
      sexe: c.sexe === "F" ? "Femmes" : c.sexe === "H" ? "Hommes" : null,
      departement: c.departement,
      ville: c.ville,
      statut: STATUTS[c.statut]?.libelle || c.statut,
      statutCode: c.statut,
      trancheScore: tranche(c.score),
      noteAssessfirst: c.noteAssessfirst === null ? null : String(c.noteAssessfirst),
    })),
    postes: postes.map((p) => ({
      annee: p.annee,
      service: p.service,
      filiere: p.filiere,
      categorie: p.categorie,
      collectivite: p.collectivite,
      etat: ETATS_POSTE[p.etat]?.libelle || p.etat,
      trancheCandidatures: trancheCandidatures(p._count.candidatures),
    })),
  };
}
