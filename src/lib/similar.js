// Versets semblables (mutashâbihât) : index précalculé dans public/data/similar/{sourate}.json
// Format : { "48": [[2,123], ...] } — calculé par similarité de mots (scripts/build-similar.py)
const cache = new Map();
export function loadSimilar(surah) {
  if (!cache.has(surah)) {
    cache.set(surah, fetch(`/data/similar/${surah}.json`).then((r) => (r.ok ? r.json() : {})).catch(() => ({})));
  }
  return cache.get(surah);
}

const DIAC = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u200c]/g;
export const normWord = (w) => w.replace(DIAC, "").replace(/[ٱأإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/ؤ/g, "و").replace(/ئ/g, "ي");

/** Marque les mots de `b` absents de la plus longue sous-suite commune avec `a` */
export function diffWords(aText, bText) {
  const a = aText.split(/\s+/).filter(Boolean), b = bText.split(/\s+/).filter(Boolean);
  const na = a.map(normWord), nb = b.map(normWord);
  const m = na.length, n = nb.length;
  const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
  for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--)
    dp[i][j] = na[i] === nb[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const same = new Set();
  let i = 0, j = 0;
  while (i < m && j < n) {
    if (na[i] === nb[j]) { same.add(j); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
  }
  return b.map((w, k) => ({ w, diff: !same.has(k) && !/^[\u0660-\u0669\u06DD\u06DE\u06E9]+$/.test(w) }));
}
