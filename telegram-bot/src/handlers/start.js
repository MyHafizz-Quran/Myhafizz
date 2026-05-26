import { mainMenuKeyboard } from '../utils/keyboard.js';
import { divider } from '../utils/format.js';

const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

export async function handleStart(bot, msg) {
  const chatId = msg.chat.id;

  if (String(chatId) !== String(ADMIN_CHAT_ID)) {
    await bot.sendMessage(
      chatId,
      '⛔ Accès refusé. Ce bot est réservé à l\'administrateur de MyHafizz.'
    );
    return;
  }

  const welcomeText =
    `🕌 <b>MyHafizz Admin Panel</b>\n` +
    `${divider()}\n\n` +
    `Assalamu Alaykum Farouck ! 👋\n\n` +
    `Bienvenue sur le panneau d'administration de <b>MyHafizz</b>.\n` +
    `Sélectionnez une catégorie ci-dessous pour consulter les statistiques en temps réel.\n\n` +
    `<i>Que souhaitez-vous consulter ?</i>`;

  await bot.sendMessage(chatId, welcomeText, {
    parse_mode: 'HTML',
    reply_markup: mainMenuKeyboard(),
  });
}

export async function handleHelp(bot, chatId) {
  const text =
    `❓ <b>Aide — MyHafizz Admin Bot</b>\n` +
    `${divider()}\n\n` +
    `<b>Commandes disponibles :</b>\n` +
    `• /start — Afficher le menu principal\n` +
    `• /help — Afficher cette aide\n\n` +
    `<b>Menus disponibles :</b>\n` +
    `👥 <b>Utilisateurs</b> — Nombre d'inscrits, nouveaux, actifs, inactifs\n` +
    `📖 <b>Mémorisation</b> — Versets, sourates complétées, top mémorisateurs\n` +
    `🏆 <b>Challenges</b> — Défis actifs, participants, classement\n` +
    `🤝 <b>Partenaires</b> — Profils d'étude, matches\n` +
    `📊 <b>Statistiques</b> — Résumés jour/semaine/mois\n` +
    `📈 <b>Tendances</b> — Graphiques d'évolution\n` +
    `🔔 <b>Alertes</b> — Notifications automatiques\n\n` +
    `<i>Développé pour Farouck Sylla — MyHafizz © 2026</i>`;

  await bot.sendMessage(chatId, text, {
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: [[{ text: '🔙 Retour menu', callback_data: 'menu_main' }]] },
  });
}

export async function handleSettings(bot, chatId) {
  const text =
    `⚙️ <b>Paramètres</b>\n` +
    `${divider()}\n\n` +
    `<b>Configuration actuelle :</b>\n` +
    `• Bot version : 1.0.0\n` +
    `• Admin ID : <code>${ADMIN_CHAT_ID}</code>\n` +
    `• Supabase URL : <code>${process.env.SUPABASE_URL || 'Non configuré'}</code>\n\n` +
    `<i>Pour modifier les paramètres, éditez le fichier .env et redémarrez le bot.</i>`;

  await bot.sendMessage(chatId, text, {
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: [[{ text: '🔙 Retour menu', callback_data: 'menu_main' }]] },
  });
}
