"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { calculerSimulation, suggererEchelon, texteSimulationPourMail, type EntreeSimulation, type ParamsPaie } from "@/lib/paie";
import { enregistrerSimulation } from "../../actions";
import CopierTexte from "../../../components/CopierTexte";

type Grade = { id: string; grade: string; categorie: string | null; filiere: string; verifieLe: string; echelons: { numero: number; indiceMajore: number; indiceBrut: number | null; dureeMois: number | null }[] };

const f = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (t?: number) => (t === undefined ? "" : `${Math.round(t * 10000) / 100} %`);
const vieux = (iso: string, mois: number) => { const d = new Date(iso); d.setMonth(d.getMonth() + mois); return d < new Date(); };

export default function Simulateur(props: {
  candidatureId: string;
  entreeInitiale: EntreeSimulation;
  stagiaireInitial: boolean;
  gradeIdInitial: string;
  grades: Grade[];
  params: ParamsPaie;
  parametresDu: string;
  suggestion: { numero: number; explication: string } | null;
  profil: { dejaFonctionnaire: boolean | null; echelonActuel: number | null; moisExperience: number | null };
}) {
  const [e, setE] = useState<EntreeSimulation>(props.entreeInitiale);
  const [gradeId, setGradeId] = useState(props.gradeIdInitial);
  const [stagiaire, setStagiaire] = useState(props.stagiaireInitial);
  const [explication, setExplication] = useState(props.suggestion?.explication || "");
  const [message, setMessage] = useState("");
  const router = useRouter();
  const grade = props.grades.find((g) => g.id === gradeId) || null;
  const r = useMemo(() => calculerSimulation(e, props.params), [e, props.params]);
  const texte = texteSimulationPourMail(e, r);
  const maj = (champs: Partial<EntreeSimulation>) => setE((x) => ({ ...x, ...champs }));

  function choisirEchelon(numero: number, g = grade) {
    const ech = g?.echelons.find((x) => x.numero === numero);
    maj({ echelon: numero, indiceMajore: ech?.indiceMajore || e.indiceMajore });
  }
  function choisirGrade(id: string) {
    setGradeId(id);
    const g = props.grades.find((x) => x.id === id);
    if (!g) return;
    const s = suggererEchelon({ regime: e.regime, dejaFonctionnaire: props.profil.dejaFonctionnaire, echelonActuel: props.profil.echelonActuel, moisExperience: props.profil.moisExperience, echelons: g.echelons });
    setExplication(s.explication);
    const ech = g.echelons.find((x) => x.numero === s.numero) || g.echelons[0];
    maj({ grade: g.grade, categorie: g.categorie || e.categorie, echelon: ech?.numero || 1, indiceMajore: ech?.indiceMajore || 0 });
  }
  function choisirRegime(regime: "titulaire" | "contractuel") {
    maj({ regime, cia: regime === "titulaire" ? true : e.cia, indemniteCsg: regime === "titulaire" });
    if (regime === "contractuel") setStagiaire(false);
    if (grade) {
      const s = suggererEchelon({ regime, dejaFonctionnaire: props.profil.dejaFonctionnaire, echelonActuel: props.profil.echelonActuel, moisExperience: props.profil.moisExperience, echelons: grade.echelons });
      setExplication(s.explication);
      const ech = grade.echelons.find((x) => x.numero === s.numero);
      if (ech) setE((x) => ({ ...x, regime, echelon: ech.numero, indiceMajore: ech.indiceMajore }));
    }
  }

  async function enregistrer() {
    await enregistrerSimulation(props.candidatureId, JSON.stringify({ date: new Date().toISOString(), entree: e, resultat: r, texte, stagiaire: e.regime === "titulaire" && stagiaire, gradeId }));
    setMessage("✓ Simulation enregistrée : elle est reprise dans le mail « Proposition de poste » de la fiche.");
    router.refresh();
  }

  const champNombre = (libelle: string, valeur: number, onChange: (n: number) => void, step = "1") => (
    <label className="champ">{libelle}<input type="number" step={step} value={Number.isFinite(valeur) ? valeur : 0} onChange={(ev) => onChange(Number(ev.target.value))} /></label>
  );
  const caseACocher = (libelle: string, valeur: boolean, onChange: (b: boolean) => void) => (
    <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}><input type="checkbox" checked={valeur} onChange={(ev) => onChange(ev.target.checked)} />{libelle}</label>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 420px) minmax(0, 1fr)", gap: 18, alignItems: "start" }}>
      <div className="carte pas-imprimer" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => choisirRegime("titulaire")} style={{ fontWeight: e.regime === "titulaire" ? 700 : 400, background: e.regime === "titulaire" ? "#E6F0E3" : undefined }}>Titulaire / stagiaire</button>
          <button onClick={() => choisirRegime("contractuel")} style={{ fontWeight: e.regime === "contractuel" ? 700 : 400, background: e.regime === "contractuel" ? "#E6F0E3" : undefined }}>Contractuel</button>
        </div>
        {e.regime === "titulaire" && caseACocher("Premier poste dans la fonction publique (stagiaire : courrier reprise des services)", stagiaire, setStagiaire)}

        <label className="champ">Grade
          <select value={gradeId} onChange={(ev) => choisirGrade(ev.target.value)}>
            <option value="">— {props.grades.length ? "choisir" : "aucune grille : Outils › Grilles indiciaires"} —</option>
            {props.grades.map((g) => <option key={g.id} value={g.id}>{g.grade} ({g.categorie || "?"})</option>)}
          </select>
        </label>
        {grade && vieux(grade.verifieLe, 6) && <div style={{ fontSize: 12, color: "#B23B3B" }}>⚠ Grille non vérifiée depuis le {new Date(grade.verifieLe).toLocaleDateString("fr-FR")} : contrôlez l'indice sur le site du CDG.</div>}
        {vieux(props.parametresDu, 12) && <div style={{ fontSize: 12, color: "#B23B3B" }}>⚠ Paramètres de paie non vérifiés depuis le {new Date(props.parametresDu).toLocaleDateString("fr-FR")}.</div>}

        <div className="grille-champs" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <label className="champ">Échelon
            {grade ? (
              <select value={e.echelon} onChange={(ev) => choisirEchelon(Number(ev.target.value))}>
                {grade.echelons.map((x) => <option key={x.numero} value={x.numero}>{x.numero} — IM {x.indiceMajore}</option>)}
              </select>
            ) : <input type="number" value={e.echelon} onChange={(ev) => maj({ echelon: Number(ev.target.value) })} />}
          </label>
          {champNombre("Indice majoré", e.indiceMajore, (n) => maj({ indiceMajore: n }))}
          {champNombre("Temps de travail (1 = 100 %)", e.tempsTravail, (n) => maj({ tempsTravail: n }), "0.0001")}
          <label className="champ">Catégorie
            <select value={e.categorie} onChange={(ev) => maj({ categorie: ev.target.value })}><option>A</option><option>B</option><option>C</option></select>
          </label>
        </div>
        {explication && <div style={{ fontSize: 12, background: "#F1F5EF", borderRadius: 6, padding: 8 }}>💡 Échelon proposé : {explication}</div>}

        <div className="grille-champs" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {champNombre("IFSE (€ / mois)", e.ifse, (n) => maj({ ifse: n }), "0.01")}
          {champNombre("Enfants à charge (SFT)", e.enfants, (n) => maj({ enfants: n }))}
          {e.regime === "titulaire" && champNombre("NBI (points)", e.nbiPoints, (n) => maj({ nbiPoints: n }))}
          {champNombre("Astreintes (nombre)", e.astreinteNombre, (n) => maj({ astreinteNombre: n }))}
          {champNombre("Astreinte (€ l'unité)", e.astreinteTaux, (n) => maj({ astreinteTaux: n }), "0.01")}
        </div>
        {caseACocher(`CIA (${props.params.ciaAnnuel} € / an, ramené au mois)`, e.cia, (b) => maj({ cia: b }))}
        {e.regime === "titulaire" && caseACocher("Complément de traitement indiciaire (CTI)", e.cti, (b) => maj({ cti: b }))}
        {e.regime === "titulaire" && caseACocher("Indemnité compensatrice CSG", e.indemniteCsg, (b) => maj({ indemniteCsg: b }))}
        {caseACocher(`Participation santé (${props.params.participationSante} € / mois)`, e.sante, (b) => maj({ sante: b }))}
        {caseACocher(`Participation prévoyance (${props.params.participationPrevoyance} € / mois)`, e.prevoyance, (b) => maj({ prevoyance: b }))}
      </div>

      <div>
        <div className="carte" style={{ fontSize: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <div><b style={{ fontSize: 16, color: "var(--color-vert-fonce)" }}>SIMULATION DE PAIE</b><br />{e.nom} — {e.poste}<br />{e.grade || "Grade ?"} · échelon {e.echelon} · IM {e.indiceMajore} · {e.regime === "titulaire" ? (stagiaire ? "stagiaire" : "titulaire") : "contractuel"}</div>
            <div style={{ textAlign: "right", color: "#888" }}>Fait le {new Date().toLocaleDateString("fr-FR")}<br />Valeur du point : {props.params.valeurPointAnnuelle.toLocaleString("fr-FR")} € / an</div>
          </div>
          <table className="tableau">
            <thead><tr><th>Éléments de rémunération</th><th>Base</th><th>Taux</th><th style={{ textAlign: "right" }}>Gain</th></tr></thead>
            <tbody>
              {r.gains.map((l, i) => <tr key={i}><td>{l.libelle}</td><td>{typeof l.base === "number" ? f(l.base) : l.base}</td><td>{l.taux !== undefined && l.taux < 1 ? pct(l.taux) : l.taux ?? ""}</td><td style={{ textAlign: "right" }}>{f(l.montant)}</td></tr>)}
              <tr><td colSpan={3} style={{ textAlign: "right", fontWeight: 700 }}>BRUT</td><td style={{ textAlign: "right", fontWeight: 700 }}>{f(r.brut)}</td></tr>
            </tbody>
          </table>
          <table className="tableau" style={{ marginTop: 10 }}>
            <thead><tr><th>Cotisations salariales</th><th>Base</th><th>Taux</th><th style={{ textAlign: "right" }}>Retenue</th></tr></thead>
            <tbody>
              {r.retenues.map((l, i) => <tr key={i}><td>{l.libelle}</td><td>{typeof l.base === "number" ? f(l.base) : l.base}</td><td>{pct(l.taux)}</td><td style={{ textAlign: "right" }}>{f(l.montant)}</td></tr>)}
              <tr><td colSpan={3} style={{ textAlign: "right", fontWeight: 700 }}>Total retenues</td><td style={{ textAlign: "right", fontWeight: 700 }}>{f(r.totalRetenues)}</td></tr>
            </tbody>
          </table>
          <div style={{ marginTop: 12, background: "#FFF3A3", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700 }}>
            <span>NET AVANT PRÉLÈVEMENT À LA SOURCE</span><span>{f(r.net)} €</span>
          </div>
          <p style={{ fontSize: 11, color: "#888", marginBottom: 0 }}>Ce calcul ne constitue qu'une simulation de bulletin de paie. Certains éléments de rémunération peuvent varier en fonction d'informations non connues au moment de la réalisation du document.</p>
        </div>
        <div className="pas-imprimer" style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={enregistrer} className="bouton-principal">💾 Enregistrer pour le mail de proposition</button>
          <CopierTexte texte={texte} libelle="📋 Copier le résumé" />
          <button onClick={() => window.print()}>🖨 Imprimer / PDF</button>
          {message && <span style={{ fontSize: 13, color: "#4F6B49" }}>{message}</span>}
        </div>
      </div>
    </div>
  );
}
