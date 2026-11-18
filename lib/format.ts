// Petits outils d'affichage partagés (dates, montants, libellés)

export const STATUTS: Record<string, { libelle: string; fond: string; couleur: string; bord: string }> = {
  recue: { libelle: "Reçue", fond: "#F0EEE7", couleur: "#666", bord: "var(--color-ligne)" },
  retenue: { libelle: "Retenue entretien", fond: "#DCEBFA", couleur: "#1F5A8C", bord: "#7FB2E0" },
  recrutee: { libelle: "Recrutée", fond: "#FFF3A3", couleur: "#6B5A00", bord: "#E8C547" },
  non_retenue: { libelle: "Non retenue", fond: "#EFEFEF", couleur: "#999", bord: "#DDD" },
  desistement: { libelle: "Désistement", fond: "#FBEDED", couleur: "#B23B3B", bord: "#E8C4C4" },
};

export const ETATS_POSTE: Record<string, { libelle: string; fond: string; couleur: string }> = {
  ouvert: { libelle: "Ouvert", fond: "#E6F0E3", couleur: "#4F6B49" },
  pourvu: { libelle: "Pourvu", fond: "#FFF3A3", couleur: "#6B5A00" },
  infructueux: { libelle: "Infructueux", fond: "#FBEDED", couleur: "#B23B3B" },
  annule: { libelle: "Annulé", fond: "#EFEFEF", couleur: "#888" },
  archive: { libelle: "Archivé (ancien Excel)", fond: "#EFEFEF", couleur: "#888" },
};

export const TYPES_RECRUTEMENT: Record<string, string> = {
  titulaire_ou_contractuel: "Titulaire ou contractuel",
  titulaire: "Titulaire (ou stagiaire)",
  contractuel: "Contractuel",
};

export const FILIERES = ["Administrative", "Technique", "Animation", "Sportive", "Sociale", "Médico-sociale", "Culturelle", "Police municipale"];
export const COLLECTIVITES = ["MAIRIE", "CCAS", "COMCOM"];

export function dateFr(d: Date | string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
}

export function dateInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

export function euros(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export function joursRestants(d: Date | string | null | undefined): number | null {
  if (!d) return null;
  const fin = new Date(d);
  fin.setHours(23, 59, 59, 0);
  return Math.ceil((fin.getTime() - Date.now()) / 86400000);
}

export function ajouterMois(d: Date, mois: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + mois);
  return x;
}

export function nomComplet(c: { prenom?: string | null; nom?: string | null }): string {
  return [c.prenom, c.nom].filter(Boolean).join(" ") || "Candidat sans nom";
}

// Département déduit d'un code postal (33600 → 33, 97400 → 974, 20000 → 2A)
export function departementDepuisCodePostal(cp: string | null | undefined): string | null {
  const c = (cp || "").replace(/\s/g, "");
  if (!/^\d{5}$/.test(c)) return null;
  if (c.startsWith("97") || c.startsWith("98")) return c.slice(0, 3);
  if (c.startsWith("20")) return Number(c) < 20200 ? "2A" : "2B";
  return c.slice(0, 2);
}
