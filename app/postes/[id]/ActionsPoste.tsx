"use client";
import { changerEtatPoste, supprimerPoste } from "../actions";
import { ETATS_POSTE } from "@/lib/format";

export default function ActionsPoste({ id, etat, nbCandidatures }: { id: string; etat: string; nbCandidatures: number }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <select value={etat} onChange={(e) => changerEtatPoste(id, e.target.value)} title="État de l'offre">
        {Object.entries(ETATS_POSTE).map(([k, s]) => <option key={k} value={k}>{s.libelle}</option>)}
      </select>
      <button
        className="corbeille"
        title="Supprimer le poste"
        onClick={() => { if (confirm(`Supprimer ce poste et ses ${nbCandidatures} candidature(s) ? C'est définitif.`)) supprimerPoste(id); }}
      >🗑</button>
    </div>
  );
}
