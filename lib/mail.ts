import nodemailer from "nodemailer";

// Envoi des rappels automatiques (même fonctionnement que l'appli Gestion EPI).
// Variables Vercel : SMTP_USER, SMTP_PASS, et SMTP_HOST / SMTP_PORT pour le serveur de la mairie (sinon Gmail).
// Destinataires : RAPPEL_EMAILS (adresses séparées par des virgules).

function creerTransport(user: string, pass: string) {
  if (process.env.SMTP_HOST) {
    const port = Number(process.env.SMTP_PORT || 465);
    return nodemailer.createTransport({ host: process.env.SMTP_HOST, port, secure: port === 465, auth: { user, pass, method: "PLAIN" } });
  }
  return nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
}

export function destinatairesRappels(): string[] {
  return (process.env.RAPPEL_EMAILS || "").split(",").map((s) => s.trim()).filter(Boolean);
}

export async function envoyerMail(sujet: string, texte: string): Promise<string> {
  const { SMTP_USER, SMTP_PASS } = process.env;
  const destinataires = destinatairesRappels();
  if (!SMTP_USER || !SMTP_PASS) return "❌ SMTP_USER ou SMTP_PASS absent sur Vercel.";
  if (destinataires.length === 0) return "❌ RAPPEL_EMAILS absent sur Vercel (adresse qui reçoit les rappels).";
  try {
    const transport = creerTransport(SMTP_USER, SMTP_PASS.replace(/\s/g, ""));
    await transport.sendMail({ from: `"Recrutements Cestas" <${SMTP_USER}>`, to: destinataires.join(", "), subject: sujet, text: texte });
    return `✅ Mail envoyé à ${destinataires.join(", ")}.`;
  } catch (e: any) {
    return "❌ Envoi refusé : " + (e?.message || String(e));
  }
}
