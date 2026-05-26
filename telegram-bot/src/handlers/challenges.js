import { supabase } from '../supabase.js';
import { challengesMenuKeyboard } from '../utils/keyboard.js';
import {
  header,
  formatDate,
  formatDateTime,
  formatNumber,
  formatChallengeStatus,
  escapeHtml,
} from '../utils/format.js';
import { getSurahName } from '../utils/quranData.js';

// Temporary in-memory state for challenge creation flow
const createFlows = {};

export async function handleChallengesMenu(bot, chatId) {
  await bot.sendMessage(
    chatId,
    `${header('🏆', 'Challenges')}\n\nQue souhaitez-vous consulter ?`,
    { parse_mode: 'HTML', reply_markup: challengesMenuKeyboard() }
  );
}

export async function handleChallengesActive(bot, chatId) {
  try {
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      await bot.sendMessage(chatId, `${header('🟢', 'Challenges Actifs')}\n\n📭 Aucun challenge actif pour le moment.`, {
        parse_mode: 'HTML',
        reply_markup: backButton(),
      });
      return;
    }

    const lines = data.map((c, i) => formatChallenge(c, i));
    const text = `${header('🟢', 'Challenges Actifs')}\n\n${lines.join('\n\n')}`;

    await bot.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: backButton(),
    });
  } catch (err) {
    await sendError(bot, chatId, err);
  }
}

export async function handleChallengesAll(bot, chatId) {
  try {
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    if (!data || data.length === 0) {
      await bot.sendMessage(chatId, `${header('📋', 'Tous les Challenges')}\n\n📭 Aucun challenge trouvé.`, {
        parse_mode: 'HTML',
        reply_markup: backButton(),
      });
      return;
    }

    const lines = data.map((c, i) => formatChallenge(c, i));
    const text =
      `${header('📋', `Tous les Challenges (${data.length})`)}\n\n` +
      lines.join('\n\n');

    await bot.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: backButton(),
    });
  } catch (err) {
    await sendError(bot, chatId, err);
  }
}

export async function handleChallengesParticipants(bot, chatId) {
  try {
    const { data: challenges, error: chalErr } = await supabase
      .from('challenges')
      .select('id, title, is_active');
    if (chalErr) throw chalErr;

    const { data: parts, error: partErr } = await supabase
      .from('challenge_participants')
      .select('challenge_id, completed');
    if (partErr) throw partErr;

    if (!challenges || challenges.length === 0) {
      await bot.sendMessage(chatId, '📭 Aucun challenge trouvé.', { reply_markup: backButton() });
      return;
    }

    const countMap = {};
    const completedMap = {};
    for (const p of parts || []) {
      countMap[p.challenge_id] = (countMap[p.challenge_id] || 0) + 1;
      if (p.completed) completedMap[p.challenge_id] = (completedMap[p.challenge_id] || 0) + 1;
    }

    const totalParticipants = Object.values(countMap).reduce((s, v) => s + v, 0);

    const lines = challenges.map((c) => {
      const cnt = countMap[c.id] || 0;
      const comp = completedMap[c.id] || 0;
      const status = c.is_active ? '🟢' : '🔴';
      return `${status} <b>${escapeHtml(c.title)}</b>\n   👥 ${cnt} participants | ✅ ${comp} complétés`;
    });

    const text =
      `${header('👥', 'Participants aux Challenges')}\n\n` +
      `📊 <b>Total participants :</b> ${formatNumber(totalParticipants)}\n\n` +
      lines.join('\n\n');

    await bot.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: backButton(),
    });
  } catch (err) {
    await sendError(bot, chatId, err);
  }
}

export async function handleChallengesRanking(bot, chatId) {
  try {
    const { data, error } = await supabase
      .from('challenge_participants')
      .select('user_name, user_email, memorized_count, completed, challenge_id')
      .order('memorized_count', { ascending: false })
      .limit(10);

    if (error) throw error;

    if (!data || data.length === 0) {
      await bot.sendMessage(chatId, '📭 Aucune donnée de classement.', { reply_markup: backButton() });
      return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    const lines = data.map((p, i) => {
      const medal = medals[i] || `${i + 1}.`;
      const name = escapeHtml(p.user_name || p.user_email || 'Inconnu');
      const comp = p.completed ? ' ✅' : '';
      return `${medal} <b>${name}</b> — ${formatNumber(p.memorized_count)} versets${comp}`;
    });

    const text =
      `${header('🥇', 'Classement des Participants')}\n\n` +
      lines.join('\n');

    await bot.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: backButton(),
    });
  } catch (err) {
    await sendError(bot, chatId, err);
  }
}

export async function handleChallengeCreate(bot, chatId) {
  createFlows[chatId] = { step: 'title' };
  await bot.sendMessage(
    chatId,
    `➕ <b>Créer un nouveau challenge</b>\n\nÉtape 1/5 — Entrez le <b>titre</b> du challenge :\n\n<i>Envoyez /start pour annuler.</i>`,
    { parse_mode: 'HTML' }
  );
}

export async function handleChallengeCreateFlow(bot, chatId, text) {
  const flow = createFlows[chatId];
  if (!flow) return false;

  if (flow.step === 'title') {
    flow.title = text;
    flow.step = 'surah';
    await bot.sendMessage(
      chatId,
      `Étape 2/5 — Entrez le <b>numéro de la sourate</b> (1-114) :\n\n<i>Ex: 67 pour Al-Mulk</i>`,
      { parse_mode: 'HTML' }
    );
    return true;
  }

  if (flow.step === 'surah') {
    const num = parseInt(text, 10);
    if (isNaN(num) || num < 1 || num > 114) {
      await bot.sendMessage(chatId, '❌ Numéro invalide. Entrez un nombre entre 1 et 114.');
      return true;
    }
    flow.surahNumber = num;
    flow.step = 'target';
    await bot.sendMessage(
      chatId,
      `Étape 3/5 — Entrez le <b>nombre de versets cibles</b> :\n\n<i>Ex: 30</i>`,
      { parse_mode: 'HTML' }
    );
    return true;
  }

  if (flow.step === 'target') {
    const num = parseInt(text, 10);
    if (isNaN(num) || num < 1) {
      await bot.sendMessage(chatId, '❌ Nombre invalide. Entrez un entier positif.');
      return true;
    }
    flow.targetVerses = num;
    flow.step = 'deadline';
    await bot.sendMessage(
      chatId,
      `Étape 4/5 — Entrez la <b>deadline</b> (format AAAA-MM-JJ) :\n\n<i>Ex: 2026-04-01</i>`,
      { parse_mode: 'HTML' }
    );
    return true;
  }

  if (flow.step === 'deadline') {
    const d = new Date(text);
    if (isNaN(d.getTime())) {
      await bot.sendMessage(chatId, '❌ Date invalide. Format attendu : AAAA-MM-JJ');
      return true;
    }
    flow.deadline = text;
    flow.step = 'badge';
    await bot.sendMessage(
      chatId,
      `Étape 5/5 — Entrez un <b>emoji badge</b> et son <b>nom</b> séparés par un espace :\n\n<i>Ex: 🏆 Champion</i>`,
      { parse_mode: 'HTML' }
    );
    return true;
  }

  if (flow.step === 'badge') {
    const parts = text.trim().split(' ');
    flow.badgeEmoji = parts[0] || '🏅';
    flow.badgeName = parts.slice(1).join(' ') || 'Badge';
    flow.step = 'confirm';

    const surahName = getSurahName(flow.surahNumber);
    const confirm =
      `📋 <b>Récapitulatif du challenge</b>\n\n` +
      `📌 Titre : ${escapeHtml(flow.title)}\n` +
      `📖 Sourate : ${surahName}\n` +
      `🎯 Versets cibles : ${flow.targetVerses}\n` +
      `⏰ Deadline : ${flow.deadline}\n` +
      `🏅 Badge : ${flow.badgeEmoji} ${escapeHtml(flow.badgeName)}\n\n` +
      `<b>Confirmez-vous la création ? (oui/non)</b>`;

    await bot.sendMessage(chatId, confirm, { parse_mode: 'HTML' });
    return true;
  }

  if (flow.step === 'confirm') {
    if (text.toLowerCase() === 'oui') {
      try {
        const { error } = await supabase.from('challenges').insert({
          title: flow.title,
          surah_number: flow.surahNumber,
          target_verses: flow.targetVerses,
          deadline: flow.deadline,
          badge_emoji: flow.badgeEmoji,
          badge_name: flow.badgeName,
          is_active: true,
        });

        if (error) throw error;

        delete createFlows[chatId];
        await bot.sendMessage(
          chatId,
          `✅ <b>Challenge créé avec succès !</b>\n\n${flow.badgeEmoji} <b>${escapeHtml(flow.title)}</b>`,
          {
            parse_mode: 'HTML',
            reply_markup: backButton(),
          }
        );
      } catch (err) {
        delete createFlows[chatId];
        await sendError(bot, chatId, err);
      }
    } else {
      delete createFlows[chatId];
      await bot.sendMessage(chatId, '❌ Création annulée.', { reply_markup: backButton() });
    }
    return true;
  }

  return false;
}

export function isInCreateFlow(chatId) {
  return !!createFlows[chatId];
}

export function cancelCreateFlow(chatId) {
  delete createFlows[chatId];
}

export async function handleChallengeDisable(bot, chatId) {
  try {
    const { data, error } = await supabase
      .from('challenges')
      .select('id, title')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      await bot.sendMessage(chatId, '📭 Aucun challenge actif à désactiver.', { reply_markup: backButton() });
      return;
    }

    const buttons = data.map((c) => [
      { text: `❌ ${c.title}`, callback_data: `chall_disable_${c.id}` },
    ]);
    buttons.push([{ text: '🔙 Retour Challenges', callback_data: 'menu_challenges' }]);

    await bot.sendMessage(
      chatId,
      `${header('❌', 'Désactiver un Challenge')}\n\nChoisissez le challenge à désactiver :`,
      {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buttons },
      }
    );
  } catch (err) {
    await sendError(bot, chatId, err);
  }
}

export async function handleChallengeDisableConfirm(bot, chatId, challengeId) {
  try {
    const { error } = await supabase
      .from('challenges')
      .update({ is_active: false })
      .eq('id', challengeId);

    if (error) throw error;

    await bot.sendMessage(chatId, '✅ <b>Challenge désactivé avec succès.</b>', {
      parse_mode: 'HTML',
      reply_markup: backButton(),
    });
  } catch (err) {
    await sendError(bot, chatId, err);
  }
}

function formatChallenge(c, i) {
  const status = formatChallengeStatus(c.is_active, c.deadline);
  const surah = c.surah_number ? `📖 ${getSurahName(c.surah_number)}` : '';
  const deadline = c.deadline ? `⏰ Deadline : ${formatDate(c.deadline)}` : '';
  const badge = c.badge_emoji ? `${c.badge_emoji} ${escapeHtml(c.badge_name || '')}` : '';
  return (
    `${i + 1}. ${status} <b>${escapeHtml(c.title)}</b>\n` +
    (surah ? `   ${surah}\n` : '') +
    (c.target_verses ? `   🎯 ${c.target_verses} versets cibles\n` : '') +
    (deadline ? `   ${deadline}\n` : '') +
    (badge ? `   🏅 ${badge}` : '')
  ).trim();
}

function backButton() {
  return { inline_keyboard: [[{ text: '🔙 Retour Challenges', callback_data: 'menu_challenges' }]] };
}

async function sendError(bot, chatId, err) {
  console.error('[Challenges handler error]', err);
  await bot.sendMessage(
    chatId,
    `❌ <b>Erreur</b> : ${escapeHtml(err.message || 'Erreur inconnue')}`,
    {
      parse_mode: 'HTML',
      reply_markup: backButton(),
    }
  );
}
