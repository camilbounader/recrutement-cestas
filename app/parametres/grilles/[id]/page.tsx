import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Cadre from "../../../components/Cadre";
import { enregistrerGrade, supprimerGrade } from "../../actions";
import { dateFr, FILIERES } from "@/lib/format";

export default async function Grade({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await prisma.gradeGrille.findUnique({ where: { id }, include: { echelons: { orderBy: { numero: "asc" } } } });
  if (!g) notFound();
  // Quelques lignes vides en plus pour ajouter des échelons
  const lignes = [...g.echelons, ...Array.from({ length: Math.max(3, 14 - g.echelons.length) }, () => null)];

  return (
    <Cadre>
      <Link href="/parametres/grilles" style={{ fontSize: 13, color: "#777" }}>← Grilles indiciaires</Link>
      <h1 className="titre-page" style={{ marginTop: 8 }}>{g.grade}</h1>
      <p style={{ fontSize: 13, color: "#666", marginTop: -8 }}>Vérifiée le {dateFr(g.verifieLe)}{g.source ? ` · source : ${g.source}` : ""}. Enregistrer vaut vérification.</p>
      <form action={enregistrerGrade.bind(null, g.id)} className="carte" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="grille-champs">
          <label className="champ">Filière<select name="filiere" defaultValue={g.filiere}>{FILIERES.map((f) => <option key={f}>{f}</option>)}</select></label>
          <label className="champ">Cadre d'emplois<input name="cadreEmploi" defaultValue={g.cadreEmploi} /></label>
          <label className="champ">Grade<input name="grade" defaultValue={g.grade} /></label>
          <label className="champ">Catégorie<select name="categorie" defaultValue={g.categorie || ""}><option value="">—</option><option>A</option><option>B</option><option>C</option></select></label>
          <label className="champ" style={{ gridColumn: "span 2" }}>Source (site, décret…)<input name="source" defaultValue={g.source || ""} /></label>
        </div>
        <table className="tableau" style={{ maxWidth: 620 }}>
          <thead><tr><th>Échelon</th><th>Indice brut</th><th>Indice majoré</th><th>Durée (mois)</th></tr></thead>
          <tbody>
            {lignes.map((e, i) => (
              <tr key={i}>
                <td><input name={`numero_${i}`} type="number" defaultValue={e?.numero ?? ""} style={{ width: 70 }} /></td>
                <td><input name={`ib_${i}`} type="number" defaultValue={e?.indiceBrut ?? ""} style={{ width: 90 }} /></td>
                <td><input name={`im_${i}`} type="number" defaultValue={e?.indiceMajore ?? ""} style={{ width: 90 }} /></td>
                <td><input name={`duree_${i}`} type="number" defaultValue={e?.dureeMois ?? ""} style={{ width: 80 }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div><button type="submit" className="bouton-principal">Enregistrer (marquer vérifiée aujourd'hui)</button></div>
      </form>
      <form action={supprimerGrade.bind(null, g.id)} style={{ marginTop: 12 }}>
        <button type="submit" className="corbeille">🗑 Supprimer cette grille</button>
      </form>
    </Cadre>
  );
}
