// Connexion par mot de passe unique (pas de comptes).
// Le cookie contient la date de connexion signée avec AUTH_SECRET : le middleware vérifie la signature,
// et les pages / actions vérifient en plus que la connexion est postérieure au dernier changement de mot de passe.

export const NOM_COOKIE = "recrutement_session";
export const DUREE_SESSION_MS = 30 * 24 * 3600 * 1000;

function secret(): string {
  return process.env.AUTH_SECRET || process.env.APP_PASSWORD || "";
}

async function signer(texte: string): Promise<string> {
  const cle = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cle, new TextEncoder().encode(texte));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function creerJeton(emisLe: number): Promise<string> {
  return `${emisLe}.${await signer(String(emisLe))}`;
}

// Renvoie la date de connexion si le jeton est authentique et a moins de 30 jours, sinon null
export async function lireJeton(jeton: string | undefined): Promise<number | null> {
  if (!jeton || !secret()) return null;
  const [emis, sig] = jeton.split(".");
  const n = Number(emis);
  if (!n || !sig || Date.now() - n > DUREE_SESSION_MS || n > Date.now() + 60000) return null;
  return (await signer(emis)) === sig ? n : null;
}
