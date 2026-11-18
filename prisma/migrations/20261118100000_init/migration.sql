-- Création des tables
CREATE TABLE "Poste" (
    "id" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "intitule" TEXT NOT NULL,
    "service" TEXT,
    "collectivite" TEXT,
    "filiere" TEXT,
    "categorie" TEXT,
    "cadreEmploi" TEXT,
    "gradeId" TEXT,
    "typeRecrutement" TEXT NOT NULL DEFAULT 'titulaire_ou_contractuel',
    "tempsTravail" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "motif" TEXT,
    "numeroOffre" TEXT,
    "dateDemande" TIMESTAMP(3),
    "dateOuverture" TIMESTAMP(3),
    "dateCloture" TIMESTAMP(3),
    "ficheDePoste" TEXT,
    "ifseMensuelle" DOUBLE PRECISION,
    "observations" TEXT,
    "etat" TEXT NOT NULL DEFAULT 'ouvert',
    "rappelEnvoyeLe" TIMESTAMP(3),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Poste_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Candidature" (
    "id" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "posteId" TEXT,
    "origine" TEXT NOT NULL DEFAULT 'directe',
    "nom" TEXT,
    "prenom" TEXT,
    "sexe" TEXT,
    "departement" TEXT,
    "ville" TEXT,
    "adresse" TEXT,
    "email" TEXT,
    "telephone" TEXT,
    "photo" TEXT,
    "resume" TEXT,
    "competences" TEXT,
    "experience" TEXT,
    "moisExperiencePublic" INTEGER,
    "moisExperienceTotale" INTEGER,
    "dejaFonctionnaire" BOOLEAN,
    "gradeActuel" TEXT,
    "echelonActuel" INTEGER,
    "score" INTEGER,
    "scoreDetail" TEXT,
    "noteAssessfirst" DOUBLE PRECISION,
    "statut" TEXT NOT NULL DEFAULT 'recue',
    "dateEntretien" TEXT,
    "observations" TEXT,
    "simulation" TEXT,
    "dateReception" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anonymiseeLe" TIMESTAMP(3),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Candidature_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GradeGrille" (
    "id" TEXT NOT NULL,
    "filiere" TEXT NOT NULL,
    "cadreEmploi" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "categorie" TEXT,
    "source" TEXT,
    "verifieLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GradeGrille_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Echelon" (
    "id" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "indiceBrut" INTEGER,
    "indiceMajore" INTEGER NOT NULL,
    "dureeMois" INTEGER,
    CONSTRAINT "Echelon_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ParametresPaie" (
    "id" TEXT NOT NULL DEFAULT 'unique',
    "valeurPointAnnuelle" DOUBLE PRECISION NOT NULL DEFAULT 5907.34,
    "seuilSmic" DOUBLE PRECISION NOT NULL DEFAULT 1867.02,
    "ctiPoints" INTEGER NOT NULL DEFAULT 49,
    "sftIndicePlancher" INTEGER NOT NULL DEFAULT 454,
    "transfertA" DOUBLE PRECISION NOT NULL DEFAULT 389,
    "transfertB" DOUBLE PRECISION NOT NULL DEFAULT 278,
    "transfertC" DOUBLE PRECISION NOT NULL DEFAULT 167,
    "ciaAnnuel" DOUBLE PRECISION NOT NULL DEFAULT 550,
    "tauxIndemniteCsg" DOUBLE PRECISION NOT NULL DEFAULT 0.0076,
    "tauxCnracl" DOUBLE PRECISION NOT NULL DEFAULT 0.111,
    "tauxRafp" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    "plafondRafp" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    "assietteCsg" DOUBLE PRECISION NOT NULL DEFAULT 0.9825,
    "tauxCsg" DOUBLE PRECISION NOT NULL DEFAULT 0.024,
    "tauxCrds" DOUBLE PRECISION NOT NULL DEFAULT 0.005,
    "tauxCsgDeductible" DOUBLE PRECISION NOT NULL DEFAULT 0.068,
    "plafondSecu" DOUBLE PRECISION NOT NULL DEFAULT 4005,
    "tauxVieillessePlafonnee" DOUBLE PRECISION NOT NULL DEFAULT 0.069,
    "tauxVieillesseDeplafonnee" DOUBLE PRECISION NOT NULL DEFAULT 0.004,
    "tauxIrcantecA" DOUBLE PRECISION NOT NULL DEFAULT 0.0284,
    "tauxIrcantecB" DOUBLE PRECISION NOT NULL DEFAULT 0.0706,
    "participationSante" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "participationPrevoyance" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "signature" TEXT,
    "misAJourLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParametresPaie_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ModeleTexte" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "nom" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "objet" TEXT,
    "corps" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ModeleTexte_pkey" PRIMARY KEY ("id")
);

-- Index
CREATE INDEX "Poste_annee_idx" ON "Poste"("annee");
CREATE INDEX "Candidature_annee_idx" ON "Candidature"("annee");
CREATE INDEX "Candidature_posteId_idx" ON "Candidature"("posteId");
CREATE UNIQUE INDEX "GradeGrille_cadreEmploi_grade_key" ON "GradeGrille"("cadreEmploi", "grade");
CREATE UNIQUE INDEX "Echelon_gradeId_numero_key" ON "Echelon"("gradeId", "numero");
CREATE UNIQUE INDEX "ModeleTexte_code_key" ON "ModeleTexte"("code");

-- Clés étrangères
ALTER TABLE "Poste" ADD CONSTRAINT "Poste_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "GradeGrille"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Candidature" ADD CONSTRAINT "Candidature_posteId_fkey" FOREIGN KEY ("posteId") REFERENCES "Poste"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Echelon" ADD CONSTRAINT "Echelon_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "GradeGrille"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Paramètres de paie repris des simulateurs Excel
INSERT INTO "ParametresPaie" ("id", "signature") VALUES ('unique', $t$Le service des Ressources Humaines
Ville de Cestas$t$) ON CONFLICT DO NOTHING;

-- Modèles de mails et de courriers (modifiables dans Paramètres > Modèles)
INSERT INTO "ModeleTexte" ("id", "code", "nom", "type", "objet", "corps", "ordre") VALUES
('modele_accuse_reception', 'accuse_reception', 'Accusé de réception + AssessFirst', 'mail',
 $t$Votre candidature au poste de {poste} – Ville de Cestas$t$,
 $t${civilite} {nom},

Nous accusons bonne réception de votre candidature au poste de {poste} et vous remercions de l'intérêt que vous portez à la Ville de Cestas.

Afin de compléter l'étude de votre dossier, nous vous avons invité(e) à répondre à un questionnaire en ligne sur la plateforme AssessFirst. Vous allez recevoir (ou avez reçu) un mail d'invitation de leur part : pensez à vérifier votre dossier « courriers indésirables » ou « spams ».

L'offre est ouverte jusqu'au {date_cloture}. Nous reviendrons vers vous à l'issue de cette période.

Les informations de votre candidature sont utilisées uniquement pour ce recrutement par le service des Ressources Humaines de la Ville de Cestas et sont conservées au maximum 2 ans. Vous pouvez demander à y accéder, à les rectifier ou à les faire supprimer en répondant à ce mail.

Nous vous prions d'agréer, {civilite}, l'expression de nos salutations distinguées.

{signature}$t$, 1),
('modele_convocation_date', 'convocation_date', 'Convocation — date imposée', 'mail',
 $t$Convocation à un entretien – {poste}$t$,
 $t${civilite} {nom},

Suite à l'étude de votre candidature au poste de {poste}, nous avons le plaisir de vous convier à un entretien le {date_entretien}, à l'Hôtel de Ville de Cestas.

Merci de bien vouloir nous confirmer votre présence en réponse à ce mail.

Nous vous prions d'agréer, {civilite}, l'expression de nos salutations distinguées.

{signature}$t$, 2),
('modele_convocation_dispo', 'convocation_dispo', 'Convocation — demande de disponibilités', 'mail',
 $t$Entretien pour le poste de {poste} – Ville de Cestas$t$,
 $t${civilite} {nom},

Suite à l'étude de votre candidature au poste de {poste}, nous souhaiterions vous rencontrer lors d'un entretien.

Pourriez-vous nous indiquer vos disponibilités sur les prochains jours, en réponse à ce mail ?

Nous vous prions d'agréer, {civilite}, l'expression de nos salutations distinguées.

{signature}$t$, 3),
('modele_proposition_poste', 'proposition_poste', 'Proposition de poste + simulation de salaire', 'mail',
 $t$Proposition de poste – {poste} – Ville de Cestas$t$,
 $t${civilite} {nom},

Suite à notre échange téléphonique, j'ai le plaisir de vous confirmer que votre candidature au poste de {poste} a été retenue.

Vous trouverez ci-dessous une simulation de votre rémunération :

{simulation}

{mention_reprise}

Acceptez-vous le poste ? Merci de nous faire part de votre réponse par retour de mail.

Nous vous prions d'agréer, {civilite}, l'expression de nos salutations distinguées.

{signature}$t$, 4),
('modele_reponse_spontanee', 'reponse_spontanee', 'Réponse à une candidature spontanée', 'mail',
 $t$Votre candidature spontanée – Ville de Cestas$t$,
 $t${civilite} {nom},

Nous avons bien reçu votre candidature spontanée et vous remercions de l'intérêt que vous portez à la Ville de Cestas.

Aucun poste correspondant à votre profil n'est ouvert actuellement. Sauf opposition de votre part, nous conservons votre candidature pendant 2 ans au maximum afin de pouvoir vous recontacter si un poste se libère. Vous pouvez à tout moment demander à y accéder, à la rectifier ou à la faire supprimer en répondant à ce mail.

Nous vous prions d'agréer, {civilite}, l'expression de nos salutations distinguées.

{signature}$t$, 5),
('modele_courrier_reprise', 'courrier_reprise', 'Courrier — reprise des services antérieurs', 'courrier',
 $t$Reprise des services antérieurs$t$,
 $t${civilite},

Dans le cadre de votre recrutement au poste de {poste} en qualité de fonctionnaire stagiaire, vos services antérieurs (publics et privés) peuvent être pris en compte pour déterminer votre classement lors de votre titularisation.

Pour cela, je vous remercie de bien vouloir nous transmettre l'ensemble de vos bulletins de paie (ou certificats de travail) justifiant de vos expériences professionnelles antérieures.

Vous disposez d'un délai d'un an à compter de votre nomination pour nous faire parvenir ces documents.

Je vous prie d'agréer, {civilite}, l'expression de mes salutations distinguées.

{signature}$t$, 10)
ON CONFLICT DO NOTHING;
