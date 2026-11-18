import Cadre from "../../components/Cadre";
import FormulairePoste from "../FormulairePoste";
import { donneesFormulaire } from "../donneesFormulaire";
import { dateInput } from "@/lib/format";
export const maxDuration = 60;

export default async function NouveauPoste() {
  const { grades, services } = await donneesFormulaire();
  return (
    <Cadre>
      <h1 className="titre-page">Nouveau poste</h1>
      <FormulairePoste valeurs={{ annee: String(new Date().getFullYear()), dateOuverture: dateInput(new Date()), tempsTravail: "1", typeRecrutement: "titulaire_ou_contractuel" }} grades={grades} services={services} />
    </Cadre>
  );
}
