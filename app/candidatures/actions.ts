"use server";
import { prisma } from "@/lib/prisma";
import { exigerConnexion } from "@/lib/garde";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { analyserCandidature, scorerVivier, type AnalyseCandidat, type Fichier } from "@/lib/ia";
import { departementDepuisCodePostal } from "@/lib/format";
import { DUREE_CONSERVATION_MOIS } from "@/lib/alertes";

function rafraichir(posteId?: string | null, candidatureId?: string) {
  if (posteId) revalidatePath(`/postes/${posteId}`);
  else revalidatePath("/spontanees");
  if (candidatureId) revalidatePath(`/candidatures/${candidatureId}`);
  revalidatePath("/");
}

// 1) L'IA lit UN fichier (rien n'est enregistré à ce stade, le fichier n'est pas conservé)
export async function analyserFichierCandidat(fichier: Fichier, imagePage1: string | null, posteId: string | null): Promise<AnalyseCandidat> {
  await exigerConnexion();
  const poste = posteId ? await prisma.poste.findUnique({ where: { id: posteId }, select: { intitule: true, ficheDePoste: true } }) : null;
  return analyserCandidature(fichier, imagePage1, poste);
}

// 2) Enregistrement : un groupe = les fichiers d'une même personne (CV + lettre)
export type GroupeAnalyse = { analyses: AnalyseCandidat[]; photo: string | null };

export async function enregistrerCandidatures(posteId: string | null, annee: number, groupes: GroupeAnalyse[]) {
  await exigerConnexion();
  const poste = posteId ? await prisma.poste.findUnique({ where: { id: posteId }, select: { annee: true } }) : null;
  let nb = 0;
  for (const g of groupes) {
    // Le CV sert de base ; la lettre complète ce qui manque
    const tries = [...g.analyses].sort((a, b) => (a.type === "lettre" ? 1 : 0) - (b.type === "lettre" ? 1 : 0));
    const premier = <K extends keyof AnalyseCandidat>(cle: K) => tries.map((a) => a[cle]).find((v) => v !== null && v !== undefined && v !== "") ?? null;
    const cv = tries.find((a) => a.type !== "lettre") || tries[0];
    const motivation = tries.map((a) => a.motivation).filter(Boolean).join(" ");
    const codePostal = premier("codePostal") as string | null;
    await prisma.candidature.create({
      data: {
        annee: poste?.annee || annee,
        posteId,
        origine: posteId ? "directe" : "spontanee",
        nom: premier("nom") as string | null,
        prenom: premier("prenom") as string | null,
        sexe: (premier("sexe") as string | null)?.toUpperCase().slice(0, 1) || null,
        email: (premier("email") as string | null)?.toLowerCase() || null,
        telephone: premier("telephone") as string | null,
        adresse: [premier("adresse"), codePostal].filter(Boolean).join(" ") || null,
        ville: (premier("ville") as string | null)?.toUpperCase() || null,
        departement: departementDepuisCodePostal(codePostal),
        photo: g.photo,
        resume: cv?.resume || null,
        competences: cv?.competences || null,
        experience: JSON.stringify(cv?.experiences || []),
        moisExperiencePublic: cv?.moisExperiencePublic ?? null,
        moisExperienceTotale: cv?.moisExperienceEnLien ?? null,
        dejaFonctionnaire: cv?.dejaFonctionnaire ?? null,
        gradeActuel: cv?.gradeActuel || null,
        echelonActuel: cv?.echelonActuel ?? null,
        score: typeof cv?.score === "number" ? Math.round(Math.max(0, Math.min(100, cv.score))) : null,
        scoreDetail: JSON.stringify({ pointsForts: cv?.pointsForts || null, pointsVigilance: cv?.pointsVigilance || null, motivation: motivation || null, diplomes: premier("diplomes") }),
      },
    });
    nb++;
  }
  rafraichir(posteId);
  return nb;
}

const champ = (f: FormData, cle: string) => {
  const v = String(f.get(cle) ?? "").trim();
  return v === "" ? null : v;
};

export async function modifierCandidature(id: string, formData: FormData) {
  await exigerConnexion();
  const note = champ(formData, "noteAssessfirst");
  const c = await prisma.candidature.update({
    where: { id },
    data: {
      nom: champ(formData, "nom"),
      prenom: champ(formData, "prenom"),
      sexe: champ(formData, "sexe"),
      email: champ(formData, "email"),
      telephone: champ(formData, "telephone"),
      adresse: champ(formData, "adresse"),
      ville: champ(formData, "ville"),
      departement: champ(formData, "departement"),
      dateEntretien: champ(formData, "dateEntretien"),
      noteAssessfirst: note ? Number(note.replace(",", ".")) : null,
      observations: champ(formData, "observations"),
      dejaFonctionnaire: champ(formData, "dejaFonctionnaire") === "oui" ? true : champ(formData, "dejaFonctionnaire") === "non" ? false : null,
    },
  });
  rafraichir(c.posteId, id);
}

export async function changerStatut(id: string, statut: string) {
  await exigerConnexion();
  const c = await prisma.candidature.update({ where: { id }, data: { statut } });
  // Un recrutement validé : le poste passe en « pourvu »
  if (statut === "recrutee" && c.posteId) await prisma.poste.update({ where: { id: c.posteId }, data: { etat: "pourvu" } });
  rafraichir(c.posteId, id);
  if (c.posteId) revalidatePath("/postes");
}

export async function changerPhoto(id: string, photo: string | null) {
  await exigerConnexion();
  const c = await prisma.candidature.update({ where: { id }, data: { photo } });
  rafraichir(c.posteId, id);
}

export async function supprimerCandidature(id: string) {
  await exigerConnexion();
  const c = await prisma.candidature.delete({ where: { id } });
  rafraichir(c.posteId);
  redirect(c.posteId ? `/postes/${c.posteId}` : "/spontanees");
}

export async function enregistrerSimulation(id: string, simulation: string) {
  await exigerConnexion();
  const c = await prisma.candidature.update({ where: { id }, data: { simulation } });
  rafraichir(c.posteId, id);
}

// Vivier : les candidatures spontanées des 2 dernières années qui correspondent au poste
export async function chercherDansLeVivier(posteId: string) {
  await exigerConnexion();
  const poste = await prisma.poste.findUnique({ where: { id: posteId } });
  if (!poste) throw new Error("Poste introuvable");
  const limite = new Date();
  limite.setMonth(limite.getMonth() - DUREE_CONSERVATION_MOIS);
  const candidats = await prisma.candidature.findMany({
    where: { posteId: null, anonymiseeLe: null, dateReception: { gte: limite } },
    select: { id: true, nom: true, prenom: true, ville: true, photo: true, resume: true, competences: true, dateReception: true },
    orderBy: { dateReception: "desc" },
    take: 150,
  });
  const scores = await scorerVivier(poste, candidats);
  const parId = new Map(scores.map((s) => [s.id, s]));
  return candidats
    .map((c) => ({ id: c.id, nom: c.nom, prenom: c.prenom, ville: c.ville, photo: c.photo, resume: c.resume, score: parId.get(c.id)?.score ?? 0, raison: parId.get(c.id)?.raison || "" }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);
}

// Ajoute une candidature spontanée au poste (une copie : la spontanée reste dans ses statistiques)
export async function ajouterDuVivier(posteId: string, candidatureId: string) {
  await exigerConnexion();
  const [poste, c] = await Promise.all([
    prisma.poste.findUnique({ where: { id: posteId }, select: { annee: true } }),
    prisma.candidature.findUnique({ where: { id: candidatureId } }),
  ]);
  if (!poste || !c) throw new Error("Introuvable");
  const deja = await prisma.candidature.findFirst({ where: { posteId, origine: "vivier", email: c.email ?? "__aucun__", nom: c.nom } });
  if (deja) return deja.id;
  const { id: _id, creeLe: _c, ...copie } = c;
  const cree = await prisma.candidature.create({ data: { ...copie, posteId, annee: poste.annee, origine: "vivier", statut: "recue", score: null, simulation: null, dateReception: new Date(), observations: [c.observations, "Ajoutée depuis le vivier des candidatures spontanées."].filter(Boolean).join("\n") } });
  rafraichir(posteId);
  return cree.id;
}

// RGPD : on efface ce qui identifie la personne, on garde le reste pour les statistiques
export async function anonymiser(ids: string[]) {
  await exigerConnexion();
  await prisma.candidature.updateMany({
    where: { id: { in: ids }, statut: { not: "recrutee" } },
    data: { nom: null, prenom: null, email: null, telephone: null, adresse: null, photo: null, resume: null, competences: null, experience: null, observations: null, scoreDetail: null, simulation: null, dateEntretien: null, gradeActuel: null, anonymiseeLe: new Date() },
  });
  revalidatePath("/rgpd");
  revalidatePath("/");
}
