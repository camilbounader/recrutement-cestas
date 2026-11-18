import { prisma } from "@/lib/prisma";
import { dateInput } from "@/lib/format";
import type { ValeursPoste } from "./FormulairePoste";

// Listes proposées dans le formulaire de poste : grades enregistrés et services déjà utilisés
export async function donneesFormulaire() {
  const grades = await prisma.gradeGrille.findMany({ orderBy: [{ filiere: "asc" }, { cadreEmploi: "asc" }, { grade: "asc" }] });
  const services = await prisma.poste.findMany({ where: { service: { not: null } }, distinct: ["service"], select: { service: true } });
  return {
    grades: grades.map((g) => ({ id: g.id, filiere: g.filiere, libelle: `${g.grade} (${g.categorie || "?"})` })),
    services: services.map((s) => s.service!).sort((a, b) => a.localeCompare(b, "fr")),
  };
}

export function valeursDepuisPoste(p: any): ValeursPoste {
  const v: ValeursPoste = {};
  for (const [cle, val] of Object.entries(p || {})) {
    if (val === null || val === undefined || typeof val === "object" && !(val instanceof Date)) continue;
    v[cle] = val instanceof Date ? dateInput(val) : String(val);
  }
  return v;
}
