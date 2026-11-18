"use client";
import { useActionState } from "react";
import Image from "next/image";
import { connexion } from "./actions";

export default function ConnexionPage() {
  const [erreur, action, enCours] = useActionState(connexion, "");

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "linear-gradient(160deg, rgba(233,241,230,0.55) 0%, rgba(247,245,240,0.35) 50%, rgba(251,243,217,0.55) 100%)" }}>
      <form action={action} style={{ width: 320, background: "white", padding: 32, borderRadius: 16, boxShadow: "0 8px 30px rgba(0,0,0,0.08)", border: "1px solid var(--color-ligne)" }}>
        <Image src="/logo.jpg" alt="Ville de Cestas" width={180} height={180} unoptimized style={{ objectFit: "contain", display: "block", margin: "0 auto 20px" }} />
        <h1 style={{ marginBottom: 24, textAlign: "center", fontSize: 19, color: "var(--color-vert-fonce)", fontFamily: "Georgia, serif" }}>Recrutements — Connexion</h1>
        <input name="motDePasse" type="password" autoComplete="current-password" placeholder="Mot de passe" autoFocus style={{ display: "block", width: "100%", padding: 11, marginBottom: 12, border: "1px solid var(--color-ligne)", borderRadius: 8, boxSizing: "border-box", fontSize: 14 }} />
        {erreur && <p style={{ color: "#B23B3B", marginBottom: 12, fontSize: 13 }}>{erreur}</p>}
        <button type="submit" disabled={enCours} style={{ width: "100%", padding: 12, background: "var(--color-vert)", color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600 }}>
          {enCours ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
