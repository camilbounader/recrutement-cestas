import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NOM_COOKIE, lireJeton } from "./auth";
import { lireSecurite } from "./motDePasse";

// Connexion valide = cookie signé, de moins de 30 jours, et postérieur au dernier changement de mot de passe
export async function sessionValide(): Promise<boolean> {
  const emis = await lireJeton((await cookies()).get(NOM_COOKIE)?.value);
  if (!emis) return false;
  const s = await lireSecurite();
  return !s || emis >= s.changeLe.getTime();
}

// À appeler au début de CHAQUE action serveur : une action peut être déclenchée hors des pages protégées
export async function exigerConnexion() {
  if (!(await sessionValide())) throw new Error("Session expirée : reconnectez-vous.");
}

// Pages : renvoie vers la connexion si le mot de passe a changé depuis
export async function exigerConnexionPage() {
  if (!(await sessionValide())) redirect("/connexion");
}
