"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { NOM_COOKIE, DUREE_SESSION_MS, creerJeton } from "@/lib/auth";
import { exigerConnexion } from "@/lib/garde";
import { motDePasseCorrect, hacher } from "@/lib/motDePasse";

async function ouvrirSession(emisLe = Date.now()) {
  (await cookies()).set(NOM_COOKIE, await creerJeton(emisLe), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: DUREE_SESSION_MS / 1000 });
}

export async function connexion(_etat: string, formData: FormData): Promise<string> {
  if (!process.env.AUTH_SECRET && !process.env.APP_PASSWORD) return "L'application n'est pas encore configurée (variables AUTH_SECRET et APP_PASSWORD sur Vercel).";
  if (!(await motDePasseCorrect(String(formData.get("motDePasse") || "")))) {
    await new Promise((r) => setTimeout(r, 1500)); // ralentit les essais au hasard
    return "Mot de passe incorrect.";
  }
  await ouvrirSession();
  redirect("/");
}

export async function deconnexion() {
  (await cookies()).delete(NOM_COOKIE);
  redirect("/connexion");
}

// Changement du mot de passe depuis l'appli : les autres ordinateurs connectés devront se reconnecter
export async function changerMotDePasse(_etat: string, formData: FormData): Promise<string> {
  await exigerConnexion();
  const actuel = String(formData.get("actuel") || "");
  const nouveau = String(formData.get("nouveau") || "");
  if (!(await motDePasseCorrect(actuel))) return "❌ Le mot de passe actuel est incorrect.";
  if (nouveau.length < 10) return "❌ Le nouveau mot de passe doit faire au moins 10 caractères.";
  if (nouveau !== String(formData.get("confirmation") || "")) return "❌ Les deux saisies du nouveau mot de passe sont différentes.";
  const maintenant = Date.now();
  await prisma.securite.upsert({ where: { id: "unique" }, update: { motDePasseHash: hacher(nouveau), changeLe: new Date(maintenant) }, create: { id: "unique", motDePasseHash: hacher(nouveau), changeLe: new Date(maintenant) } });
  await ouvrirSession(maintenant);
  return "✅ Mot de passe changé. Les autres ordinateurs devront se reconnecter avec le nouveau.";
}
