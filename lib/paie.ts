// Calcul des simulations de paie : reprend ligne à ligne les deux fichiers Excel
// « Simulateur de paie Titulaire » et « Simulateur de paie Contractuel ».
// Tous les montants et taux viennent de la page Paramètres de paie (modifiable).

export type ParamsPaie = {
  valeurPointAnnuelle: number;
  seuilSmic: number;
  ctiPoints: number;
  sftIndicePlancher: number;
  transfertA: number;
  transfertB: number;
  transfertC: number;
  ciaAnnuel: number;
  tauxIndemniteCsg: number;
  tauxCnracl: number;
  tauxRafp: number;
  plafondRafp: number;
  assietteCsg: number;
  tauxCsg: number;
  tauxCrds: number;
  tauxCsgDeductible: number;
  plafondSecu: number;
  tauxVieillessePlafonnee: number;
  tauxVieillesseDeplafonnee: number;
  tauxIrcantecA: number;
  tauxIrcantecB: number;
  participationSante: number;
  participationPrevoyance: number;
};

export type EntreeSimulation = {
  regime: "titulaire" | "contractuel";
  nom: string;
  poste: string;
  grade: string;
  echelon: number;
  indiceMajore: number;
  tempsTravail: number; // 1 = 100 %
  categorie: string; // A, B ou C (transfert primes/points)
  cti: boolean;
  nbiPoints: number;
  enfants: number;
  ifse: number;
  cia: boolean;
  astreinteNombre: number;
  astreinteTaux: number;
  sante: boolean;
  prevoyance: boolean;
  indemniteCsg: boolean;
};

export type LignePaie = { libelle: string; base?: number | string; taux?: number; montant: number };
export type ResultatSimulation = { gains: LignePaie[]; brut: number; retenues: LignePaie[]; totalRetenues: number; net: number; valeurPoint: number };

const arrondi = (n: number) => Math.round(n * 100) / 100;

// Supplément familial de traitement (même règle que les fichiers Excel ; au-delà de 3 enfants : +4,57 € et +6 % par enfant)
function sft(enfants: number, indice: number, plancher: number, vpt: number): number {
  if (enfants <= 0) return 0;
  if (enfants === 1) return 2.29;
  const base = Math.max(indice, plancher) * vpt;
  if (enfants === 2) return 10.67 + base * 0.03;
  const enPlus = enfants - 3;
  return 15.24 + 4.57 * enPlus + base * (0.08 + 0.06 * enPlus);
}

export function calculerSimulation(e: EntreeSimulation, p: ParamsPaie): ResultatSimulation {
  const vpt = p.valeurPointAnnuelle / 12 / 100; // valeur mensuelle d'un point
  const tps = e.tempsTravail || 1;
  const gains: LignePaie[] = [];
  const retenues: LignePaie[] = [];

  const traitement = e.indiceMajore * vpt * tps;
  gains.push({ libelle: "Traitement de base indiciaire", base: `IM ${e.indiceMajore}`, montant: traitement });
  const diffSmic = traitement > p.seuilSmic ? 0 : (p.seuilSmic - e.indiceMajore * vpt) * tps;
  if (diffSmic > 0) gains.push({ libelle: "Indemnité différentielle SMIC", montant: diffSmic });

  let cti = 0, nbi = 0, transfert = 0;
  if (e.regime === "titulaire") {
    cti = e.cti ? p.ctiPoints * vpt : 0;
    if (cti) gains.push({ libelle: "Complément de traitement indiciaire (CTI)", base: `${p.ctiPoints} points`, montant: cti });
    nbi = (e.nbiPoints || 0) * vpt;
    if (nbi) gains.push({ libelle: "Nouvelle bonification indiciaire (NBI)", base: `${e.nbiPoints} points`, montant: nbi });
  }
  const supplementFamilial = sft(e.enfants || 0, e.indiceMajore + (e.nbiPoints || 0), p.sftIndicePlancher, vpt);
  if (supplementFamilial) gains.push({ libelle: "Supplément familial de traitement (SFT)", base: `${e.enfants} enfant(s)`, montant: supplementFamilial });

  if (e.regime === "titulaire") {
    const montantCat = e.categorie === "A" ? p.transfertA : e.categorie === "B" ? p.transfertB : p.transfertC;
    transfert = -(montantCat / 12) * tps;
    gains.push({ libelle: "Transfert primes / points", base: `Cat. ${e.categorie || "C"}`, montant: transfert });
  }
  const ifse = e.ifse || 0;
  if (ifse) gains.push({ libelle: "IFSE", montant: ifse });
  const cia = e.cia ? p.ciaAnnuel / 12 : 0;
  if (cia) gains.push({ libelle: "CIA (versé en juin, ramené au mois)", montant: cia });
  const astreinte = (e.astreinteNombre || 0) * (e.astreinteTaux || 0);
  if (astreinte) gains.push({ libelle: "Astreintes", base: e.astreinteNombre, taux: e.astreinteTaux, montant: astreinte });
  const sante = e.sante ? p.participationSante : 0;
  if (sante) gains.push({ libelle: "Participation santé", montant: sante });
  const prevoyance = e.prevoyance ? p.participationPrevoyance : 0;
  if (prevoyance) gains.push({ libelle: "Participation prévoyance", montant: prevoyance });

  if (e.regime === "titulaire" && e.indemniteCsg) {
    const base = traitement + nbi + supplementFamilial + transfert + ifse + cia + astreinte + sante + prevoyance;
    gains.push({ libelle: "Indemnité compensatrice CSG", base: arrondi(base), taux: p.tauxIndemniteCsg, montant: base * p.tauxIndemniteCsg });
  }

  const brut = gains.reduce((s, l) => s + l.montant, 0);

  if (e.regime === "titulaire") {
    const baseCnracl = traitement + nbi + cti;
    retenues.push({ libelle: "CNRACL", base: arrondi(baseCnracl), taux: p.tauxCnracl, montant: baseCnracl * p.tauxCnracl });
    const rafpPrimes = (ifse + cia + astreinte) * p.tauxRafp;
    const rafpPlafond = traitement * p.plafondRafp * p.tauxRafp;
    retenues.push({ libelle: "RAFP", base: arrondi(Math.min(ifse + cia + astreinte, traitement * p.plafondRafp)), taux: p.tauxRafp, montant: Math.min(rafpPrimes, rafpPlafond) });
  } else {
    const basePlafonnee = Math.min(brut, p.plafondSecu);
    retenues.push({ libelle: "Vieillesse plafonnée", base: arrondi(basePlafonnee), taux: p.tauxVieillessePlafonnee, montant: basePlafonnee * p.tauxVieillessePlafonnee });
    retenues.push({ libelle: "Vieillesse déplafonnée", base: arrondi(brut), taux: p.tauxVieillesseDeplafonnee, montant: brut * p.tauxVieillesseDeplafonnee });
    const baseA = Math.min(basePlafonnee - supplementFamilial, p.plafondSecu);
    retenues.push({ libelle: "Ircantec tranche A", base: arrondi(baseA), taux: p.tauxIrcantecA, montant: baseA * p.tauxIrcantecA });
    const baseB = brut < p.plafondSecu ? 0 : brut - baseA;
    if (baseB > 0) retenues.push({ libelle: "Ircantec tranche B", base: arrondi(baseB), taux: p.tauxIrcantecB, montant: baseB * p.tauxIrcantecB });
  }
  const baseCsg = brut * p.assietteCsg;
  retenues.push({ libelle: "CSG non déductible", base: arrondi(baseCsg), taux: p.tauxCsg, montant: baseCsg * p.tauxCsg });
  retenues.push({ libelle: "CRDS", base: arrondi(baseCsg), taux: p.tauxCrds, montant: baseCsg * p.tauxCrds });
  retenues.push({ libelle: "CSG déductible", base: arrondi(baseCsg), taux: p.tauxCsgDeductible, montant: baseCsg * p.tauxCsgDeductible });

  const totalRetenues = retenues.reduce((s, l) => s + l.montant, 0);
  return {
    gains: gains.map((l) => ({ ...l, montant: arrondi(l.montant) })),
    brut: arrondi(brut),
    retenues: retenues.map((l) => ({ ...l, montant: arrondi(l.montant) })),
    totalRetenues: arrondi(totalRetenues),
    net: arrondi(brut - totalRetenues),
    valeurPoint: vpt,
  };
}

// Proposition d'échelon à partir de ce que l'IA a lu dans le CV (toujours à valider par la RH)
export function suggererEchelon(opts: {
  regime: "titulaire" | "contractuel";
  dejaFonctionnaire?: boolean | null;
  echelonActuel?: number | null;
  moisExperience?: number | null;
  echelons: { numero: number; dureeMois: number | null }[];
}): { numero: number; explication: string } {
  const liste = [...opts.echelons].sort((a, b) => a.numero - b.numero);
  const max = liste.length ? liste[liste.length - 1].numero : 1;
  if (opts.dejaFonctionnaire && opts.echelonActuel) {
    return { numero: Math.min(opts.echelonActuel, max), explication: `Déjà fonctionnaire : échelon actuel lu dans le CV (${opts.echelonActuel}). À vérifier sur son dernier arrêté.` };
  }
  if (opts.regime === "titulaire") {
    return { numero: 1, explication: "Premier poste de fonctionnaire : nomination stagiaire à l'échelon 1. La reprise des services antérieurs se fera avec ses bulletins de paie (courrier à envoyer)." };
  }
  let reste = opts.moisExperience || 0;
  let numero = liste[0]?.numero || 1;
  for (const e of liste) {
    if (!e.dureeMois || reste < e.dureeMois || e.numero === max) { numero = e.numero; break; }
    reste -= e.dureeMois;
    numero = e.numero + 1;
  }
  const annees = Math.round(((opts.moisExperience || 0) / 12) * 10) / 10;
  return { numero: Math.min(numero, max), explication: `Contractuel : ${annees} an(s) d'expérience en lien avec le poste lus dans le CV, comparés aux durées des échelons de la grille. Indicatif.` };
}

export function texteSimulationPourMail(e: EntreeSimulation, r: ResultatSimulation): string {
  const f = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  return [
    `• Grade : ${e.grade || "—"}, échelon ${e.echelon} (indice majoré ${e.indiceMajore})`,
    `• Temps de travail : ${Math.round((e.tempsTravail || 1) * 1000) / 10} %`,
    `• Rémunération brute mensuelle : ${f(r.brut)}`,
    `• Rémunération nette mensuelle avant prélèvement à la source : ${f(r.net)}`,
    "",
    "Ce calcul ne constitue qu'une simulation. Certains éléments de rémunération peuvent varier en fonction d'informations non connues à ce jour.",
  ].join("\n");
}
