"use client";
import { useState } from "react";

// Bouton qui copie un texte (mail, adresses…) pour le coller dans Zimbra
export default function CopierTexte({ texte, libelle = "📋 Copier", titre, principal = false }: { texte: string; libelle?: string; titre?: string; principal?: boolean }) {
  const [copie, setCopie] = useState(false);
  async function copier() {
    try {
      await navigator.clipboard.writeText(texte);
    } catch {
      const zone = document.createElement("textarea");
      zone.value = texte;
      document.body.appendChild(zone);
      zone.select();
      document.execCommand("copy");
      zone.remove();
    }
    setCopie(true);
    setTimeout(() => setCopie(false), 1800);
  }
  return (
    <button type="button" onClick={copier} title={titre} className={principal ? "bouton-principal" : undefined} style={copie ? { background: "#E6F0E3", borderColor: "#6E8D66" } : undefined}>
      {copie ? "✓ Copié" : libelle}
    </button>
  );
}
