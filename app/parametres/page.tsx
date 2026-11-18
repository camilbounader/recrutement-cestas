import Cadre from "../components/Cadre";
import { lireParametres } from "@/lib/parametres";
import { enregistrerParametres } from "./actions";
import { dateFr } from "@/lib/format";
import TestMail from "./TestMail";

type Champ = { cle: string; libelle: string; pct?: boolean; aide?: string };

const BLOCS: { titre: string; champs: Champ[] }[] = [
  { titre: "Traitement", champs: [
    { cle: "valeurPointAnnuelle", libelle: "Valeur annuelle de 100 points d'indice (€)", aide: "5 907,34 € depuis le 1er juillet 2023" },
    { cle: "seuilSmic", libelle: "Seuil indemnité différentielle SMIC (€ brut / mois)" },
    { cle: "ctiPoints", libelle: "CTI : nombre de points" },
    { cle: "sftIndicePlancher", libelle: "SFT : indice plancher" },
  ] },
  { titre: "Primes", champs: [
    { cle: "transfertA", libelle: "Transfert primes/points cat. A (€ / an)" },
    { cle: "transfertB", libelle: "Transfert primes/points cat. B (€ / an)" },
    { cle: "transfertC", libelle: "Transfert primes/points cat. C (€ / an)" },
    { cle: "ciaAnnuel", libelle: "CIA annuel (€)" },
    { cle: "participationSante", libelle: "Participation santé (€ / mois)" },
    { cle: "participationPrevoyance", libelle: "Participation prévoyance (€ / mois)" },
    { cle: "tauxIndemniteCsg", libelle: "Indemnité compensatrice CSG (%)", pct: true },
  ] },
  { titre: "Cotisations titulaires", champs: [
    { cle: "tauxCnracl", libelle: "CNRACL (%)", pct: true },
    { cle: "tauxRafp", libelle: "RAFP (%)", pct: true },
    { cle: "plafondRafp", libelle: "Plafond RAFP (% du traitement)", pct: true },
  ] },
  { titre: "Cotisations contractuels", champs: [
    { cle: "plafondSecu", libelle: "Plafond mensuel de la Sécurité sociale (€)" },
    { cle: "tauxVieillessePlafonnee", libelle: "Vieillesse plafonnée (%)", pct: true },
    { cle: "tauxVieillesseDeplafonnee", libelle: "Vieillesse déplafonnée (%)", pct: true },
    { cle: "tauxIrcantecA", libelle: "Ircantec tranche A (%)", pct: true },
    { cle: "tauxIrcantecB", libelle: "Ircantec tranche B (%)", pct: true },
  ] },
  { titre: "CSG / CRDS (tous)", champs: [
    { cle: "assietteCsg", libelle: "Assiette CSG (% du brut)", pct: true },
    { cle: "tauxCsg", libelle: "CSG non déductible (%)", pct: true },
    { cle: "tauxCrds", libelle: "CRDS (%)", pct: true },
    { cle: "tauxCsgDeductible", libelle: "CSG déductible (%)", pct: true },
  ] },
];

const enPct = (n: number) => String(Math.round(n * 100 * 10000) / 10000);

export default async function Parametres() {
  const p: Record<string, any> = await lireParametres();
  return (
    <Cadre>
      <h1 className="titre-page">Paramètres de paie</h1>
      <p style={{ fontSize: 13, color: "#666", marginTop: -8 }}>
        Repris des simulateurs Excel. Dernière vérification : <b>{dateFr(p.misAJourLe)}</b>. Enregistrer cette page vaut vérification (une alerte apparaît après 12 mois).
      </p>
      <form action={enregistrerParametres} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {BLOCS.map((b) => (
          <div key={b.titre} className="carte">
            <h2 className="titre-bloc">{b.titre}</h2>
            <div className="grille-champs" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
              {b.champs.map((c) => (
                <label key={c.cle} className="champ">
                  {c.libelle}
                  <input name={c.cle} defaultValue={c.pct ? enPct(p[c.cle]) : String(p[c.cle])} inputMode="decimal" />
                  {c.pct && <input type="hidden" name={`${c.cle}__pct`} value="1" />}
                  {c.aide && <span style={{ fontSize: 11, color: "#999" }}>{c.aide}</span>}
                </label>
              ))}
            </div>
          </div>
        ))}
        <div className="carte">
          <h2 className="titre-bloc">Signature des mails et courriers</h2>
          <textarea name="signature" rows={4} defaultValue={p.signature || ""} style={{ width: "100%", boxSizing: "border-box" }} />
        </div>
        <div><button type="submit" className="bouton-principal">Enregistrer (et marquer comme vérifié)</button></div>
      </form>
      <TestMail />
    </Cadre>
  );
}
