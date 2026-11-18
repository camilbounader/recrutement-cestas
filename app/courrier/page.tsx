import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { remplir } from "@/lib/modeles";
import { lireParametres } from "@/lib/parametres";
import { dateFr, nomComplet } from "@/lib/format";
import BoutonImprimer from "./BoutonImprimer";

// Courrier à l'en-tête de la mairie : « Imprimer » puis « Enregistrer en PDF » pour l'envoyer par mail
export default async function Courrier({ searchParams }: { searchParams: Promise<{ c?: string; m?: string }> }) {
  const sp = await searchParams;
  if (!sp.c || !sp.m) notFound();
  const [c, m, p] = await Promise.all([
    prisma.candidature.findUnique({ where: { id: sp.c }, include: { poste: { include: { grade: true } } } }),
    prisma.modeleTexte.findUnique({ where: { id: sp.m } }),
    lireParametres(),
  ]);
  if (!c || !m) notFound();
  const d = { candidat: c, poste: c.poste, signature: p.signature };
  const corps = remplir(m.corps, d);

  return (
    <div className="fond-courrier" style={{ background: "#EEE", minHeight: "100vh", padding: "24px 0" }}>
      <div className="pas-imprimer" style={{ maxWidth: "210mm", margin: "0 auto 12px", display: "flex", gap: 10, alignItems: "center" }}>
        <BoutonImprimer />
        <span style={{ fontSize: 13, color: "#666" }}>Dans la fenêtre d'impression, choisissez « Enregistrer au format PDF » pour l'envoyer par mail.</span>
      </div>
      <div className="feuille" style={{ background: "white", width: "210mm", minHeight: "297mm", margin: "0 auto", padding: "18mm 20mm", boxSizing: "border-box", fontFamily: "Arial, sans-serif", fontSize: "11pt", color: "#222", boxShadow: "0 2px 10px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <img src="/logo.jpg" alt="Ville de Cestas" style={{ width: "38mm" }} />
          <div style={{ textAlign: "right", fontSize: "10pt", color: "#555" }}>
            Ressources Humaines<br />Hôtel de Ville<br />33610 Cestas
          </div>
        </div>
        <div style={{ marginTop: "14mm", marginLeft: "95mm", lineHeight: 1.5 }}>
          {c.sexe === "F" ? "Madame" : c.sexe === "H" ? "Monsieur" : ""} {nomComplet(c)}<br />
          {c.adresse && <>{c.adresse}<br /></>}
          {c.ville}
        </div>
        <div style={{ marginTop: "10mm", textAlign: "right" }}>Cestas, le {dateFr(new Date())}</div>
        {m.objet && <div style={{ marginTop: "8mm" }}><b>Objet :</b> {remplir(m.objet, d)}</div>}
        <div style={{ marginTop: "10mm", whiteSpace: "pre-wrap", lineHeight: 1.6, textAlign: "justify" }}>{corps}</div>
      </div>
      <style>{`@media print { @page { size: A4; margin: 0; } body { background: white !important; } .feuille { box-shadow: none !important; margin: 0 !important; } .fond-courrier { padding: 0 !important; background: white !important; } }`}</style>
    </div>
  );
}
