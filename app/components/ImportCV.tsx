"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { analyserFichierCandidat, enregistrerCandidatures, type GroupeAnalyse } from "../candidatures/actions";
import { lireBase64, typeAccepte, premierePage, canvasEnJpegBase64, decouperPhoto } from "./outilsFichiers";
import type { AnalyseCandidat } from "@/lib/ia";

type Ligne = { nom: string; etat: "attente" | "analyse" | "ok" | "erreur"; message?: string; analyse?: AnalyseCandidat; photo?: string | null };

const cle = (a: AnalyseCandidat, i: number) => {
  if (a.email) return a.email.trim().toLowerCase();
  const n = `${a.nom || ""} ${a.prenom || ""}`.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");
  return n || `inconnu-${i}`;
};

// Dépôt d'un ou plusieurs CV / lettres : l'IA lit chaque fichier, puis on regroupe par personne avant d'enregistrer
export default function ImportCV({ posteId, annee }: { posteId: string | null; annee: number }) {
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [enCours, setEnCours] = useState(false);
  const [survol, setSurvol] = useState(false);
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function traiter(fichiers: File[]) {
    if (fichiers.length === 0 || enCours) return;
    setMessage("");
    setEnCours(true);
    const depart: Ligne[] = fichiers.map((f) => ({ nom: f.name, etat: "attente" }));
    setLignes(depart);
    const resultats: Ligne[] = [...depart];
    for (let i = 0; i < fichiers.length; i++) {
      const f = fichiers[i];
      const type = typeAccepte(f);
      if (!type) {
        resultats[i] = { ...resultats[i], etat: "erreur", message: "Format non lu (Word ? enregistrez-le en PDF)" };
        setLignes([...resultats]);
        continue;
      }
      resultats[i] = { ...resultats[i], etat: "analyse" };
      setLignes([...resultats]);
      try {
        const canvas = await premierePage(f);
        const analyse = await analyserFichierCandidat({ data: await lireBase64(f), mimeType: type }, canvas ? canvasEnJpegBase64(canvas) : null, posteId);
        const photo = canvas && analyse.photo?.presente ? decouperPhoto(canvas, analyse.photo.cadre) : null;
        resultats[i] = { ...resultats[i], etat: "ok", analyse, photo };
      } catch (e: any) {
        resultats[i] = { ...resultats[i], etat: "erreur", message: e?.message || "Erreur de lecture" };
      }
      setLignes([...resultats]);
    }
    setEnCours(false);
  }

  // Regroupe CV + lettre d'une même personne (même mail, ou même nom et prénom)
  function groupes(): GroupeAnalyse[] {
    const map = new Map<string, GroupeAnalyse>();
    lignes.forEach((l, i) => {
      if (l.etat !== "ok" || !l.analyse) return;
      const k = cle(l.analyse, i);
      if (!map.has(k)) map.set(k, { analyses: [], photo: null });
      const g = map.get(k)!;
      g.analyses.push(l.analyse);
      if (!g.photo && l.photo) g.photo = l.photo;
    });
    return Array.from(map.values());
  }

  async function enregistrer() {
    const g = groupes();
    if (g.length === 0) return;
    setEnCours(true);
    try {
      const nb = await enregistrerCandidatures(posteId, annee, g);
      setMessage(`✓ ${nb} candidature${nb > 1 ? "s" : ""} enregistrée${nb > 1 ? "s" : ""}. Les fichiers n'ont pas été conservés.`);
      setLignes([]);
      router.refresh();
    } catch (e: any) {
      setMessage("⚠ " + (e?.message || "Enregistrement impossible"));
    }
    setEnCours(false);
  }

  const g = groupes();
  const fini = lignes.length > 0 && lignes.every((l) => l.etat === "ok" || l.etat === "erreur");

  return (
    <div className="carte" style={{ marginBottom: 18 }}>
      <div
        onDragOver={(e) => { e.preventDefault(); setSurvol(true); }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(e) => { e.preventDefault(); setSurvol(false); traiter(Array.from(e.dataTransfer.files)); }}
        onClick={() => !enCours && inputRef.current?.click()}
        style={{ border: `2px dashed ${survol ? "var(--color-vert)" : "#C9D6C4"}`, background: survol ? "#F1F5EF" : "#FAFAF7", borderRadius: 10, padding: 20, textAlign: "center", cursor: enCours ? "progress" : "pointer" }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-vert-fonce)" }}>📄 Déposez ici les CV et lettres de motivation (un ou plusieurs)</div>
        <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>PDF ou photos · l'IA remplit nom, prénom, sexe, ville, département, mail, photo{posteId ? " et le score" : ""} · les fichiers ne sont pas conservés</div>
        <input ref={inputRef} type="file" multiple accept="application/pdf,image/*" style={{ display: "none" }} onChange={(e) => { traiter(Array.from(e.target.files || [])); e.target.value = ""; }} />
      </div>

      {lignes.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <table className="tableau">
            <thead><tr><th>Fichier</th><th>Lu par l'IA</th><th>Score</th></tr></thead>
            <tbody>
              {lignes.map((l, i) => (
                <tr key={i}>
                  <td>{l.nom}</td>
                  <td>
                    {l.etat === "attente" && <span style={{ color: "#999" }}>en attente</span>}
                    {l.etat === "analyse" && <span className="chargement" style={{ color: "#777" }}>lecture</span>}
                    {l.etat === "erreur" && <span style={{ color: "#B23B3B" }}>⚠ {l.message}</span>}
                    {l.etat === "ok" && l.analyse && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        {l.photo && <img src={l.photo} alt="" style={{ width: 28, height: 34, objectFit: "cover", borderRadius: 4 }} />}
                        <b>{[l.analyse.prenom, l.analyse.nom].filter(Boolean).join(" ") || "Nom non trouvé"}</b>
                        <span style={{ color: "#888" }}>{l.analyse.type === "lettre" ? "lettre" : l.analyse.type === "cv_et_lettre" ? "CV + lettre" : "CV"} · {l.analyse.ville || "ville ?"} · {l.analyse.email || "mail ?"}</span>
                      </span>
                    )}
                  </td>
                  <td>{l.analyse?.score ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {fini && g.length > 0 && (
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={enregistrer} disabled={enCours} className="bouton-principal">Enregistrer {g.length} candidature{g.length > 1 ? "s" : ""}</button>
              <span style={{ fontSize: 12, color: "#777" }}>Les CV et lettres d'une même personne sont réunis sur une seule fiche.</span>
            </div>
          )}
        </div>
      )}
      {message && <p style={{ marginTop: 10, fontSize: 13 }}>{message}</p>}
    </div>
  );
}
