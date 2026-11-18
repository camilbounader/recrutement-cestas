"use client";
import { useRef, useState } from "react";
import { analyserExcel, importerExcel } from "./actions";
import { lireBase64 } from "../components/outilsFichiers";

type Resume = Awaited<ReturnType<typeof analyserExcel>>[number] & { garder: boolean };

export default function ImportExcel() {
  const [fichier, setFichier] = useState<string | null>(null);
  const [feuilles, setFeuilles] = useState<Resume[]>([]);
  const [message, setMessage] = useState("");
  const [enCours, setEnCours] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  async function choisir(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setEnCours(true);
    setMessage("Lecture du tableau…");
    try {
      const b64 = await lireBase64(f);
      const r = await analyserExcel(b64);
      setFichier(b64);
      // « EN COURS » est décochée par défaut : elle reprend souvent des postes déjà dans les feuilles par année
      setFeuilles(r.map((x) => ({ ...x, garder: /20\d\d/.test(x.nom) && x.nbPostes > 0 })));
      setMessage(r.length ? "Vérifiez les chiffres et l'année de chaque feuille, puis importez." : "⚠ Aucune feuille reconnue (il faut une colonne « Poste » et une colonne « Noms »).");
    } catch (err: any) {
      setMessage("⚠ " + (err?.message || "Fichier illisible"));
    }
    setEnCours(false);
  }

  async function importer() {
    if (!fichier) return;
    setEnCours(true);
    setMessage("Import en cours… (jusqu'à une minute)");
    try {
      const r = await importerExcel(fichier, feuilles.filter((f) => f.garder).map((f) => ({ nom: f.nom, annee: f.annee })));
      setMessage(`✓ ${r.nbPostes} postes et ${r.nbCandidats} candidatures importés.`);
      setFeuilles([]);
      setFichier(null);
    } catch (err: any) {
      setMessage("⚠ " + (err?.message || "Import impossible"));
    }
    setEnCours(false);
  }

  return (
    <div className="carte">
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={() => ref.current?.click()} disabled={enCours} className="bouton-principal">📊 Choisir le fichier Excel</button>
        <input ref={ref} type="file" accept=".xlsx" onChange={choisir} style={{ display: "none" }} />
        <span style={{ fontSize: 13 }}>{message}</span>
      </div>
      {feuilles.length > 0 && (
        <>
          <table className="tableau" style={{ marginTop: 14 }}>
            <thead><tr><th>Importer</th><th>Feuille</th><th>Année</th><th>Postes</th><th>Candidatures</th><th>Convoquées</th><th>Recrutées (surlignées en jaune)</th></tr></thead>
            <tbody>
              {feuilles.map((f, i) => (
                <tr key={f.nom}>
                  <td><input type="checkbox" checked={f.garder} onChange={(e) => setFeuilles((l) => l.map((x, j) => (j === i ? { ...x, garder: e.target.checked } : x)))} /></td>
                  <td>{f.nom} {f.dejaImportee && <span style={{ fontSize: 11, background: "#FFF6D6", padding: "1px 6px", borderRadius: 10 }}>déjà importée : sera remplacée</span>}</td>
                  <td><input type="number" value={f.annee} onChange={(e) => setFeuilles((l) => l.map((x, j) => (j === i ? { ...x, annee: Number(e.target.value) } : x)))} style={{ width: 80 }} /></td>
                  <td>{f.nbPostes}</td>
                  <td>{f.nbCandidats}</td>
                  <td>{f.nbRetenus}</td>
                  <td>{f.nbRecrutes}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={importer} disabled={enCours || !feuilles.some((f) => f.garder)} className="bouton-principal" style={{ marginTop: 12 }}>Importer les feuilles cochées</button>
        </>
      )}
    </div>
  );
}
