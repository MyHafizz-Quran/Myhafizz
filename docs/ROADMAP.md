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

## Phase 4 · Voix
12. Enregistrer sa récitation, la réécouter, l'envoyer au maître.
5. Récitation au micro vérifiée (reconnaissance vocale arabe, mot oublié/sauté).

## Phase 5 · Communauté et croissance
11. Espace maître / madrasa : classes, leçons, validation des élèves.
13. Khatma collective (famille, groupe).
14. Mode enfant + suivi parent.
15. Rappels intelligents aux heures de prière (notifications PWA + bot Telegram).

## Données (Neon)
- verse_reviews(user_id, surah_number, verse_number, interval_days, ease, reps, lapses, due_date, last_grade, last_reviewed)
- hifz_plans(user_id, start_surah, direction, daily_new, manzil_daily, goal_date)
