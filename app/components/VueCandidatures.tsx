"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { STATUTS } from "@/lib/format";
import { changerStatut } from "../candidatures/actions";
import CopierTexte from "./CopierTexte";

export type CarteCandidat = {
  id: string;
  nom: string | null;
  prenom: string | null;
  photo: string | null;
  ville: string | null;
  departement: string | null;
  email: string | null;
  score: number | null;
  noteAssessfirst: number | null;
  statut: string;
  origine: string;
  anonymisee: boolean;
};

const initiales = (c: CarteCandidat) => `${(c.prenom || "")[0] || ""}${(c.nom || "")[0] || ""}`.toUpperCase() || "?";
const couleurScore = (s: number) => (s >= 70 ? "#4F6B49" : s >= 45 ? "#B8860B" : "#B23B3B");

// Trombinoscope (comme « Mon équipe » de l'appli EPI) ou liste, avec surlignage selon l'avancement
export default function VueCandidatures({ candidats, avecScore = true }: { candidats: CarteCandidat[]; avecScore?: boolean }) {
  const [vue, setVue] = useState<"grille" | "liste">("grille");
  const [filtre, setFiltre] = useState("tous");
  const [tri, setTri] = useState(avecScore ? "score" : "nom");

  useEffect(() => {
    try { const v = localStorage.getItem("vueCandidatures"); if (v === "liste" || v === "grille") setVue(v); } catch {}
  }, []);
  const choisirVue = (v: "grille" | "liste") => { setVue(v); try { localStorage.setItem("vueCandidatures", v); } catch {} };

  const liste = candidats
    .filter((c) => filtre === "tous" || c.statut === filtre)
    .sort((a, b) => (tri === "score" ? (b.score ?? -1) - (a.score ?? -1) : tri === "assessfirst" ? (b.noteAssessfirst ?? -1) - (a.noteAssessfirst ?? -1) : `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, "fr")));
  const adresses = liste.map((c) => c.email).filter(Boolean).join("; ");
  const compte = (s: string) => candidats.filter((c) => c.statut === s).length;

  if (candidats.length === 0) return <p style={{ color: "#999", fontSize: 13 }}>Aucune candidature pour l'instant.</p>;

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <div className="onglets" style={{ margin: 0 }}>
          <a href="#" onClick={(e) => { e.preventDefault(); setFiltre("tous"); }} className={filtre === "tous" ? "actif" : ""}>Toutes ({candidats.length})</a>
          {Object.entries(STATUTS).map(([k, s]) => compte(k) > 0 && (
            <a key={k} href="#" onClick={(e) => { e.preventDefault(); setFiltre(k); }} className={filtre === k ? "actif" : ""} style={filtre === k ? undefined : { background: s.fond }}>{s.libelle} ({compte(k)})</a>
          ))}
        </div>
        <select value={tri} onChange={(e) => setTri(e.target.value)} style={{ marginLeft: "auto" }}>
          {avecScore && <option value="score">Tri : score IA</option>}
          <option value="assessfirst">Tri : note AssessFirst</option>
          <option value="nom">Tri : nom</option>
        </select>
        <button onClick={() => choisirVue("grille")} style={{ fontWeight: vue === "grille" ? 700 : 400 }}>▦ Trombinoscope</button>
        <button onClick={() => choisirVue("liste")} style={{ fontWeight: vue === "liste" ? 700 : 400 }}>☰ Liste</button>
        {adresses && <CopierTexte texte={adresses} libelle={`📋 Copier les ${liste.filter((c) => c.email).length} adresses`} titre="À coller dans le champ Cci de Zimbra" />}
      </div>

      {vue === "grille" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(165px, 1fr))", gap: 12 }}>
          {liste.map((c) => {
            const s = STATUTS[c.statut] || STATUTS.recue;
            return (
              <Link key={c.id} href={`/candidatures/${c.id}`} className="carte-cliquable" style={{ background: c.statut === "recue" ? "white" : s.fond, border: `2px solid ${s.bord}`, borderRadius: 10, overflow: "hidden", textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", opacity: c.statut === "non_retenue" ? 0.65 : 1 }}>
                <div style={{ height: 150, background: "#F3F1EC", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
                  {c.photo
                    ? <img src={c.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ fontSize: 44, fontWeight: 700, color: "#C9C3B6", fontFamily: "Georgia, serif" }}>{initiales(c)}</span>}
                  {avecScore && c.score !== null && <span title="Score de compatibilité IA (indicatif)" style={{ position: "absolute", top: 6, right: 6, background: couleurScore(c.score), color: "white", fontSize: 12, fontWeight: 700, padding: "2px 7px", borderRadius: 20 }}>{c.score}</span>}
                </div>
                <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 3 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "var(--color-vert-fonce)" }}>{c.anonymisee ? "Anonymisée" : [c.prenom, c.nom].filter(Boolean).join(" ") || "Sans nom"}</div>
                  <div style={{ fontSize: 11, color: "#888" }}>{[c.ville, c.departement && `(${c.departement})`].filter(Boolean).join(" ") || "—"}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 2 }}>
                    {c.statut !== "recue" && <span style={{ background: "white", color: s.couleur, fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 20 }}>{s.libelle}</span>}
                    {c.noteAssessfirst !== null && <span style={{ background: "#EFE8F7", color: "#5B3E8C", fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 20 }}>AssessFirst {c.noteAssessfirst}/5</span>}
                    {c.origine === "vivier" && <span style={{ background: "#E6F0E3", color: "#4F6B49", fontSize: 10, padding: "1px 6px", borderRadius: 20 }}>vivier</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <table className="tableau">
          <thead><tr><th></th><th>Nom</th><th>Ville</th><th>Mail</th>{avecScore && <th>Score</th>}<th>AssessFirst</th><th>Avancement</th></tr></thead>
          <tbody>
            {liste.map((c) => {
              const s = STATUTS[c.statut] || STATUTS.recue;
              return (
                <tr key={c.id} style={{ background: c.statut === "recue" ? undefined : s.fond }}>
                  <td style={{ width: 34 }}>{c.photo ? <img src={c.photo} alt="" style={{ width: 28, height: 34, objectFit: "cover", borderRadius: 4 }} /> : null}</td>
                  <td><Link href={`/candidatures/${c.id}`} style={{ fontWeight: 600, color: "var(--color-vert-fonce)" }}>{(c.nom || "").toUpperCase()} {c.prenom}</Link></td>
                  <td>{c.ville} {c.departement && `(${c.departement})`}</td>
                  <td>{c.email}</td>
                  {avecScore && <td style={{ fontWeight: 700, color: c.score !== null ? couleurScore(c.score) : undefined }}>{c.score ?? ""}</td>}
                  <td>{c.noteAssessfirst ?? ""}</td>
                  <td>
                    <select defaultValue={c.statut} onChange={(e) => changerStatut(c.id, e.target.value)}>
                      {Object.entries(STATUTS).map(([k, st]) => <option key={k} value={k}>{st.libelle}</option>)}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
