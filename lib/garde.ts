import { cookies } from "next/headers";
import { NOM_COOKIE, jetonAttendu } from "./auth";

// À appeler au début de CHAQUE action serveur : une action peut être déclenchée hors des pages protégées
export async function exigerConnexion() {
  const attendu = await jetonAttendu();
  const recu = (await cookies()).get(NOM_COOKIE)?.value;
  if (!attendu || recu !== attendu) throw new Error("Session expirée : reconnectez-vous.");
}
