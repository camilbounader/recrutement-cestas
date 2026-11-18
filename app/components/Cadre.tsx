import Sidebar from "./Sidebar";
import { exigerConnexionPage } from "@/lib/garde";

// Mise en page commune : menu à gauche, contenu à droite (et vérification de la connexion)
export default async function Cadre({ children }: { children: React.ReactNode }) {
  await exigerConnexionPage();
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: 32, maxWidth: 1400, minWidth: 0 }}>{children}</main>
    </div>
  );
}
