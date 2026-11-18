import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Cadre from "./components/Cadre";
import { alertes } from "@/lib/alertes";
import { dateFr, joursRestants } from "@/lib/format";

const STYLES_ALERTE = {
  urgent: { fond: "#FBEDED", bord: "#E8C4C4", icone: "⏰" },
  attention: { fond: "#FFF6D6", bord: "#EAD58A", icone: "⚠️" },
  info: { fond: "#EEF4FA", bord: "#C7DAEC", icone: "ℹ️" },
};

export default async function TableauDeBord() {
  const annee = new Date().getFullYear();
  const [liste, ouverts, nbPostes, nbCandidatures, nbRecrutes, nbSpontanees] = await Promise.all([
    alertes(),
    prisma.poste.findMany({ where: { etat: "ouvert" }, orderBy: { dateCloture: "asc" }, include: { _count: { select: { candidatures: true } } } }),
    prisma.poste.count({ where: { annee } }),
    prisma.candidature.count({ where: { annee } }),
    prisma.candidature.count({ where: { annee, statut: "recrutee" } }),
    prisma.candidature.count({ where: { annee, posteId: null } }),
  ]);

  const chiffres = [
    { libelle: `Postes ${annee}`, valeur: nbPostes, lien: `/postes?annee=${annee}` },
    { libelle: "Candidatures traitées", valeur: nbCandidatures, lien: `/postes?annee=${annee}` },
    { libelle: "dont spontanées", valeur: nbSpontanees, lien: `/spontanees?annee=${annee}` },
    { libelle: "Recrutements", valeur: nbRecrutes, lien: `/postes?annee=${annee}` },
  ];

  return (
    <Cadre>
      <h1 className="titre-page">Tableau de bord</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        {chiffres.map((c) => (
          <Link key={c.libelle} href={c.lien} className="carte carte-cliquable" style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{ fontSize: 30, fontWeight: 700, color: "var(--color-vert-fonce)", fontFamily: "Georgia, serif" }}>{c.valeur}</div>
            <div style={{ fontSize: 13, color: "#777" }}>{c.libelle}</div>
          </Link>
        ))}
      </div>

      <h2 className="titre-bloc">À faire</h2>
      {liste.length === 0 && <p className="carte" style={{ color: "#4F6B49" }}>✓ Rien d'urgent.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 22 }}>
        {liste.map((a, i) => {
          const s = STYLES_ALERTE[a.niveau];
          return (
            <Link key={i} href={a.lien} style={{ background: s.fond, border: `1px solid ${s.bord}`, borderRadius: 8, padding: "10px 14px", textDecoration: "none", color: "inherit", fontSize: 14 }}>
              {s.icone} {a.texte}
            </Link>
          );
        })}
      </div>

      <h2 className="titre-bloc">Offres en cours</h2>
      {ouverts.length === 0 ? <p style={{ color: "#999" }}>Aucune offre ouverte.</p> : (
        <table className="tableau">
          <thead><tr><th>Poste</th><th>Service</th><th>Publiée le</th><th>Clôture</th><th>Candidatures</th></tr></thead>
          <tbody>
            {ouverts.map((p) => {
              const j = joursRestants(p.dateCloture);
              return (
                <tr key={p.id}>
                  <td><Link href={`/postes/${p.id}`} style={{ fontWeight: 600, color: "var(--color-vert-fonce)" }}>{p.intitule}</Link></td>
                  <td>{p.service}</td>
                  <td>{dateFr(p.dateOuverture)}</td>
                  <td style={{ color: j !== null && j <= 7 ? "#B23B3B" : undefined, fontWeight: j !== null && j <= 7 ? 700 : 400 }}>
                    {dateFr(p.dateCloture)} {j !== null && (j >= 0 ? `(J-${j})` : "(clôturée)")}
                  </td>
                  <td>{p._count.candidatures}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Cadre>
  );
}
