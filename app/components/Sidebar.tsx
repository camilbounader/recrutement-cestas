import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deconnexion } from "../connexion/actions";

type LienNav = { href: string; label: string; icone: string; groupe?: string };

// Menu défini une seule fois pour toutes les pages, regroupé par thème
const LIENS: LienNav[] = [
  { href: "/", label: "Tableau de bord", icone: "🏠" },
  { href: "/postes", label: "Postes & candidatures", icone: "📂", groupe: "Recrutements" },
  { href: "/spontanees", label: "Candidatures spontanées", icone: "📥", groupe: "Recrutements" },
  { href: "/statistiques", label: "Statistiques & rapport", icone: "📈", groupe: "Recrutements" },
  { href: "/assistant", label: "Assistant IA", icone: "💬", groupe: "Recrutements" },
  { href: "/parametres", label: "Paramètres de paie", icone: "💶", groupe: "Outils" },
  { href: "/parametres/grilles", label: "Grilles indiciaires", icone: "📊", groupe: "Outils" },
  { href: "/parametres/modeles", label: "Modèles de mails", icone: "✉️", groupe: "Outils" },
  { href: "/parametres/mot-de-passe", label: "Mot de passe", icone: "🔑", groupe: "Outils" },
  { href: "/import", label: "Reprise de l'ancien Excel", icone: "📤", groupe: "Outils" },
  { href: "/rgpd", label: "RGPD", icone: "🔒", groupe: "Outils" },
];

export default async function Sidebar() {
  const pastilles: Record<string, number> = {};
  try {
    const dans7Jours = new Date(Date.now() + 7 * 86400000);
    pastilles["/postes"] = await prisma.poste.count({ where: { etat: "ouvert", dateCloture: { lte: dans7Jours } } });
  } catch {}

  return (
    <div className="pas-imprimer" style={{ width: 250, flexShrink: 0, height: "100vh", position: "sticky", top: 0, background: "var(--color-vert-fonce)", color: "white", padding: "24px 16px", display: "flex", flexDirection: "column", overflowY: "auto" }}>
      <div style={{ background: "white", borderRadius: 12, padding: 10, marginBottom: 20, display: "flex", justifyContent: "center" }}>
        <Image src="/logo.jpg" alt="Ville de Cestas" width={100} height={80} style={{ objectFit: "contain" }} unoptimized />
      </div>

      <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 20, textAlign: "center", lineHeight: 1.4 }}>
        RECRUTEMENTS<br />VILLE DE CESTAS
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        {LIENS.map((l, i) => (
          <div key={l.href}>
            {l.groupe && l.groupe !== LIENS[i - 1]?.groupe && (
              <div style={{ fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", opacity: 0.6, margin: "12px 12px 2px", borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 10 }}>{l.groupe}</div>
            )}
            <Link href={l.href} style={{ padding: "8px 12px", borderRadius: 8, color: "white", textDecoration: "none", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <span>{l.icone}</span> {l.label}
              {(pastilles[l.href] || 0) > 0 && <span title="Offre(s) qui se terminent dans moins de 7 jours" style={{ marginLeft: "auto", background: "#E0533D", color: "white", borderRadius: 10, fontSize: 11, fontWeight: 700, padding: "1px 7px", lineHeight: "16px" }}>{pastilles[l.href]}</span>}
            </Link>
          </div>
        ))}
      </nav>

      <form action={deconnexion} style={{ borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 16, marginTop: 16 }}>
        <button type="submit" style={{ background: "rgba(255,255,255,0.12)", color: "white", border: "1px solid rgba(255,255,255,0.3)", fontSize: 12 }}>Se déconnecter</button>
      </form>
    </div>
  );
}
