-- Import de l'ancien tableau Excel : on retient la feuille d'origine pour pouvoir réimporter sans doublon
ALTER TABLE "Poste" ADD COLUMN IF NOT EXISTS "importeDe" TEXT;

-- Graphiques enregistrés (page Statistiques)
CREATE TABLE IF NOT EXISTS "Graphique" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Graphique_pkey" PRIMARY KEY ("id")
);

-- Conversation avec l'assistant IA
CREATE TABLE IF NOT EXISTS "MessageAssistant" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "propositions" TEXT,
    "appliquees" BOOLEAN NOT NULL DEFAULT false,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageAssistant_pkey" PRIMARY KEY ("id")
);
