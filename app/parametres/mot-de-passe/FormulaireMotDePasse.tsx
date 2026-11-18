"use client";
import { useActionState } from "react";
import { changerMotDePasse } from "../../connexion/actions";

export default function FormulaireMotDePasse() {
  const [message, action, enCours] = useActionState(changerMotDePasse, "");
  return (
    <div style={{ maxWidth: 460 }}>
      <h1 className="titre-page">Mot de passe de l'application</h1>
      <form action={action} className="carte" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label className="champ">Mot de passe actuel<input name="actuel" type="password" autoComplete="current-password" required /></label>
        <label className="champ">Nouveau mot de passe (10 caractères minimum)<input name="nouveau" type="password" autoComplete="new-password" minLength={10} required /></label>
        <label className="champ">Nouveau mot de passe, encore une fois<input name="confirmation" type="password" autoComplete="new-password" minLength={10} required /></label>
        <div><button type="submit" disabled={enCours} className="bouton-principal">Changer le mot de passe</button></div>
        {message && <p style={{ margin: 0, fontSize: 13 }}>{message}</p>}
      </form>
      <p style={{ fontSize: 12, color: "#888" }}>En cas d'oubli, la personne qui gère l'hébergement peut remettre le mot de passe de départ (voir le README).</p>
    </div>
  );
}
