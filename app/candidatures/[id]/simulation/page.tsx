import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Cadre from "../../../components/Cadre";
import Simulateur from "./Simulateur";
import { lireParametres } from "@/lib/parametres";
import { suggererEchelon, type EntreeSimulation } from "@/lib/paie";
import { nomComplet } from "@/lib/format";

export default async function PageSimulation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await prisma.candidature.findUnique({ where: { id }, include: { poste: true } });
  if (!c || !c.poste) notFound();
  const poste = c.poste;
  const [p, grades] = await Promise.all([
    lireParametres(),
    prisma.gradeGrille.findMany({ include: { echelons: { orderBy: { numero: "asc" } } }, orderBy: [{ filiere: "asc" }, { grade: "asc" }] }),
  ]);
  const { id: _id, signature: _s, misAJourLe, ...params2 } = p;

  // Régime par défaut : celui du poste ; « les deux » → titulaire si déjà fonctionnaire, sinon stagiaire
  const regime: "titulaire" | "contractuel" = poste.typeRecrutement === "contractuel" ? "contractuel" : "titulaire";
  const grade = grades.find((g) => g.id === poste.gradeId) || null;
  const suggestion = suggererEchelon({
    regime,
    dejaFonctionnaire: c.dejaFonctionnaire,
    echelonActuel: c.echelonActuel,
    moisExperience: c.moisExperienceTotale,
    echelons: grade?.echelons || [],
  });
  const precedente = (() => { try { return c.simulation ? JSON.parse(c.simulation) : null; } catch { return null; } })();
  const echelon = grade?.echelons.find((e) => e.numero === suggestion.numero) || grade?.echelons[0];

  const entreeInitiale: EntreeSimulation = precedente?.entree || {
    regime,
    nom: nomComplet(c),
    poste: poste.intitule,
    grade: grade?.grade || "",
    echelon: echelon?.numero || 1,
    indiceMajore: echelon?.indiceMajore || 0,
    tempsTravail: poste.tempsTravail || 1,
    categorie: grade?.categorie || poste.categorie || "C",
    cti: false,
    nbiPoints: 0,
    enfants: 0,
    ifse: poste.ifseMensuelle || 0,
    cia: regime === "titulaire",
    astreinteNombre: 0,
    astreinteTaux: 0,
    sante: false,
    prevoyance: false,
    indemniteCsg: regime === "titulaire",
  };

  return (
    <Cadre>
      <Link href={`/candidatures/${c.id}`} style={{ fontSize: 13, color: "#777" }}>← Fiche de {nomComplet(c)}</Link>
      <h1 className="titre-page" style={{ marginTop: 8 }}>Simulation de paie</h1>
      <Simulateur
        candidatureId={c.id}
        entreeInitiale={entreeInitiale}
        stagiaireInitial={precedente ? !!precedente.stagiaire : regime === "titulaire" && !c.dejaFonctionnaire}
        gradeIdInitial={precedente?.gradeId || grade?.id || ""}
        grades={grades.map((g) => ({ id: g.id, grade: g.grade, categorie: g.categorie, filiere: g.filiere, verifieLe: g.verifieLe.toISOString(), echelons: g.echelons.map((e) => ({ numero: e.numero, indiceMajore: e.indiceMajore, indiceBrut: e.indiceBrut, dureeMois: e.dureeMois })) }))}
        params={params2}
        parametresDu={misAJourLe.toISOString()}
        suggestion={precedente ? null : suggestion}
        profil={{ dejaFonctionnaire: c.dejaFonctionnaire, echelonActuel: c.echelonActuel, moisExperience: c.moisExperienceTotale }}
      />
    </Cadre>
  );
}
