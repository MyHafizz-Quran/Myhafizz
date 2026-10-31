# MyHafizz 📖

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20DB-3ECF8E?logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3-06B6D4?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/Licence-MIT-green)

**Application web de mémorisation du Saint Coran** — suivi du Hifdh verset par verset, écoute audio, quiz, défis communautaires et matching d'étude.

---

## 📁 Organisation du repo

```
Myhafizz/
├── app/             → l'application client (React + Vite), déployée sur Vercel (projet « myhafizz », myhafizz.com)
├── myhafizz-admin/  → l'administration, déployée à part sur son propre projet Vercel
├── telegram-bot/    → bot Telegram (Render)
├── vercel.json      → build du client depuis app/
└── render.yaml
```

Le client et l'admin ne partagent ni code, ni base, ni connexion :
- client : base Neon « MyHafizz Client », Neon Auth du client ;
- admin : base Neon « MyHafizz Admin » (équipe, journal, notes), Neon Auth de l'admin, et lecture/modération de la base client côté serveur uniquement.

Chaque projet Vercel ne se reconstruit que si son dossier change.

---

## ✨ Fonctionnalités

- 📊 **Tableau de bord** — Vue d'ensemble de la progression avec statistiques et révisions récentes
- 📚 **Liste des sourates** — 114 sourates avec filtres (toutes, complètes, en cours, non commencées) et recherche par nom ou numéro
- 🎧 **Mémorisation** — Interface verset par verset avec lecture audio, mode boucle, masquage/affichage, translittération phonétique et marqueurs d'arrêt persistants
- 🧠 **Quiz Hifdh** — Saisir la suite d'un verset avec correction intelligente (normalisation de l'arabe) et score détaillé
- 🏆 **Défis** — Défis de mémorisation communautaires avec classement et badges
- 🤝 **StudyMatch** — Trouver un partenaire de révision selon le niveau et les disponibilités
- ❤️ **Signets** — Sauvegarder des versets favoris et des positions de lecture
- 🌙 **Mode sombre** — Thème clair/sombre persistant
- 🔊 **Récitateurs** — Choix du récitateur (Alafasy par défaut) via l'API alquran.cloud

---

## 🏗️ Stack technique

| Technologie | Usage |
|---|---|
| **React 18** + **Vite** | Framework + bundler |
| **React Router DOM v6** | Navigation SPA |
| **TanStack Query (React Query)** | Fetching et cache des données |
| **Supabase** | Authentification + base de données PostgreSQL |
| **Tailwind CSS** + **shadcn/ui** | Interface utilisateur |
| **Framer Motion** | Animations |
| **Lucide React** | Icônes |
| **alquran.cloud API** | Versets arabes, translittérations et audio |

---

## 📁 Structure du projet

```
myhafizz/
├── public/
├── src/
│   ├── api/
│   │   ├── supabaseClient.js          # Client Supabase
│   │   └── entities/
│   │       ├── index.js               # Re-exports des entités
│   │       ├── memorizationProgress.js # CRUD memorization_progress
│   │       ├── challenges.js          # CRUD challenges + participants
│   │       └── studyMatch.js          # CRUD study_profiles + matches
│   ├── components/
│   │   ├── ui/                        # Composants shadcn/ui
│   │   ├── study/                     # Composants StudyMatch
│   │   │   ├── ProfileSetupModal.jsx  # Modal configuration du profil
│   │   │   └── MatchCard.jsx          # Carte partenaire
│   │   ├── quranData.jsx              # Données des 114 sourates
│   │   ├── SurahCard.jsx              # Carte d'une sourate
│   │   ├── VerseCard.jsx              # Carte d'un verset avec audio
│   │   ├── ProgressRing.jsx           # Anneau de progression SVG
│   │   ├── ProfileSection.jsx         # Section profil utilisateur
│   │   ├── ReciterSelector.jsx        # Sélecteur de récitateur
│   │   └── usePreferences.jsx         # Hook de préférences (localStorage)
│   ├── lib/
│   │   ├── AuthContext.jsx            # Contexte d'authentification Supabase
│   │   ├── PageNotFound.jsx           # Page 404
│   │   ├── query-client.js            # Instance TanStack Query
│   │   └── utils.js                   # Utilitaires (cn, isIframe)
│   ├── pages/
│   │   ├── Dashboard.jsx              # Tableau de bord
│   │   ├── SurahList.jsx              # Liste des sourates
│   │   ├── Memorize.jsx               # Interface de mémorisation
│   │   ├── Quiz.jsx                   # Quiz Hifdh
│   │   ├── Bookmarks.jsx              # Signets et favoris
│   │   ├── Challenges.jsx             # Défis communautaires
│   │   ├── StudyMatch.jsx             # Matching d'étude
│   │   └── Login.jsx                  # Page de connexion/inscription
│   ├── App.jsx                        # Routing principal + AuthProvider
│   └── main.jsx                       # Point d'entrée
├── supabase/                          # Migrations et configuration Supabase
├── .env.example                       # Variables d'environnement exemple
├── render.yaml                        # Configuration déploiement Render
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## 🗺️ Pages et routes

| Route | Composant | Description |
|---|---|---|
| `/` | Redirect | Redirige vers `/Dashboard` |
| `/Dashboard` | `Dashboard.jsx` | Tableau de bord avec statistiques de progression |
| `/SurahList` | `SurahList.jsx` | Liste des 114 sourates avec filtres et recherche |
| `/Memorize` | `Memorize.jsx` | Mémorisation verset par verset avec lecture audio |
| `/Quiz` | `Quiz.jsx` | Quiz de révision des versets mémorisés |
| `/Bookmarks` | `Bookmarks.jsx` | Signets et marqueurs de position sauvegardés |
| `/Challenges` | `Challenges.jsx` | Défis de mémorisation communautaires |
| `/StudyMatch` | `StudyMatch.jsx` | Matching avec d'autres apprenants |

---

## 🗄️ Tables Supabase requises

| Table | Description |
|---|---|
| `memorization_progress` | Progression par sourate et par utilisateur |
| `challenges` | Défis de mémorisation actifs |
| `challenge_participants` | Participants et avancement dans les défis |
| `study_profiles` | Profils pour la mise en relation d'étude |
| `study_matches` | Demandes de partenariat (pending / accepted / declined) |

Les migrations SQL se trouvent dans le dossier `supabase/`.

---

## ⚙️ Installation et développement local

### Prérequis

- **Node.js** ≥ 18
- Un projet **Supabase** avec les tables ci-dessus créées

### Étapes

```bash
# Cloner le projet
git clone https://github.com/goatyiriba/hafizcomplet.git
cd hafizcomplet

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos clés Supabase
```

### Variables d'environnement (`.env`)

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Lancer l'application

```bash
npm run dev
```

---

## 📜 Scripts disponibles

| Script | Description |
|---|---|
| `npm run dev` | Serveur de développement Vite |
| `npm run build` | Build de production |
| `npm run preview` | Prévisualisation du build |
| `npm run lint` | Vérification ESLint |
| `npm run lint:fix` | Correction automatique ESLint |

---

## 🚀 Déploiement sur Render

Le projet inclut un fichier `render.yaml` préconfiguré pour un déploiement en tant que **Static Site** sur [Render.com](https://render.com) :

| Paramètre | Valeur |
|---|---|
| **Type** | Static Site |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |

Variables d'environnement à configurer dans Render :
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## 🔊 API externe

- **[alquran.cloud API](https://api.alquran.cloud/)** — Récupération des versets arabes, translittérations et fichiers audio MP3 par récitateur
- Audio servi via `cdn.islamic.network`

---

## 💾 Stockage local (localStorage)

Certaines fonctionnalités utilisent uniquement le localStorage (sans base de données) :

| Clé | Contenu |
|---|---|
| `quran_preferences` | `{ reciter, showPhonetic, darkMode }` |
| `quran_favorites` | Liste des numéros de versets favoris |
| `quran_stop_markers` | Marqueurs d'arrêt `{ verseNumber: timeInSeconds }` |
