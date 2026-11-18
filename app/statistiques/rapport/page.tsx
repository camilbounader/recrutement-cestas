import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Cadre from "../../components/Cadre";
import Rapport from "./Rapport";
import BoutonImprimer from "../../courrier/BoutonImprimer";
import { lignesStatistiques } from "@/lib/statsDonnees";

export default async function PageRapport({ searchParams }: { searchParams: Promise<{ annee?: string }> }) {
  const sp = await searchParams;
  const [lignes, enregistres] = await Promise.all([lignesStatistiques(), prisma.graphique.findMany({ orderBy: { ordre: "asc" } })]);
  const annees = Array.from(new Set([new Date().getFullYear(), ...lignes.candidatures.map((l) => Number(l.annee))])).sort((a, b) => b - a);
  const annee = Number(sp.annee) || annees[0];

  return (
    <Cadre>
      <div className="pas-imprimer" style={{ marginBottom: 10 }}><Link href="/statistiques" style={{ fontSize: 13, color: "#777" }}>← Statistiques</Link></div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img src="/logo.jpg" alt="Ville de Cestas" style={{ height: 56 }} />
          <h1 className="titre-page" style={{ margin: 0 }}>Bilan des recrutements {annee}</h1>
        </div>
        <div className="pas-imprimer" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div className="onglets" style={{ margin: 0 }}>{annees.map((a) => <Link key={a} href={`/statistiques/rapport?annee=${a}`} className={a === annee ? "actif" : ""}>{a}</Link>)}</div>
          <BoutonImprimer />
        </div>
      </div>
      <Rapport annee={annee} lignes={lignes} enregistres={enregistres.map((g) => ({ id: g.id, nom: g.nom, config: g.config }))} />
      <p style={{ fontSize: 11, color: "#999", marginTop: 14 }}>Édité le {new Date().toLocaleDateString("fr-FR")} depuis l'application Recrutements. Les années reprises de l'ancien tableau Excel peuvent être incomplètes (sexe, mois de réception).</p>
    </Cadre>
  );
}
