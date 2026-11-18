"use client";

export default function BoutonImprimer({ libelle = "🖨 Imprimer / PDF" }: { libelle?: string }) {
  return <button onClick={() => window.print()} className="bouton-principal">{libelle}</button>;
}
