import { prisma } from "@/lib/prisma";
import Cadre from "../components/Cadre";
import ChatBox from "./ChatBox";
export const maxDuration = 60;

export default async function Assistant() {
  const messages = await prisma.messageAssistant.findMany({ orderBy: { date: "asc" } });
  return (
    <Cadre>
      <div style={{ maxWidth: 820 }}>
        <h1 className="titre-page">Assistant IA</h1>
        <p style={{ fontSize: 12, color: "#888", marginTop: -10 }}>L'assistant lit les postes et candidatures et propose des actions que vous validez d'un clic. La conversation est effacée automatiquement au bout de 90 jours.</p>
        <ChatBox messagesInitiaux={messages.map((m) => ({ id: m.id, role: m.role, contenu: m.contenu, propositions: m.propositions, appliquees: m.appliquees }))} />
      </div>
    </Cadre>
  );
}
