# MyHafizz · Plan de construction (validé le 30/10/2026)

Retiré : 1to1 / StudyMatch (onglet, page, aide, mentions légales). Tables conservées en base, inutilisées.

## Phase 1 · Le système d'apprentissage (livrée)
1. Programme Sabaq / Sabqi / Manzil : session du jour en 3 blocs, onglet « Réviser » à la place de 1to1.
2. Révision espacée : chaque verset a un intervalle ; notes Oublié / Hésité / Facile ; file « à réviser aujourd'hui ».
3. Masquage progressif : Texte complet → Premières lettres → Masqué, en révision et en mémorisation.
16. Objectif guidé : « Juz Amma en 3 mois » → quota/jour, avance/retard (dans le réglage du programme).

## Phase 2 · Outils de répétition (livrée)
4. Boucle audio : répéter un verset N fois, plage A–B, vitesse, pause de répétition, écran éteint.
6. Exercices d'enchaînement : verset suivant, compléter la fin, remettre les mots dans l'ordre (dans Quiz).
8. Carte de solidité : vue par sourate des versets fragiles (données de la phase 1).

## Phase 3 · Compréhension (livrée)
> Sens mot à mot : traduction en anglais (Quran.com n'a pas de version française mot à mot). Versets semblables : index précalculé via `scripts/build-similar.py`.

9. Sens mot à mot + traduction courte au toucher.
10. Tajwîd en couleur (activable).
7. Versets semblables (mutashâbihât) : alerte + différence surlignée.

## Phase 4 · Voix (livrée)
> Page « Réciter » : vérification via la reconnaissance vocale du navigateur (ar-SA, alignement tolérant dans `src/lib/recitation.js`) et enregistrements stockés sur l'appareil (IndexedDB), partagés via la feuille de partage du téléphone.

12. Enregistrer sa récitation, la réécouter, l'envoyer au maître.
5. Récitation au micro vérifiée (reconnaissance vocale arabe, mot oublié/sauté).

## Phase 5 · Communauté et croissance
11. Espace maître / madrasa : classes, leçons, validation des élèves.
13. Khatma collective (famille, groupe).
14. ✅ Mode enfant : code parent à 4 chiffres (empreinte SHA-256 sur l'appareil), profil, réglages, classement et aide verrouillés, création, adhésion et départ de groupe masqués. Code oublié : mot de passe du compte.
15. ✅ Rappels après la prière (Web Push) : table `prayer_reminders`, horaires calculés avec adhan (Ligue islamique mondiale), envoi par `scripts/prayer-reminders.mjs` (rôle `reminder_worker` limité à cette table). Reste : ajouter `.github/workflows/prayer-reminders.yml` (cron toutes les 5 min), qui demande la permission GitHub « workflow ».

## Données (Neon)
- verse_reviews(user_id, surah_number, verse_number, interval_days, ease, reps, lapses, due_date, last_grade, last_reviewed)
- hifz_plans(user_id, start_surah, direction, daily_new, manzil_daily, goal_date)

## Apprendre à lire l'arabe (méthode Qaida Nourania, façon Duolingo, sans « vies »)

- **Lot A (livré)** : parcours `/Lire` en 3 unités (les 28 lettres, les formes liées, les voyelles courtes + tanwîn), 23 leçons, lecteur `/Lecon` avec 9 types d'exercices (découverte, lire, écouter, formes, position, syllabes, assembler, paires, tracé au doigt). Une erreur fait revenir la question en fin de leçon. Points + précision en fin de leçon, progression enregistrée dans `reading_lessons` (Neon, `neon/004_reading.sql`), qui compte aussi pour la série. Entrées : Accueil, page Coran, barre latérale PC.
- Voix : voix arabe de l'appareil en attendant des enregistrements (dossier prévu `/audio/qaida/`). Sans voix arabe, les exercices d'écoute sont remplacés par de la lecture.
- **Lot B (livré)** : unité 4 (prolongations alif/yâ/wâw, courtes ou longues, soukoun, chadda, révision sur de vrais mots du Coran) et test de niveau de 12 questions qui valide les unités 1 à 3 à partir de 80 %.
- **Lot C (livré)** : unité 5 « Les mots du Coran » (noms d'Allah, petits mots fréquents, lettres lunaires et solaires, révision) et unité 6 « Premières sourates » (Al-Ikhlâṣ, Al-Kawthar, Al-ʿAṣr, Al-Fâtiḥa en 2 leçons, Al-Falaq, An-Nâs, révision). Audio réel mot à mot et par verset (Mishary al-ʿAfâsy, quran.com), sens en français (trad. Hamidullah). Exercices : remettre un verset dans l'ordre, mot manquant, sens d'un mot, l prononcé ou muet. Données : `src/data/qaida-quran.json`. Parcours complet : 6 unités, 43 leçons.
- **Gamification de la lecture (livré)** : objectif du jour réglable (1, 2, 3 ou 5 leçons, aussi sur l'Accueil), 9 badges (un par unité, Al-Fâtiḥa, Sans faute, Œil sûr), 3 défis de lecture par semaine renouvelés le lundi (Régulier, Sans faute, Marathon) dans la page Défis, onglet Lecture du Classement (points de la semaine). Journal `reading_sessions` + fonction `get_reading_leaderboard` (`neon/005_reading_game.sql`).
- **Finitions natives (livré)** : thème clair/nuit qui suit l'appareil (réglable), en-têtes natifs iOS (grand titre + barre en verre) et Android (barre Material 3) sans double marge sous la barre d'état, onglet « Apprendre » à la place de « Groupes », sons et vibrations au toucher (réglables), lettres arabes jamais coupées (tracé centré sur l'encre réelle), connexion Google active.
- **Invitations (livré)** : nouvelle carte d'invitation (Profil et groupes) avec QR code, WhatsApp, partage, copie et image 1080×1350 ; page publique `/rejoindre/CODE` : la personne crée son compte (Google ou email) et arrive directement dans le groupe. `neon/006_invite.sql`.
