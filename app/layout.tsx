import "./globals.css";
import IndicateurClic from "./components/IndicateurClic";
import FondEcran from "./components/FondEcran";

// Toujours les données à jour (pas de pages figées au moment de la mise en ligne)
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Recrutements",
  description: "Suivi des recrutements - Ville de Cestas",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <IndicateurClic />
        <FondEcran />
      </body>
    </html>
  );
}
