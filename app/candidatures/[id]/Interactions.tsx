"use client";
import { useRef } from "react";
import { changerStatut, changerPhoto, supprimerCandidature } from "../actions";
import { STATUTS } from "@/lib/format";

export function BoutonsStatut({ id, statut }: { id: string; statut: string }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {Object.entries(STATUTS).map(([k, s]) => (
        <button key={k} onClick={() => changerStatut(id, k)} style={{ background: k === statut ? s.fond : "white", borderColor: k === statut ? s.bord : undefined, color: k === statut ? s.couleur : undefined, fontWeight: k === statut ? 700 : 400, borderWidth: k === statut ? 2 : 1 }}>
          {k === statut ? "● " : ""}{s.libelle}
        </button>
      ))}
    </div>
  );
}

// Photo du trombinoscope : remplacer par une image, ou la retirer
export function PhotoCandidat({ id, photo, initiales }: { id: string; photo: string | null; initiales: string }) {
  const ref = useRef<HTMLInputElement>(null);
  async function choisir(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = async () => {
      const c = document.createElement("canvas");
      c.width = 240;
      c.height = Math.round((240 * img.height) / img.width);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      await changerPhoto(id, c.toDataURL("image/jpeg", 0.8));
    };
    img.src = url;
  }
  return (
    <div style={{ width: 180 }}>
      <div style={{ width: 180, height: 220, background: "#F3F1EC", borderRadius: 10, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--color-ligne)" }}>
        {photo ? <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 56, fontWeight: 700, color: "#C9C3B6", fontFamily: "Georgia, serif" }}>{initiales}</span>}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 6, fontSize: 12 }}>
        <button onClick={() => ref.current?.click()} style={{ fontSize: 12 }}>Changer</button>
        {photo && <button onClick={() => changerPhoto(id, null)} style={{ fontSize: 12 }}>Retirer</button>}
        <input ref={ref} type="file" accept="image/*" onChange={choisir} style={{ display: "none" }} />
      </div>
    </div>
  );
}

export function BoutonSupprimer({ id }: { id: string }) {
  return (
    <button className="corbeille" title="Supprimer la candidature" onClick={() => { if (confirm("Supprimer définitivement cette candidature ?")) supprimerCandidature(id); }}>🗑 Supprimer</button>
  );
}
