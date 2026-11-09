// Traduit fr-strings.json → en.json par lots (garde les traductions déjà faites)
import fs from 'node:fs';
const URL = 'https://superagent-54460fe8.base44.app/functions/myhafizzI18nBatch';
const KEY = fs.readFileSync('/tmp/i18n_tok', 'utf8').trim();
const fr = JSON.parse(fs.readFileSync('fr-strings.json', 'utf8'));
const en = fs.existsSync('en.json') ? JSON.parse(fs.readFileSync('en.json', 'utf8')) : {};
const todo = fr.filter((s) => !(s in en));
const B = Number(process.argv[2] || 80), PAR = Number(process.argv[3] || 6);
const batches = []; for (let i = 0; i < todo.length; i += B) batches.push(todo.slice(i, i + B));
console.log(todo.length, 'à traduire en', batches.length, 'lots');
let done = 0, failed = 0;
const one = async (items, tries = 0) => {
  try {
    const r = await fetch(URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key: KEY, items }) });
    const j = await r.json();
    if (!j.t) throw new Error(JSON.stringify(j).slice(0, 120));
    items.forEach((s, i) => { en[s] = j.t[i]; });
    done++; fs.writeFileSync('en.json', JSON.stringify(en, null, 1));
  } catch (e) {
    if (tries < 2) return one(items, tries + 1);
    if (items.length > 10) { const h = Math.ceil(items.length / 2); await one(items.slice(0, h)); await one(items.slice(h)); return; }
    failed++; console.log('échec', e.message);
  }
};
const queue = [...batches];
await Promise.all(Array.from({ length: PAR }, async () => { while (queue.length) await one(queue.shift()); }));
console.log('lots ok', done, 'échecs', failed, 'total traduit', Object.keys(en).length, '/', fr.length);
