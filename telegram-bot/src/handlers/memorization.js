import { supabase } from '../supabase.js';
import { memorizationMenuKeyboard } from '../utils/keyboard.js';
import {
  header,
  formatDate,
  formatNumber,
  escapeHtml,
} from '../utils/format.js';
import { getSurahName } from '../utils/quranData.js';

export async function handleMemorizationMenu(bot, chatId) {
  await bot.sendMessage(
    chatId,
    `${header('📖', 'Mémorisation')}\n\nQue souhaitez-vous consulter ?`,
    { parse_mode: 'HTML', reply_markup: memorizationMenuKeyboard() }
  );
}

export async function handleMemoTotalVerses(bot, chatId) {
  try {
    const { data, error } = await supabase
      .from('memorization_progress')
      .select('memorized_verses');

    if (error) throw error;

    let total = 0;
    for (const row of data || []) {
      if (Array.isArray(row.memorized_verses)) {
        total += row.memorized_verses.length;
      }
    }

    const text =
      `${header('📊', 'Total Versets Mémorisés')}\n\n` +
      `📖 <b>Total global :</b> ${formatNumber(total)} versets\n\n` +
      `<i>Cumulé pour tous les utilisateurs de MyHafizz</i>`;

    await bot.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: backButton(),
    });
  } catch (err) {
    await sendError(bot, chatId, err);
  }
}

export async function handleMemoCompleted(bot, chatId) {
  try {
    const { data, count, error } = await supabase
      .from('memorization_progress')
      .select('surah_number, user_id', { count: 'exact' })
      .eq('status', 'completed');

    if (error) throw error;

    // Count unique surahs completed
    const surahCounts = {};
    for (const row of data || []) {
      surahCounts[row.surah_number] = (surahCounts[row.surah_number] || 0) + 1;
    }

    const top5 = Object.entries(surahCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([num, cnt]) => `  • ${getSurahName(Number(num))} — ${cnt}x`);

    const text =
      `${header('✅', 'Sourates Complétées')}\n\n` +
      `✅ <b>Total complétions :</b> ${formatNumber(count || 0)}\n` +
      `📚 <b>Sourates distinctes :</b> ${Object.keys(surahCounts).length}\n\n` +
      (top5.length > 0 ? `🏆 <b>Top 5 sourates :</b>\n${top5.join('\n')}` : '');

    await bot.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: backButton(),
    });
  } catch (err) {
    await sendError(bot, chatId, err);
  }
}

export async function handleMemoInProgress(bot, chatId) {
  try {
    const { count, error } = await supabase
      .from('memorization_progress')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'in_progress');

    if (error) throw error;

    const { count: notStarted } = await supabase
      .from('memorization_progress')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'not_started');

    const text =
      `${header('🔄', 'Sourates en Cours')}\n\n` +
      `🔄 <b>En cours :</b> ${formatNumber(count || 0)}\n` +
      `⏳ <b>Pas encore commencées :</b> ${formatNumber(notStarted || 0)}\n\n` +
      `<i>Nombre d'entrées dans memorization_progress</i>`;

    await bot.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: backButton(),
    });
  } catch (err) {
    await sendError(bot, chatId, err);
  }
}

export async function handleMemoRecent(bot, chatId) {
  try {
    const { data, error } = await supabase
      .from('memorization_progress')
      .select('user_id, surah_number, memorized_verses, status, updated_at')
      .order('updated_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    if (!data || data.length === 0) {
      await bot.sendMessage(chatId, '📭 Aucune activité récente.', { reply_markup: backButton() });
      return;
    }

    const lines = (data || []).map((row, i) => {
      const verses = Array.isArray(row.memorized_verses) ? row.memorized_verses.length : 0;
      const status = statusEmoji(row.status);
      const date = formatDate(row.updated_at);
      return (
        `${i + 1}. ${status} <b>${getSurahName(row.surah_number)}</b>\n` +
        `   📖 ${verses} versets | 🆔 <code>${escapeHtml(row.user_id.substring(0, 8))}…</code>\n` +
        `   📅 ${date}`
      );
    });

    const text =
      `${header('🆕', 'Mémorisations Récentes (Top 10)')}\n\n` +
      lines.join('\n\n');

    await bot.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: backButton(),
    });
  } catch (err) {
    await sendError(bot, chatId, err);
  }
}

export async function handleMemoTop10(bot, chatId) {
  try {
    const { data, error } = await supabase
      .from('memorization_progress')
      .select('user_id, memorized_verses, surah_number, status');

    if (error) throw error;

    // Aggregate by user
    const userMap = {};
    for (const row of data || []) {
      const uid = row.user_id;
      if (!userMap[uid]) {
        userMap[uid] = { totalVerses: 0, completedSurahs: 0, surahCount: 0 };
      }
      const verses = Array.isArray(row.memorized_verses) ? row.memorized_verses.length : 0;
      userMap[uid].totalVerses += verses;
      userMap[uid].surahCount += 1;
      if (row.status === 'completed') userMap[uid].completedSurahs += 1;
    }

    const top10 = Object.entries(userMap)
      .sort((a, b) => b[1].totalVerses - a[1].totalVerses)
      .slice(0, 10);

    if (top10.length === 0) {
      await bot.sendMessage(chatId, '📭 Aucune donnée disponible.', { reply_markup: backButton() });
      return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    const lines = top10.map(([uid, stats], i) => {
      const medal = medals[i] || `${i + 1}.`;
      return (
        `${medal} <code>${escapeHtml(uid.substring(0, 8))}…</code>\n` +
        `   📖 ${formatNumber(stats.totalVerses)} versets | ✅ ${stats.completedSurahs} sourates complètes`
      );
    });

    const text =
      `${header('🏅', 'Top 10 Mémorisateurs')}\n\n` +
      lines.join('\n\n');

    await bot.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: backButton(),
    });
  } catch (err) {
    await sendError(bot, chatId, err);
  }
}

export async function handleMemoAverage(bot, chatId) {
  try {
    const { data, error } = await supabase
      .from('memorization_progress')
      .select('user_id, memorized_verses');

    if (error) throw error;

    const userTotals = {};
    for (const row of data || []) {
      const uid = row.user_id;
      if (!userTotals[uid]) userTotals[uid] = 0;
      if (Array.isArray(row.memorized_verses)) {
        userTotals[uid] += row.memorized_verses.length;
      }
    }

    const values = Object.values(userTotals);
    const nbUsers = values.length;
    const totalVerses = values.reduce((s, v) => s + v, 0);
    const average = nbUsers > 0 ? Math.round(totalVerses / nbUsers) : 0;

    const text =
      `${header('📉', 'Progression Moyenne')}\n\n` +
      `👥 <b>Utilisateurs avec données :</b> ${formatNumber(nbUsers)}\n` +
      `📖 <b>Total versets :</b> ${formatNumber(totalVerses)}\n` +
      `📊 <b>Moyenne par utilisateur :</b> ${formatNumber(average)} versets\n\n` +
      `<i>Calculé sur tous les utilisateurs ayant au moins une entrée</i>`;

    await bot.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: backButton(),
    });
  } catch (err) {
    await sendError(bot, chatId, err);
  }
}

function statusEmoji(status) {
  if (status === 'completed') return '✅';
  if (status === 'in_progress') return '🔄';
  return '⏳';
}

function backButton() {
  return { inline_keyboard: [[{ text: '🔙 Retour Mémorisation', callback_data: 'menu_memorization' }]] };
}

async function sendError(bot, chatId, err) {
  console.error('[Memorization handler error]', err);
  await bot.sendMessage(
    chatId,
    `❌ <b>Erreur</b> : ${escapeHtml(err.message || 'Erreur inconnue')}`,
    {
      parse_mode: 'HTML',
      reply_markup: backButton(),
    }
  );
}
