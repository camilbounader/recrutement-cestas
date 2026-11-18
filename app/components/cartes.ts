import type { CarteCandidat } from "./VueCandidatures";

export const SELECTION_CARTE = { id: true, nom: true, prenom: true, photo: true, ville: true, departement: true, email: true, score: true, noteAssessfirst: true, statut: true, origine: true, anonymiseeLe: true } as const;

export function versCarte(c: any): CarteCandidat {
  return { id: c.id, nom: c.nom, prenom: c.prenom, photo: c.photo, ville: c.ville, departement: c.departement, email: c.email, score: c.score, noteAssessfirst: c.noteAssessfirst, statut: c.statut, origine: c.origine, anonymisee: !!c.anonymiseeLe };
}
