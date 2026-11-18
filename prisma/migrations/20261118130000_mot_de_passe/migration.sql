-- Mot de passe modifiable depuis l'appli (sinon APP_PASSWORD sur Vercel sert de mot de passe de départ)
CREATE TABLE IF NOT EXISTS "Securite" (
    "id" TEXT NOT NULL DEFAULT 'unique',
    "motDePasseHash" TEXT,
    "changeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Securite_pkey" PRIMARY KEY ("id")
);
