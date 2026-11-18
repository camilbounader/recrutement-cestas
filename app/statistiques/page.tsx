import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Cadre from "../components/Cadre";
import Constructeur from "./Constructeur";
import { lignesStatistiques } from "@/lib/statsDonnees";

export default async function Statistiques() {
  const [lignes, enregistres] = await Promise.all([lignesStatistiques(), prisma.graphique.findMany({ orderBy: { ordre: "asc" } })]);
  const annees = Array.from(new Set([...lignes.candidatures, ...lignes.postes].map((l) => Number(l.annee)))).sort((a, b) => b - a);
  return (
    <Cadre>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h1 className="titre-page" style={{ margin: 0 }}>Statistiques</h1>
        <Link href="/statistiques/rapport" className="bouton-principal">📑 Rapport annuel pour la DRH</Link>
      </div>
      <Constructeur lignes={lignes} annees={annees} enregistres={enregistres.map((g) => ({ id: g.id, nom: g.nom, config: g.config }))} />
    </Cadre>
  );
}
