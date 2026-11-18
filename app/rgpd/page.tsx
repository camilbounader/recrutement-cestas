import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Cadre from "../components/Cadre";
import { anonymiser } from "../candidatures/actions";
import { DUREE_CONSERVATION_MOIS } from "@/lib/alertes";
import { dateFr, nomComplet } from "@/lib/format";

export default async function Rgpd() {
  const limite = new Date();
  limite.setMonth(limite.getMonth() - DUREE_CONSERVATION_MOIS);
  const anciennes = await prisma.candidature.findMany({
    where: { anonymiseeLe: null, statut: { not: "recrutee" }, dateReception: { lt: limite } },
    select: { id: true, nom: true, prenom: true, dateReception: true, poste: { select: { intitule: true } } },
    orderBy: { dateReception: "asc" },
  });
  const toutAnonymiser = anonymiser.bind(null, anciennes.map((c) => c.id));

  return (
    <Cadre>
      <h1 className="titre-page">RGPD</h1>
      <div className="carte" style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 18 }}>
        <b>Ce que fait l'application :</b>
        <ul style={{ margin: "6px 0" }}>
          <li>Les CV et lettres sont lus par l'IA puis <b>ne sont pas conservés</b> : seules les informations utiles au recrutement sont enregistrées.</li>
          <li>Le score de compatibilité est <b>indicatif</b> : la décision est toujours prise par la RH (pas de décision automatique).</li>
          <li>Les candidatures non retenues sont <b>anonymisées après 2 ans</b> : nom, prénom, coordonnées, photo et profil sont effacés ; sexe, département, ville, poste et avancement restent pour les statistiques.</li>
          <li>Le mail d'accusé de réception informe le candidat de l'usage de ses données et de ses droits.</li>
          <li>Pour une demande d'accès ou de suppression d'un candidat : ouvrez sa fiche (modifier ou 🗑 supprimer).</li>
        </ul>
      </div>

      <h2 className="titre-bloc">Candidatures de plus de 2 ans à anonymiser ({anciennes.length})</h2>
      {anciennes.length === 0 ? <p style={{ color: "#4F6B49" }}>✓ Aucune.</p> : (
        <>
          <form action={toutAnonymiser} style={{ marginBottom: 12 }}>
            <button type="submit" className="bouton-principal">Anonymiser les {anciennes.length} candidatures</button>
          </form>
          <table className="tableau">
            <thead><tr><th>Candidat</th><th>Poste</th><th>Reçue le</th></tr></thead>
            <tbody>
              {anciennes.map((c) => (
                <tr key={c.id}><td><Link href={`/candidatures/${c.id}`}>{nomComplet(c)}</Link></td><td>{c.poste?.intitule || "Spontanée"}</td><td>{dateFr(c.dateReception)}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Cadre>
  );
}
