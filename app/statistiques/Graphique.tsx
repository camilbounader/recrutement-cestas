"use client";
import { useState } from "react";
import type { Agregat, TypeGraphique } from "@/lib/stats";

const ENCRE = "#2A2A28";
const ENCRE_2 = "#6B6A64";
const GRILLE = "#ECE9E1";
const L = 760;

function maxRond(v: number): number {
  if (v <= 5) return 5;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}
const court = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const fmt = (n: number) => n.toLocaleString("fr-FR");

type Bulle = { x: number; y: number; lignes: string[] } | null;

// Rendu SVG des graphiques (histogramme, barres, camembert, courbe) avec infobulle au survol
export default function Graphique({ donnees, type, libelleCategorie }: { donnees: Agregat; type: TypeGraphique; libelleCategorie: string }) {
  const [bulle, setBulle] = useState<Bulle>(null);
  const [voirTableau, setVoirTableau] = useState(false);
  const { categories, series } = donnees;
  const plusieurs = series.length > 1;
  const totaux = categories.map((_, i) => series.reduce((s, x) => s + x.valeurs[i], 0));

  const survol = (e: React.MouseEvent, lignes: string[]) => {
    const r = (e.currentTarget as SVGElement).ownerSVGElement!.parentElement!.getBoundingClientRect();
    setBulle({ x: e.clientX - r.left, y: e.clientY - r.top, lignes });
  };
  const details = (i: number) => [
    `${libelleCategorie} : ${categories[i]}`,
    ...(plusieurs ? series.filter((s) => s.valeurs[i] > 0).map((s) => `${s.nom} : ${fmt(s.valeurs[i])}`) : []),
    `Total : ${fmt(totaux[i])}`,
  ];

  if (categories.length === 0) return <p style={{ color: "#999", fontSize: 13 }}>Aucune donnée avec ces filtres.</p>;

  let svg: React.ReactNode = null;

  if (type === "histogramme") {
    const H = 340, g = 44, b = 70, haut = 24;
    const max = maxRond(Math.max(...totaux));
    const largeur = (L - g - 10) / categories.length;
    const barre = Math.min(48, largeur * 0.7);
    const y = (v: number) => haut + (H - haut - b) * (1 - v / max);
    const incliner = categories.length > 6 || categories.some((c) => c.length > 10);
    svg = (
      <svg viewBox={`0 0 ${L} ${H}`} width="100%" role="img">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line x1={g} x2={L - 10} y1={y(max * t)} y2={y(max * t)} stroke={GRILLE} />
            <text x={g - 6} y={y(max * t) + 4} fontSize={11} textAnchor="end" fill={ENCRE_2}>{fmt(max * t)}</text>
          </g>
        ))}
        {categories.map((c, i) => {
          const x = g + i * largeur + (largeur - barre) / 2;
          let cumul = 0;
          return (
            <g key={c} onMouseMove={(e) => survol(e, details(i))} onMouseLeave={() => setBulle(null)}>
              <rect x={g + i * largeur} y={haut} width={largeur} height={H - haut - b} fill="transparent" />
              {series.map((s, si) => {
                const v = s.valeurs[i];
                if (!v) return null;
                const y1 = y(cumul + v), y0 = y(cumul);
                cumul += v;
                const dernier = series.slice(si + 1).every((x2) => !x2.valeurs[i]);
                const h = Math.max(1, y0 - y1 - (plusieurs && !dernier ? 2 : 0));
                return <rect key={s.nom} x={x} y={y1} width={barre} height={h} rx={dernier ? 4 : 0} fill={s.couleur} />;
              })}
              {categories.length <= 15 && <text x={x + barre / 2} y={y(totaux[i]) - 6} fontSize={11} textAnchor="middle" fill={ENCRE}>{fmt(totaux[i])}</text>}
              <text x={x + barre / 2} y={H - b + 16} fontSize={11} fill={ENCRE_2} textAnchor={incliner ? "end" : "middle"} transform={incliner ? `rotate(-35 ${x + barre / 2} ${H - b + 16})` : undefined}>{court(c, incliner ? 18 : 14)}</text>
            </g>
          );
        })}
        <line x1={g} x2={L - 10} y1={y(0)} y2={y(0)} stroke="#C9C3B6" />
      </svg>
    );
  }

  if (type === "barres") {
    const ligne = 28, gauche = 250, haut = 6;
    const H = haut + categories.length * ligne + 10;
    const max = maxRond(Math.max(...totaux));
    const x = (v: number) => gauche + ((L - gauche - 60) * v) / max;
    svg = (
      <svg viewBox={`0 0 ${L} ${H}`} width="100%" role="img">
        {categories.map((c, i) => {
          const yy = haut + i * ligne;
          let cumul = 0;
          return (
            <g key={c} onMouseMove={(e) => survol(e, details(i))} onMouseLeave={() => setBulle(null)}>
              <rect x={0} y={yy} width={L} height={ligne} fill="transparent" />
              <text x={gauche - 8} y={yy + ligne / 2 + 4} fontSize={12} textAnchor="end" fill={ENCRE}>{court(c, 30)}</text>
              {series.map((s, si) => {
                const v = s.valeurs[i];
                if (!v) return null;
                const x0 = x(cumul), x1 = x(cumul + v);
                cumul += v;
                const dernier = series.slice(si + 1).every((x2) => !x2.valeurs[i]);
                return <rect key={s.nom} x={x0} y={yy + 5} width={Math.max(1, x1 - x0 - (plusieurs && !dernier ? 2 : 0))} height={ligne - 10} rx={dernier ? 4 : 0} fill={s.couleur} />;
              })}
              <text x={x(totaux[i]) + 6} y={yy + ligne / 2 + 4} fontSize={11} fill={ENCRE}>{fmt(totaux[i])}</text>
            </g>
          );
        })}
        <line x1={gauche} x2={gauche} y1={0} y2={H - 6} stroke="#C9C3B6" />
      </svg>
    );
  }

  if (type === "camembert") {
    const total = totaux.reduce((a, b) => a + b, 0) || 1;
    const R = 120, r = 70, cx = 150, cy = 140;
    const couleurs = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"];
    let angle = -Math.PI / 2;
    const arcs = categories.map((c, i) => {
      const part = totaux[i] / total;
      const a0 = angle, a1 = angle + part * Math.PI * 2;
      angle = a1;
      const grand = a1 - a0 > Math.PI ? 1 : 0;
      const p = (a: number, rr: number) => `${cx + rr * Math.cos(a)} ${cy + rr * Math.sin(a)}`;
      const d = part >= 0.9999
        ? `M ${cx - R} ${cy} A ${R} ${R} 0 1 1 ${cx + R} ${cy} A ${R} ${R} 0 1 1 ${cx - R} ${cy} M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`
        : `M ${p(a0, R)} A ${R} ${R} 0 ${grand} 1 ${p(a1, R)} L ${p(a1, r)} A ${r} ${r} 0 ${grand} 0 ${p(a0, r)} Z`;
      return { c, d, couleur: c === "Autres" ? "#B8B4AA" : c === "Non renseigné" ? "#D8D4CA" : couleurs[i % couleurs.length], v: totaux[i], pct: Math.round(part * 1000) / 10 };
    });
    svg = (
      <svg viewBox={`0 0 ${L} 290`} width="100%" role="img">
        {arcs.map((a, i) => (
          <path key={a.c} d={a.d} fill={a.couleur} stroke="white" strokeWidth={2} fillRule="evenodd" onMouseMove={(e) => survol(e, [`${a.c} : ${fmt(a.v)} (${a.pct} %)`])} onMouseLeave={() => setBulle(null)} />
        ))}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize={24} fontWeight={700} fill={ENCRE}>{fmt(total)}</text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize={11} fill={ENCRE_2}>au total</text>
        {arcs.map((a, i) => (
          <g key={a.c} transform={`translate(320 ${40 + i * 32})`}>
            <rect width={14} height={14} rx={3} fill={a.couleur} />
            <text x={22} y={12} fontSize={13} fill={ENCRE}>{court(a.c, 36)}</text>
            <text x={420} y={12} fontSize={13} textAnchor="end" fill={ENCRE}><tspan fontWeight={700}>{fmt(a.v)}</tspan> · {a.pct} %</text>
          </g>
        ))}
      </svg>
    );
  }

  if (type === "courbe") {
    const H = 320, g = 44, b = 56, haut = 20;
    const max = maxRond(Math.max(...series.flatMap((s) => s.valeurs)));
    const pas = categories.length > 1 ? (L - g - 30) / (categories.length - 1) : 0;
    const xx = (i: number) => g + 15 + i * pas;
    const y = (v: number) => haut + (H - haut - b) * (1 - v / max);
    svg = (
      <svg viewBox={`0 0 ${L} ${H}`} width="100%" role="img">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line x1={g} x2={L - 10} y1={y(max * t)} y2={y(max * t)} stroke={GRILLE} />
            <text x={g - 6} y={y(max * t) + 4} fontSize={11} textAnchor="end" fill={ENCRE_2}>{fmt(max * t)}</text>
          </g>
        ))}
        {series.map((s) => (
          <polyline key={s.nom} fill="none" stroke={s.couleur} strokeWidth={2} points={s.valeurs.map((v, i) => `${xx(i)},${y(v)}`).join(" ")} />
        ))}
        {categories.map((c, i) => (
          <g key={c} onMouseMove={(e) => survol(e, details(i))} onMouseLeave={() => setBulle(null)}>
            <rect x={xx(i) - Math.max(pas, 20) / 2} y={haut} width={Math.max(pas, 20)} height={H - haut - b} fill="transparent" />
            {series.map((s) => <circle key={s.nom} cx={xx(i)} cy={y(s.valeurs[i])} r={4} fill={s.couleur} stroke="white" strokeWidth={2} />)}
            {(categories.length <= 14 || i % Math.ceil(categories.length / 14) === 0) && <text x={xx(i)} y={H - b + 18} fontSize={11} textAnchor="middle" fill={ENCRE_2}>{court(c, 10)}</text>}
          </g>
        ))}
        <line x1={g} x2={L - 10} y1={y(0)} y2={y(0)} stroke="#C9C3B6" />
      </svg>
    );
  }

  const tableau = (
    <table className="tableau" style={{ marginTop: 8 }}>
      <thead><tr><th>{libelleCategorie}</th>{series.map((s) => <th key={s.nom} style={{ textAlign: "right" }}>{plusieurs ? s.nom : "Nombre"}</th>)}{plusieurs && <th style={{ textAlign: "right" }}>Total</th>}</tr></thead>
      <tbody>
        {categories.map((c, i) => (
          <tr key={c}><td>{c}</td>{series.map((s) => <td key={s.nom} style={{ textAlign: "right" }}>{fmt(s.valeurs[i])}</td>)}{plusieurs && <td style={{ textAlign: "right", fontWeight: 600 }}>{fmt(totaux[i])}</td>}</tr>
        ))}
      </tbody>
    </table>
  );

  if (type === "tableau") return tableau;

  return (
    <div style={{ position: "relative" }}>
      {plusieurs && type !== "camembert" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", fontSize: 12, marginBottom: 6, color: ENCRE }}>
          {series.map((s) => <span key={s.nom} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: s.couleur, display: "inline-block" }} />{s.nom}</span>)}
        </div>
      )}
      {svg}
      {bulle && (
        <div style={{ position: "absolute", left: Math.min(bulle.x + 12, 520), top: bulle.y + 12, background: "white", border: "1px solid var(--color-ligne)", borderRadius: 6, boxShadow: "0 4px 14px rgba(0,0,0,0.12)", padding: "6px 10px", fontSize: 12, pointerEvents: "none", whiteSpace: "nowrap", zIndex: 5 }}>
          {bulle.lignes.map((l, i) => <div key={i} style={{ fontWeight: i === bulle.lignes.length - 1 ? 700 : 400 }}>{l}</div>)}
        </div>
      )}
      <button className="pas-imprimer" onClick={() => setVoirTableau((v) => !v)} style={{ fontSize: 11, marginTop: 4, background: "none", border: "none", color: ENCRE_2 }}>{voirTableau ? "Masquer le tableau" : "Voir les chiffres en tableau"}</button>
      {voirTableau && tableau}
    </div>
  );
}
