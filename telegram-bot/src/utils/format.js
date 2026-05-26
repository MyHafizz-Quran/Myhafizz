// Message formatting helpers

const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

export function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateTime(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()} à ${hours}h${mins}`;
}

export function formatNumber(n) {
  if (n === null || n === undefined) return '0';
  return Number(n).toLocaleString('fr-FR');
}

export function divider() {
  return '━━━━━━━━━━━━━━━━━━━━━━';
}

export function header(icon, title) {
  return `${icon} <b>${title}</b>\n${divider()}`;
}

export function getUserDisplayName(user) {
  if (!user) return 'Utilisateur inconnu';
  const meta = user.user_metadata || user.raw_user_meta_data || {};
  return meta.full_name || meta.name || user.email || 'Anonyme';
}

export function formatUserLine(user, index) {
  const name = getUserDisplayName(user);
  const email = user.email || 'N/A';
  const date = formatDate(user.created_at);
  const prefix = index !== undefined ? `${index + 1}. ` : '• ';
  return `${prefix}<b>${name}</b> — ${email}\n   📅 Inscrit le ${date}`;
}

export function formatProgressBar(value, max, width = 10) {
  if (!max || max === 0) return '░'.repeat(width) + ' 0%';
  const filled = Math.round((value / max) * width);
  const empty = width - filled;
  const pct = Math.round((value / max) * 100);
  return '█'.repeat(filled) + '░'.repeat(empty) + ` ${pct}%`;
}

export function formatLevel(level) {
  const levels = {
    beginner: '🌱 Débutant',
    intermediate: '📖 Intermédiaire',
    advanced: '🔥 Avancé',
    hafidh: '🏆 Hafidh',
  };
  return levels[level] || level || 'Inconnu';
}

export function formatChallengeStatus(isActive, deadline) {
  if (!isActive) return '🔴 Inactif';
  if (deadline && new Date(deadline) < new Date()) return '⌛ Expiré';
  return '🟢 Actif';
}

export function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function getDayLabel(date) {
  return DAYS_FR[date.getDay()];
}
