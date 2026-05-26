import { supabase } from '../supabase.js';
import { trendsMenuKeyboard } from '../utils/keyboard.js';
import { header, escapeHtml } from '../utils/format.js';
import { barChart, buildDailyData } from '../utils/chart.js';

export async function handleTrendsMenu(bot, chatId) {
  await bot.sendMessage(
    chatId,
    `${header('📈', 'Tendances')}\n\nQue souhaitez-vous visualiser ?`,
    { parse_mode: 'HTML', reply_markup: trendsMenuKeyboard() }
  );
}

export async function handleTrendsUsers(bot, chatId) {
  try {
    // Get memorization_progress entries grouped by day (as proxy for user activity)
    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('memorization_progress')
      .select('user_id, created_at')
      .gte('created_at', since.toISOString());

    if (error) throw error;

    // Group unique users by day
    const dayUserMap = {};
    for (const row of data || []) {
      const dateKey = row.created_at.split('T')[0];
      if (!dayUserMap[dateKey]) dayUserMap[dateKey] = new Set();
      dayUserMap[dateKey].add(row.user_id);
    }

    const rows = Object.entries(dayUserMap).map(([date, users]) => ({
      date,
      count: users.size,
    }));

    const chartData = buildDailyData(rows, 7);
    const total = chartData.reduce((s, d) => s + d.value, 0);
    const avg = chartData.length > 0 ? Math.round(total / chartData.length) : 0;

    const chart = barChart(chartData, 'users');

    const text =
      `${header('📈', 'Croissance Utilisateurs Actifs (7 jours)')}\n\n` +
      `<pre>${chart}</pre>\n\n` +
      `📊 Total : ${total} | Moy : ${avg}/jour`;

    await bot.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: backButton(),
    });
  } catch (err) {
    await sendError(bot, chatId, err);
  }
}

export async function handleTrendsActivity(bot, chatId) {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('memorization_progress')
      .select('memorized_verses, updated_at')
      .gte('updated_at', since.toISOString());

    if (error) throw error;

    // Group verses by day
    const dayVerseMap = {};
    for (const row of data || []) {
      const dateKey = row.updated_at.split('T')[0];
      if (!dayVerseMap[dateKey]) dayVerseMap[dateKey] = 0;
      if (Array.isArray(row.memorized_verses)) {
        dayVerseMap[dateKey] += row.memorized_verses.length;
      }
    }

    const rows = Object.entries(dayVerseMap).map(([date, count]) => ({ date, count }));
    const chartData = buildDailyData(rows, 7);
    const total = chartData.reduce((s, d) => s + d.value, 0);
    const avg = chartData.length > 0 ? Math.round(total / chartData.length) : 0;

    const chart = barChart(chartData, 'v');

    const text =
      `${header('📊', 'Activité Quotidienne — Versets (7 jours)')}\n\n` +
      `<pre>${chart}</pre>\n\n` +
      `📖 Total : ${total} versets | Moy : ${avg}/jour`;

    await bot.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: backButton(),
    });
  } catch (err) {
    await sendError(bot, chatId, err);
  }
}

function backButton() {
  return { inline_keyboard: [[{ text: '🔙 Retour Tendances', callback_data: 'menu_trends' }]] };
}

async function sendError(bot, chatId, err) {
  console.error('[Trends handler error]', err);
  await bot.sendMessage(
    chatId,
    `❌ <b>Erreur</b> : ${escapeHtml(err.message || 'Erreur inconnue')}`,
    { parse_mode: 'HTML', reply_markup: backButton() }
  );
}
