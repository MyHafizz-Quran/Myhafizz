# Sécurité de MyHafizz

## Signaler une faille
Merci de ne pas ouvrir d'issue publique. Écris à **security@myhafizz.com** (ou via « Report a vulnerability » dans l'onglet Security de ce dépôt) avec les étapes pour reproduire. Réponse sous 72 h.

## Ce qui est en place
- Base Neon : RLS sur toutes les tables, aucun accès sans compte, fonctions `SECURITY DEFINER` avec `search_path` fixé et réservées aux comptes connectés (`app/neon/007_security.sql`).
- Chaque utilisateur ne lit que ses propres données ; les responsables de groupe voient la progression de leurs membres ; le classement n'expose que des totaux.
- En-têtes HTTP (HSTS, nosniff, Referrer-Policy, Permissions-Policy, anti-iframe) et politique CSP (en observation, rapports dans Sentry) : `vercel.json`.
- Le back-office est dans un dépôt privé séparé : MyHafizz-Quran/myhafizz-admin.
- Automatique sur GitHub : CodeQL, gitleaks, `npm audit`, Dependabot (`.github/`).
- Aucun secret dans le code : les clés vivent dans les variables d'environnement Vercel et les secrets GitHub.
