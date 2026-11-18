import { dateFr } from "./format";

// Remplace les {variables} d'un modèle de mail ou de courrier par les infos du candidat et du poste
export const VARIABLES = [
  { code: "{civilite}", aide: "Madame / Monsieur (selon le sexe)" },
  { code: "{prenom}", aide: "Prénom du candidat" },
  { code: "{nom}", aide: "Nom du candidat" },
  { code: "{poste}", aide: "Intitulé du poste" },
  { code: "{date_cloture}", aide: "Date de clôture de l'offre" },
  { code: "{date_entretien}", aide: "Date d'entretien saisie sur la fiche" },
  { code: "{grade}", aide: "Grade du poste" },
  { code: "{simulation}", aide: "Résumé de la dernière simulation de paie" },
  { code: "{mention_reprise}", aide: "Phrase sur les bulletins de paie (si recrutement stagiaire)" },
  { code: "{date_du_jour}", aide: "Date du jour" },
  { code: "{signature}", aide: "Signature (Paramètres)" },
];

export type DonneesModele = {
  candidat: { nom?: string | null; prenom?: string | null; sexe?: string | null; dateEntretien?: string | null; simulation?: string | null };
  poste?: { intitule: string; dateCloture?: Date | null; grade?: { grade: string } | null } | null;
  signature?: string | null;
};

export function remplir(texte: string, d: DonneesModele): string {
  const c = d.candidat;
  const civilite = c.sexe === "F" ? "Madame" : c.sexe === "H" ? "Monsieur" : "Madame, Monsieur";
  let simulation = "";
  let reprise = "";
  let grade = d.poste?.grade?.grade || "";
  if (c.simulation) {
    try {
      const s = JSON.parse(c.simulation);
      simulation = s.texte || "";
      grade = s.entree?.grade || grade;
      if (s.stagiaire) reprise = "Votre recrutement se fera en qualité de fonctionnaire stagiaire. Afin d'étudier la reprise de vos services antérieurs, merci de nous transmettre l'ensemble de vos bulletins de paie : vous disposez d'un délai d'un an à compter de votre nomination.";
    } catch {}
  }
  const valeurs: Record<string, string> = {
    "{civilite}": civilite,
    "{prenom}": c.prenom || "",
    "{nom}": (c.nom || "").toUpperCase(),
    "{poste}": d.poste?.intitule || "",
    "{date_cloture}": dateFr(d.poste?.dateCloture) || "…",
    "{date_entretien}": c.dateEntretien || "…",
    "{grade}": grade || "…",
    "{simulation}": simulation || "[faire d'abord la simulation de paie]",
    "{mention_reprise}": reprise,
    "{date_du_jour}": dateFr(new Date()),
    "{signature}": d.signature || "",
  };
  let resultat = texte;
  for (const [cle, val] of Object.entries(valeurs)) resultat = resultat.split(cle).join(val);
  // Pas de lignes vides en trop quand une variable est vide
  return resultat.replace(/ +,/g, ",").replace(/\n{3,}/g, "\n\n").trim();
}
