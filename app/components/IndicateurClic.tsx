"use client";
import { useEffect } from "react";

// Affiche un petit rond qui tourne sur le bouton ou le lien cliqué, le temps que l'action se fasse
export default function IndicateurClic() {
  useEffect(() => {
    const actifs = new Map<HTMLElement, number>();
    const arreter = (el: HTMLElement) => {
      el.classList.remove("chargement");
      actifs.delete(el);
      if (actifs.size === 0) document.documentElement.classList.remove("occupe");
    };
    const demarrer = (el: HTMLElement) => {
      el.classList.add("chargement");
      document.documentElement.classList.add("occupe");
      actifs.set(el, Date.now());
      setTimeout(() => arreter(el), 15000);
    };

    const surEnvoi = (e: Event) => {
      const formulaire = e.target as HTMLFormElement;
      const bouton = ((e as SubmitEvent).submitter as HTMLElement | null) || formulaire.querySelector<HTMLElement>('button[type="submit"], button:not([type])');
      if (bouton) demarrer(bouton);
    };
    const surReinitialisation = (e: Event) => {
      (e.target as HTMLElement).querySelectorAll<HTMLElement>(".chargement").forEach(arreter);
    };
    const surClic = (e: MouseEvent) => {
      const lien = (e.target as HTMLElement).closest("a");
      if (!lien || e.ctrlKey || e.metaKey || e.shiftKey || lien.target === "_blank") return;
      const href = lien.getAttribute("href") || "";
      if (!href || href.startsWith("#") || href.startsWith("http") || href.startsWith("mailto:")) return;
      demarrer(lien);
    };
    // Dès que la page se met à jour (résultat de l'action, nouvelle page), on arrête les ronds
    const observateur = new MutationObserver(() => {
      const maintenant = Date.now();
      actifs.forEach((debut, el) => {
        if (maintenant - debut > 300) arreter(el);
      });
    });
    observateur.observe(document.body, { childList: true, subtree: true, characterData: true });

    document.addEventListener("submit", surEnvoi, true);
    document.addEventListener("reset", surReinitialisation, true);
    document.addEventListener("click", surClic, true);
    return () => {
      observateur.disconnect();
      document.removeEventListener("submit", surEnvoi, true);
      document.removeEventListener("reset", surReinitialisation, true);
      document.removeEventListener("click", surClic, true);
    };
  }, []);
  return null;
}