"use client";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NOMBRE_FONDS = 11; // nombre de photos fond1.jpg, fond2.jpg… dans public/fonds

// Photo de fond en filigrane : tirée au hasard à chaque connexion, puis gardée sur toutes les pages
export default function FondEcran() {
  const chemin = usePathname();
  const connexion = chemin === "/connexion";
  const [numero, setNumero] = useState<number | null>(null);

  useEffect(() => {
    let n = NaN;
    try {
      if (!connexion) n = parseInt(localStorage.getItem("fondEcran") || "", 10);
    } catch {}
    if (!(n >= 1 && n <= NOMBRE_FONDS)) {
      n = 1 + Math.floor(Math.random() * NOMBRE_FONDS);
      try { localStorage.setItem("fondEcran", String(n)); } catch {}
    }
    setNumero(n);
  }, [connexion]);

  if (!numero) return null;
  return (
    <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none" }}>
      <Image src={`/fonds/fond${numero}.jpg`} alt="" fill sizes="100vw" quality={60} priority={connexion} style={{ objectFit: "cover", opacity: connexion ? 0.35 : 0.12 }} />
    </div>
  );
}