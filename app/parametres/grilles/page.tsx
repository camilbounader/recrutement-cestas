import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Cadre from "../../components/Cadre";
import ImportGrilles from "./ImportGrilles";
import { creerGrade } from "../actions";
import { dateFr, FILIERES } from "@/lib/format";
export const maxDuration = 60;

export default async function Grilles() {
  const grades = await prisma.gradeGrille.findMany({ include: { echelons: { orderBy: { numero: "asc" } }, _count: { select: { postes: true } } }, orderBy: [{ filiere: "asc" }, { cadreEmploi: "asc" }, { grade: "asc" }] });
  const limite = new Date();
  limite.setMonth(limite.getMonth() - 6);
  const parFiliere = new Map<string, typeof grades>();
  grades.forEach((g) => { if (!parFiliere.has(g.filiere)) parFiliere.set(g.filiere, []); parFiliere.get(g.filiere)!.push(g); });

  return (
    <Cadre>
      <h1 className="titre-page">Grilles indiciaires</h1>
      <p style={{ fontSize: 13, color: "#666", marginTop: -8 }}>Elles donnent l'indice majoré de chaque échelon pour la simulation de paie. Une grille non vérifiée depuis plus de 6 mois est signalée en rouge et sur le tableau de bord.</p>
      <ImportGrilles existants={grades.map((g) => `${g.cadreEmploi}|${g.grade}`)} />

      {grades.length === 0 && <p style={{ color: "#999" }}>Aucune grille pour l'instant : importez celles des grades que vous recrutez le plus souvent.</p>}
      {Array.from(parFiliere.entries()).map(([filiere, liste]) => (
        <div key={filiere} style={{ marginBottom: 18 }}>
          <h2 className="titre-bloc">Filière {filiere}</h2>
          <table className="tableau">
            <thead><tr><th>Grade</th><th>Cadre d'emplois</th><th>Cat.</th><th>Échelons</th><th>IM</th><th>Vérifiée le</th><th></th></tr></thead>
            <tbody>
              {liste.map((g) => {
                const vieille = g.verifieLe < limite;
                return (
                  <tr key={g.id}>
                    <td style={{ fontWeight: 600 }}>{g.grade}</td>
                    <td>{g.cadreEmploi}</td>
                    <td>{g.categorie}</td>
                    <td>{g.echelons.length}</td>
                    <td>{g.echelons.length ? `${g.echelons[0].indiceMajore} → ${g.echelons[g.echelons.length - 1].indiceMajore}` : "—"}</td>
                    <td style={{ color: vieille ? "#B23B3B" : undefined, fontWeight: vieille ? 700 : 400 }} title={g.source || ""}>{dateFr(g.verifieLe)}</td>
                    <td><Link href={`/parametres/grilles/${g.id}`} className="bouton-lien">Voir / modifier</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

      <details className="carte">
        <summary style={{ fontWeight: 600 }}>＋ Saisir une grille à la main</summary>
        <form action={creerGrade} className="grille-champs" style={{ marginTop: 12, alignItems: "end" }}>
          <label className="champ">Filière<select name="filiere">{FILIERES.map((f) => <option key={f}>{f}</option>)}</select></label>
          <label className="champ">Cadre d'emplois<input name="cadreEmploi" required /></label>
          <label className="champ">Grade<input name="grade" required /></label>
          <label className="champ">Catégorie<select name="categorie"><option>C</option><option>B</option><option>A</option></select></label>
          <div><button type="submit" className="bouton-principal">Créer puis saisir les échelons</button></div>
        </form>
      </details>
    </Cadre>
  );
}
