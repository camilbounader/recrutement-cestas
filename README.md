# Recrutements — Ville de Cestas

Suivi des recrutements : postes par année, candidatures (lecture des CV par l'IA, trombinoscope, score indicatif),
candidatures spontanées (vivier), mails à copier dans Zimbra, courriers PDF, simulation de paie, rappels J-7, RGPD.

## Mise en ligne (une seule fois)

1. **Vercel** › *Add New* › *Project* › importer le dépôt `recrutement-cestas`. Ne pas encore cliquer sur *Deploy* si Vercel le permet ; sinon le premier déploiement échouera (normal, il manque la base).
2. **Base de données** : dans le projet Vercel › onglet *Storage* › *Create Database* › **Neon** › région **Frankfurt (eu-central-1)** › relier au projet. La variable `DATABASE_URL` est ajoutée toute seule.
3. **Variables d'environnement** (projet Vercel › *Settings* › *Environment Variables*) :

| Variable | Valeur |
|---|---|
| `APP_PASSWORD` | mot de passe de départ ; ensuite il se change dans l'appli (Outils › Mot de passe) |
| `AUTH_SECRET` | une longue phrase au hasard (sert à signer la connexion) |
| `GEMINI_API_KEY` | clé Gemini (Google AI Studio) |
| `CRON_SECRET` | une autre phrase au hasard (protège le rappel automatique) |
| `RAPPEL_EMAILS` | adresse(s) qui reçoivent les rappels J-7, séparées par des virgules |
| `SMTP_USER` / `SMTP_PASS` | même boîte d'envoi que l'appli EPI |
| `SMTP_HOST` / `SMTP_PORT` | seulement si on passe par le serveur mail de la mairie |
| `APP_URL` | l'adresse de l'appli, ex. `https://recrutement-cestas.vercel.app` (liens dans les rappels) |

4. *Deployments* › *Redeploy*. Le build crée les tables, les paramètres de paie (repris des fichiers Excel) et les modèles de mails.
5. Dans l'appli : **Outils › Grilles indiciaires** › importer les grilles des grades recrutés (PDF du CDG), puis **Outils › Paramètres de paie** › *Envoyer un mail de test*.

## En local (PC de la mairie)

```
npm.cmd install
npm.cmd run dev
```
Créer un fichier `.env` avec au minimum `DATABASE_URL`, `APP_PASSWORD`, `GEMINI_API_KEY`.

## Mot de passe oublié

Le mot de passe choisi dans l'appli est enregistré haché dans la base. Pour revenir au mot de passe de départ (`APP_PASSWORD`) :
Neon › *SQL Editor* › `DELETE FROM "Securite";`
