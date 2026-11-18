import Sidebar from "./Sidebar";

// Mise en page commune : menu à gauche, contenu à droite
export default function Cadre({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: 32, maxWidth: 1400, minWidth: 0 }}>{children}</main>
    </div>
  );
}
