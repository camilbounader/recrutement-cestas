"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NOM_COOKIE, jetonAttendu } from "@/lib/auth";

export async function connexion(_etat: string, formData: FormData): Promise<string> {
  const saisi = String(formData.get("motDePasse") || "");
  const attendu = await jetonAttendu();
  if (!attendu) return "Le mot de passe n'est pas encore défini sur Vercel (variable APP_PASSWORD).";
  if (saisi !== process.env.APP_PASSWORD) {
    await new Promise((r) => setTimeout(r, 1500)); // ralentit les essais au hasard
    return "Mot de passe incorrect.";
  }
  const c = await cookies();
  c.set(NOM_COOKIE, attendu, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  redirect("/");
}

export async function deconnexion() {
  const c = await cookies();
  c.delete(NOM_COOKIE);
  redirect("/connexion");
}
