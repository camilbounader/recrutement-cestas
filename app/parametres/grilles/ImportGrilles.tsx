"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { lireGrillesIA, enregistrerGrilles } from "../actions";
import { lireBase64, typeAccepte } from "../../components/outilsFichiers";
import type { GrilleLue } from "@/lib/ia";

// Dépôt d'une grille du CDG (PDF ou capture) : l'IA recopie les indices, on vérifie, on enregistre
export default function ImportGrilles({ existants }: { existants: string[] }) {
  const [grilles, setGrilles] = useState<(GrilleLue & { garder: boolean })[]>([]);
  const [source, setSource] = useState("");
  const [message, setMessage] = useState("");
  const [enCours, setEnCours] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function lire(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const type = typeAccepte(f);
    if (!type) { setMessage("⚠ Enregistrez la grille en PDF ou en image."); return; }
    setEnCours(true);
    setGrilles([]);
    setMessage("L'IA lit les grilles… (jusqu'à une minute pour un gros PDF)");
    try {
      const r = await lireGrillesIA({ data: await lireBase64(f), mimeType: type });
      setGrilles(r.map((g) => ({ ...g, garder: true })));
      setSource(`${f.name} (lu le ${new Date().toLocaleDateString("fr-FR")})`);
      setMessage(r.length ? `${r.length} grade(s) trouvé(s). Comparez avec le document, décochez ce qui est faux, puis enregistrez.` : "⚠ Aucune grille trouvée dans ce document.");
    } catch (err: any) {
      setMessage("⚠ " + (err?.message || "Lecture impossible"));
    }
    setEnCours(false);
  }

  async function enregistrer() {
    setEnCours(true);
    await enregistrerGrilles(grilles.filter((g) => g.garder).map(({ garder: _g, ...g }) => g), source);
    setGrilles([]);
    setMessage("✓ Grilles enregistrées et marquées comme vérifiées aujourd'hui.");
    setEnCours(false);
    router.refresh();
  }

  return (
    <div className="carte" style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={() => ref.current?.click()} disabled={enCours} className="bouton-principal">📄 Importer une grille (PDF du CDG, capture…)</button>
        <input ref={ref} type="file" accept="application/pdf,image/*" onChange={lire} style={{ display: "none" }} />
        <span style={{ fontSize: 13, color: "#555" }}>{message || "Téléchargez la grille sur le site du CDG, déposez-la ici : l'IA recopie les échelons et indices."}</span>
      </div>
      {grilles.length > 0 && (
        <div style={{ marginTop: 14 }}>
          {grilles.map((g, i) => (
            <div key={i} style={{ borderTop: "1px solid var(--color-ligne)", padding: "10px 0" }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 600 }}>
                <input type="checkbox" checked={g.garder} onChange={(e) => setGrilles((l) => l.map((x, j) => (j === i ? { ...x, garder: e.target.checked } : x)))} />
                {g.grade} <span style={{ fontWeight: 400, color: "#888" }}>— {g.cadreEmploi} · {g.filiere} · cat. {g.categorie || "?"}</span>
                {existants.includes(`${g.cadreEmploi}|${g.grade}`) && <span style={{ fontSize: 11, background: "#FFF6D6", padding: "1px 6px", borderRadius: 10 }}>remplacera la grille existante</span>}
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6, fontSize: 12 }}>
                {g.echelons.map((e) => (
                  <span key={e.numero} style={{ background: "#F0EEE7", borderRadius: 6, padding: "2px 6px" }}>Éch. {e.numero} : IB {e.indiceBrut ?? "?"} / <b>IM {e.indiceMajore}</b>{e.dureeMois ? ` · ${e.dureeMois} mois` : ""}</span>
                ))}
              </div>
            </div>
          ))}
          <button onClick={enregistrer} disabled={enCours} className="bouton-principal">Enregistrer les {grilles.filter((g) => g.garder).length} grille(s) cochée(s)</button>
        </div>
      )}
    </div>
  );
}
