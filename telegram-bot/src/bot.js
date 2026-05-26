import { Telegraf } from 'telegraf';
import { mainMenuKeyboard } from './utils/keyboard.js';
import { handleStart, handleHelp, handleSettings } from './handlers/start.js';
import {
  handleUsersMenu,
  handleUsersTotal,
  handleUsersNew7d,
  handleUsersThisMonth,
  handleUsersMostActive,
  handleUsersInactive,
  handleUsersSearch,
  handleUsersSearchResult,
} from './handlers/users.js';
import {
  handleMemorizationMenu,
  handleMemoTotalVerses,
  handleMemoCompleted,
  handleMemoInProgress,
  handleMemoRecent,
  handleMemoTop10,
  handleMemoAverage,
} from './handlers/memorization.js';
import {
  handleChallengesMenu,
  handleChallengesActive,
  handleChallengesAll,
  handleChallengesParticipants,
  handleChallengesRanking,
  handleChallengeCreate,
  handleChallengeCreateFlow,
  isInCreateFlow,
  cancelCreateFlow,
  handleChallengeDisable,
  handleChallengeDisableConfirm,
} from './handlers/challenges.js';
import {
  handlePartnersMenu,
  handlePartnersProfiles,
  handlePartnersActive,
  handlePartnersPending,
  handlePartnersByLevel,
} from './handlers/partners.js';
import {
  handleStatisticsMenu,
  handleStatsToday,
  handleStatsWeek,
  handleStatsMonth,
  handleStatsOverview,
} from './handlers/statistics.js';
import {
  handleTrendsMenu,
  handleTrendsUsers,
  handleTrendsActivity,
} from './handlers/trends.js';
import {
  handleAlertsMenu,
  handleAlertToggleDailyReport,
  handleAlertToggleNewUser,
  handleAlertToggleCompletion,
  handleAlertSetTime,
  handleAlertSetTimeFlow,
  isInSetTimeFlow,
  handleAlertBroadcast,
  handleBroadcastFlow,
  isInBroadcastFlow,
  initAlerts,
} from './handlers/alerts.js';

const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

// Track users waiting for search input
const searchPendingUsers = new Set();

function isAdmin(chatId) {
  return String(chatId) === String(ADMIN_CHAT_ID);
}

// Build a bot-compatible proxy object that handlers can call as bot.sendMessage(chatId, text, opts)
function makeProxy(telegram) {
  return {
    sendMessage: (chatId, text, opts) => telegram.sendMessage(chatId, text, opts),
  };
}

export function createBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN est requis.');
  }

  const bot = new Telegraf(token);

  // Build a bot-proxy for handlers
  const botProxy = makeProxy(bot.telegram);

  // Register persistent bot commands (shows in the "/" menu inside Telegram)
  bot.telegram.setMyCommands([
    { command: 'start', description: '🏠 Afficher le menu principal' },
    { command: 'menu', description: '📋 Dashboard principal' },
    { command: 'users', description: '👥 Gestion utilisateurs' },
    { command: 'stats', description: '📊 Statistiques globales' },
    { command: 'help', description: '❓ Aide et commandes' },
  ]).catch((err) => console.error('setMyCommands error:', err));

  // Configure the persistent menu button in the Telegram chat interface
  bot.telegram.setChatMenuButton({ menuButton: { type: 'commands' } })
    .catch((err) => console.error('setChatMenuButton error:', err));

  // Initialize alerts (cron + polling)
  initAlerts(botProxy);

  // /start command
  bot.command('start', async (ctx) => {
    const chatId = ctx.chat.id;
    cancelCreateFlow(chatId);
    searchPendingUsers.delete(chatId);
    // Re-create a minimal msg object compatible with handleStart
    await handleStart(botProxy, { chat: { id: chatId }, from: ctx.from });
  });

  // /menu command — alias for /start, shows the main dashboard
  bot.command('menu', async (ctx) => {
    const chatId = ctx.chat.id;
    cancelCreateFlow(chatId);
    searchPendingUsers.delete(chatId);
    await handleStart(botProxy, { chat: { id: chatId }, from: ctx.from });
  });

  // /help command
  bot.command('help', async (ctx) => {
    if (!isAdmin(ctx.chat.id)) return;
    await handleHelp(botProxy, ctx.chat.id);
  });

  // /stats command — quick summary for today
  bot.command('stats', async (ctx) => {
    if (!isAdmin(ctx.chat.id)) return;
    await handleStatsToday(botProxy, ctx.chat.id);
  });

  // /users command — total registered users
  bot.command('users', async (ctx) => {
    if (!isAdmin(ctx.chat.id)) return;
    await handleUsersTotal(botProxy, ctx.chat.id);
  });

  // Handle text messages (for interactive flows)
  bot.on('text', async (ctx) => {
    const chatId = ctx.chat.id;
    if (!isAdmin(chatId)) return;

    const text = ctx.message.text.trim();
    if (text.startsWith('/')) return;

    // Challenge creation flow
    if (isInCreateFlow(chatId)) {
      await handleChallengeCreateFlow(botProxy, chatId, text);
      return;
    }

    // Alert set-time flow
    if (isInSetTimeFlow(chatId)) {
      await handleAlertSetTimeFlow(botProxy, chatId, text);
      return;
    }

    // Broadcast flow
    if (isInBroadcastFlow(chatId)) {
      await handleBroadcastFlow(botProxy, chatId, text);
      return;
    }

    // User search flow
    if (searchPendingUsers.has(chatId)) {
      searchPendingUsers.delete(chatId);
      await handleUsersSearchResult(botProxy, chatId, text);
      return;
    }
  });

  // Handle callback queries (inline keyboard button presses)
  bot.on('callback_query', async (ctx) => {
    const chatId = ctx.callbackQuery.message.chat.id;
    const data = ctx.callbackQuery.data;

    // Always answer the callback query to remove the loading indicator
    await ctx.answerCbQuery().catch(() => {});

    if (!isAdmin(chatId)) {
      await botProxy.sendMessage(chatId, '⛔ Accès refusé.');
      return;
    }

    try {
      await routeCallback(botProxy, chatId, data);
    } catch (err) {
      console.error('[Callback routing error]', err);
      await botProxy.sendMessage(
        chatId,
        `❌ Une erreur s'est produite. Revenez au menu principal avec /start.`
      );
    }
  });

  console.log('🤖 MyHafizz Admin Bot démarré avec succès !');

  return {
    launch: () => bot.launch(),
    stop: (signal) => bot.stop(signal),
  };
}

async function routeCallback(bot, chatId, data) {
  // Main menu
  if (data === 'menu_main') {
    cancelCreateFlow(chatId);
    searchPendingUsers.delete(chatId);
    await bot.sendMessage(
      chatId,
      `🕌 <b>MyHafizz Admin Panel</b>\n\nQue souhaitez-vous consulter ?`,
      { parse_mode: 'HTML', reply_markup: mainMenuKeyboard() }
    );
    return;
  }

  if (data === 'menu_help') { await handleHelp(bot, chatId); return; }
  if (data === 'menu_settings') { await handleSettings(bot, chatId); return; }

  // Users menu
  if (data === 'menu_users') { await handleUsersMenu(bot, chatId); return; }
  if (data === 'users_total') { await handleUsersTotal(bot, chatId); return; }
  if (data === 'users_new_7d') { await handleUsersNew7d(bot, chatId); return; }
  if (data === 'users_this_month') { await handleUsersThisMonth(bot, chatId); return; }
  if (data === 'users_most_active') { await handleUsersMostActive(bot, chatId); return; }
  if (data === 'users_inactive') { await handleUsersInactive(bot, chatId); return; }
  if (data === 'users_search') {
    searchPendingUsers.add(chatId);
    await handleUsersSearch(bot, chatId);
    return;
  }

  // Memorization menu
  if (data === 'menu_memorization') { await handleMemorizationMenu(bot, chatId); return; }
  if (data === 'memo_total_verses') { await handleMemoTotalVerses(bot, chatId); return; }
  if (data === 'memo_completed') { await handleMemoCompleted(bot, chatId); return; }
  if (data === 'memo_in_progress') { await handleMemoInProgress(bot, chatId); return; }
  if (data === 'memo_recent') { await handleMemoRecent(bot, chatId); return; }
  if (data === 'memo_top10') { await handleMemoTop10(bot, chatId); return; }
  if (data === 'memo_average') { await handleMemoAverage(bot, chatId); return; }

  // Challenges menu
  if (data === 'menu_challenges') { await handleChallengesMenu(bot, chatId); return; }
  if (data === 'chall_active') { await handleChallengesActive(bot, chatId); return; }
  if (data === 'chall_all') { await handleChallengesAll(bot, chatId); return; }
  if (data === 'chall_participants') { await handleChallengesParticipants(bot, chatId); return; }
  if (data === 'chall_ranking') { await handleChallengesRanking(bot, chatId); return; }
  if (data === 'chall_create') { await handleChallengeCreate(bot, chatId); return; }
  if (data === 'chall_disable') { await handleChallengeDisable(bot, chatId); return; }
  if (data.startsWith('chall_disable_')) {
    const id = data.replace('chall_disable_', '');
    await handleChallengeDisableConfirm(bot, chatId, id);
    return;
  }

  // Partners menu
  if (data === 'menu_partners') { await handlePartnersMenu(bot, chatId); return; }
  if (data === 'partners_profiles') { await handlePartnersProfiles(bot, chatId); return; }
  if (data === 'partners_active') { await handlePartnersActive(bot, chatId); return; }
  if (data === 'partners_pending') { await handlePartnersPending(bot, chatId); return; }
  if (data === 'partners_by_level') { await handlePartnersByLevel(bot, chatId); return; }

  // Statistics menu
  if (data === 'menu_statistics') { await handleStatisticsMenu(bot, chatId); return; }
  if (data === 'stats_today') { await handleStatsToday(bot, chatId); return; }
  if (data === 'stats_week') { await handleStatsWeek(bot, chatId); return; }
  if (data === 'stats_month') { await handleStatsMonth(bot, chatId); return; }
  if (data === 'stats_overview') { await handleStatsOverview(bot, chatId); return; }

  // Trends menu
  if (data === 'menu_trends') { await handleTrendsMenu(bot, chatId); return; }
  if (data === 'trends_users') { await handleTrendsUsers(bot, chatId); return; }
  if (data === 'trends_activity') { await handleTrendsActivity(bot, chatId); return; }

  // Alerts menu
  if (data === 'menu_alerts') { await handleAlertsMenu(bot, chatId); return; }
  if (data === 'alerts_toggle_daily') { await handleAlertToggleDailyReport(bot, chatId); return; }
  if (data === 'alerts_toggle_new_user') { await handleAlertToggleNewUser(bot, chatId); return; }
  if (data === 'alerts_toggle_completion') { await handleAlertToggleCompletion(bot, chatId); return; }
  if (data === 'alerts_set_time') { await handleAlertSetTime(bot, chatId); return; }
  if (data === 'alerts_broadcast') { await handleAlertBroadcast(bot, chatId); return; }

  // Unknown callback
  await bot.sendMessage(chatId, `❓ Action inconnue : <code>${data}</code>`, { parse_mode: 'HTML' });
}
