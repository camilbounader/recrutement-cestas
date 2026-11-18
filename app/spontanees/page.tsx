import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Cadre from "../components/Cadre";
import ImportCV from "../components/ImportCV";
import VueCandidatures from "../components/VueCandidatures";
import CopierTexte from "../components/CopierTexte";
import { SELECTION_CARTE, versCarte } from "../components/cartes";
import { remplir } from "@/lib/modeles";
import { lireParametres } from "@/lib/parametres";
export const maxDuration = 60;

export default async function Spontanees({ searchParams }: { searchParams: Promise<{ annee?: string }> }) {
  const sp = await searchParams;
  const anneeCourante = new Date().getFullYear();
  const annee = Number(sp.annee) || anneeCourante;
  const anneesBase = await prisma.candidature.findMany({ where: { posteId: null }, distinct: ["annee"], select: { annee: true } });
  const annees = Array.from(new Set([anneeCourante, ...anneesBase.map((a) => a.annee)])).sort((a, b) => b - a);
  const candidatures = await prisma.candidature.findMany({ where: { posteId: null, annee }, select: SELECTION_CARTE, orderBy: { dateReception: "desc" } });

  const p = await lireParametres();
  const modele = await prisma.modeleTexte.findUnique({ where: { code: "reponse_spontanee" } });
  const corps = modele ? remplir(modele.corps, { candidat: {}, signature: p.signature }) : "";
  const adresses = candidatures.filter((c) => c.email && c.statut === "recue").map((c) => c.email!);

  return (
    <Cadre>
      <h1 className="titre-page">Candidatures spontanées</h1>
      <div className="onglets">
        {annees.map((a) => <Link key={a} href={`/spontanees?annee=${a}`} className={a === annee ? "actif" : ""}>{a}</Link>)}
      </div>
      <p style={{ fontSize: 13, color: "#666", marginTop: -6 }}>Elles forment le vivier : sur chaque poste, le bouton « Chercher les profils compatibles » les compare à la fiche de poste.</p>
      <ImportCV posteId={null} annee={annee} />
      <VueCandidatures candidats={candidatures.map(versCarte)} avecScore={false} />
      {modele && (
        <details className="carte" style={{ marginTop: 18 }}>
          <summary style={{ fontWeight: 600, color: "var(--color-vert-fonce)" }}>✉️ Réponse groupée aux candidatures spontanées ({adresses.length} « reçues »)</summary>
          <div style={{ display: "flex", gap: 8, margin: "10px 0" }}>
            <CopierTexte texte={adresses.join("; ")} libelle="📋 Adresses (Cci)" />
            <CopierTexte texte={remplir(modele.objet || "", { candidat: {} })} libelle="📋 Objet" />
            <CopierTexte texte={corps} libelle="📋 Texte du mail" principal />
          </div>
          <div style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>{corps}</div>
        </details>
      )}
    </Cadre>
  );
}
