# 🕌 MyHafizz Admin Bot

Bot Telegram d'administration pour l'application **MyHafizz** — Consultez les statistiques en temps réel directement depuis Telegram.

---

## 📋 Fonctionnalités

| Menu | Fonctionnalités |
|---|---|
| 👥 **Utilisateurs** | Total inscrits, nouveaux (7j), actifs ce mois, les plus actifs, inactifs, recherche |
| 📖 **Mémorisation** | Versets totaux, sourates complétées/en cours, mémorisations récentes, top 10, progression moyenne |
| 🏆 **Challenges** | Challenges actifs/tous, participants, classement, créer un challenge, désactiver |
| 🤝 **Partenaires d'étude** | Profils créés, matches actifs, demandes en attente, répartition par niveau |
| 📊 **Statistiques** | Résumés du jour, semaine, mois, vue d'ensemble |
| 📈 **Tendances** | Graphiques texte de croissance utilisateurs et activité quotidienne (7 jours) |
| 🔔 **Alertes** | Rapport quotidien automatique, alertes nouveau user, alerte complétion, annonce |

---

## 🔐 Prérequis

### 1. Créer le bot Telegram via @BotFather

1. Ouvrez Telegram et cherchez **@BotFather**
2. Envoyez `/newbot`
3. Donnez un **nom** (ex: `MyHafizz Admin`)
4. Donnez un **username** se terminant par `bot` (ex: `myhafizz_admin_bot`)
5. Copiez le **token** fourni (format : `7123456789:AAHxxx...`)

### 2. Récupérer votre Chat ID Telegram

1. Cherchez **@userinfobot** sur Telegram
2. Envoyez `/start`
3. Copiez votre **Chat ID** (un nombre comme `123456789`)

### 3. Récupérer la clé Supabase service_role

1. Allez dans votre **Supabase Dashboard** → **Settings** → **API**
2. Copiez la clé **service_role** (⚠️ **pas** l'anon key !)
3. ⚠️ Cette clé a tous les droits — ne la commitez jamais dans votre repo !

---

## ⚙️ Installation et lancement local

```bash
# 1. Allez dans le dossier du bot
cd telegram-bot

# 2. Installez les dépendances
npm install

# 3. Copiez le fichier d'environnement
cp .env.example .env

# 4. Éditez le fichier .env avec vos valeurs
nano .env
```

Contenu du `.env` :
```env
TELEGRAM_BOT_TOKEN=7123456789:AAHxxxxxxxxxxxxxxxxxx
TELEGRAM_ADMIN_CHAT_ID=123456789
DATABASE_URL=postgresql://neondb_owner:xxxx@ep-xxx-pooler.c-8.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

```bash
# 5. Démarrez le bot
npm start
```

Le bot affichera :
```
🕌 Démarrage du bot MyHafizz Admin...
   Base : Neon
   Admin Chat ID : 123456789
🤖 MyHafizz Admin Bot démarré avec succès !
```

---

## 🚀 Déploiement sur Render

Le bot est configuré pour être déployé en tant que **Worker** sur Render (service Node.js en continu).

### Option 1 : Via render.yaml (recommandé)

Le fichier `render.yaml` à la racine du projet contient déjà la configuration du bot. Il suffit de :

1. Aller sur [render.com](https://render.com) → votre projet → **New Service**
2. Sélectionner votre repo GitHub
3. Render détectera automatiquement le `render.yaml`
4. Ajouter les variables d'environnement dans l'interface Render :
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_ADMIN_CHAT_ID`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

### Option 2 : Configuration manuelle sur Render

1. Créez un **nouveau service Web** (type : **Background Worker**)
2. Connectez votre repo GitHub
3. Configurez :
   - **Root Directory** : `telegram-bot`
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
4. Ajoutez les 4 variables d'environnement

---

## 📱 Commandes disponibles

| Commande | Description |
|---|---|
| `/start` | Affiche le menu principal avec les boutons inline |
| `/help` | Affiche l'aide et la liste des menus |

---

## 🏗️ Structure du projet

```
telegram-bot/
├── package.json          # Dépendances Node.js
├── .env.example          # Template des variables d'environnement
├── README.md             # Ce fichier
└── src/
    ├── index.js          # Point d'entrée principal
    ├── bot.js            # Initialisation du bot + routage des callbacks
    ├── supabase.js       # Client Supabase admin (service_role)
    ├── handlers/
    │   ├── start.js      # Commande /start + menu principal
    │   ├── users.js      # Statistiques utilisateurs
    │   ├── memorization.js # Statistiques mémorisation
    │   ├── challenges.js # Statistiques challenges
    │   ├── partners.js   # Statistiques partenaires d'étude
    │   ├── statistics.js # Statistiques globales
    │   ├── trends.js     # Tendances avec graphiques texte
    │   └── alerts.js     # Système d'alertes et notifications
    └── utils/
        ├── keyboard.js   # Constructeur de claviers inline
        ├── format.js     # Helpers de formatage des messages
        ├── chart.js      # Générateur de graphiques texte (█)
        └── quranData.js  # Données des 114 sourates
```

---

## 🔒 Sécurité

- Le bot répond **uniquement** au `TELEGRAM_ADMIN_CHAT_ID` configuré
- La clé `service_role` Supabase n'est jamais exposée côté client
- Les variables d'environnement ne sont jamais committées dans le repo
- Toute tentative d'accès non autorisé est rejetée avec un message d'erreur

---

## 📦 Dépendances

| Package | Version | Rôle |
|---|---|---|
| `telegraf` | ^4.16.3 | Framework Telegram Bot (moderne, sans vulnérabilités) |
| `@supabase/supabase-js` | ^2.45.0 | Client Supabase |
| `node-cron` | ^3.0.3 | Planification du rapport quotidien |
| `dotenv` | ^16.4.5 | Chargement des variables d'environnement |

---

*Développé pour Farouck Sylla — MyHafizz © 2026*
