import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { envoyerMail } from "@/lib/mail";
import { dateFr } from "@/lib/format";

// Lancé chaque matin par Vercel (vercel.json) : prévient par mail 7 jours avant la clôture d'une offre
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }
  const dans7Jours = new Date(Date.now() + 7 * 86400000);
  const postes = await prisma.poste.findMany({
    where: { etat: "ouvert", rappelEnvoyeLe: null, dateCloture: { not: null, lte: dans7Jours, gte: new Date(Date.now() - 86400000) } },
    include: { _count: { select: { candidatures: true } } },
    orderBy: { dateCloture: "asc" },
  });
  if (postes.length === 0) return NextResponse.json({ envoye: false, message: "Aucune offre ne se termine dans 7 jours" });

  const lien = process.env.APP_URL || "";
  const lignes = postes.map((p) => `• ${p.intitule}${p.numeroOffre ? ` (${p.numeroOffre})` : ""} : clôture le ${dateFr(p.dateCloture)} — ${p._count.candidatures} candidature(s) à ce jour${lien ? `\n  ${lien}/postes/${p.id}` : ""}`).join("\n");
  const resultat = await envoyerMail(
    postes.length > 1 ? `Rappel : ${postes.length} offres se terminent bientôt` : `Rappel : l'offre « ${postes[0].intitule} » se termine bientôt`,
    `Bonjour,\n\nCes offres d'emploi se terminent dans 7 jours ou moins :\n\n${lignes}\n\nPensez à préparer la notation AssessFirst et le choix des candidats retenus.\n\nApplication Recrutements — Ville de Cestas`
  );
  if (resultat.startsWith("✅")) await prisma.poste.updateMany({ where: { id: { in: postes.map((p) => p.id) } }, data: { rappelEnvoyeLe: new Date() } });
  return NextResponse.json({ envoye: resultat.startsWith("✅"), message: resultat });
}
