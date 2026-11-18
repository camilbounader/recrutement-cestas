import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Cadre from "../../components/Cadre";
import CopierTexte from "../../components/CopierTexte";
import { BoutonsStatut, PhotoCandidat, BoutonSupprimer } from "./Interactions";
import { modifierCandidature } from "../actions";
import { dateFr, euros, nomComplet } from "@/lib/format";
import { remplir } from "@/lib/modeles";
import { lireParametres } from "@/lib/parametres";

const duree = (mois: number | null) => (mois === null ? "—" : mois >= 12 ? `${Math.floor(mois / 12)} an(s)${mois % 12 ? ` ${mois % 12} mois` : ""}` : `${mois} mois`);

export default async function FicheCandidature({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await prisma.candidature.findUnique({ where: { id }, include: { poste: { include: { grade: true } } } });
  if (!c) notFound();
  const p = await lireParametres();
  const modeles = await prisma.modeleTexte.findMany({ orderBy: [{ ordre: "asc" }, { nom: "asc" }] });
  const detail = (() => { try { return JSON.parse(c.scoreDetail || "{}"); } catch { return {}; } })();
  const experiences: any[] = (() => { try { return JSON.parse(c.experience || "[]"); } catch { return []; } })();
  const simulation = (() => { try { return c.simulation ? JSON.parse(c.simulation) : null; } catch { return null; } })();
  const donnees = { candidat: c, poste: c.poste, signature: p.signature };
  const initiales = `${(c.prenom || "")[0] || ""}${(c.nom || "")[0] || ""}`.toUpperCase() || "?";
  const enregistrer = modifierCandidature.bind(null, c.id);
  const mails = modeles.filter((m) => m.type === "mail" && (c.posteId ? m.code !== "reponse_spontanee" : true));
  const courriers = modeles.filter((m) => m.type === "courrier");

  return (
    <Cadre>
      <Link href={c.posteId ? `/postes/${c.posteId}` : `/spontanees?annee=${c.annee}`} style={{ fontSize: 13, color: "#777" }}>← {c.poste ? c.poste.intitule : `Candidatures spontanées ${c.annee}`}</Link>

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start", margin: "12px 0 18px", flexWrap: "wrap" }}>
        <PhotoCandidat id={c.id} photo={c.photo} initiales={initiales} />
        <div style={{ flex: 1, minWidth: 300 }}>
          <h1 className="titre-page" style={{ marginBottom: 4 }}>{c.anonymiseeLe ? "Candidature anonymisée" : nomComplet(c)}</h1>
          <div style={{ fontSize: 13, color: "#777", marginBottom: 10 }}>
            Reçue le {dateFr(c.dateReception)} · {c.origine === "vivier" ? "ajoutée depuis le vivier" : c.posteId ? "candidature au poste" : "candidature spontanée"}
            {c.anonymiseeLe && ` · anonymisée le ${dateFr(c.anonymiseeLe)}`}
          </div>
          <BoutonsStatut id={c.id} statut={c.statut} />
          {c.score !== null && (
            <div className="carte" style={{ marginTop: 12, padding: 12, display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ fontSize: 30, fontWeight: 700, color: c.score >= 70 ? "#4F6B49" : c.score >= 45 ? "#B8860B" : "#B23B3B", lineHeight: 1 }}>{c.score}<span style={{ fontSize: 13, color: "#999" }}>/100</span></div>
              <div style={{ fontSize: 13 }}>
                <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>Compatibilité avec la fiche de poste — indicatif, calculé par l'IA</div>
                {detail.pointsForts && <div>✅ {detail.pointsForts}</div>}
                {detail.pointsVigilance && <div>🔍 {detail.pointsVigilance}</div>}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 18 }}>
        <form action={enregistrer} className="carte" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 className="titre-bloc">Informations</h2>
          <div className="grille-champs" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <label className="champ">Nom<input name="nom" defaultValue={c.nom || ""} /></label>
            <label className="champ">Prénom<input name="prenom" defaultValue={c.prenom || ""} /></label>
            <label className="champ">Sexe
              <select name="sexe" defaultValue={c.sexe || ""}><option value="">—</option><option value="F">F</option><option value="H">H</option></select>
            </label>
            <label className="champ">Téléphone<input name="telephone" defaultValue={c.telephone || ""} /></label>
            <label className="champ" style={{ gridColumn: "span 2" }}>Adresse mail<input name="email" type="email" defaultValue={c.email || ""} /></label>
            <label className="champ" style={{ gridColumn: "span 2" }}>Adresse postale<input name="adresse" defaultValue={c.adresse || ""} /></label>
            <label className="champ">Ville<input name="ville" defaultValue={c.ville || ""} /></label>
            <label className="champ">Département<input name="departement" defaultValue={c.departement || ""} /></label>
            <label className="champ">Date / heure d'entretien<input name="dateEntretien" defaultValue={c.dateEntretien || ""} placeholder="mardi 12 décembre à 10h" /></label>
            <label className="champ">Note AssessFirst (0 à 5)<input name="noteAssessfirst" type="number" step="0.5" min="0" max="5" defaultValue={c.noteAssessfirst ?? ""} /></label>
            <label className="champ">Déjà fonctionnaire ?
              <select name="dejaFonctionnaire" defaultValue={c.dejaFonctionnaire === true ? "oui" : c.dejaFonctionnaire === false ? "non" : ""}><option value="">Je ne sais pas</option><option value="oui">Oui (mutation, détachement…)</option><option value="non">Non</option></select>
            </label>
          </div>
          <label className="champ">Observations<textarea name="observations" rows={3} defaultValue={c.observations || ""} /></label>
          <div><button type="submit" className="bouton-principal">Enregistrer</button></div>
        </form>

        <div className="carte">
          <h2 className="titre-bloc">Profil lu par l'IA</h2>
          {c.resume && <p style={{ fontSize: 13, marginTop: 0 }}>{c.resume}</p>}
          {detail.motivation && <p style={{ fontSize: 13 }}><b>Lettre :</b> {detail.motivation}</p>}
          {c.competences && <p style={{ fontSize: 13 }}><b>Compétences :</b> {c.competences}</p>}
          {detail.diplomes && <p style={{ fontSize: 13 }}><b>Diplômes :</b> {detail.diplomes}</p>}
          <p style={{ fontSize: 13 }}>
            <b>Expérience dans le public :</b> {duree(c.moisExperiencePublic)} · <b>en lien avec le poste :</b> {duree(c.moisExperienceTotale)}
            {c.gradeActuel && <> · <b>grade actuel :</b> {c.gradeActuel}{c.echelonActuel ? `, échelon ${c.echelonActuel}` : ""}</>}
          </p>
          {experiences.length > 0 && (
            <table className="tableau">
              <thead><tr><th>Période</th><th>Poste</th><th>Employeur</th></tr></thead>
              <tbody>
                {experiences.map((e, i) => (
                  <tr key={i}>
                    <td style={{ whiteSpace: "nowrap" }}>{e.debut || "?"} → {e.fin || "?"}</td>
                    <td>{e.poste}</td>
                    <td>{e.employeur} {e.public && <span style={{ fontSize: 10, background: "#DCEBFA", color: "#1F5A8C", padding: "1px 5px", borderRadius: 10 }}>public</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!c.resume && experiences.length === 0 && <p style={{ color: "#999", fontSize: 13 }}>Pas d'analyse IA pour cette candidature.</p>}
        </div>
      </div>

      {c.posteId && (
        <div className="carte" style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <h2 className="titre-bloc" style={{ margin: 0 }}>💶 Simulation de paie</h2>
          {simulation ? (
            <span style={{ fontSize: 13 }}>Dernière simulation ({dateFr(simulation.date)}) : {simulation.entree?.regime === "titulaire" ? (simulation.stagiaire ? "stagiaire" : "titulaire") : "contractuel"}, échelon {simulation.entree?.echelon} (IM {simulation.entree?.indiceMajore}) — <b>brut {euros(simulation.resultat?.brut || 0)}</b>, <b>net {euros(simulation.resultat?.net || 0)}</b></span>
          ) : <span style={{ fontSize: 13, color: "#888" }}>Pas encore faite.</span>}
          <Link href={`/candidatures/${c.id}/simulation`} className="bouton-principal" style={{ marginLeft: "auto" }}>{simulation ? "Refaire la simulation" : "Faire la simulation"}</Link>
        </div>
      )}

      <div className="carte" style={{ marginTop: 18 }}>
        <h2 className="titre-bloc">✉️ Mails à copier dans Zimbra</h2>
        {c.email && <div style={{ marginBottom: 10 }}><CopierTexte texte={c.email} libelle={`📋 Copier l'adresse : ${c.email}`} /></div>}
        {mails.map((m) => {
          const objet = remplir(m.objet || "", donnees);
          const corps = remplir(m.corps, donnees);
          return (
            <details key={m.id} style={{ borderTop: "1px solid var(--color-ligne)", padding: "8px 0" }}>
              <summary style={{ fontWeight: 600, fontSize: 14 }}>{m.nom}</summary>
              <div style={{ display: "flex", gap: 8, margin: "8px 0" }}>
                <CopierTexte texte={objet} libelle="📋 Objet" />
                <CopierTexte texte={corps} libelle="📋 Texte du mail" principal />
              </div>
              <div style={{ fontSize: 12, color: "#777" }}>Objet : {objet}</div>
              <div style={{ whiteSpace: "pre-wrap", fontSize: 13, background: "#FAFAF7", border: "1px solid var(--color-ligne)", borderRadius: 6, padding: 10, marginTop: 6 }}>{corps}</div>
            </details>
          );
        })}
        {courriers.length > 0 && (
          <div style={{ borderTop: "1px solid var(--color-ligne)", paddingTop: 10, marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <b style={{ fontSize: 14 }}>📄 Courriers :</b>
            {courriers.map((m) => <Link key={m.id} href={`/courrier?c=${c.id}&m=${m.id}`} target="_blank" className="bouton-lien">{m.nom}</Link>)}
          </div>
        )}
        <p style={{ fontSize: 12, color: "#888", marginBottom: 0 }}>Les textes se modifient dans Outils › Modèles de mails. Le mail aux candidats non retenus part depuis AssessFirst.</p>
      </div>

      <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}><BoutonSupprimer id={c.id} /></div>
    </Cadre>
  );
}
