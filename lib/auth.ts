// Protection par un mot de passe unique (pas de comptes).
// Le cookie contient une empreinte du mot de passe : changer APP_PASSWORD sur Vercel déconnecte tout le monde.

export const NOM_COOKIE = "recrutement_session";

export async function jetonAttendu(): Promise<string | null> {
  const motDePasse = process.env.APP_PASSWORD;
  const secret = process.env.AUTH_SECRET || "recrutement-cestas";
  if (!motDePasse) return null;
  const donnees = new TextEncoder().encode(`${secret}:${motDePasse}`);
  const empreinte = await crypto.subtle.digest("SHA-256", donnees);
  return Array.from(new Uint8Array(empreinte)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
