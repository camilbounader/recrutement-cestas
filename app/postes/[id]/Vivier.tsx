"use client";
import { useState } from "react";
import Link from "next/link";
import { chercherDansLeVivier, ajouterDuVivier } from "../../candidatures/actions";

type Resultat = Awaited<ReturnType<typeof chercherDansLeVivier>>[number];

// Cherche dans les candidatures spontanées des 2 dernières années celles qui correspondent au poste
export default function Vivier({ posteId }: { posteId: string }) {
  const [resultats, setResultats] = useState<Resultat[] | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [ajoutees, setAjoutees] = useState<Record<string, string>>({});
  const [erreur, setErreur] = useState("");

  async function chercher() {
    setEnCours(true);
    setErreur("");
    try { setResultats(await chercherDansLeVivier(posteId)); } catch (e: any) { setErreur(e?.message || "Recherche impossible"); }
    setEnCours(false);
  }
  async function ajouter(id: string) {
    const nouvelId = await ajouterDuVivier(posteId, id);
    setAjoutees((a) => ({ ...a, [id]: nouvelId }));
  }

  return (
    <div className="carte" style={{ marginTop: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 className="titre-bloc" style={{ margin: 0 }}>📥 Vivier des candidatures spontanées</h2>
        <button onClick={chercher} disabled={enCours}>{enCours ? "L'IA compare les profils…" : "Chercher les profils compatibles"}</button>
        {erreur && <span style={{ color: "#B23B3B", fontSize: 13 }}>⚠ {erreur}</span>}
      </div>
      {resultats && resultats.length === 0 && <p style={{ color: "#999", fontSize: 13 }}>Aucune candidature spontanée dans les 2 dernières années.</p>}
      {resultats && resultats.length > 0 && (
        <table className="tableau" style={{ marginTop: 10 }}>
          <thead><tr><th>Score</th><th>Candidat</th><th>Pourquoi</th><th></th></tr></thead>
          <tbody>
            {resultats.map((r) => (
              <tr key={r.id}>
                <td style={{ fontWeight: 700 }}>{r.score}</td>
                <td><Link href={`/candidatures/${r.id}`} target="_blank">{r.prenom} {r.nom}</Link><div style={{ fontSize: 11, color: "#888" }}>{r.ville}</div></td>
                <td style={{ fontSize: 12 }}>{r.raison}</td>
                <td>{ajoutees[r.id] ? <Link href={`/candidatures/${ajoutees[r.id]}`}>✓ Ajoutée</Link> : <button onClick={() => ajouter(r.id)}>＋ Ajouter au poste</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
