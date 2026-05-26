import { supabase } from '../supabase.js';
import { usersMenuKeyboard } from '../utils/keyboard.js';
import {
  header,
  formatDate,
  formatNumber,
  getUserDisplayName,
  formatUserLine,
  escapeHtml,
} from '../utils/format.js';

const backButton = { inline_keyboard: [[{ text: '🔙 Retour Utilisateurs', callback_data: 'menu_users' }, { text: '🏠 Menu principal', callback_data: 'menu_main' }]] };

/**
 * Paginate through all Supabase Auth users and return them as a flat array.
 * listUsers returns up to 1000 users per page; we iterate until the page is empty.
 */
export async function getAllAuthUsers() {
  const allUsers = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users || [];
    allUsers.push(...users);
    if (users.length < perPage) break;
    page++;
  }

  return allUsers;
}

export async function handleUsersMenu(bot, chatId) {
  await bot.sendMessage(
    chatId,
    `${header('👥', 'Utilisateurs')}\n\nQue souhaitez-vous consulter ?`,
    { parse_mode: 'HTML', reply_markup: usersMenuKeyboard() }
  );
}

export async function handleUsersTotal(bot, chatId) {
  try {
    const allUsers = await getAllAuthUsers();
    const totalCount = allUsers.length;

    // New signups today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayUsers = allUsers.filter((u) => u.created_at && new Date(u.created_at) >= today);

    // Last registered user
    const sorted = [...allUsers].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const lastUser = sorted[0];
    const lastUserName = lastUser ? escapeHtml(getUserDisplayName(lastUser)) : '—';
    const lastUserDate = lastUser ? formatDate(lastUser.created_at) : '—';

    const text =
      `${header('👥', 'Total Utilisateurs Inscrits')}\n\n` +
      `📊 <b>Total inscrits :</b> ${formatNumber(totalCount)} utilisateurs\n` +
      `🆕 <b>Nouveaux aujourd'hui :</b> ${formatNumber(todayUsers.length)}\n\n` +
      `👤 <b>Dernier inscrit :</b> ${lastUserName}\n` +
      `   📅 Le ${lastUserDate}`;

    await bot.sendMessage(chatId, text, { parse_mode: 'HTML', reply_markup: backButton });
  } catch (err) {
    await sendError(bot, chatId, err);
  }
}

export async function handleUsersNew7d(bot, chatId) {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const allUsers = await getAllAuthUsers();
    const newUsers = allUsers
      .filter((u) => u.created_at && new Date(u.created_at) >= since)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const last5 = newUsers.slice(0, 5);
    const listLines = last5.map((u, i) => formatUserLine(u, i));

    const text =
      `${header('🆕', 'Nouveaux Inscrits (7 derniers jours)')}\n\n` +
      `📊 <b>Nouveaux inscrits :</b> ${formatNumber(newUsers.length)} utilisateurs\n\n` +
      (last5.length > 0
        ? `<b>Les 5 derniers inscrits :</b>\n\n${listLines.join('\n\n')}`
        : `<i>Aucun nouvel inscrit ces 7 derniers jours.</i>`);

    await bot.sendMessage(chatId, text, { parse_mode: 'HTML', reply_markup: backButton });
  } catch (err) {
    await sendError(bot, chatId, err);
  }
}

export async function handleUsersThisMonth(bot, chatId) {
  try {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

    const allUsers = await getAllAuthUsers();
    const monthUsers = allUsers
      .filter((u) => u.created_at && new Date(u.created_at) >= firstDay)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const monthNames = [
      'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
    ];

    const last5 = monthUsers.slice(0, 5);
    const listLines = last5.map((u, i) => formatUserLine(u, i));

    const text =
      `${header('📅', `Inscrits — ${monthNames[now.getMonth()]} ${now.getFullYear()}`)}\n\n` +
      `📊 <b>Inscrits ce mois :</b> ${formatNumber(monthUsers.length)}\n\n` +
      (last5.length > 0
        ? `<b>Les 5 derniers inscrits :</b>\n\n${listLines.join('\n\n')}`
        : `<i>Aucun inscrit ce mois-ci.</i>`);

    await bot.sendMessage(chatId, text, { parse_mode: 'HTML', reply_markup: backButton });
  } catch (err) {
    await sendError(bot, chatId, err);
  }
}

export async function handleUsersMostActive(bot, chatId) {
  try {
    const { data, error } = await supabase
      .from('memorization_progress')
      .select('user_id, memorized_verses, surah_number, last_reviewed');

    if (error) throw error;

    // Aggregate by user_id
    const userMap = {};
    for (const row of data || []) {
      const uid = row.user_id;
      if (!userMap[uid]) {
        userMap[uid] = { user_id: uid, totalVerses: 0, surahCount: 0, lastReviewed: null };
      }
      const verses = Array.isArray(row.memorized_verses) ? row.memorized_verses.length : 0;
      userMap[uid].totalVerses += verses;
      userMap[uid].surahCount += 1;
      if (row.last_reviewed && (!userMap[uid].lastReviewed || row.last_reviewed > userMap[uid].lastReviewed)) {
        userMap[uid].lastReviewed = row.last_reviewed;
      }
    }

    const sorted = Object.values(userMap)
      .sort((a, b) => b.totalVerses - a.totalVerses)
      .slice(0, 10);

    if (sorted.length === 0) {
      await bot.sendMessage(chatId, '📭 Aucune donnée de mémorisation trouvée.', {
        reply_markup: backButton,
      });
      return;
    }

    // Enrich with real user names from auth
    const allUsers = await getAllAuthUsers();
    const userById = {};
    for (const u of allUsers) userById[u.id] = u;

    const lines = sorted.map((u, i) => {
      const authUser = userById[u.user_id];
      const name = authUser ? escapeHtml(getUserDisplayName(authUser)) : `<code>${escapeHtml(u.user_id.substring(0, 8))}…</code>`;
      const email = authUser ? escapeHtml(authUser.email || '') : '';
      const lastSeen = u.lastReviewed ? formatDate(u.lastReviewed) : 'jamais';
      return (
        `${i + 1}. 👤 <b>${name}</b>${email ? ` — ${email}` : ''}\n` +
        `   📖 ${formatNumber(u.totalVerses)} versets | 📚 ${u.surahCount} sourates\n` +
        `   🕐 Dernière révision : ${lastSeen}`
      );
    });

    const text =
      `${header('🏅', 'Top 10 Utilisateurs les Plus Actifs')}\n\n` +
      lines.join('\n\n');

    await bot.sendMessage(chatId, text, { parse_mode: 'HTML', reply_markup: backButton });
  } catch (err) {
    await sendError(bot, chatId, err);
  }
}

export async function handleUsersInactive(bot, chatId) {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get all auth users
    const allUsers = await getAllAuthUsers();

    // Get latest activity from memorization_progress
    const { data: memoData, error: memoErr } = await supabase
      .from('memorization_progress')
      .select('user_id, last_reviewed');

    if (memoErr) throw memoErr;

    const userLatest = {};
    for (const row of memoData || []) {
      const uid = row.user_id;
      if (!userLatest[uid] || (row.last_reviewed && row.last_reviewed > userLatest[uid])) {
        userLatest[uid] = row.last_reviewed;
      }
    }

    // Find auth users with no recent activity (or no activity at all)
    const inactive = allUsers
      .filter((u) => {
        const lastActivity = userLatest[u.id];
        return !lastActivity || new Date(lastActivity) < thirtyDaysAgo;
      })
      .sort((a, b) => {
        const la = userLatest[a.id] || '0';
        const lb = userLatest[b.id] || '0';
        return la < lb ? -1 : la > lb ? 1 : 0;
      })
      .slice(0, 15);

    if (inactive.length === 0) {
      const text =
        `${header('😴', 'Utilisateurs Inactifs (30+ jours)')}\n\n` +
        `✅ Aucun utilisateur inactif depuis plus de 30 jours.`;
      await bot.sendMessage(chatId, text, { parse_mode: 'HTML', reply_markup: backButton });
      return;
    }

    const lines = inactive.map((u, i) => {
      const name = escapeHtml(getUserDisplayName(u));
      const email = u.email ? escapeHtml(u.email) : '—';
      const last = userLatest[u.id] ? formatDate(userLatest[u.id]) : 'jamais';
      return `${i + 1}. 👤 <b>${name}</b> — ${email}\n   🕐 Dernière activité : ${last}`;
    });

    const text =
      `${header('😴', 'Utilisateurs Inactifs (30+ jours)')}\n\n` +
      `😴 <b>${inactive.length}</b> utilisateurs inactifs (affichage des 15 premiers)\n\n` +
      lines.join('\n\n');

    await bot.sendMessage(chatId, text, { parse_mode: 'HTML', reply_markup: backButton });
  } catch (err) {
    await sendError(bot, chatId, err);
  }
}

export async function handleUsersSearch(bot, chatId) {
  await bot.sendMessage(
    chatId,
    `🔍 <b>Rechercher un utilisateur</b>\n\nVeuillez envoyer l'<b>email</b> ou le <b>nom</b> de l'utilisateur à rechercher.\n\n<i>Envoyez /start pour annuler.</i>`,
    { parse_mode: 'HTML' }
  );
}

export async function handleUsersSearchResult(bot, chatId, query) {
  try {
    const q = query.toLowerCase();

    // Search auth users by email or name
    const allUsers = await getAllAuthUsers();
    const matched = allUsers.filter((u) => {
      const email = (u.email || '').toLowerCase();
      const name = getUserDisplayName(u).toLowerCase();
      return email.includes(q) || name.includes(q);
    }).slice(0, 5);

    if (matched.length === 0) {
      await bot.sendMessage(
        chatId,
        `🔍 Aucun résultat trouvé pour : <b>${escapeHtml(query)}</b>`,
        { parse_mode: 'HTML', reply_markup: backButton }
      );
      return;
    }

    // Enrich with memorization stats
    const userIds = matched.map((u) => u.id);
    const { data: memoData } = await supabase
      .from('memorization_progress')
      .select('user_id, memorized_verses')
      .in('user_id', userIds);

    const memoByUser = {};
    for (const row of memoData || []) {
      const verses = Array.isArray(row.memorized_verses) ? row.memorized_verses.length : 0;
      memoByUser[row.user_id] = (memoByUser[row.user_id] || 0) + verses;
    }

    const lines = matched.map((u, i) => {
      const name = escapeHtml(getUserDisplayName(u));
      const email = u.email ? escapeHtml(u.email) : '—';
      const date = formatDate(u.created_at);
      const verses = memoByUser[u.id] ? ` | 📖 ${formatNumber(memoByUser[u.id])} versets` : '';
      return `${i + 1}. 👤 <b>${name}</b> — ${email}\n   📅 Inscrit le ${date}${verses}`;
    });

    const text =
      `${header('🔍', `Résultats pour "${escapeHtml(query)}"`)}\n\n` +
      lines.join('\n\n');

    await bot.sendMessage(chatId, text, { parse_mode: 'HTML', reply_markup: backButton });
  } catch (err) {
    await sendError(bot, chatId, err);
  }
}

async function sendError(bot, chatId, err) {
  console.error('[Users handler error]', err);
  await bot.sendMessage(
    chatId,
    `❌ <b>Erreur</b> : ${escapeHtml(err.message || 'Erreur inconnue')}`,
    { parse_mode: 'HTML', reply_markup: backButton }
  );
}
