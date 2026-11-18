"use server";
import { GoogleGenAI, Type } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { exigerConnexion } from "@/lib/garde";
import { revalidatePath } from "next/cache";
import { MODELE } from "@/lib/ia";
import { alertes } from "@/lib/alertes";
import { remplir } from "@/lib/modeles";
import { lireParametres } from "@/lib/parametres";
import { STATUTS, ETATS_POSTE, ajouterMois, dateFr } from "@/lib/format";

const MESSAGES_MEMOIRE = 40;
const CONSERVATION_JOURS = 90; // la conversation contient des données personnelles : effacée au bout de 90 jours

// ---------------------------------------------------------------------------
// Outils de lecture proposés à l'IA
// ---------------------------------------------------------------------------
const OUTILS: any[] = [
  { name: "lister_postes", description: "Liste les postes (offres) : id, intitulé, année, service, état, dates, nombre de candidatures, retenues, recrutés.", parameters: { type: Type.OBJECT, properties: { annee: { type: Type.NUMBER, description: "Année (optionnel)" }, etat: { type: Type.STRING, description: "ouvert, pourvu, infructueux, annule, archive (optionnel)" }, motCle: { type: Type.STRING, description: "Mot-clé dans l'intitulé ou le service (optionnel)" } } } },
  { name: "lire_poste", description: "Détail d'un poste (fiche de poste, grade, dates) et la liste de ses candidatures (id, nom, statut, score IA, note AssessFirst, ville).", parameters: { type: Type.OBJECT, properties: { posteId: { type: Type.STRING } }, required: ["posteId"] } },
  { name: "chercher_candidatures", description: "Cherche des candidatures par nom, prénom, ville, compétences, et/ou filtre (année, statut, poste, spontanées). 50 résultats maximum.", parameters: { type: Type.OBJECT, properties: { motCle: { type: Type.STRING }, annee: { type: Type.NUMBER }, statut: { type: Type.STRING, description: Object.keys(STATUTS).join(", ") }, posteId: { type: Type.STRING }, spontanees: { type: Type.BOOLEAN, description: "true = seulement les candidatures spontanées" } } } },
  { name: "lire_candidature", description: "Fiche complète d'une candidature : coordonnées, profil lu dans le CV, expériences, score et points forts, statut, observations, dernière simulation de paie.", parameters: { type: Type.OBJECT, properties: { candidatureId: { type: Type.STRING } }, required: ["candidatureId"] } },
  { name: "statistiques", description: "Chiffres d'une année (ou toutes) : nombre de postes, de candidatures, spontanées, par statut, par sexe, par poste.", parameters: { type: Type.OBJECT, properties: { annee: { type: Type.NUMBER } } } },
  { name: "consulter_alertes", description: "Tout ce qui est à faire : offres qui se terminent dans 7 jours ou clôturées à traiter, candidatures à anonymiser (RGPD), grilles et paramètres de paie à vérifier.", parameters: { type: Type.OBJECT, properties: {} } },
  { name: "texte_modele", description: "Renvoie un modèle de mail ou de courrier déjà rempli pour une candidature (codes : accuse_reception, convocation_date, convocation_dispo, proposition_poste, reponse_spontanee, courrier_reprise, ou l'id d'un modèle).", parameters: { type: Type.OBJECT, properties: { candidatureId: { type: Type.STRING }, modele: { type: Type.STRING } }, required: ["candidatureId", "modele"] } },
];

async function executerOutil(nom: string, a: any) {
  switch (nom) {
    case "lister_postes": {
      const postes = await prisma.poste.findMany({
        where: {
          ...(a?.annee ? { annee: Number(a.annee) } : {}),
          ...(a?.etat ? { etat: a.etat } : {}),
          ...(a?.motCle ? { OR: [{ intitule: { contains: a.motCle, mode: "insensitive" as const } }, { service: { contains: a.motCle, mode: "insensitive" as const } }] } : {}),
        },
        include: { candidatures: { select: { statut: true, nom: true, prenom: true } } },
        orderBy: [{ annee: "desc" }, { dateOuverture: "desc" }],
        take: 80,
      });
      return { postes: postes.map((p) => ({ id: p.id, intitule: p.intitule, annee: p.annee, service: p.service, etat: ETATS_POSTE[p.etat]?.libelle || p.etat, publication: dateFr(p.dateOuverture), cloture: dateFr(p.dateCloture), candidatures: p.candidatures.length, retenues: p.candidatures.filter((c) => c.statut === "retenue").length, recrutes: p.candidatures.filter((c) => c.statut === "recrutee").map((c) => `${c.prenom || ""} ${c.nom || ""}`.trim()) })) };
    }
    case "lire_poste": {
      const p = await prisma.poste.findUnique({ where: { id: a.posteId }, include: { grade: true, candidatures: { select: { id: true, nom: true, prenom: true, statut: true, score: true, noteAssessfirst: true, ville: true, email: true, origine: true } } } });
      if (!p) return { erreur: "Poste introuvable" };
      return { ...p, grade: p.grade?.grade || null, candidatures: p.candidatures.map((c) => ({ ...c, statut: STATUTS[c.statut]?.libelle || c.statut })) };
    }
    case "chercher_candidatures": {
      const mc = (a?.motCle || "").trim();
      const liste = await prisma.candidature.findMany({
        where: {
          ...(a?.annee ? { annee: Number(a.annee) } : {}),
          ...(a?.statut ? { statut: a.statut } : {}),
          ...(a?.posteId ? { posteId: a.posteId } : {}),
          ...(a?.spontanees ? { posteId: null } : {}),
          ...(mc ? { OR: ["nom", "prenom", "ville", "competences", "resume", "email"].map((ch) => ({ [ch]: { contains: mc, mode: "insensitive" } }) as any) } : {}),
        },
        select: { id: true, nom: true, prenom: true, ville: true, statut: true, score: true, noteAssessfirst: true, annee: true, poste: { select: { id: true, intitule: true } } },
        orderBy: { dateReception: "desc" },
        take: 50,
      });
      return { candidatures: liste.map((c) => ({ ...c, statut: STATUTS[c.statut]?.libelle || c.statut, poste: c.poste?.intitule || "Spontanée", posteId: c.poste?.id || null })) };
    }
    case "lire_candidature": {
      const c = await prisma.candidature.findUnique({ where: { id: a.candidatureId }, include: { poste: { select: { id: true, intitule: true } } } });
      if (!c) return { erreur: "Candidature introuvable" };
      const { photo: _p, ...reste } = c;
      return { ...reste, aUnePhoto: !!c.photo, statut: STATUTS[c.statut]?.libelle || c.statut };
    }
    case "statistiques": {
      const where = a?.annee ? { annee: Number(a.annee) } : {};
      const [postes, cand, parStatut, parSexe] = await Promise.all([
        prisma.poste.count({ where }),
        prisma.candidature.count({ where }),
        prisma.candidature.groupBy({ by: ["statut"], where, _count: true }),
        prisma.candidature.groupBy({ by: ["sexe"], where, _count: true }),
      ]);
      const spontanees = await prisma.candidature.count({ where: { ...where, posteId: null } });
      return { postes, candidatures: cand, spontanees, parStatut: parStatut.map((s) => ({ statut: STATUTS[s.statut]?.libelle || s.statut, nombre: s._count })), parSexe: parSexe.map((s) => ({ sexe: s.sexe || "non renseigné", nombre: s._count })) };
    }
    case "consulter_alertes":
      return { alertes: await alertes() };
    case "texte_modele": {
      const c = await prisma.candidature.findUnique({ where: { id: a.candidatureId }, include: { poste: { include: { grade: true } } } });
      const m = await prisma.modeleTexte.findFirst({ where: { OR: [{ code: a.modele }, { id: a.modele }] } });
      if (!c || !m) return { erreur: "Candidature ou modèle introuvable" };
      const p = await lireParametres();
      const d = { candidat: c, poste: c.poste, signature: p.signature };
      return { objet: remplir(m.objet || "", d), texte: remplir(m.corps, d), destinataire: c.email };
    }
  }
  return { erreur: "Outil inconnu" };
}

// ---------------------------------------------------------------------------
// Actions que l'IA peut PROPOSER (appliquées seulement après clic sur « Valider »)
// ---------------------------------------------------------------------------
const ACTIONS = `- {"type":"changer_statut","candidatureId":"…","statut":"recue|retenue|recrutee|non_retenue|desistement"}
- {"type":"noter_assessfirst","candidatureId":"…","note":0 à 5}
- {"type":"ajouter_observation","candidatureId":"…","texte":"…"}
- {"type":"modifier_candidature","candidatureId":"…","nom":"…","prenom":"…","sexe":"H|F","email":"…","telephone":"…","ville":"…","departement":"…","dateEntretien":"…"} (seulement les champs à changer)
- {"type":"creer_candidature","posteId":"… ou null pour une spontanée","nom":"…","prenom":"…","sexe":"H|F","email":"…","telephone":"…","ville":"…","departement":"…","observations":"…"}
- {"type":"creer_poste","intitule":"…","annee":2026,"service":"…","filiere":"…","categorie":"A|B|C","dateOuverture":"AAAA-MM-JJ","numeroOffre":"…","ficheDePoste":"…"}
- {"type":"changer_etat_poste","posteId":"…","etat":"ouvert|pourvu|infructueux|annule"}
- {"type":"modifier_poste","posteId":"…","dateCloture":"AAAA-MM-JJ","numeroOffre":"…","service":"…","observations":"…"} (seulement les champs à changer)`;

function consignes() {
  return `Tu es l'assistant de l'application Recrutements de la Ville de Cestas (fonction publique territoriale). Tu aides la gestionnaire RH.
Date du jour : ${new Date().toLocaleDateString("fr-FR")}.

FONCTIONNEMENT DE L'APPLICATION :
- Les postes sont classés par année. Une offre Emploi Territorial dure 1 mois (clôture = publication + 1 mois). Un rappel part 7 jours avant.
- À réception d'un CV : accusé de réception + invitation AssessFirst (le candidat doit regarder ses spams). Après la clôture, elle et la RH notent sur AssessFirst (0 à 5) puis retiennent des candidats (statut « Retenue entretien »), convoqués avec une date imposée ou en demandant leurs disponibilités.
- Après les entretiens, un candidat est « Recrutée » : appel, puis mail avec la simulation de paie (page Simulation de la fiche) et la question « acceptez-vous le poste ? ». Premier poste dans le public = stagiaire, échelon 1, + courrier pour la reprise des services antérieurs (bulletins de paie sous 1 an).
- Les non retenus reçoivent leur réponse depuis AssessFirst. Les mails sont copiés dans Zimbra : tu peux rédiger un mail, mais tu ne l'envoies pas.
- Les candidatures spontanées forment un vivier (2 ans maximum, RGPD), comparé aux nouveaux postes.
- Le score de compatibilité est indicatif : ne recommande jamais d'écarter quelqu'un pour son âge, son sexe, son origine, sa situation familiale ou sa photo. La décision appartient toujours à la RH.

RÈGLES :
1. Utilise les outils pour lire les données avant de répondre ; n'invente aucun chiffre ni aucun nom.
2. Si un document est joint (CV, lettre, fiche de poste, tableau), lis-le directement.
3. Tu ne modifies JAMAIS rien toi-même : ne dis pas « c'est fait ». Propose les actions dans un bloc :
\`\`\`propositions
[{"type":"…","libelle":"phrase courte qui décrit l'action", …}]
\`\`\`
Elles seront appliquées quand l'utilisateur cliquera sur « Valider ». Utilise uniquement les ids lus avec les outils.
Actions possibles :
${ACTIONS}

Réponds en français, de façon claire et concise.`;
}

// ---------------------------------------------------------------------------
// Conversation
// ---------------------------------------------------------------------------
async function envoyerInterne(texte: string, fichier?: { data: string; mimeType: string; nom: string }) {
  const debut = Date.now();
  await prisma.messageAssistant.deleteMany({ where: { date: { lt: new Date(Date.now() - CONSERVATION_JOURS * 86400000) } } });
  const historique = await prisma.messageAssistant.findMany({ orderBy: { date: "desc" }, take: MESSAGES_MEMOIRE });
  let contents: any[] = [];
  for (const m of historique.reverse()) {
    const role = m.role === "user" ? "user" : "model";
    let contenu = m.contenu;
    if (m.propositions) contenu += `\n[Actions proposées${m.appliquees ? " — VALIDÉES et appliquées" : " — non validées"} : ${m.propositions}]`;
    const dernier = contents[contents.length - 1];
    if (dernier && dernier.role === role) dernier.parts.push({ text: contenu });
    else contents.push({ role, parts: [{ text: contenu }] });
  }
  if (contents.length > 0 && contents[0].role !== "user") contents.shift();

  // Le document joint est lu mais pas conservé : seul son nom reste dans l'historique
  await prisma.messageAssistant.create({ data: { role: "user", contenu: fichier ? `${texte} [document joint : ${fichier.nom}, non conservé]` : texte } });
  const parts: any[] = [{ text: texte }];
  if (fichier) parts.push({ inlineData: { mimeType: fichier.mimeType, data: fichier.data } });
  const dernier = contents[contents.length - 1];
  if (dernier && dernier.role === "user") dernier.parts.push(...parts);
  else contents.push({ role: "user", parts });

  if (!process.env.GEMINI_API_KEY) throw new Error("La clé GEMINI_API_KEY n'est pas renseignée sur Vercel.");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const config = { systemInstruction: consignes(), tools: [{ functionDeclarations: OUTILS }] };
  const appel = () =>
    Promise.race([
      ai.models.generateContent({ model: MODELE, contents, config }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Délai dépassé")), Math.max(5000, 48000 - (Date.now() - debut)))),
    ]) as Promise<any>;

  let reponseFinale = "";
  for (let tour = 0; tour < 8; tour++) {
    if (Date.now() - debut > 42000) break;
    let response: any;
    for (let essai = 0; ; essai++) {
      try { response = await appel(); break; } catch (err) {
        if (essai >= 1) throw err;
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
    const appels = response.functionCalls;
    if (!appels || appels.length === 0) {
      reponseFinale = response.text || "Désolé, je n'ai pas pu répondre.";
      break;
    }
    contents = [...contents, response.candidates[0].content];
    const resultats = [];
    for (const x of appels) {
      let r: any;
      try { r = await executerOutil(x.name, x.args); } catch (e: any) { r = { erreur: e?.message || "Erreur de lecture" }; }
      resultats.push({ functionResponse: { name: x.name, response: r } });
    }
    contents = [...contents, { role: "user", parts: resultats }];
  }
  if (!reponseFinale) reponseFinale = "Je n'ai pas pu terminer : reformulez ou découpez la demande.";

  const match = reponseFinale.match(/```propositions\s*([\s\S]*?)```/);
  const reponse = (match ? reponseFinale.replace(match[0], "") : reponseFinale).trim();
  let propositions = match ? match[1].trim() : null;
  if (propositions) { try { JSON.parse(propositions); } catch { propositions = null; } }
  const cree = await prisma.messageAssistant.create({ data: { role: "assistant", contenu: reponse || "(actions proposées ci-dessous)", propositions } });
  return { id: cree.id, texte: reponse || "(actions proposées ci-dessous)", propositions };
}

export async function envoyerMessage(texte: string, fichier?: { data: string; mimeType: string; nom: string }) {
  await exigerConnexion();
  try {
    return await envoyerInterne(texte, fichier);
  } catch (err: any) {
    const brut = String(err?.message || err);
    const message = /429|quota|RESOURCE_EXHAUSTED/i.test(brut)
      ? "Limite gratuite de Gemini atteinte : attendez une minute et réessayez."
      : /Délai dépassé/.test(brut) ? "La recherche a pris trop de temps : posez une question plus précise." : brut;
    throw new Error(message);
  }
}

export async function viderConversation() {
  await exigerConnexion();
  await prisma.messageAssistant.deleteMany({});
}

const texteOuNull = (v: any) => (v === undefined ? undefined : v === null || String(v).trim() === "" ? null : String(v).trim());
const dateOuNull = (v: any) => (v ? new Date(`${String(v).slice(0, 10)}T12:00:00`) : undefined);

// Chaque action validée est revérifiée ici avant d'être appliquée
export async function appliquerPropositions(propositions: any[], messageId?: string) {
  await exigerConnexion();
  if (messageId) {
    const verrou = await prisma.messageAssistant.updateMany({ where: { id: messageId, appliquees: false }, data: { appliquees: true } });
    if (verrou.count === 0) return { compteRendu: "Ces actions ont déjà été appliquées." };
  }
  const compteRendu: string[] = [];
  for (const a of propositions) {
    const libelle = a.libelle || a.type;
    try {
      switch (a.type) {
        case "changer_statut": {
          if (!STATUTS[a.statut]) throw new Error("statut inconnu");
          const c = await prisma.candidature.update({ where: { id: a.candidatureId }, data: { statut: a.statut } });
          if (a.statut === "recrutee" && c.posteId) await prisma.poste.update({ where: { id: c.posteId }, data: { etat: "pourvu" } });
          break;
        }
        case "noter_assessfirst": {
          const note = Number(a.note);
          if (!(note >= 0 && note <= 5)) throw new Error("note entre 0 et 5");
          await prisma.candidature.update({ where: { id: a.candidatureId }, data: { noteAssessfirst: note } });
          break;
        }
        case "ajouter_observation": {
          const c = await prisma.candidature.findUniqueOrThrow({ where: { id: a.candidatureId }, select: { observations: true } });
          await prisma.candidature.update({ where: { id: a.candidatureId }, data: { observations: [c.observations, a.texte].filter(Boolean).join("\n") } });
          break;
        }
        case "modifier_candidature": {
          const data: any = {};
          for (const ch of ["nom", "prenom", "sexe", "email", "telephone", "ville", "departement", "dateEntretien"]) if (a[ch] !== undefined) data[ch] = texteOuNull(a[ch]);
          await prisma.candidature.update({ where: { id: a.candidatureId }, data });
          break;
        }
        case "creer_candidature": {
          const poste = a.posteId ? await prisma.poste.findUniqueOrThrow({ where: { id: a.posteId }, select: { id: true, annee: true } }) : null;
          await prisma.candidature.create({ data: { annee: poste?.annee || new Date().getFullYear(), posteId: poste?.id || null, origine: poste ? "directe" : "spontanee", nom: texteOuNull(a.nom), prenom: texteOuNull(a.prenom), sexe: texteOuNull(a.sexe), email: texteOuNull(a.email)?.toLowerCase(), telephone: texteOuNull(a.telephone), ville: texteOuNull(a.ville)?.toUpperCase(), departement: texteOuNull(a.departement), observations: texteOuNull(a.observations) } });
          break;
        }
        case "creer_poste": {
          const ouverture = dateOuNull(a.dateOuverture) || null;
          await prisma.poste.create({ data: { intitule: String(a.intitule || "Poste"), annee: Number(a.annee) || (ouverture || new Date()).getFullYear(), service: texteOuNull(a.service), filiere: texteOuNull(a.filiere), categorie: texteOuNull(a.categorie), numeroOffre: texteOuNull(a.numeroOffre), ficheDePoste: texteOuNull(a.ficheDePoste), dateOuverture: ouverture, dateCloture: ouverture ? ajouterMois(ouverture, 1) : null } });
          break;
        }
        case "changer_etat_poste": {
          if (!ETATS_POSTE[a.etat]) throw new Error("état inconnu");
          await prisma.poste.update({ where: { id: a.posteId }, data: { etat: a.etat } });
          break;
        }
        case "modifier_poste": {
          const data: any = {};
          for (const ch of ["numeroOffre", "service", "observations"]) if (a[ch] !== undefined) data[ch] = texteOuNull(a[ch]);
          if (a.dateCloture) { data.dateCloture = dateOuNull(a.dateCloture); data.rappelEnvoyeLe = null; }
          await prisma.poste.update({ where: { id: a.posteId }, data });
          break;
        }
        default:
          throw new Error("action non autorisée");
      }
      compteRendu.push(`✓ ${libelle}`);
    } catch (e: any) {
      compteRendu.push(`✗ ${libelle} : ${e?.message || "erreur"}`);
    }
  }
  revalidatePath("/", "layout");
  await prisma.messageAssistant.create({ data: { role: "assistant", contenu: compteRendu.join("\n") } });
  return { compteRendu: compteRendu.join("\n") };
}
