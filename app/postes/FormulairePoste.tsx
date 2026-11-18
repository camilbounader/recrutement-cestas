"use client";
import { useRef, useState } from "react";
import { enregistrerPoste, lireFichePosteIA } from "./actions";
import { lireBase64, typeAccepte } from "../components/outilsFichiers";
import { FILIERES, COLLECTIVITES, TYPES_RECRUTEMENT } from "@/lib/format";

export type ValeursPoste = Record<string, string>;
type Grade = { id: string; libelle: string; filiere: string };

export default function FormulairePoste({ valeurs, grades, services }: { valeurs: ValeursPoste; grades: Grade[]; services: string[] }) {
  const [v, setV] = useState<ValeursPoste>(valeurs);
  const [lecture, setLecture] = useState("");
  const fichierRef = useRef<HTMLInputElement>(null);
  const maj = (cle: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV((x) => ({ ...x, [cle]: e.target.value }));

  async function lireFiche(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const type = typeAccepte(f);
    if (!type) { setLecture("⚠ Format non lu : enregistrez la fiche en PDF ou en image."); return; }
    setLecture("L'IA lit la fiche de poste…");
    try {
      const r = await lireFichePosteIA({ data: await lireBase64(f), mimeType: type });
      setV((x) => ({
        ...x,
        ficheDePoste: r.texte || x.ficheDePoste,
        intitule: x.intitule || r.intitule || "",
        service: x.service || r.service || "",
        filiere: r.filiere || x.filiere,
        categorie: r.categorie || x.categorie,
        cadreEmploi: r.cadreEmploi || x.cadreEmploi,
        gradeId: r.gradeId || x.gradeId,
        tempsTravail: r.tempsTravail ? String(r.tempsTravail) : x.tempsTravail,
      }));
      setLecture(`✓ Fiche lue. Vérifiez les champs avant d'enregistrer.${r.grade && !r.gradeId ? ` Grade lu : « ${r.grade} » (pas encore dans les grilles indiciaires).` : ""}`);
    } catch (err: any) {
      setLecture("⚠ " + (err?.message || "Lecture impossible"));
    }
  }

  const gradesFiltres = v.filiere ? grades.filter((g) => g.filiere === v.filiere || g.id === v.gradeId) : grades;

  return (
    <form action={enregistrerPoste} className="carte" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <input type="hidden" name="id" value={v.id || ""} />

      <div style={{ background: "#F1F5EF", borderRadius: 8, padding: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button type="button" onClick={() => fichierRef.current?.click()} className="bouton-principal">📄 Lire la fiche de poste avec l'IA</button>
        <input ref={fichierRef} type="file" accept="application/pdf,image/*" onChange={lireFiche} style={{ display: "none" }} />
        <span style={{ fontSize: 13, color: "#555" }}>{lecture || "PDF ou photo de la fiche : l'IA remplit les champs, vous vérifiez."}</span>
      </div>

      <div className="grille-champs">
        <label className="champ" style={{ gridColumn: "span 2" }}>Intitulé du poste *<input name="intitule" required value={v.intitule || ""} onChange={maj("intitule")} /></label>
        <label className="champ">Année du recrutement<input name="annee" type="number" value={v.annee || ""} onChange={maj("annee")} /></label>
        <label className="champ">N° offre Emploi Territorial<input name="numeroOffre" value={v.numeroOffre || ""} onChange={maj("numeroOffre")} placeholder="033…" /></label>
        <label className="champ">Service<input name="service" list="liste-services" value={v.service || ""} onChange={maj("service")} /></label>
        <label className="champ">Collectivité
          <select name="collectivite" value={v.collectivite || ""} onChange={maj("collectivite")}>
            <option value="">—</option>
            {COLLECTIVITES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="champ" style={{ gridColumn: "span 2" }}>Motif (titulaire remplacé, création…)<input name="motif" value={v.motif || ""} onChange={maj("motif")} placeholder="Remplacement de M. … / Création de poste" /></label>
      </div>

      <div className="grille-champs">
        <label className="champ">Date de la demande<input name="dateDemande" type="date" value={v.dateDemande || ""} onChange={maj("dateDemande")} /></label>
        <label className="champ">Date de publication<input name="dateOuverture" type="date" value={v.dateOuverture || ""} onChange={maj("dateOuverture")} /></label>
        <label className="champ">Date de clôture (vide = publication + 1 mois)<input name="dateCloture" type="date" value={v.dateCloture || ""} onChange={maj("dateCloture")} /></label>
      </div>

      <div className="grille-champs">
        <label className="champ">Filière
          <select name="filiere" value={v.filiere || ""} onChange={maj("filiere")}>
            <option value="">—</option>
            {FILIERES.map((f) => <option key={f}>{f}</option>)}
          </select>
        </label>
        <label className="champ">Catégorie
          <select name="categorie" value={v.categorie || ""} onChange={maj("categorie")}>
            <option value="">—</option>
            <option>A</option><option>B</option><option>C</option>
          </select>
        </label>
        <label className="champ">Cadre d'emplois<input name="cadreEmploi" value={v.cadreEmploi || ""} onChange={maj("cadreEmploi")} /></label>
        <label className="champ">Grade (pour la simulation de paie)
          <select name="gradeId" value={v.gradeId || ""} onChange={maj("gradeId")}>
            <option value="">— {grades.length === 0 ? "aucune grille enregistrée" : "choisir"} —</option>
            {gradesFiltres.map((g) => <option key={g.id} value={g.id}>{g.libelle}</option>)}
          </select>
        </label>
        <label className="champ">Type de recrutement
          <select name="typeRecrutement" value={v.typeRecrutement || "titulaire_ou_contractuel"} onChange={maj("typeRecrutement")}>
            {Object.entries(TYPES_RECRUTEMENT).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
        <label className="champ">Temps de travail (1 = complet, 0.9 = 31h30)<input name="tempsTravail" type="number" step="0.0001" min="0" max="1" value={v.tempsTravail || "1"} onChange={maj("tempsTravail")} /></label>
        <label className="champ">IFSE mensuelle prévue (€)<input name="ifseMensuelle" type="number" step="0.01" value={v.ifseMensuelle || ""} onChange={maj("ifseMensuelle")} /></label>
      </div>

      <label className="champ">Fiche de poste (sert au score de compatibilité)
        <textarea name="ficheDePoste" rows={10} value={v.ficheDePoste || ""} onChange={maj("ficheDePoste")} placeholder="Missions, compétences attendues, profil… (ou cliquez sur « Lire la fiche de poste avec l'IA »)" />
      </label>
      <label className="champ">Observations<textarea name="observations" rows={2} value={v.observations || ""} onChange={maj("observations")} /></label>

      <datalist id="liste-services">{services.map((s) => <option key={s} value={s} />)}</datalist>
      <div><button type="submit" className="bouton-principal">Enregistrer le poste</button></div>
    </form>
  );
}
