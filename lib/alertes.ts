import { prisma } from "./prisma";
import { dateFr, joursRestants } from "./format";

// Toutes les échéances et alertes de l'appli, affichées sur le tableau de bord
export type Alerte = { niveau: "urgent" | "attention" | "info"; texte: string; lien: string };

export const DUREE_CONSERVATION_MOIS = 24; // recommandation CNIL : 2 ans après le dernier contact
const GRILLE_A_VERIFIER_MOIS = 6;
const PARAMETRES_A_VERIFIER_MOIS = 12;

export async function alertes(): Promise<Alerte[]> {
  const liste: Alerte[] = [];
  const maintenant = new Date();

  // Offres : clôture dans les 7 jours ou dépassée
  const ouverts = await prisma.poste.findMany({ where: { etat: "ouvert", dateCloture: { not: null } }, orderBy: { dateCloture: "asc" }, include: { _count: { select: { candidatures: true } } } });
  for (const p of ouverts) {
    const j = joursRestants(p.dateCloture)!;
    if (j < 0) liste.push({ niveau: "attention", texte: `${p.intitule} : offre clôturée depuis le ${dateFr(p.dateCloture)} (${p._count.candidatures} candidature(s)) — à traiter`, lien: `/postes/${p.id}` });
    else if (j <= 7) liste.push({ niveau: "urgent", texte: `${p.intitule} : l'offre se termine ${j === 0 ? "aujourd'hui" : `dans ${j} jour(s)`} (le ${dateFr(p.dateCloture)})`, lien: `/postes/${p.id}` });
  }

  // RGPD : candidatures de plus de 2 ans à anonymiser
  const limite = new Date(maintenant);
  limite.setMonth(limite.getMonth() - DUREE_CONSERVATION_MOIS);
  const anciennes = await prisma.candidature.count({ where: { anonymiseeLe: null, statut: { not: "recrutee" }, dateReception: { lt: limite } } });
  if (anciennes > 0) liste.push({ niveau: "attention", texte: `RGPD : ${anciennes} candidature(s) de plus de 2 ans à anonymiser`, lien: "/rgpd" });

  // Grilles et paramètres de paie à revérifier
  const limiteGrille = new Date(maintenant);
  limiteGrille.setMonth(limiteGrille.getMonth() - GRILLE_A_VERIFIER_MOIS);
  const grilles = await prisma.gradeGrille.count({ where: { verifieLe: { lt: limiteGrille } } });
  if (grilles > 0) liste.push({ niveau: "info", texte: `${grilles} grille(s) indiciaire(s) non vérifiée(s) depuis plus de 6 mois`, lien: "/parametres/grilles" });
  const params = await prisma.parametresPaie.findUnique({ where: { id: "unique" } });
  const limiteParams = new Date(maintenant);
  limiteParams.setMonth(limiteParams.getMonth() - PARAMETRES_A_VERIFIER_MOIS);
  if (params && params.misAJourLe < limiteParams) liste.push({ niveau: "info", texte: `Paramètres de paie (point d'indice, SMIC, taux) non vérifiés depuis le ${dateFr(params.misAJourLe)}`, lien: "/parametres" });

  return liste;
}
