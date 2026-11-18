import { prisma } from "@/lib/prisma";
import Cadre from "../../components/Cadre";
import { VARIABLES } from "@/lib/modeles";
import { enregistrerModele, supprimerModele } from "../actions";

export default async function Modeles() {
  const modeles = await prisma.modeleTexte.findMany({ orderBy: [{ type: "desc" }, { ordre: "asc" }, { nom: "asc" }] });

  const formulaire = (m?: (typeof modeles)[number]) => (
    <form action={enregistrerModele} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input type="hidden" name="id" value={m?.id || ""} />
      <div className="grille-champs">
        <label className="champ" style={{ gridColumn: "span 2" }}>Nom du modèle<input name="nom" defaultValue={m?.nom || ""} required /></label>
        <label className="champ">Type
          <select name="type" defaultValue={m?.type || "mail"}><option value="mail">Mail</option><option value="courrier">Courrier (PDF)</option></select>
        </label>
        <label className="champ">Ordre d'affichage<input name="ordre" type="number" defaultValue={m?.ordre ?? 50} /></label>
      </div>
      <label className="champ">Objet<input name="objet" defaultValue={m?.objet || ""} /></label>
      <label className="champ">Texte<textarea name="corps" rows={12} defaultValue={m?.corps || ""} required style={{ fontFamily: "inherit" }} /></label>
      <div><button type="submit" className="bouton-principal">Enregistrer</button></div>
    </form>
  );

  return (
    <Cadre>
      <h1 className="titre-page">Modèles de mails et de courriers</h1>
      <div className="carte" style={{ marginBottom: 16, fontSize: 13 }}>
        <b>Variables remplacées automatiquement :</b>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", marginTop: 6 }}>
          {VARIABLES.map((v) => <span key={v.code}><code style={{ background: "#F0EEE7", padding: "1px 5px", borderRadius: 4 }}>{v.code}</code> {v.aide}</span>)}
        </div>
      </div>

      {modeles.map((m) => (
        <details key={m.id} className="carte" style={{ marginBottom: 10 }}>
          <summary style={{ fontWeight: 600 }}>{m.type === "courrier" ? "📄" : "✉️"} {m.nom}</summary>
          <div style={{ marginTop: 12 }}>{formulaire(m)}</div>
          {!m.code && (
            <form action={supprimerModele.bind(null, m.id)} style={{ marginTop: 8 }}>
              <button type="submit" className="corbeille">🗑 Supprimer ce modèle</button>
            </form>
          )}
        </details>
      ))}

      <details className="carte" style={{ marginTop: 16 }}>
        <summary style={{ fontWeight: 600, color: "var(--color-vert-fonce)" }}>＋ Nouveau modèle</summary>
        <div style={{ marginTop: 12 }}>{formulaire()}</div>
      </details>
    </Cadre>
  );
}
