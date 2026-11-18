// Statistiques : chaque candidature (ou chaque poste) devient une ligne « à plat »,
// puis on compte selon les critères choisis dans le constructeur de graphiques.

export type LigneStat = Record<string, string | number | null>;

export type Source = "candidatures" | "postes";
export type TypeGraphique = "histogramme" | "barres" | "camembert" | "courbe" | "tableau";
export type ConfigGraphique = {
  source: Source;
  regrouper: string;           // axe des catégories (abscisse)
  separer: string | null;      // 2e critère : barres empilées / plusieurs courbes
  type: TypeGraphique;
  annees: number[];            // vide = toutes
  statuts: string[];           // vide = tous (candidatures)
  provenance: "toutes" | "postes" | "spontanees";
  titre?: string;
};

export type Dimension = { cle: string; libelle: string; ordonnee?: boolean };

export const DIMENSIONS: Record<Source, Dimension[]> = {
  candidatures: [
    { cle: "annee", libelle: "Année", ordonnee: true },
    { cle: "mois", libelle: "Mois de réception", ordonnee: true },
    { cle: "poste", libelle: "Poste" },
    { cle: "service", libelle: "Service" },
    { cle: "filiere", libelle: "Filière" },
    { cle: "categorie", libelle: "Catégorie (A, B, C)" },
    { cle: "collectivite", libelle: "Collectivité" },
    { cle: "provenance", libelle: "Poste ou spontanée" },
    { cle: "sexe", libelle: "Sexe" },
    { cle: "departement", libelle: "Département" },
    { cle: "ville", libelle: "Ville" },
    { cle: "statut", libelle: "Avancement" },
    { cle: "trancheScore", libelle: "Score IA (tranche)", ordonnee: true },
    { cle: "noteAssessfirst", libelle: "Note AssessFirst", ordonnee: true },
  ],
  postes: [
    { cle: "annee", libelle: "Année", ordonnee: true },
    { cle: "service", libelle: "Service" },
    { cle: "filiere", libelle: "Filière" },
    { cle: "categorie", libelle: "Catégorie (A, B, C)" },
    { cle: "collectivite", libelle: "Collectivité" },
    { cle: "etat", libelle: "État de l'offre" },
    { cle: "trancheCandidatures", libelle: "Nombre de candidatures reçues", ordonnee: true },
  ],
};

export const TYPES: { cle: TypeGraphique; libelle: string; icone: string }[] = [
  { cle: "histogramme", libelle: "Histogramme", icone: "📊" },
  { cle: "barres", libelle: "Barres horizontales", icone: "📶" },
  { cle: "camembert", libelle: "Camembert", icone: "🥧" },
  { cle: "courbe", libelle: "Courbe", icone: "📈" },
  { cle: "tableau", libelle: "Tableau", icone: "🔢" },
];

// Palette catégorielle validée (ordre fixe, jamais recyclée) ; une seule série = vert de la charte
export const COULEURS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];
export const COULEUR_UNIQUE = "#6E8D66";
export const COULEUR_AUTRES = "#B8B4AA";
export const MAX_SERIES = 8;

export const VIDE = "Non renseigné";
const AUTRES = "Autres";

export function libelleDimension(source: Source, cle: string | null): string {
  return DIMENSIONS[source].find((d) => d.cle === cle)?.libelle || "";
}

function filtrer(lignes: LigneStat[], c: ConfigGraphique): LigneStat[] {
  return lignes.filter((l) =>
    (c.annees.length === 0 || c.annees.includes(Number(l.annee))) &&
    (c.source !== "candidatures" || c.statuts.length === 0 || c.statuts.includes(String(l.statutCode))) &&
    (c.source !== "candidatures" || c.provenance === "toutes" || (c.provenance === "spontanees" ? l.provenance === "Spontanée" : l.provenance !== "Spontanée"))
  );
}

const valeur = (l: LigneStat, cle: string) => (l[cle] === null || l[cle] === undefined || l[cle] === "" ? VIDE : String(l[cle]));

function trier(cats: string[], totaux: Map<string, number>, ordonnee: boolean): string[] {
  return [...cats].sort((a, b) => {
    if (a === VIDE) return 1;
    if (b === VIDE) return -1;
    if (ordonnee) return a.localeCompare(b, "fr", { numeric: true });
    return (totaux.get(b) || 0) - (totaux.get(a) || 0) || a.localeCompare(b, "fr");
  });
}

export type Agregat = { categories: string[]; series: { nom: string; couleur: string; valeurs: number[] }[]; total: number; nbLignes: number };

// lignesToutes sert à figer l'ordre (et donc la couleur) de chaque série, quels que soient les filtres
export function agreger(lignesToutes: LigneStat[], c: ConfigGraphique): Agregat {
  const lignes = filtrer(lignesToutes, c);
  const dim = DIMENSIONS[c.source].find((d) => d.cle === c.regrouper);
  const ordonnee = !!dim?.ordonnee;
  const totaux = new Map<string, number>();
  lignes.forEach((l) => totaux.set(valeur(l, c.regrouper), (totaux.get(valeur(l, c.regrouper)) || 0) + 1));
  let categories = trier(Array.from(totaux.keys()), totaux, ordonnee);
  // Trop de catégories : les plus petites passent dans « Autres » (sauf axe ordonné comme les années)
  const max = c.type === "camembert" ? 6 : ordonnee ? 60 : 15;
  let regroupees = new Set<string>();
  if (categories.length > max) {
    const gardees = ordonnee ? categories.slice(-max) : categories.slice(0, max - 1);
    regroupees = new Set(categories.filter((x) => !gardees.includes(x)));
    categories = ordonnee ? gardees : [...gardees, AUTRES];
  }
  const cat = (l: LigneStat) => { const v = valeur(l, c.regrouper); return regroupees.has(v) ? (ordonnee ? null : AUTRES) : v; };

  if (!c.separer || c.type === "camembert") {
    const valeurs = categories.map(() => 0);
    lignes.forEach((l) => { const k = cat(l); if (k === null) return; valeurs[categories.indexOf(k)]++; });
    return { categories, series: [{ nom: "Nombre", couleur: COULEUR_UNIQUE, valeurs }], total: valeurs.reduce((a, b) => a + b, 0), nbLignes: lignes.length };
  }

  // Séries : ordre fixé sur TOUTES les lignes, pour que chaque série garde sa couleur
  const totauxSerie = new Map<string, number>();
  lignesToutes.forEach((l) => totauxSerie.set(valeur(l, c.separer!), (totauxSerie.get(valeur(l, c.separer!)) || 0) + 1));
  const dimSerie = DIMENSIONS[c.source].find((d) => d.cle === c.separer);
  let ordreSeries = trier(Array.from(totauxSerie.keys()), totauxSerie, !!dimSerie?.ordonnee);
  let seriesAutres = new Set<string>();
  if (ordreSeries.length > MAX_SERIES) {
    seriesAutres = new Set(ordreSeries.slice(MAX_SERIES - 1));
    ordreSeries = [...ordreSeries.slice(0, MAX_SERIES - 1), AUTRES];
  }
  const nomSerie = (l: LigneStat) => { const v = valeur(l, c.separer!); return seriesAutres.has(v) ? AUTRES : v; };
  const presentes = new Set(lignes.map(nomSerie));
  const series = ordreSeries
    .map((nom, i) => ({ nom, couleur: nom === AUTRES ? COULEUR_AUTRES : nom === VIDE ? "#D8D4CA" : COULEURS[i % COULEURS.length], valeurs: categories.map(() => 0) }))
    .filter((s) => presentes.has(s.nom));
  lignes.forEach((l) => {
    const k = cat(l);
    if (k === null) return;
    const s = series.find((x) => x.nom === nomSerie(l));
    if (s) s.valeurs[categories.indexOf(k)]++;
  });
  return { categories, series, total: lignes.length, nbLignes: lignes.length };
}

export function enCsv(a: Agregat, libelleCategorie: string): string {
  const echapper = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
  const entete = [libelleCategorie, ...a.series.map((s) => s.nom)];
  const lignes = a.categories.map((c, i) => [c, ...a.series.map((s) => s.valeurs[i])]);
  return [entete, ...lignes].map((l) => l.map(echapper).join(";")).join("\n");
}
