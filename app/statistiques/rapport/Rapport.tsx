"use client";
import Graphique from "../Graphique";
import { agreger, libelleDimension, type ConfigGraphique, type LigneStat } from "@/lib/stats";

const base = (annee: number): Omit<ConfigGraphique, "regrouper" | "type"> => ({ source: "candidatures", separer: null, annees: [annee], statuts: [], provenance: "toutes" });

// Rapport annuel : chiffres clés + graphiques types + graphiques ajoutés depuis le constructeur (recalculés pour l'année choisie)
export default function Rapport({ annee, lignes, enregistres }: { annee: number; lignes: { candidatures: LigneStat[]; postes: LigneStat[] }; enregistres: { id: string; nom: string; config: string }[] }) {
  const c = lignes.candidatures.filter((l) => Number(l.annee) === annee);
  const p = lignes.postes.filter((l) => Number(l.annee) === annee);
  const spontanees = c.filter((l) => l.provenance === "Spontanée").length;
  const convoquees = c.filter((l) => l.statutCode === "retenue" || l.statutCode === "recrutee").length;
  const recrutees = c.filter((l) => l.statutCode === "recrutee").length;
  const femmes = c.filter((l) => l.sexe === "Femmes").length;
  const hommes = c.filter((l) => l.sexe === "Hommes").length;
  const gironde = c.filter((l) => l.departement === "33").length;
  const avecDpt = c.filter((l) => l.departement).length;
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)} %` : "—");

  const chiffres = [
    { v: p.length, l: "postes ouverts au recrutement" },
    { v: c.length, l: "candidatures traitées" },
    { v: spontanees, l: "candidatures spontanées" },
    { v: convoquees, l: "candidats convoqués en entretien" },
    { v: recrutees, l: "recrutements" },
    { v: p.length ? Math.round(((c.length - spontanees) / p.length) * 10) / 10 : "—", l: "candidatures par poste en moyenne" },
    { v: pct(femmes, femmes + hommes), l: "de femmes parmi les candidats (sexe connu)" },
    { v: pct(gironde, avecDpt), l: "de candidats girondins (département connu)" },
  ];

  const types: { titre: string; config: ConfigGraphique }[] = [
    { titre: "Candidatures par poste", config: { ...base(annee), regrouper: "poste", type: "barres", provenance: "postes" } },
    { titre: "Candidatures par mois de réception", config: { ...base(annee), regrouper: "mois", type: "courbe" } },
    { titre: "Répartition femmes / hommes", config: { ...base(annee), regrouper: "sexe", type: "camembert" } },
    { titre: "Avancement des candidatures", config: { ...base(annee), regrouper: "statut", type: "camembert" } },
    { titre: "Candidatures par département", config: { ...base(annee), regrouper: "departement", type: "barres" } },
    { titre: "Candidatures par filière et par sexe", config: { ...base(annee), regrouper: "filiere", separer: "sexe", type: "histogramme", provenance: "postes" } },
  ];
  const ajoutes = enregistres.flatMap((g) => { try { return [{ titre: g.nom, config: { ...(JSON.parse(g.config) as ConfigGraphique), annees: [annee] } }]; } catch { return []; } });

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 18 }}>
        {chiffres.map((x) => (
          <div key={x.l} className="carte" style={{ padding: 12 }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: "var(--color-vert-fonce)", fontFamily: "Georgia, serif" }}>{typeof x.v === "number" ? x.v.toLocaleString("fr-FR") : x.v}</div>
            <div style={{ fontSize: 12, color: "#666" }}>{x.l}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(520px, 1fr))", gap: 14 }}>
        {[...types, ...ajoutes].map((g, i) => (
          <div key={i} className="carte" style={{ breakInside: "avoid" }}>
            <h2 className="titre-bloc">{g.titre.replace(/ — [\d, ]+$/, "")}</h2>
            <Graphique donnees={agreger(lignes[g.config.source], g.config)} type={g.config.type} libelleCategorie={libelleDimension(g.config.source, g.config.regrouper)} />
          </div>
        ))}
      </div>
    </div>
  );
}
