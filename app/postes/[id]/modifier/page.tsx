import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Cadre from "../../../components/Cadre";
import FormulairePoste from "../../FormulairePoste";
import { donneesFormulaire, valeursDepuisPoste } from "../../donneesFormulaire";
export const maxDuration = 60;

export default async function ModifierPoste({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const poste = await prisma.poste.findUnique({ where: { id } });
  if (!poste) notFound();
  const { grades, services } = await donneesFormulaire();
  return (
    <Cadre>
      <Link href={`/postes/${id}`} style={{ fontSize: 13, color: "#777" }}>← Retour au poste</Link>
      <h1 className="titre-page" style={{ marginTop: 8 }}>Modifier : {poste.intitule}</h1>
      <FormulairePoste valeurs={valeursDepuisPoste(poste)} grades={grades} services={services} />
    </Cadre>
  );
}
