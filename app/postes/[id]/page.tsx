import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Cadre from "../../components/Cadre";
import ImportCV from "../../components/ImportCV";
import VueCandidatures from "../../components/VueCandidatures";
import CopierTexte from "../../components/CopierTexte";
import { SELECTION_CARTE, versCarte } from "../../components/cartes";
import ActionsPoste from "./ActionsPoste";
import Vivier from "./Vivier";
import { ETATS_POSTE, TYPES_RECRUTEMENT, dateFr, joursRestants } from "@/lib/format";
import { remplir } from "@/lib/modeles";
import { lireParametres } from "@/lib/parametres";
export const maxDuration = 60;

export default async function PagePoste({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const poste = await prisma.poste.findUnique({ where: { id }, include: { grade: true, candidatures: { select: SELECTION_CARTE, orderBy: { creeLe: "asc" } } } });
  if (!poste) notFound();
  const etat = ETATS_POSTE[poste.etat] || ETATS_POSTE.ouvert;
  const j = poste.etat === "ouvert" ? joursRestants(poste.dateCloture) : null;

  // Mails groupés (un seul mail en Cci) : accusé de réception aux nouvelles candidatures, convocation aux retenues
  const params2 = await lireParametres();
  const modeles = await prisma.modeleTexte.findMany({ where: { code: { in: ["accuse_reception", "convocation_dispo"] } } });
  const groupes = [
    { code: "accuse_reception", titre: "Accusé de réception", statut: "recue" },
    { code: "convocation_dispo", titre: "Convocation (demande de disponibilités)", statut: "retenue" },
  ].map((g) => {
    const m = modeles.find((x) => x.code === g.code);
    const adresses = poste.candidatures.filter((c) => c.statut === g.statut && c.email).map((c) => c.email!);
    const d = { candidat: {}, poste, signature: params2.signature };
    return { ...g, objet: m ? remplir(m.objet || "", d) : "", corps: m ? remplir(m.corps, d) : "", adresses };
  });

  return (
    <Cadre>
      <Link href={`/postes?annee=${poste.annee}`} style={{ fontSize: 13, color: "#777" }}>← Postes {poste.annee}</Link>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, margin: "8px 0 16px", flexWrap: "wrap" }}>
        <div>
          <h1 className="titre-page" style={{ margin: 0 }}>{poste.intitule}</h1>
          <div style={{ fontSize: 13, color: "#777", marginTop: 4 }}>
            {[poste.service, poste.collectivite, poste.filiere, poste.categorie && `Catégorie ${poste.categorie}`, poste.grade?.grade, TYPES_RECRUTEMENT[poste.typeRecrutement], poste.tempsTravail !== 1 && `${Math.round(poste.tempsTravail * 1000) / 10} %`].filter(Boolean).join(" · ")}
          </div>
          {poste.motif && <div style={{ fontSize: 13, color: "#777", fontStyle: "italic" }}>{poste.motif}</div>}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ background: etat.fond, color: etat.couleur, fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>{etat.libelle}</span>
          <ActionsPoste id={poste.id} etat={poste.etat} nbCandidatures={poste.candidatures.length} />
          <Link href={`/postes/${poste.id}/modifier`} className="bouton-lien">✏️ Modifier</Link>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div className="carte" style={{ padding: "10px 14px", fontSize: 13 }}>N° offre : <b>{poste.numeroOffre || "—"}</b></div>
        <div className="carte" style={{ padding: "10px 14px", fontSize: 13 }}>Publiée le <b>{dateFr(poste.dateOuverture) || "—"}</b></div>
        <div className="carte" style={{ padding: "10px 14px", fontSize: 13, borderColor: j !== null && j <= 7 ? "#E0533D" : undefined }}>
          Clôture le <b>{dateFr(poste.dateCloture) || "—"}</b>
          {j !== null && j >= 0 && <b style={{ color: j <= 7 ? "#B23B3B" : "#4F6B49" }}> (J-{j})</b>}
          {j !== null && j < 0 && <b style={{ color: "#B8860B" }}> (clôturée)</b>}
        </div>
        <div className="carte" style={{ padding: "10px 14px", fontSize: 13 }}>Candidatures : <b>{poste.candidatures.length}</b></div>
      </div>

      {poste.ficheDePoste ? (
        <details className="carte" style={{ marginBottom: 16 }}>
          <summary style={{ fontWeight: 600, color: "var(--color-vert-fonce)" }}>Fiche de poste (utilisée pour le score IA)</summary>
          <div style={{ whiteSpace: "pre-wrap", fontSize: 13, marginTop: 10 }}>{poste.ficheDePoste}</div>
        </details>
      ) : (
        <p style={{ fontSize: 13, background: "#FFF6D6", padding: 10, borderRadius: 8 }}>💡 Ajoutez la fiche de poste (bouton « Modifier ») pour que l'IA calcule un score de compatibilité plus juste.</p>
      )}

      <ImportCV posteId={poste.id} annee={poste.annee} />

      <h2 className="titre-bloc">Candidatures</h2>
      <VueCandidatures candidats={poste.candidatures.map(versCarte)} />

      <details className="carte" style={{ marginTop: 18 }}>
        <summary style={{ fontWeight: 600, color: "var(--color-vert-fonce)" }}>✉️ Mails groupés (un seul mail, adresses en Cci)</summary>
        {groupes.map((g) => (
          <div key={g.code} style={{ marginTop: 14, borderTop: "1px solid var(--color-ligne)", paddingTop: 10 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{g.titre} — {g.adresses.length} destinataire(s) ({g.statut === "recue" ? "candidatures reçues" : "candidatures retenues"})</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
              <CopierTexte texte={g.adresses.join("; ")} libelle="📋 Adresses (Cci)" />
              <CopierTexte texte={g.objet} libelle="📋 Objet" />
              <CopierTexte texte={g.corps} libelle="📋 Texte du mail" principal />
            </div>
            <div style={{ whiteSpace: "pre-wrap", fontSize: 12, background: "#FAFAF7", border: "1px solid var(--color-ligne)", borderRadius: 6, padding: 10, maxHeight: 200, overflowY: "auto" }}>{g.corps}</div>
          </div>
        ))}
        <p style={{ fontSize: 12, color: "#888" }}>Pour un mail personnalisé (date d'entretien, proposition de poste…), ouvrez la fiche du candidat.</p>
      </details>

      <Vivier posteId={poste.id} />
    </Cadre>
  );
}
