"use client";
import { useState, useRef, useEffect } from "react";
import { envoyerMessage, appliquerPropositions, viderConversation } from "./actions";

type Message = { id?: string; role: string; contenu: string; propositions?: string | null; appliquees?: boolean };

function resumeProposition(p: any): string {
  return p.libelle || p.type || "Action proposée";
}

export default function ChatBox({ messagesInitiaux }: { messagesInitiaux: { role: string; contenu: string }[] }) {
  const [messages, setMessages] = useState<Message[]>(messagesInitiaux);
  const [texte, setTexte] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [application, setApplication] = useState<number | null>(null);
  const [ecoute, setEcoute] = useState(false);
  const [fichier, setFichier] = useState<{ data: string; mimeType: string; nom: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const saisieRef = useRef<HTMLTextAreaElement>(null);
  // La conversation descend toute seule jusqu'au dernier message
  useEffect(() => {
    zoneRef.current?.scrollTo({ top: zoneRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, enCours]);
  // La zone de saisie s'agrandit avec le texte (jusqu'à environ 8 lignes)
  useEffect(() => {
    const el = saisieRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 180) + "px";
  }, [texte]);

  function toggleMicro() {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) { alert("Dictée vocale non disponible sur ce navigateur (utilisez Chrome)."); return; }
    if (ecoute) { setEcoute(false); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (e: any) => setTexte((prev) => (prev ? prev + " " : "") + e.results[0][0].transcript);
    recognition.onend = () => setEcoute(false);
    recognition.start();
    setEcoute(true);
  }

  function handleFichierChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      setFichier({ data: base64, mimeType: file.type, nom: file.name });
    };
    reader.readAsDataURL(file);
  }

  async function envoyer() {
    if (!texte.trim() && !fichier) return;
    const monMessage = texte || "(fichier joint)";
    const monFichier = fichier;
    setTexte("");
    setFichier(null);
    setMessages((prev) => [...prev, { role: "user", contenu: monMessage }]);
    setEnCours(true);
    try {
      const resultat = await envoyerMessage(monMessage, monFichier ? { data: monFichier.data, mimeType: monFichier.mimeType, nom: monFichier.nom } : undefined);
      setMessages((prev) => [...prev, { id: resultat.id, role: "assistant", contenu: resultat.texte, propositions: resultat.propositions }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: "assistant", contenu: "⚠ " + (err.message || "Une erreur est survenue, réessayez.") }]);
    }
    setEnCours(false);
  }

  async function valider(index: number) {
    const m = messages[index];
    if (!m.propositions || application !== null || m.appliquees) return;
    setApplication(index);
    try {
      const liste = JSON.parse(m.propositions);
      const resultat = await appliquerPropositions(liste, m.id);
      setMessages((prev) => [...prev.map((msg, i) => (i === index ? { ...msg, appliquees: true } : msg)), { role: "assistant", contenu: resultat.compteRendu }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: "assistant", contenu: "⚠ " + (err?.message || "Les actions n'ont pas pu être appliquées.") }]);
    }
    setApplication(null);
  }
  function annuler(index: number) {
    setMessages((prev) => prev.map((msg, i) => (i === index ? { ...msg, propositions: null } : msg)));
  }
  async function vider() {
    await viderConversation();
    setMessages([]);
  }  

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <button onClick={vider} style={{ fontSize: 12, color: "#B23B3B", background: "none", border: "none", cursor: "pointer" }}>🗑 Vider la conversation</button>
      </div>
      <div ref={zoneRef} style={{ background: "white", border: "1px solid var(--color-ligne)", borderRadius: 10, padding: 16, height: "calc(100vh - 260px)", minHeight: 420, overflowY: "auto", marginBottom: 12 }}>
        {messages.length === 0 && <p style={{ color: "#999", fontSize: 13 }}>Posez une question (« où en est le poste de jardinier ? », « rédige la convocation de Mme X pour mardi 10h », « combien de candidatures en 2025 ? »), dictez au micro, ou joignez un CV, une fiche de poste ou une photo : le document est lu puis n’est pas conservé.</p>}
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 10, textAlign: m.role === "user" ? "right" : "left" }}>
            <span style={{ display: "inline-block", padding: "8px 12px", borderRadius: 10, fontSize: 13, background: m.role === "user" ? "var(--color-vert)" : "#F0EEE7", color: m.role === "user" ? "white" : "var(--foreground)", maxWidth: "80%", whiteSpace: "pre-wrap" }}>
              {m.contenu}
            </span>
            {m.propositions && !m.appliquees && (
              <div style={{ marginTop: 6, textAlign: "left", background: "#F0EEE7", borderRadius: 8, padding: 10, maxWidth: "90%" }}>
                <div style={{ fontSize: 11, color: "#666", marginBottom: 6 }}>{JSON.parse(m.propositions).length} action(s) proposée(s) :</div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
                  {JSON.parse(m.propositions).map((p: any, pi: number) => (
                    <li key={pi} style={{ marginBottom: 5 }}>{p.libelle || resumeProposition(p)}</li>
                  ))}
                </ul>
                <button onClick={() => valider(i)} disabled={application !== null} className={application === i ? "chargement" : undefined} style={{ marginTop: 6, padding: "5px 12px", background: "var(--color-vert)", color: "white", border: "none", borderRadius: 6, fontSize: 12, marginRight: 6 }}>✓ Valider tout</button>
                <button onClick={() => annuler(i)} style={{ padding: "5px 12px", background: "#eee", border: "none", borderRadius: 6, fontSize: 12 }}>Ignorer</button>
              </div>
            )}
            {m.appliquees && <div style={{ fontSize: 11, color: "var(--color-vert)", marginTop: 4 }}>✓ Appliqué</div>}
          </div>
        ))}
        {enCours && <p style={{ color: "#999", fontSize: 13 }}>…</p>}
      </div>

      {fichier && (
        <div style={{ marginBottom: 8, fontSize: 12, background: "#F0EEE7", padding: "6px 10px", borderRadius: 6, display: "flex", alignItems: "center", gap: 8 }}>
          📎 {fichier.nom}
          <button onClick={() => setFichier(null)} style={{ marginLeft: "auto", fontSize: 11 }}>✕</button>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <button onClick={toggleMicro} style={{ padding: "10px 12px", background: ecoute ? "#B23B3B" : "white", color: ecoute ? "white" : "var(--foreground)", border: "1px solid var(--color-ligne)", borderRadius: 8 }}>🎤</button>
        <button onClick={() => fileInputRef.current?.click()} style={{ padding: "10px 12px", background: "white", border: "1px solid var(--color-ligne)", borderRadius: 8 }}>📎</button>
        <input ref={fileInputRef} type="file" accept="image/*,application/pdf,.csv,.txt" onChange={handleFichierChange} style={{ display: "none" }} />
        <textarea
          ref={saisieRef}
          rows={1}
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              envoyer();
            }
          }}
          placeholder="Votre question… (Maj+Entrée pour aller à la ligne)"
          style={{ flex: 1, padding: 10, border: "1px solid var(--color-ligne)", borderRadius: 8, resize: "none", fontFamily: "inherit", fontSize: 14, lineHeight: 1.4, maxHeight: 180, overflowY: "auto" }}
        />
        <button onClick={envoyer} disabled={enCours} style={{ padding: "10px 18px", background: "var(--color-vert)", color: "white", border: "none", borderRadius: 8 }}>Envoyer</button>
      </div>
    </div>
  );
}