"use server";
import { prisma } from "@/lib/prisma";
import { exigerConnexion } from "@/lib/garde";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { lireGrilles, type Fichier, type GrilleLue } from "@/lib/ia";
import { envoyerMail } from "@/lib/mail";

const CHAMPS_NOMBRES = [
  "valeurPointAnnuelle", "seuilSmic", "ctiPoints", "sftIndicePlancher", "transfertA", "transfertB", "transfertC", "ciaAnnuel",
  "tauxIndemniteCsg", "tauxCnracl", "tauxRafp", "plafondRafp", "assietteCsg", "tauxCsg", "tauxCrds", "tauxCsgDeductible",
  "plafondSecu", "tauxVieillessePlafonnee", "tauxVieillesseDeplafonnee", "tauxIrcantecA", "tauxIrcantecB", "participationSante", "participationPrevoyance",
] as const;
const ENTIERS = new Set(["ctiPoints", "sftIndicePlancher"]);

// Les taux sont saisis en % dans la page (11,1) et stockés en décimal (0,111)
export async function enregistrerParametres(formData: FormData) {
  await exigerConnexion();
  const data: Record<string, any> = { misAJourLe: new Date(), signature: String(formData.get("signature") || "") || null };
  for (const cle of CHAMPS_NOMBRES) {
    const brut = String(formData.get(cle) ?? "").replace(",", ".").trim();
    if (brut === "") continue;
    let n = Number(brut);
    if (!Number.isFinite(n)) continue;
    if (formData.get(`${cle}__pct`)) n = n / 100;
    data[cle] = ENTIERS.has(cle) ? Math.round(n) : n;
  }
  await prisma.parametresPaie.upsert({ where: { id: "unique" }, update: data, create: { id: "unique", ...data } });
  revalidatePath("/parametres");
  revalidatePath("/");
}

export async function testerMail(): Promise<string> {
  await exigerConnexion();
  return envoyerMail("Test — Recrutements Cestas", "Ceci est un mail de test envoyé depuis l'application Recrutements.\nLes rappels « offre qui se termine dans 7 jours » arriveront à cette adresse.");
}

// ---------------- Grilles indiciaires ----------------
export async function lireGrillesIA(fichier: Fichier): Promise<GrilleLue[]> {
  await exigerConnexion();
  return lireGrilles(fichier);
}

// Enregistre (ou remplace) les grilles validées
export async function enregistrerGrilles(grilles: GrilleLue[], source: string) {
  await exigerConnexion();
  for (const g of grilles) {
    if (!g.grade || !g.cadreEmploi || !Array.isArray(g.echelons) || g.echelons.length === 0) continue;
    const grade = await prisma.gradeGrille.upsert({
      where: { cadreEmploi_grade: { cadreEmploi: g.cadreEmploi, grade: g.grade } },
      update: { filiere: g.filiere, categorie: g.categorie, source, verifieLe: new Date() },
      create: { filiere: g.filiere, cadreEmploi: g.cadreEmploi, grade: g.grade, categorie: g.categorie, source },
    });
    await prisma.echelon.deleteMany({ where: { gradeId: grade.id } });
    await prisma.echelon.createMany({
      data: g.echelons.filter((e) => e.indiceMajore).map((e) => ({ gradeId: grade.id, numero: Math.round(e.numero), indiceBrut: e.indiceBrut ? Math.round(e.indiceBrut) : null, indiceMajore: Math.round(e.indiceMajore), dureeMois: e.dureeMois ? Math.round(e.dureeMois) : null })),
      skipDuplicates: true,
    });
  }
  revalidatePath("/parametres/grilles");
}

export async function enregistrerGrade(id: string, formData: FormData) {
  await exigerConnexion();
  await prisma.gradeGrille.update({
    where: { id },
    data: {
      filiere: String(formData.get("filiere") || ""),
      cadreEmploi: String(formData.get("cadreEmploi") || ""),
      grade: String(formData.get("grade") || ""),
      categorie: String(formData.get("categorie") || "") || null,
      source: String(formData.get("source") || "") || null,
      verifieLe: new Date(),
    },
  });
  // Lignes d'échelons : numero_X, ib_X, im_X, duree_X
  const lignes: { numero: number; indiceBrut: number | null; indiceMajore: number; dureeMois: number | null }[] = [];
  for (let i = 0; i < 40; i++) {
    const numero = Number(formData.get(`numero_${i}`));
    const im = Number(formData.get(`im_${i}`));
    if (!numero || !im) continue;
    const ib = Number(formData.get(`ib_${i}`));
    const duree = Number(formData.get(`duree_${i}`));
    lignes.push({ numero, indiceBrut: ib || null, indiceMajore: im, dureeMois: duree || null });
  }
  await prisma.echelon.deleteMany({ where: { gradeId: id } });
  await prisma.echelon.createMany({ data: lignes.map((l) => ({ ...l, gradeId: id })), skipDuplicates: true });
  revalidatePath("/parametres/grilles");
  redirect("/parametres/grilles");
}

export async function supprimerGrade(id: string) {
  await exigerConnexion();
  await prisma.gradeGrille.delete({ where: { id } });
  revalidatePath("/parametres/grilles");
  redirect("/parametres/grilles");
}

// ---------------- Modèles de mails et courriers ----------------
export async function enregistrerModele(formData: FormData) {
  await exigerConnexion();
  const id = String(formData.get("id") || "");
  const data = {
    nom: String(formData.get("nom") || "Modèle"),
    type: String(formData.get("type") || "mail"),
    objet: String(formData.get("objet") || "") || null,
    corps: String(formData.get("corps") || ""),
    ordre: Number(formData.get("ordre") || 50),
  };
  if (id) await prisma.modeleTexte.update({ where: { id }, data });
  else await prisma.modeleTexte.create({ data });
  revalidatePath("/parametres/modeles");
}

export async function supprimerModele(id: string) {
  await exigerConnexion();
  await prisma.modeleTexte.delete({ where: { id } });
  revalidatePath("/parametres/modeles");
}

export async function creerGrade(formData: FormData) {
  await exigerConnexion();
  const g = await prisma.gradeGrille.create({
    data: {
      filiere: String(formData.get("filiere") || "Technique"),
      cadreEmploi: String(formData.get("cadreEmploi") || "À compléter"),
      grade: String(formData.get("grade") || "Nouveau grade"),
      categorie: String(formData.get("categorie") || "") || null,
      source: "Saisie manuelle",
    },
  });
  redirect(`/parametres/grilles/${g.id}`);
}
