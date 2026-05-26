// Keyboard builder utilities for Telegram inline keyboards

export function mainMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '👥 Utilisateurs', callback_data: 'menu_users' },
        { text: '📖 Mémorisation', callback_data: 'menu_memorization' },
      ],
      [
        { text: '🏆 Challenges', callback_data: 'menu_challenges' },
        { text: '🤝 Partenaires', callback_data: 'menu_partners' },
      ],
      [
        { text: '📊 Statistiques', callback_data: 'menu_statistics' },
        { text: '📈 Tendances', callback_data: 'menu_trends' },
      ],
      [
        { text: '🔔 Alertes', callback_data: 'menu_alerts' },
        { text: '⚙️ Paramètres', callback_data: 'menu_settings' },
      ],
      [
        { text: '❓ Aide', callback_data: 'menu_help' },
      ],
    ],
  };
}

export function backToMainButton() {
  return [{ text: '🏠 Menu principal', callback_data: 'menu_main' }];
}

export function usersMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '📋 Total inscrits', callback_data: 'users_total' },
        { text: '🆕 Nouveaux (7j)', callback_data: 'users_new_7d' },
      ],
      [
        { text: '📅 Inscrits ce mois', callback_data: 'users_this_month' },
        { text: '🔍 Chercher un user', callback_data: 'users_search' },
      ],
      [
        { text: '🏅 Users les + actifs', callback_data: 'users_most_active' },
        { text: '😴 Users inactifs', callback_data: 'users_inactive' },
      ],
      [backToMainButton()[0]],
    ],
  };
}

export function memorizationMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '📊 Versets total', callback_data: 'memo_total_verses' },
        { text: '✅ Sourates complétées', callback_data: 'memo_completed' },
      ],
      [
        { text: '🔄 Sourates en cours', callback_data: 'memo_in_progress' },
        { text: '🆕 Mémorisation récente', callback_data: 'memo_recent' },
      ],
      [
        { text: '🏅 Top 10 mémorisateurs', callback_data: 'memo_top10' },
        { text: '📉 Progression moyenne', callback_data: 'memo_average' },
      ],
      [backToMainButton()[0]],
    ],
  };
}

export function challengesMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '🟢 Challenges actifs', callback_data: 'chall_active' },
        { text: '📋 Tous les challenges', callback_data: 'chall_all' },
      ],
      [
        { text: '👥 Participants', callback_data: 'chall_participants' },
        { text: '🥇 Classement', callback_data: 'chall_ranking' },
      ],
      [
        { text: '➕ Créer un challenge', callback_data: 'chall_create' },
        { text: '❌ Désactiver', callback_data: 'chall_disable' },
      ],
      [backToMainButton()[0]],
    ],
  };
}

export function partnersMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '👥 Profils créés', callback_data: 'partners_profiles' },
        { text: '🤝 Matches actifs', callback_data: 'partners_active' },
      ],
      [
        { text: '⏳ En attente', callback_data: 'partners_pending' },
        { text: '📊 Par niveau', callback_data: 'partners_by_level' },
      ],
      [backToMainButton()[0]],
    ],
  };
}

export function statisticsMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '📈 Résumé du jour', callback_data: 'stats_today' },
        { text: '📅 Résumé semaine', callback_data: 'stats_week' },
      ],
      [
        { text: '📆 Résumé mensuel', callback_data: 'stats_month' },
        { text: '🌍 Vue d\'ensemble', callback_data: 'stats_overview' },
      ],
      [backToMainButton()[0]],
    ],
  };
}

export function trendsMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '📈 Croissance users', callback_data: 'trends_users' },
        { text: '📊 Activité quotidienne', callback_data: 'trends_activity' },
      ],
      [backToMainButton()[0]],
    ],
  };
}

export function alertsMenuKeyboard(alertSettings) {
  const dailyStatus = alertSettings.dailyReport ? '🟢' : '🔴';
  const newUserStatus = alertSettings.newUserAlert ? '🟢' : '🔴';
  const completionStatus = alertSettings.completionAlert ? '🟢' : '🔴';

  return {
    inline_keyboard: [
      [
        {
          text: `${dailyStatus} Rapport quotidien`,
          callback_data: 'alerts_toggle_daily',
        },
        { text: '⏰ Configurer l\'heure', callback_data: 'alerts_set_time' },
      ],
      [
        {
          text: `${newUserStatus} Alerte nouveau user`,
          callback_data: 'alerts_toggle_new_user',
        },
        {
          text: `${completionStatus} Alerte complétion`,
          callback_data: 'alerts_toggle_completion',
        },
      ],
      [
        { text: '📢 Envoyer annonce', callback_data: 'alerts_broadcast' },
        backToMainButton()[0],
      ],
    ],
  };
}
