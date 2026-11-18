import Cadre from "../components/Cadre";
import ImportExcel from "./ImportExcel";
export const maxDuration = 60;

export default function PageImport() {
  return (
    <Cadre>
      <h1 className="titre-page">Reprise de l'ancien tableau Excel</h1>
      <div className="carte" style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
        Déposez le fichier <b>SUIVI DES RECRUTEMENTS.xlsx</b> : chaque feuille « RECRUTEMENT 20xx » devient une année, chaque ligne « Poste » un poste et les lignes suivantes ses candidatures.
        <ul style={{ margin: "6px 0" }}>
          <li>Nom surligné en <span style={{ background: "#FFFF00", padding: "0 4px" }}>jaune</span> → <b>recrutée</b> ; colonne « Proposition » remplie → <b>retenue entretien</b>.</li>
          <li>Les postes importés sont classés « Pourvu » ou « Archivé » : ils n'apparaissent pas dans les offres en cours.</li>
          <li>Réimporter une feuille la remplace (pas de doublon). Les candidatures de plus de 2 ans seront proposées à l'anonymisation (page RGPD) : les statistiques restent.</li>
        </ul>
      </div>
      <ImportExcel />
    </Cadre>
  );
}
