"use client";
import { useMemo, useState } from "react";
import Graphique from "./Graphique";
import { agreger, enCsv, libelleDimension, DIMENSIONS, TYPES, type ConfigGraphique, type LigneStat } from "@/lib/stats";
import { STATUTS } from "@/lib/format";
import { enregistrerGraphique, supprimerGraphique } from "./actions";

type Enregistre = { id: string; nom: string; config: string };

export function telechargerCsv(contenu: string, nom: string) {
  const blob = new Blob(["﻿" + contenu], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nom.replace(/[^\w\-]+/g, "_") + ".csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

const pastille = (actif: boolean) => ({ padding: "4px 10px", borderRadius: 20, fontSize: 12, border: `1px solid ${actif ? "var(--color-vert-fonce)" : "var(--color-ligne)"}`, background: actif ? "var(--color-vert-fonce)" : "white", color: actif ? "white" : "var(--foreground)" });

// Constructeur de graphiques : on choisit les données, l'abscisse, un 2e critère, les filtres et la forme
export default function Constructeur({ lignes, annees, enregistres }: { lignes: { candidatures: LigneStat[]; postes: LigneStat[] }; annees: number[]; enregistres: Enregistre[] }) {
  const [c, setC] = useState<ConfigGraphique>({ source: "candidatures", regrouper: "poste", separer: null, type: "barres", annees: annees.length ? [annees[0]] : [], statuts: [], provenance: "toutes" });
  const [nom, setNom] = useState("");
  const [message, setMessage] = useState("");
  const maj = (x: Partial<ConfigGraphique>) => setC((v) => ({ ...v, ...x }));
  const donnees = useMemo(() => agreger(lignes[c.source], c), [lignes, c]);
  const titreAuto = `${c.source === "postes" ? "Postes" : "Candidatures"} par ${libelleDimension(c.source, c.regrouper).toLowerCase()}${c.separer ? ` et ${libelleDimension(c.source, c.separer).toLowerCase()}` : ""}${c.annees.length ? ` — ${[...c.annees].sort().join(", ")}` : ""}`;
  const basculer = <T,>(liste: T[], v: T) => (liste.includes(v) ? liste.filter((x) => x !== v) : [...liste, v]);

  return (
    <div>
      <div className="carte pas-imprimer" style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
          <label className="champ">Données
            <select value={c.source} onChange={(e) => { const source = e.target.value as ConfigGraphique["source"]; maj({ source, regrouper: source === "postes" ? "annee" : "poste", separer: null }); }}>
              <option value="candidatures">Candidatures</option>
              <option value="postes">Postes (offres)</option>
            </select>
          </label>
          <label className="champ">Regrouper par (abscisse)
            <select value={c.regrouper} onChange={(e) => maj({ regrouper: e.target.value })}>
              {DIMENSIONS[c.source].map((d) => <option key={d.cle} value={d.cle}>{d.libelle}</option>)}
            </select>
          </label>
          <label className="champ">Séparer par (couleurs)
            <select value={c.separer || ""} onChange={(e) => maj({ separer: e.target.value || null })} disabled={c.type === "camembert"}>
              <option value="">— rien —</option>
              {DIMENSIONS[c.source].filter((d) => d.cle !== c.regrouper).map((d) => <option key={d.cle} value={d.cle}>{d.libelle}</option>)}
            </select>
          </label>
          <div className="champ">Forme
            <div style={{ display: "flex", gap: 4 }}>
              {TYPES.map((t) => <button key={t.cle} title={t.libelle} onClick={() => maj({ type: t.cle })} style={pastille(c.type === t.cle)}>{t.icone} {t.libelle}</button>)}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", fontSize: 12 }}>
          <b style={{ marginRight: 4 }}>Années :</b>
          <button onClick={() => maj({ annees: [] })} style={pastille(c.annees.length === 0)}>Toutes</button>
          {annees.map((a) => <button key={a} onClick={() => maj({ annees: basculer(c.annees, a) })} style={pastille(c.annees.includes(a))}>{a}</button>)}
        </div>
        {c.source === "candidatures" && (
          <>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", fontSize: 12 }}>
              <b style={{ marginRight: 4 }}>Avancement :</b>
              <button onClick={() => maj({ statuts: [] })} style={pastille(c.statuts.length === 0)}>Tous</button>
              {Object.entries(STATUTS).map(([k, s]) => <button key={k} onClick={() => maj({ statuts: basculer(c.statuts, k) })} style={pastille(c.statuts.includes(k))}>{s.libelle}</button>)}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", fontSize: 12 }}>
              <b style={{ marginRight: 4 }}>Provenance :</b>
              {([["toutes", "Toutes"], ["postes", "Candidatures à un poste"], ["spontanees", "Spontanées"]] as const).map(([k, l]) => <button key={k} onClick={() => maj({ provenance: k })} style={pastille(c.provenance === k)}>{l}</button>)}
            </div>
          </>
        )}
      </div>

      <div className="carte">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
          <h2 className="titre-bloc" style={{ margin: 0 }}>{nom || titreAuto}</h2>
          <span style={{ fontSize: 12, color: "#888" }}>{donnees.nbLignes.toLocaleString("fr-FR")} {c.source === "postes" ? "postes" : "candidatures"}</span>
        </div>
        <Graphique donnees={donnees} type={c.type} libelleCategorie={libelleDimension(c.source, c.regrouper)} />
        <div className="pas-imprimer" style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", alignItems: "center", borderTop: "1px solid var(--color-ligne)", paddingTop: 10 }}>
          <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder={titreAuto} style={{ flex: 1, minWidth: 220 }} />
          <button className="bouton-principal" onClick={async () => { await enregistrerGraphique(nom || titreAuto, JSON.stringify({ ...c, titre: nom || titreAuto })); setMessage("✓ Ajouté au rapport"); setNom(""); }}>＋ Ajouter au rapport</button>
          <button onClick={() => telechargerCsv(enCsv(donnees, libelleDimension(c.source, c.regrouper)), nom || titreAuto)}>⬇ Excel (CSV)</button>
          {message && <span style={{ fontSize: 13, color: "#4F6B49" }}>{message}</span>}
        </div>
      </div>

      {enregistres.length > 0 && (
        <div className="carte pas-imprimer" style={{ marginTop: 14 }}>
          <h2 className="titre-bloc">Graphiques du rapport</h2>
          {enregistres.map((g) => (
            <div key={g.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0", borderTop: "1px solid var(--color-ligne)", fontSize: 13 }}>
              <span style={{ flex: 1 }}>{g.nom}</span>
              <button onClick={() => { try { setC(JSON.parse(g.config)); setNom(g.nom); } catch {} }}>Ouvrir</button>
              <button className="corbeille" onClick={() => supprimerGraphique(g.id)}>🗑</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
