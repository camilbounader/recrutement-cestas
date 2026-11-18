"use server";
import { prisma } from "@/lib/prisma";
import { exigerConnexion } from "@/lib/garde";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ajouterMois } from "@/lib/format";
import { lireFicheDePoste, type Fichier } from "@/lib/ia";

const texte = (f: FormData, cle: string) => {
  const v = String(f.get(cle) ?? "").trim();
  return v === "" ? null : v;
};
const nombre = (f: FormData, cle: string) => {
  const v = texte(f, cle);
  if (v === null) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const date = (f: FormData, cle: string) => {
  const v = texte(f, cle);
  return v ? new Date(`${v}T12:00:00`) : null;
};

export async function enregistrerPoste(formData: FormData) {
  await exigerConnexion();
  const id = texte(formData, "id");
  const dateOuverture = date(formData, "dateOuverture");
  // Une offre Emploi Territorial dure un mois : la clôture se calcule toute seule si elle n'est pas saisie
  const dateCloture = date(formData, "dateCloture") || (dateOuverture ? ajouterMois(dateOuverture, 1) : null);
  const annee = nombre(formData, "annee") || (dateOuverture || new Date()).getFullYear();
  const donnees = {
    annee,
    intitule: texte(formData, "intitule") || "Poste sans intitulé",
    service: texte(formData, "service"),
    collectivite: texte(formData, "collectivite"),
    filiere: texte(formData, "filiere"),
    categorie: texte(formData, "categorie"),
    cadreEmploi: texte(formData, "cadreEmploi"),
    gradeId: texte(formData, "gradeId"),
    typeRecrutement: texte(formData, "typeRecrutement") || "titulaire_ou_contractuel",
    tempsTravail: nombre(formData, "tempsTravail") || 1,
    motif: texte(formData, "motif"),
    numeroOffre: texte(formData, "numeroOffre"),
    dateDemande: date(formData, "dateDemande"),
    dateOuverture,
    dateCloture,
    ficheDePoste: texte(formData, "ficheDePoste"),
    ifseMensuelle: nombre(formData, "ifseMensuelle"),
    observations: texte(formData, "observations"),
  };
  let posteId = id;
  if (id) {
    const avant = await prisma.poste.findUnique({ where: { id }, select: { dateCloture: true } });
    // Nouvelle date de clôture : le rappel J-7 pourra repartir
    const rappel = avant?.dateCloture?.getTime() !== dateCloture?.getTime() ? { rappelEnvoyeLe: null } : {};
    await prisma.poste.update({ where: { id }, data: { ...donnees, ...rappel } });
    // Les candidatures suivent l'année du poste
    await prisma.candidature.updateMany({ where: { posteId: id }, data: { annee } });
  } else {
    posteId = (await prisma.poste.create({ data: donnees })).id;
  }
  revalidatePath("/postes");
  redirect(`/postes/${posteId}`);
}

export async function changerEtatPoste(id: string, etat: string) {
  await exigerConnexion();
  await prisma.poste.update({ where: { id }, data: { etat } });
  revalidatePath(`/postes/${id}`);
  revalidatePath("/postes");
  revalidatePath("/");
}

export async function supprimerPoste(id: string) {
  await exigerConnexion();
  await prisma.poste.delete({ where: { id } });
  revalidatePath("/postes");
  redirect("/postes");
}

// L'IA lit la fiche de poste (PDF ou photo) et pré-remplit le formulaire
export async function lireFichePosteIA(fichier: Fichier) {
  await exigerConnexion();
  const r = await lireFicheDePoste(fichier);
  let gradeId: string | null = null;
  if (r.grade) {
    const g = await prisma.gradeGrille.findFirst({ where: { grade: { contains: r.grade, mode: "insensitive" } }, select: { id: true } });
    gradeId = g?.id || null;
  }
  return { ...r, gradeId };
}
