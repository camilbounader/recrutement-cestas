// Reprise de l'ancien tableau Excel « SUIVI DES RECRUTEMENTS »
// Une feuille par année ; une ligne « Poste » puis les lignes de ses candidats ;
// nom surligné en jaune = recruté, colonne « Proposition » remplie = convoqué en entretien.

export type Cellule = { v: string | number | Date | null; jaune: boolean };
export type Feuille = { nom: string; lignes: Cellule[][] };

export type CandidatImport = {
  nom: string | null; prenom: string | null; sexe: string | null; departement: string | null; ville: string | null; email: string | null;
  statut: string; dateEntretien: string | null; observations: string | null;
};
export type PosteImport = {
  intitule: string; motif: string | null; dateDemande: Date | null; numeroOffre: string | null; service: string | null; filiere: string | null;
  categorie: string | null; collectivite: string | null; observations: string | null; candidats: CandidatImport[];
};
export type FeuilleAnalysee = { nom: string; annee: number; postes: PosteImport[]; nbCandidats: number; nbRetenus: number; nbRecrutes: number };

const sansAccent = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

// Colonnes reconnues (les intitulés varient selon les années)
const COLONNES: Record<string, string[]> = {
  poste: ["poste"],
  motif: ["nom du titulaire a remplacer"],
  demande: ["demande faite le"],
  offre: ["n° offre", "no offre", "n offre"],
  nom: ["noms", "nom"],
  prenom: ["prenom"],
  sexe: ["sexe"],
  dpt: ["dpt", "dep.", "dep", "departement"],
  ville: ["ville"],
  email: ["adresse mail", "mail"],
  assessfirst: ["assessfirst"],
  proposition: ["proposition"],
  reponses: ["reponses"],
  observations: ["observations"],
  nomination: ["nomination et", "cloturer et"],
  service: ["service"],
  filiere: ["filiere"],
  cat: ["cat", "cat."],
  coll: ["coll.", "coll"],
};

const FILIERES: Record<string, string> = {
  TECH: "Technique", ADM: "Administrative", ADMIN: "Administrative", ANIM: "Animation", SPORT: "Sportive", SOC: "Sociale", SOCIAL: "Sociale", SOCIALE: "Sociale",
  "MEDICO-SOCIALE": "Médico-sociale", "MEDICO SOCIALE": "Médico-sociale", MS: "Médico-sociale", CULT: "Culturelle", CULTURELLE: "Culturelle", POLICE: "Police municipale", PM: "Police municipale",
};

// Filière écrite librement dans l'Excel (TECH, ADM, MEDICO SO, SECURITÉ…) → filière officielle
function filiere(brut: string): string | null {
  const f = sansAccent(brut).toUpperCase();
  if (!f || f.includes("/")) return null;
  if (FILIERES[f]) return FILIERES[f];
  const prefixes: [string, string][] = [["MEDICO", "Médico-sociale"], ["TECH", "Technique"], ["ADM", "Administrative"], ["ANIM", "Animation"], ["SPORT", "Sportive"], ["SOC", "Sociale"], ["CULT", "Culturelle"], ["POLICE", "Police municipale"], ["SECU", "Police municipale"]];
  return prefixes.find(([p]) => f.startsWith(p))?.[1] || null;
}

export function texte(v: Cellule["v"] | undefined): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toLocaleDateString("fr-FR", { timeZone: "UTC" });
  const s = String(v).trim();
  if (!s || s.startsWith("=")) return null;
  return s;
}

const uneLigne = (s: string | null) => (s ? s.replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " ").trim() : null);

export function analyserFeuilles(feuilles: Feuille[], anneeParDefaut: number): FeuilleAnalysee[] {
  const resultat: FeuilleAnalysee[] = [];
  for (const f of feuilles) {
    // Ligne d'en-tête : celle dont la 1re colonne vaut « Poste »
    const iEntete = f.lignes.slice(0, 8).findIndex((l) => sansAccent(texte(l[0]?.v) || "") === "poste");
    if (iEntete < 0) continue;
    const entete = f.lignes[iEntete].map((c) => sansAccent(texte(c?.v) || ""));
    const col: Record<string, number> = {};
    for (const [cle, noms] of Object.entries(COLONNES)) {
      const i = entete.findIndex((h) => noms.includes(h));
      if (i >= 0) col[cle] = i;
    }
    if (col.poste === undefined || col.nom === undefined) continue;
    const lire = (l: Cellule[], cle: string) => (col[cle] === undefined ? null : texte(l[col[cle]]?.v));
    const cellule = (l: Cellule[], cle: string) => (col[cle] === undefined ? undefined : l[col[cle]]);

    const annee = Number((f.nom.match(/20\d\d/) || [])[0]) || anneeParDefaut;
    const postes: PosteImport[] = [];
    let courant: PosteImport | null = null;
    for (const l of f.lignes.slice(iEntete + 1)) {
      const intitule = lire(l, "poste");
      if (intitule) {
        const demande = cellule(l, "demande")?.v;
        const filiereBrute = (lire(l, "filiere") || "").toUpperCase();
        const offre = lire(l, "offre");
        courant = {
          intitule: uneLigne(intitule)!,
          motif: uneLigne(lire(l, "motif")),
          dateDemande: demande instanceof Date ? demande : null,
          numeroOffre: offre ? offre.replace(/^ET\s*:?\s*/i, "").trim() || null : null,
          service: uneLigne(lire(l, "service")),
          filiere: filiere(filiereBrute) || (filiereBrute ? uneLigne(lire(l, "filiere")) : null),
          categorie: (lire(l, "cat") || "").toUpperCase().trim().slice(0, 1) || null,
          collectivite: (lire(l, "coll") || "").toUpperCase().trim() || null,
          observations: [!(demande instanceof Date) && texte(demande) ? `Demande : ${uneLigne(texte(demande))}` : null, lire(l, "nomination") ? `Nomination ET : ${uneLigne(lire(l, "nomination"))}` : null].filter(Boolean).join("\n") || null,
          candidats: [],
        };
        postes.push(courant);
      }
      const nom = lire(l, "nom");
      if (!courant || !nom) continue;
      const sexeBrut = (lire(l, "sexe") || "").toUpperCase();
      const dpt = lire(l, "dpt");
      const proposition = lire(l, "proposition");
      const recrute = !!cellule(l, "nom")?.jaune;
      courant.candidats.push({
        nom: uneLigne(nom)?.toUpperCase() || null,
        prenom: uneLigne(lire(l, "prenom")),
        sexe: sexeBrut.startsWith("F") ? "F" : sexeBrut.startsWith("H") || sexeBrut.startsWith("M") ? "H" : null,
        departement: dpt && /^\d{1,3}$|^2[AB]$/i.test(dpt) ? dpt.toUpperCase().padStart(2, "0") : null,
        ville: uneLigne(lire(l, "ville"))?.toUpperCase() || null,
        email: (lire(l, "email") || "").toLowerCase().match(/[^\s<>;,]+@[^\s<>;,]+/)?.[0] || null,
        statut: recrute ? "recrutee" : proposition ? "retenue" : "recue",
        dateEntretien: uneLigne(proposition),
        observations: [lire(l, "observations"), lire(l, "reponses") && `Réponse : ${lire(l, "reponses")}`, lire(l, "assessfirst") && `AssessFirst : ${lire(l, "assessfirst")}`].filter(Boolean).map(uneLigne).join("\n") || null,
      });
    }
    const tous = postes.flatMap((p) => p.candidats);
    resultat.push({ nom: f.nom, annee, postes, nbCandidats: tous.length, nbRetenus: tous.filter((c) => c.statut !== "recue").length, nbRecrutes: tous.filter((c) => c.statut === "recrutee").length });
  }
  return resultat;
}

// Lecture du fichier .xlsx (côté serveur) avec la couleur de fond de chaque cellule
export async function lireClasseur(base64: string): Promise<Feuille[]> {
  const ExcelJS: any = (await import("exceljs")).default || (await import("exceljs"));
  const classeur = new ExcelJS.Workbook();
  await classeur.xlsx.load(Buffer.from(base64, "base64"));
  const feuilles: Feuille[] = [];
  classeur.eachSheet((ws: any) => {
    const lignes: Cellule[][] = [];
    ws.eachRow({ includeEmpty: true }, (row: any, numero: number) => {
      const cellules: Cellule[] = [];
      for (let c = 1; c <= Math.min(ws.columnCount || 30, 40); c++) {
        const cell = row.getCell(c);
        let v: any = cell.value;
        if (v && typeof v === "object" && !(v instanceof Date)) {
          if ("result" in v) v = v.result ?? null;
          else if ("richText" in v) v = v.richText.map((t: any) => t.text).join("");
          else if ("text" in v) v = v.text;
          else v = null;
        }
        const argb = cell.fill?.type === "pattern" ? cell.fill?.fgColor?.argb : undefined;
        cellules.push({ v: v ?? null, jaune: argb === "FFFFFF00" });
      }
      lignes[numero - 1] = cellules;
    });
    for (let i = 0; i < lignes.length; i++) if (!lignes[i]) lignes[i] = [];
    feuilles.push({ nom: ws.name, lignes });
  });
  return feuilles;
}
