# MyHafizz

Application web (PWA) pour mémoriser le Coran avec la méthode des madrasas : sabaq, sabqi, manzil, révision espacée, groupes avec un maître, khatma, apprentissage de la lecture de l'arabe.

Site : https://www.myhafizz.com

## Organisation du repo

```
Myhafizz/
├── app/             → l'application client (React + Vite), projet Vercel « myhafizz »
├── .github/         → vérifications, scans de sécurité, Dependabot
├── scripts/         → tâche des rappels après la prière (GitHub Actions, toutes les 5 min)
└── vercel.json      → build du client depuis app/
```

L'administration est dans un dépôt privé séparé, **MyHafizz-Quran/myhafizz-admin**. Le client et l'admin ne partagent ni code, ni base, ni connexion :
- **client** : base Neon « MyHafizz Client », Neon Auth du client ;
- **admin** : base Neon « MyHafizz Admin » (équipe, journal, notes), Neon Auth de l'admin, et lecture/modération de la base client côté serveur uniquement.


## Client (`app/`)

| Technologie | Usage |
|---|---|
| React 18 + Vite | interface et build |
| React Router 7 | navigation |
| TanStack Query | chargement et cache des données |
| Neon (Postgres + Neon Auth + Data API) | comptes et données |
| Tailwind CSS | style (palette Lagon, police Nunito) |
| Phosphor Icons | icônes |
| Framer Motion | animations |
| Sentry | suivi des erreurs |
| alquran.cloud / quran.com | texte, traductions et audio |

```
app/
├── public/          → icônes, manifeste PWA, service worker, données
├── src/
│   ├── api/         → neonClient.js (client `db`) et entities/
│   ├── components/  → composants partagés (navigation, en-têtes, versets…)
│   ├── hooks/
│   ├── lib/         → auth, révision espacée, rappels, lecture, hors ligne…
│   ├── data/
│   └── pages/       → une page par écran
├── neon/            → schéma et migrations SQL de la base client
└── scripts/         → outils (image de partage, index des versets semblables)
```

### Lancer en local
```bash
cd app
cp .env.example .env.local   # VITE_NEON_URL=...
npm install
npm run dev
```

### Variables (Vercel)
- `VITE_NEON_URL` : URL de la base client (Neon Console → Connect)
- `VITE_GOOGLE_AUTH=1` : affiche la connexion Google
- `SENTRY_AUTH_TOKEN` : envoi des source maps (facultatif)

## Rappels après la prière (`scripts/`)
`prayer-reminders.mjs` calcule les heures de prière de chaque abonné et envoie la notification. Secrets GitHub : `REMINDER_DATABASE_URL`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`.
