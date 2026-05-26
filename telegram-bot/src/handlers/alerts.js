import { supabase } from '../supabase.js';
import { alertsMenuKeyboard } from '../utils/keyboard.js';
import { header, escapeHtml } from '../utils/format.js';
import cron from 'node-cron';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../data');
const SETTINGS_FILE = join(DATA_DIR, 'alert-settings.json');

// Ensure data directory exists
try {
  mkdirSync(DATA_DIR, { recursive: true });
} catch {
  // Ignore if already exists
}

// Default settings
const defaultSettings = {
  dailyReport: false,
  dailyReportHour: 8,
  newUserAlert: false,
  completionAlert: false,
  lastUserCount: 0,
  lastCompletionCount: 0,
};

// Load settings from file or use defaults
function loadSettings() {
  try {
    if (existsSync(SETTINGS_FILE)) {
      const raw = readFileSync(SETTINGS_FILE, 'utf8');
      return { ...defaultSettings, ...JSON.parse(raw) };
    }
  } catch {
    // Fall through to defaults
  }
  return { ...defaultSettings };
}

// Save settings to file
function saveSettings() {
  try {
    writeFileSync(SETTINGS_FILE, JSON.stringify(alertSettings, null, 2), 'utf8');
  } catch (err) {
    console.error('[Alert settings save error]', err);
  }
}

// Alert settings — loaded from file, persisted on change
export const alertSettings = loadSettings();

let cronJob = null;
let pollingInterval = null;

export function initAlerts(bot) {
  scheduleDailyReport(bot);
  startPolling(bot);
}

function scheduleDailyReport(bot) {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
  }

  if (!alertSettings.dailyReport) return;

  const hour = alertSettings.dailyReportHour;
  cronJob = cron.schedule(`0 ${hour} * * *`, async () => {
    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
    if (!chatId) return;
    await sendDailyReport(bot, chatId);
  });
}

function startPolling(bot) {
  if (pollingInterval) clearInterval(pollingInterval);

  pollingInterval = setInterval(async () => {
    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
    if (!chatId) return;

    if (alertSettings.newUserAlert) {
      await checkNewUsers(bot, chatId);
    }
    if (alertSettings.completionAlert) {
      await checkNewCompletions(bot, chatId);
    }
  }, 2 * 60 * 1000); // Poll every 2 minutes
}

async function checkNewUsers(bot, chatId) {
  try {
    const { count } = await supabase
      .from('memorization_progress')
      .select('user_id', { count: 'exact', head: true });

    const currentCount = count || 0;
    if (alertSettings.lastUserCount === 0) {
      alertSettings.lastUserCount = currentCount;
      saveSettings();
      return;
    }

    if (currentCount > alertSettings.lastUserCount) {
      const newCount = currentCount - alertSettings.lastUserCount;
      alertSettings.lastUserCount = currentCount;
      saveSettings();
      await bot.sendMessage(
        chatId,
        `🎉 <b>${newCount} nouvel(s) utilisateur(s) actif(s) !</b>\n\nTotal actifs : ${currentCount}`,
        { parse_mode: 'HTML' }
      );
    }
  } catch (err) {
    console.error('[Alert polling error - users]', err);
  }
}

async function checkNewCompletions(bot, chatId) {
  try {
    const { count } = await supabase
      .from('memorization_progress')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');

    const currentCount = count || 0;
    if (alertSettings.lastCompletionCount === 0) {
      alertSettings.lastCompletionCount = currentCount;
      saveSettings();
      return;
    }

    if (currentCount > alertSettings.lastCompletionCount) {
      const newCount = currentCount - alertSettings.lastCompletionCount;
      alertSettings.lastCompletionCount = currentCount;
      saveSettings();
      await bot.sendMessage(
        chatId,
        `🏆 <b>${newCount} nouvelle(s) sourate(s) complétée(s) !</b>\n\nTotal complétions : ${currentCount}`,
        { parse_mode: 'HTML' }
      );
    }
  } catch (err) {
    console.error('[Alert polling error - completions]', err);
  }
}

export async function sendDailyReport(bot, chatId) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: memoData } = await supabase
      .from('memorization_progress')
      .select('user_id, memorized_verses, status, updated_at')
      .gte('updated_at', today.toISOString());

    let verses = 0;
    let completed = 0;
    const users = new Set();
    for (const row of memoData || []) {
      if (Array.isArray(row.memorized_verses)) verses += row.memorized_verses.length;
      if (row.status === 'completed') completed++;
      users.add(row.user_id);
    }

    const { count: challCount } = await supabase
      .from('challenge_participants')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    const dateStr = today.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const text =
      `${header('📈', `Rapport quotidien — ${dateStr}`)}\n\n` +
      `👥 Utilisateurs actifs aujourd'hui : <b>${users.size}</b>\n` +
      `📖 Versets mémorisés : <b>${verses}</b>\n` +
      `✅ Sourates complétées : <b>${completed}</b>\n` +
      `🏆 Participations challenges : <b>${challCount || 0}</b>\n\n` +
      `<i>Rapport automatique MyHafizz Admin Bot</i>`;

    await bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
  } catch (err) {
    console.error('[Daily report error]', err);
  }
}

export async function handleAlertsMenu(bot, chatId) {
  const text =
    `${header('🔔', 'Alertes & Notifications')}\n\n` +
    `🟢 = Activé  |  🔴 = Désactivé\n\n` +
    `⏰ Heure rapport quotidien : <b>${alertSettings.dailyReportHour}h00</b>`;

  await bot.sendMessage(chatId, text, {
    parse_mode: 'HTML',
    reply_markup: alertsMenuKeyboard(alertSettings),
  });
}

export async function handleAlertToggleDailyReport(bot, chatId) {
  alertSettings.dailyReport = !alertSettings.dailyReport;
  saveSettings();
  scheduleDailyReport(bot);
  const status = alertSettings.dailyReport ? '🟢 activé' : '🔴 désactivé';
  await bot.sendMessage(chatId, `🔔 Rapport quotidien <b>${status}</b>.`, {
    parse_mode: 'HTML',
    reply_markup: alertsMenuKeyboard(alertSettings),
  });
}

export async function handleAlertToggleNewUser(bot, chatId) {
  alertSettings.newUserAlert = !alertSettings.newUserAlert;
  saveSettings();
  const status = alertSettings.newUserAlert ? '🟢 activé' : '🔴 désactivé';
  await bot.sendMessage(chatId, `🎉 Alerte nouveau user <b>${status}</b>.`, {
    parse_mode: 'HTML',
    reply_markup: alertsMenuKeyboard(alertSettings),
  });
}

export async function handleAlertToggleCompletion(bot, chatId) {
  alertSettings.completionAlert = !alertSettings.completionAlert;
  saveSettings();
  const status = alertSettings.completionAlert ? '🟢 activé' : '🔴 désactivé';
  await bot.sendMessage(chatId, `🏆 Alerte complétion <b>${status}</b>.`, {
    parse_mode: 'HTML',
    reply_markup: alertsMenuKeyboard(alertSettings),
  });
}

// State for hour configuration flow
const setTimeFlows = {};

export async function handleAlertSetTime(bot, chatId) {
  setTimeFlows[chatId] = true;
  await bot.sendMessage(
    chatId,
    `⏰ <b>Configurer l'heure du rapport quotidien</b>\n\nEntrez l'heure souhaitée (0-23) :\n\n<i>Ex: 8 pour 8h00, 20 pour 20h00</i>`,
    { parse_mode: 'HTML' }
  );
}

export async function handleAlertSetTimeFlow(bot, chatId, text) {
  if (!setTimeFlows[chatId]) return false;

  const hour = parseInt(text, 10);
  if (isNaN(hour) || hour < 0 || hour > 23) {
    await bot.sendMessage(chatId, '❌ Heure invalide. Entrez un nombre entre 0 et 23.');
    return true;
  }

  alertSettings.dailyReportHour = hour;
  saveSettings();
  delete setTimeFlows[chatId];
  scheduleDailyReport(bot);

  await bot.sendMessage(
    chatId,
    `✅ Heure du rapport quotidien configurée à <b>${hour}h00</b>.`,
    {
      parse_mode: 'HTML',
      reply_markup: alertsMenuKeyboard(alertSettings),
    }
  );
  return true;
}

export function isInSetTimeFlow(chatId) {
  return !!setTimeFlows[chatId];
}

// Broadcast flow
const broadcastFlows = {};

export async function handleAlertBroadcast(bot, chatId) {
  broadcastFlows[chatId] = true;
  await bot.sendMessage(
    chatId,
    `📢 <b>Envoyer une annonce</b>\n\nEntrez le message à envoyer (il sera envoyé uniquement à l'admin pour l'instant) :\n\n<i>Envoyez /start pour annuler.</i>`,
    { parse_mode: 'HTML' }
  );
}

export async function handleBroadcastFlow(bot, chatId, text) {
  if (!broadcastFlows[chatId]) return false;

  delete broadcastFlows[chatId];

  // For now, broadcast only to admin (the bot has no user chat IDs stored)
  await bot.sendMessage(
    chatId,
    `📢 <b>Annonce envoyée :</b>\n\n${escapeHtml(text)}\n\n<i>Note : le broadcast vers les utilisateurs nécessite de stocker leurs chat IDs Telegram.</i>`,
    {
      parse_mode: 'HTML',
      reply_markup: alertsMenuKeyboard(alertSettings),
    }
  );
  return true;
}

export function isInBroadcastFlow(chatId) {
  return !!broadcastFlows[chatId];
}
