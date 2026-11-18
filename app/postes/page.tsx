import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Cadre from "../components/Cadre";
import { ETATS_POSTE, dateFr, joursRestants, nomComplet } from "@/lib/format";

export default async function Postes({ searchParams }: { searchParams: Promise<{ annee?: string }> }) {
  const sp = await searchParams;
  const anneeCourante = new Date().getFullYear();
  const annee = Number(sp.annee) || anneeCourante;
  const anneesPostes = await prisma.poste.findMany({ distinct: ["annee"], select: { annee: true } });
  const annees = Array.from(new Set([anneeCourante, ...anneesPostes.map((a) => a.annee)])).sort((a, b) => b - a);

  const postes = await prisma.poste.findMany({
    where: { annee },
    orderBy: [{ dateOuverture: "desc" }, { creeLe: "desc" }],
    include: { candidatures: { select: { statut: true, nom: true, prenom: true } } },
  });
  const spontanees = await prisma.candidature.count({ where: { annee, posteId: null } });

  return (
    <Cadre>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h1 className="titre-page" style={{ margin: 0 }}>Postes & candidatures</h1>
        <Link href="/postes/nouveau" className="bouton-principal">＋ Nouveau poste</Link>
      </div>

      <div className="onglets">
        {annees.map((a) => <Link key={a} href={`/postes?annee=${a}`} className={a === annee ? "actif" : ""}>{a}</Link>)}
      </div>

      {postes.length === 0 && <p style={{ color: "#999" }}>Aucun poste en {annee}.</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
        {postes.map((p) => {
          const etat = ETATS_POSTE[p.etat] || ETATS_POSTE.ouvert;
          const j = p.etat === "ouvert" ? joursRestants(p.dateCloture) : null;
          const retenues = p.candidatures.filter((c) => c.statut === "retenue" || c.statut === "recrutee").length;
          const recrutes = p.candidatures.filter((c) => c.statut === "recrutee");
          return (
            <Link key={p.id} href={`/postes/${p.id}`} className="carte carte-cliquable" style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", gap: 8, borderColor: recrutes.length ? "#E8C547" : undefined }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontWeight: 700, color: "var(--color-vert-fonce)", fontSize: 15 }}>{p.intitule}</div>
                <span style={{ background: etat.fond, color: etat.couleur, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, height: "fit-content", whiteSpace: "nowrap" }}>{etat.libelle}</span>
              </div>
              <div style={{ fontSize: 12, color: "#888" }}>{[p.service, p.filiere, p.categorie && `Cat. ${p.categorie}`, p.collectivite].filter(Boolean).join(" · ")}</div>
              {p.motif && <div style={{ fontSize: 12, color: "#777", fontStyle: "italic" }}>{p.motif}</div>}
              <div style={{ fontSize: 12 }}>
                {p.dateOuverture && <>Publié le {dateFr(p.dateOuverture)}</>}
                {p.dateCloture && <> · clôture le {dateFr(p.dateCloture)}</>}
                {j !== null && j >= 0 && j <= 7 && <span style={{ color: "#B23B3B", fontWeight: 700 }}> · J-{j}</span>}
                {j !== null && j < 0 && <span style={{ color: "#B8860B", fontWeight: 700 }}> · clôturée, à traiter</span>}
              </div>
              <div style={{ display: "flex", gap: 14, fontSize: 13, marginTop: "auto" }}>
                <span>📄 {p.candidatures.length} candidature{p.candidatures.length > 1 ? "s" : ""}</span>
                <span style={{ color: "#1F5A8C" }}>★ {retenues} retenue{retenues > 1 ? "s" : ""}</span>
              </div>
              {recrutes.length > 0 && <div style={{ background: "#FFF3A3", borderRadius: 6, padding: "4px 8px", fontSize: 12, fontWeight: 600 }}>✓ Recruté : {recrutes.map(nomComplet).join(", ")}</div>}
            </Link>
          );
        })}
      </div>

      <Link href={`/spontanees?annee=${annee}`} className="carte carte-cliquable" style={{ display: "block", marginTop: 18, textDecoration: "none", color: "inherit" }}>
        📥 <b>Candidatures spontanées {annee}</b> : {spontanees}
      </Link>
    </Cadre>
  );
}
