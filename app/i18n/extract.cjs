// Extrait tous les textes français de src/ vers i18n/fr-strings.json (à traduire dans en.json)
const fs = require('fs'), path = require('path'), babel = require('@babel/core');
const plugin = require('./babel-plugin-fr.cjs');
const set = new Set();
const walk = (d) => fs.readdirSync(d).forEach((f) => { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.(jsx?|tsx?)$/.test(f) && !/\.test\./.test(f)) {
  babel.transformSync(fs.readFileSync(p, 'utf8'), { filename: p, babelrc: false, configFile: false, parserOpts: { plugins: ['jsx'] }, plugins: [[plugin, { collect: set }]] }); } });
walk(path.join(__dirname, '../src'));
const arr = [...set].sort();
fs.writeFileSync(path.join(__dirname, 'fr-strings.json'), JSON.stringify(arr, null, 1));
console.log(arr.length, 'textes');
