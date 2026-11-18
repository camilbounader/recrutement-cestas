# Recrutements Cestas — règles pour toute modification

Application Next.js (App Router) + Prisma 7 + Neon, déployée sur Vercel, même charte que Gestion EPI.
Utilisateurs : service RH de la Ville de Cestas (non développeurs). Interface et code en français.

## Règles à appliquer à CHAQUE nouvelle fonctionnalité

1. **Sécurité** : pas de comptes, un mot de passe unique (`APP_PASSWORD`). Chaque action serveur (`"use server"`) commence par `await exigerConnexion()` (lib/garde.ts) : une action peut être appelée hors des pages protégées par le middleware.
2. **RGPD** : les CV et lettres ne sont jamais stockés (ni Blob, ni base) ; seules les infos extraites le sont. Les photos sont de petites images en base (jamais d'URL publique). Toute nouvelle donnée personnelle doit être effacée par `anonymiser()` (app/candidatures/actions.ts).
3. **IA** : tous les appels Gemini passent par `lib/ia.ts`. Le score est indicatif ; ne jamais faire décider l'IA à la place de la RH.
4. **Alertes (lib/alertes.ts)** : toute échéance d'un module s'y ajoute ; elle apparaît alors sur le tableau de bord.
5. **Menu (app/components/Sidebar.tsx)** : ranger toute nouvelle page dans un groupe existant (Recrutements, Outils).
6. **Migrations** : écrites à la main dans `prisma/migrations/<horodatage>_<nom>/migration.sql` (le build lance `prisma migrate deploy`). Une migration qui échoue bloque tous les déploiements suivants : reprises de données prudentes (`WHERE EXISTS`, `ON CONFLICT DO NOTHING`).
7. **Paie** : le calcul est dans `lib/paie.ts` et reproduit les simulateurs Excel ; aucun montant ou taux en dur ailleurs que dans `ParametresPaie`.
8. **Mails** : les mails aux candidats sont copiés dans Zimbra (pas d'envoi). Seuls les rappels internes partent par `lib/mail.ts` ; identifiants SMTP uniquement dans les variables d'environnement Vercel.
