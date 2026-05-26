// Text-based bar chart generator using █ characters

const MAX_BAR_WIDTH = 20;

/**
 * Generate a horizontal bar chart
 * @param {Array<{label: string, value: number}>} data
 * @param {string} unit - unit label (optional)
 * @returns {string}
 */
export function barChart(data, unit = '') {
  if (!data || data.length === 0) return 'Aucune donnée disponible';

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  const lines = data.map((d) => {
    const barLen = Math.round((d.value / maxValue) * MAX_BAR_WIDTH);
    const bar = '█'.repeat(barLen) || '▏';
    const label = d.label.padEnd(4, ' ');
    const valueStr = String(d.value).padStart(4, ' ');
    return `${label} ${bar} ${valueStr}${unit ? ' ' + unit : ''}`;
  });

  return lines.join('\n');
}

/**
 * Generate data array for last N days
 * @param {Array<{date: string, count: number}>} rows - rows with date and count
 * @param {number} days - number of days to display
 * @returns {Array<{label: string, value: number}>}
 */
export function buildDailyData(rows, days = 7) {
  const result = [];
  const dayLabels = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().split('T')[0];
    const label = dayLabels[d.getDay()];

    const found = rows.find((r) => r.date === dateKey);
    result.push({ label, value: found ? Number(found.count) : 0 });
  }

  return result;
}
