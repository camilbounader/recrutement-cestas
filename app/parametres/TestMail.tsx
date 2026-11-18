"use client";
import { useState } from "react";
import { testerMail } from "./actions";

// Vérifie que les rappels automatiques (J-7) pourront partir
export default function TestMail() {
  const [resultat, setResultat] = useState("");
  return (
    <div className="carte" style={{ marginTop: 18, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <b style={{ fontSize: 14 }}>📧 Rappels par mail</b>
      <button onClick={async () => { setResultat("Envoi…"); setResultat(await testerMail()); }}>Envoyer un mail de test</button>
      <span style={{ fontSize: 13 }}>{resultat}</span>
    </div>
  );
}
