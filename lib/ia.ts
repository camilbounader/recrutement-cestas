import { GoogleGenAI } from "@google/genai";

// Toutes les demandes à l'IA (Gemini) passent par ici.
// Les documents sont envoyés pour lecture puis ne sont pas conservés : seules les infos extraites sont enregistrées.
export const MODELE = process.env.GEMINI_MODELE || "gemini-3.5-flash-lite";

export type Fichier = { data: string; mimeType: string };

function lireJson(texte: string): any {
  const nettoye = (texte || "").replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(nettoye);
  } catch {
    const debut = nettoye.search(/[[{]/);
    const fin = Math.max(nettoye.lastIndexOf("}"), nettoye.lastIndexOf("]"));
    if (debut >= 0 && fin > debut) return JSON.parse(nettoye.slice(debut, fin + 1));
    throw new Error("Réponse de l'IA illisible");
  }
}

async function demanderJson(consigne: string, fichiers: Fichier[]): Promise<any> {
  if (!process.env.GEMINI_API_KEY) throw new Error("La clé GEMINI_API_KEY n'est pas renseignée sur Vercel.");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const parts: any[] = [{ text: consigne }, ...fichiers.map((f) => ({ inlineData: { mimeType: f.mimeType, data: f.data } }))];
  let derniereErreur: any;
  for (let essai = 0; essai < 2; essai++) {
    try {
      const reponse: any = await ai.models.generateContent({
        model: MODELE,
        contents: [{ role: "user", parts }],
        config: { responseMimeType: "application/json", temperature: 0.1 },
      });
      return lireJson(reponse.text || "");
    } catch (e) {
      derniereErreur = e;
      await new Promise((r) => setTimeout(r, 2500));
    }
  }
  throw new Error("L'IA n'a pas répondu : " + (derniereErreur?.message || "erreur inconnue"));
}

const aujourdhui = () => new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Lecture d'un CV / d'une lettre de motivation
// ---------------------------------------------------------------------------
export type AnalyseCandidat = {
  type: "cv" | "lettre" | "cv_et_lettre" | "autre";
  nom: string | null;
  prenom: string | null;
  sexe: "H" | "F" | null;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  codePostal: string | null;
  ville: string | null;
  photo: { presente: boolean; cadre: number[] | null } | null;
  resume: string | null;
  competences: string | null;
  diplomes: string | null;
  experiences: { employeur: string; poste: string; debut: string | null; fin: string | null; public: boolean; statut: string }[];
  moisExperiencePublic: number | null;
  moisExperienceEnLien: number | null;
  dejaFonctionnaire: boolean | null;
  gradeActuel: string | null;
  echelonActuel: number | null;
  score: number | null;
  pointsForts: string | null;
  pointsVigilance: string | null;
  motivation: string | null;
};

export async function analyserCandidature(fichier: Fichier, imagePage1: string | null, poste: { intitule: string; ficheDePoste?: string | null } | null): Promise<AnalyseCandidat> {
  const contextePoste = poste
    ? `Poste visé : « ${poste.intitule} ».\nFiche de poste :\n${(poste.ficheDePoste || "(pas de fiche de poste : compare avec l'intitulé du poste)").slice(0, 12000)}`
    : "Candidature spontanée (pas de poste précis) : score = null.";
  const consigne = `Tu aides le service RH de la mairie de Cestas (Gironde, fonction publique territoriale) à lire des candidatures.
Le premier fichier joint est un document de candidature (CV, lettre de motivation, ou les deux).${imagePage1 ? "\nLe second fichier est une image de sa PREMIÈRE PAGE, qui sert uniquement à repérer la photo d'identité du candidat." : ""}
Date du jour : ${aujourdhui()} (une expérience « en cours » se termine aujourd'hui).

${contextePoste}

Réponds UNIQUEMENT avec un objet JSON de cette forme :
{
  "type": "cv" | "lettre" | "cv_et_lettre" | "autre",
  "nom": string|null, "prenom": string|null,
  "sexe": "H"|"F"|null,            // d'après la civilité, les accords (« motivée », « né ») ou le prénom ; null si doute
  "email": string|null, "telephone": string|null,
  "adresse": string|null,          // numéro et rue seulement
  "codePostal": string|null, "ville": string|null,
  "photo": { "presente": boolean, "cadre": [ymin, xmin, ymax, xmax] | null },  // cadre de la photo du visage sur l'IMAGE de la première page, coordonnées de 0 à 1000 ; null si pas de photo
  "resume": string|null,           // 2 à 3 phrases sur le profil
  "competences": string|null,      // compétences clés séparées par des virgules
  "diplomes": string|null,
  "experiences": [{ "employeur": string, "poste": string, "debut": "AAAA-MM"|null, "fin": "AAAA-MM"|null, "public": boolean, "statut": "titulaire"|"contractuel"|"prive"|"stage"|"autre" }],
  "moisExperiencePublic": number|null,   // total des mois travaillés dans la fonction publique (mairie, État, hôpital, CCAS…)
  "moisExperienceEnLien": number|null,   // total des mois d'expérience en lien avec le poste visé (public ou privé)
  "dejaFonctionnaire": boolean|null,     // true seulement s'il est écrit qu'il est fonctionnaire titulaire ou stagiaire actuellement
  "gradeActuel": string|null, "echelonActuel": number|null,
  "score": number|null,            // compatibilité de 0 à 100 avec la fiche de poste, à titre indicatif
  "pointsForts": string|null,      // 1 à 3 points forts pour ce poste, très courts
  "pointsVigilance": string|null,  // 1 à 3 points à vérifier en entretien, très courts
  "motivation": string|null        // si une lettre de motivation est présente : sa motivation en 1 à 2 phrases
}
N'invente rien : mets null quand l'information n'est pas dans le document. Reste factuel et neutre : le score ne doit tenir compte ni de l'âge, ni du sexe, ni de l'origine, ni de la situation familiale, ni de la photo.`;
  const fichiers: Fichier[] = [fichier];
  if (imagePage1) fichiers.push({ data: imagePage1, mimeType: "image/jpeg" });
  const r = await demanderJson(consigne, fichiers);
  return { ...r, experiences: Array.isArray(r.experiences) ? r.experiences : [] };
}

// ---------------------------------------------------------------------------
// Lecture d'une fiche de poste (pré-remplit le poste)
// ---------------------------------------------------------------------------
export async function lireFicheDePoste(fichier: Fichier): Promise<{ texte: string; intitule: string | null; service: string | null; filiere: string | null; categorie: string | null; cadreEmploi: string | null; grade: string | null; tempsTravail: number | null }> {
  const consigne = `Voici une fiche de poste de la mairie de Cestas (fonction publique territoriale).
Réponds UNIQUEMENT en JSON :
{ "texte": string,            // tout le contenu utile de la fiche (missions, compétences, profil, conditions), en texte brut
  "intitule": string|null, "service": string|null,
  "filiere": "Administrative"|"Technique"|"Animation"|"Sportive"|"Sociale"|"Médico-sociale"|"Culturelle"|"Police municipale"|null,
  "categorie": "A"|"B"|"C"|null, "cadreEmploi": string|null, "grade": string|null,
  "tempsTravail": number|null   // 1 pour un temps complet, 0.9 pour 31h30…
}`;
  return demanderJson(consigne, [fichier]);
}

// ---------------------------------------------------------------------------
// Lecture d'une grille indiciaire (PDF du CDG, capture d'écran…)
// ---------------------------------------------------------------------------
export type GrilleLue = { filiere: string; cadreEmploi: string; grade: string; categorie: string | null; echelons: { numero: number; indiceBrut: number | null; indiceMajore: number; dureeMois: number | null }[] };

export async function lireGrilles(fichier: Fichier): Promise<GrilleLue[]> {
  const consigne = `Ce document contient une ou plusieurs grilles indiciaires de la fonction publique territoriale (par exemple publiées par un Centre de Gestion).
Extrais CHAQUE grade présent. Réponds UNIQUEMENT en JSON :
[{ "filiere": "Administrative"|"Technique"|"Animation"|"Sportive"|"Sociale"|"Médico-sociale"|"Culturelle"|"Police municipale",
   "cadreEmploi": string,      // ex. « Adjoints techniques territoriaux »
   "grade": string,            // ex. « Adjoint technique principal de 2e classe »
   "categorie": "A"|"B"|"C"|null,
   "echelons": [{ "numero": number, "indiceBrut": number|null, "indiceMajore": number, "dureeMois": number|null }]  // dureeMois : durée pour passer à l'échelon suivant (ex. « 2 ans » = 24, « 1 an 6 mois » = 18), null pour le dernier
}]
Recopie les indices exactement, sans rien calculer ni inventer. Si le document indique plusieurs grilles selon une date d'application, garde celle actuellement en vigueur ou la plus récente.`;
  const r = await demanderJson(consigne, [fichier]);
  return Array.isArray(r) ? r : Array.isArray(r?.grilles) ? r.grilles : [];
}

// ---------------------------------------------------------------------------
// Vivier : quelles candidatures spontanées correspondent à un poste ?
// ---------------------------------------------------------------------------
export async function scorerVivier(poste: { intitule: string; ficheDePoste?: string | null }, candidats: { id: string; resume: string | null; competences: string | null }[]): Promise<{ id: string; score: number; raison: string }[]> {
  if (candidats.length === 0) return [];
  const liste = candidats.map((c) => `- id=${c.id} | ${c.resume || ""} | Compétences : ${c.competences || ""}`).join("\n");
  const consigne = `Poste à pourvoir à la mairie de Cestas : « ${poste.intitule} ».
Fiche de poste :
${(poste.ficheDePoste || "(pas de fiche, utilise l'intitulé)").slice(0, 8000)}

Voici des candidatures spontanées reçues (résumé + compétences) :
${liste}

Donne pour CHAQUE candidature un score de compatibilité de 0 à 100 (à titre indicatif, sans tenir compte du sexe ni de l'âge) et une raison très courte.
Réponds UNIQUEMENT en JSON : [{ "id": string, "score": number, "raison": string }]`;
  const r = await demanderJson(consigne, []);
  return Array.isArray(r) ? r : [];
}
