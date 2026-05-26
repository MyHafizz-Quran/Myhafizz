import { supabase } from '../supabase.js';
import { statisticsMenuKeyboard } from '../utils/keyboard.js';
import {
  header,
  formatNumber,
  formatDate,
  escapeHtml,
} from '../utils/format.js';
import { getAllAuthUsers } from './users.js';

export async function handleStatisticsMenu(bot, chatId) {
  await bot.sendMessage(
    chatId,
    `${header('📊', 'Statistiques Globales')}\n\nChoisissez la période :`,
    { parse_mode: 'HTML', reply_markup: statisticsMenuKeyboard() }
  );
}

export async function handleStatsToday(bot, chatId) {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  await sendSummary(bot, chatId, since, `📈 Résumé du ${formatDate(since)}`);
}

export async function handleStatsWeek(bot, chatId) {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  await sendSummary(bot, chatId, since, '📅 Résumé des 7 derniers jours');
}

export async function handleStatsMonth(bot, chatId) {
  const now = new Date();
  const since = new Date(now.getFullYear(), now.getMonth(), 1);
  await sendSummary(bot, chatId, since, '📆 Résumé du mois en cours');
}

export async function handleStatsOverview(bot, chatId) {
  await sendSummary(bot, chatId, null, '🌍 Vue d\'ensemble globale');
}

async function sendSummary(bot, chatId, since, title) {
  try {
    const sinceIso = since ? since.toISOString() : null;

    // Memorization data
    let memoQuery = supabase
      .from('memorization_progress')
      .select('user_id, memorized_verses, status, updated_at');
    if (sinceIso) memoQuery = memoQuery.gte('updated_at', sinceIso);
    const { data: memoData, error: memoErr } = await memoQuery;
    if (memoErr) throw memoErr;

    let totalVerses = 0;
    let completedCount = 0;
    const activeUsers = new Set();
    for (const row of memoData || []) {
      if (Array.isArray(row.memorized_verses)) totalVerses += row.memorized_verses.length;
      if (row.status === 'completed') completedCount++;
      activeUsers.add(row.user_id);
    }

    // Challenge participations
    let challQuery = supabase
      .from('challenge_participants')
      .select('*', { count: 'exact', head: true });
    if (sinceIso) challQuery = challQuery.gte('created_at', sinceIso);
    const { count: challCount } = await challQuery;

    // Active challenges total
    const { count: activeChallenges } = await supabase
      .from('challenges')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Study matches
    let matchQuery = supabase
      .from('study_matches')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'accepted');
    if (sinceIso) matchQuery = matchQuery.gte('created_at', sinceIso);
    const { count: matchCount } = await matchQuery;

    // Study profiles
    const { count: profileCount } = await supabase
      .from('study_profiles')
      .select('*', { count: 'exact', head: true });

    // Total registered users (auth)
    let totalRegistered = null;
    try {
      const authUsers = await getAllAuthUsers();
      totalRegistered = authUsers.length;
    } catch (_) {
      // non-blocking — just skip if auth API fails
    }

    const period = since ? `Depuis le ${formatDate(since)}` : 'Toutes périodes confondues';

    const text =
      `${header('📊', title)}\n\n` +
      `📅 <i>${period}</i>\n\n` +
      `<b>👥 Utilisateurs</b>\n` +
      (totalRegistered !== null ? `  • Total inscrits : ${formatNumber(totalRegistered)}\n` : '') +
      `  • Actifs : ${formatNumber(activeUsers.size)}\n\n` +
      `<b>📖 Mémorisation</b>\n` +
      `  • Versets mémorisés : ${formatNumber(totalVerses)}\n` +
      `  • Sourates complétées : ${formatNumber(completedCount)}\n\n` +
      `<b>🏆 Challenges</b>\n` +
      `  • Challenges actifs : ${formatNumber(activeChallenges || 0)}\n` +
      `  • Participations : ${formatNumber(challCount || 0)}\n\n` +
      `<b>🤝 Partenaires d'étude</b>\n` +
      `  • Profils créés : ${formatNumber(profileCount || 0)}\n` +
      `  • Nouveaux matches : ${formatNumber(matchCount || 0)}`;

    await bot.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: backButton(),
    });
  } catch (err) {
    console.error('[Statistics handler error]', err);
    await bot.sendMessage(
      chatId,
      `❌ <b>Erreur</b> : ${escapeHtml(err.message || 'Erreur inconnue')}`,
      { parse_mode: 'HTML', reply_markup: backButton() }
    );
  }
}

function backButton() {
  return { inline_keyboard: [[{ text: '🔙 Retour Statistiques', callback_data: 'menu_statistics' }]] };
}
