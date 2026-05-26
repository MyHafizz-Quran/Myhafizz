import { supabase } from '../supabase.js';
import { partnersMenuKeyboard } from '../utils/keyboard.js';
import {
  header,
  formatNumber,
  formatLevel,
  escapeHtml,
} from '../utils/format.js';

export async function handlePartnersMenu(bot, chatId) {
  await bot.sendMessage(
    chatId,
    `${header('🤝', 'Partenaires d\'Étude')}\n\nQue souhaitez-vous consulter ?`,
    { parse_mode: 'HTML', reply_markup: partnersMenuKeyboard() }
  );
}

export async function handlePartnersProfiles(bot, chatId) {
  try {
    const { count, error } = await supabase
      .from('study_profiles')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;

    const { count: visibleCount } = await supabase
      .from('study_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_visible', true);

    const text =
      `${header('👥', 'Profils d\'Étude Créés')}\n\n` +
      `👥 <b>Total profils :</b> ${formatNumber(count || 0)}\n` +
      `👁️ <b>Profils visibles :</b> ${formatNumber(visibleCount || 0)}\n` +
      `🙈 <b>Profils masqués :</b> ${formatNumber((count || 0) - (visibleCount || 0))}\n\n` +
      `<i>Données issues de study_profiles</i>`;

    await bot.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: backButton(),
    });
  } catch (err) {
    await sendError(bot, chatId, err);
  }
}

export async function handlePartnersActive(bot, chatId) {
  try {
    const { count, error } = await supabase
      .from('study_matches')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'accepted');

    if (error) throw error;

    const text =
      `${header('🤝', 'Matches Actifs')}\n\n` +
      `🤝 <b>Matches acceptés :</b> ${formatNumber(count || 0)}\n\n` +
      `<i>Partenaires d'étude en collaboration active</i>`;

    await bot.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: backButton(),
    });
  } catch (err) {
    await sendError(bot, chatId, err);
  }
}

export async function handlePartnersPending(bot, chatId) {
  try {
    const { count: pendingCount, error: pendErr } = await supabase
      .from('study_matches')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (pendErr) throw pendErr;

    const { count: rejectedCount } = await supabase
      .from('study_matches')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'rejected');

    const { data: pending, error: listErr } = await supabase
      .from('study_matches')
      .select('requester_name, requester_email, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5);

    if (listErr) throw listErr;

    const lines = (pending || []).map((m) => {
      const name = escapeHtml(m.requester_name || m.requester_email || 'Inconnu');
      return `• <b>${name}</b>`;
    });

    const text =
      `${header('⏳', 'Demandes en Attente')}\n\n` +
      `⏳ <b>En attente :</b> ${formatNumber(pendingCount || 0)}\n` +
      `❌ <b>Refusés :</b> ${formatNumber(rejectedCount || 0)}\n\n` +
      (lines.length > 0 ? `<b>Dernières demandes :</b>\n${lines.join('\n')}` : '');

    await bot.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: backButton(),
    });
  } catch (err) {
    await sendError(bot, chatId, err);
  }
}

export async function handlePartnersByLevel(bot, chatId) {
  try {
    const { data, error } = await supabase
      .from('study_profiles')
      .select('level');

    if (error) throw error;

    const levelMap = {};
    for (const row of data || []) {
      const lvl = row.level || 'unknown';
      levelMap[lvl] = (levelMap[lvl] || 0) + 1;
    }

    const total = Object.values(levelMap).reduce((s, v) => s + v, 0);
    const lines = Object.entries(levelMap)
      .sort((a, b) => b[1] - a[1])
      .map(([lvl, cnt]) => {
        const pct = total > 0 ? Math.round((cnt / total) * 100) : 0;
        return `${formatLevel(lvl)} : <b>${cnt}</b> (${pct}%)`;
      });

    const text =
      `${header('📊', 'Profils par Niveau')}\n\n` +
      `👥 <b>Total profils :</b> ${formatNumber(total)}\n\n` +
      lines.join('\n');

    await bot.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: backButton(),
    });
  } catch (err) {
    await sendError(bot, chatId, err);
  }
}

function backButton() {
  return { inline_keyboard: [[{ text: '🔙 Retour Partenaires', callback_data: 'menu_partners' }]] };
}

async function sendError(bot, chatId, err) {
  console.error('[Partners handler error]', err);
  await bot.sendMessage(
    chatId,
    `❌ <b>Erreur</b> : ${escapeHtml(err.message || 'Erreur inconnue')}`,
    {
      parse_mode: 'HTML',
      reply_markup: backButton(),
    }
  );
}
