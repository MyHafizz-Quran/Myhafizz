// Plugin Babel : entoure chaque texte français de l'interface par __t(...) au moment du build.
// À l'exécution, __t renvoie la version anglaise (i18n/en.json) si l'appareil est en anglais.
// Aucun fichier d'écran n'a besoin d'être modifié. Mode « collect » : sert à extraire les textes (i18n/extract.cjs).
const SKIP_ATTR = /^(className|class|key|to|href|src|id|type|name|role|dir|lang|style|htmlFor|autoComplete|inputMode|enterKeyHint|pattern|accept|rel|target|method|action|value|defaultValue|layoutId|viewBox|d|fill|stroke|transform|xmlns|as|variant|size|weight|mode|data-[\w-]+|form|loading|decoding|crossOrigin|referrerPolicy|sandbox|allow|frameBorder|tone|icon|initial|animate|exit|transition)$/;
const SKIP_PROP = /^(key|id|kind|type|category|status|game|src|lang|url|href|to|path|icon|tone|color|className|cls|queryKey|mutationKey|tag|slug|code|reciter|edition|value|mode|field|unit|route|event|ev|screen|screen_name|method|provider|variant|weight|format|locale|tz|timezone|qkey|ref|font|bg|fg|ring|border|text_cls|anim)$/;
const SKIP_CALLEE = /^(require|import|fetch|report|track|trackPage|identify|navigate|setSearchParams|getItem|setItem|removeItem|from|rpc|select|eq|neq|in|order|filter|match|insert|update|upsert|delete|is|gte|lte|gt|lt|ilike|like|contains|maybeSingle|single|querySelector|querySelectorAll|getElementById|addEventListener|removeEventListener|createElement|setAttribute|getAttribute|classList|add|remove|toggle|replace|split|join|startsWith|endsWith|includes|indexOf|test|exec|Date|RegExp|postMessage|open|send|setHeader|get|has|set|log|warn|error|info|debug|captureException|captureMessage|setTag|setContext|Audio|URL|URLSearchParams|encodeURIComponent|decodeURIComponent|atob|btoa|cx|cn|clsx|twMerge|keyframes|matchMedia|haptic|play|playSfx|sfx|vibrate|invalidateQueries|removeQueries|setQueryData|getQueryData|prefetchQuery|useQuery|__t|__tf)$/;
const ARABIC = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;

function isFrench(s) {
  if (!s || s.length < 2 || s.length > 3000) return false;
  const t = s.trim();
  if (!t || ARABIC.test(t) && !/[a-zà-ÿ]{3,}\s[a-zà-ÿ]{3,}/i.test(t.replace(ARABIC, ''))) return false;
  if (/^(https?:|mailto:|tel:|data:|\/|#|\.|@\/|\.\/)/.test(t)) return false;
  if (/^[\w.-]+\.(js|jsx|css|png|jpg|svg|mp3|json|webp)$/i.test(t)) return false;
  if (/[{}<>;=]|=>|\bfunction\b|^\$/.test(t) && !/[à-ÿ]/i.test(t)) return false;
  // classes Tailwind / identifiants
  if (/^[a-z0-9:\-\/\[\]\.\s_%#()!,&>+*~'"]+$/.test(t) && !/\b(le|la|les|un|une|des|de|du|et|ou|tu|ton|ta|tes|est|pour|avec|sur|dans|pas|plus|à)\b/.test(t)) return false;
  if (/^[A-Z0-9_]+$/.test(t)) return false;
  if (/^[a-z]+[A-Z]\w*$/.test(t)) return false; // camelCase
  return /[a-zà-ÿ]/i.test(t) && (/[à-ÿÀ-Ý’«»]/.test(t) || /\s/.test(t) || /^[A-ZÀ-Ý][a-zà-ÿ]+[.!?…:]?$/.test(t));
}

module.exports = function frPlugin({ types: T }, opts = {}) {
  const collect = opts.collect;
  const wrap = (node) => T.callExpression(T.identifier('__t'), [node]);
  const keep = (path) => {
    let p = path.parentPath, node = path.node;
    if (!p) return false;
    if (p.isImportDeclaration() || p.isExportAllDeclaration() || p.isExportNamedDeclaration() || p.isImportExpression?.()) return false;
    if (p.isObjectProperty() && p.node.key === node) return false;
    if (p.isObjectProperty() && p.node.value === node) {
      const k = p.node.key.name || p.node.key.value;
      if (k && SKIP_PROP.test(k)) return false;
    }
    if (p.isMemberExpression() && p.node.property === node) return false;
    if (p.isBinaryExpression() && /^(===|!==|==|!=|in|instanceof)$/.test(p.node.operator)) return false;
    if (p.isSwitchCase()) return false;
    if (p.isJSXAttribute()) { const n = p.node.name.name; if (typeof n !== 'string' || SKIP_ATTR.test(n)) return false; }
    if (p.isJSXExpressionContainer() && p.parentPath.isJSXAttribute()) { const n = p.parentPath.node.name.name; if (typeof n !== 'string' || SKIP_ATTR.test(n)) return false; }
    if (p.isCallExpression() || p.isNewExpression()) {
      const c = p.node.callee; const nm = c.type === 'MemberExpression' ? (c.property.name || c.property.value) : c.name;
      if (nm && SKIP_CALLEE.test(nm)) return false;
    }
    // valeurs dans des tableaux de clés (queryKey) : on garde, mais pas si parent direct est un tableau sous queryKey
    if (p.isArrayExpression() && p.parentPath.isObjectProperty()) { const k = p.parentPath.node.key.name; if (k && SKIP_PROP.test(k)) return false; }
    if (p.isTaggedTemplateExpression?.()) return false;
    if (p.isVariableDeclarator() && /^(cls|className|classes|style|URL|API|KEY|STORAGE|LS_|.*_KEY)$/i.test(p.node.id.name || '')) return false;
    if (p.isAssignmentExpression() && p.node.left.type === 'MemberExpression' && /^(className|href|src|lang|dir|id)$/.test(p.node.left.property.name)) return false;
    return true;
  };
  return {
    name: 'mh-fr-i18n',
    pre(file) { this.used = new Set(); this.off = /[\\/]lib[\\/]i18n\.js$|node_modules/.test(file.opts.filename || ''); },
    visitor: {
      Program: { enter(path) { if (this.off) path.stop(); }, exit(path) {
        if (collect || !this.used.size) return;
        const spec = [...this.used].map((n) => T.importSpecifier(T.identifier(n), T.identifier(n)));
        path.unshiftContainer('body', T.importDeclaration(spec, T.stringLiteral('@/lib/i18n')));
      } },
      StringLiteral(path) {
        const v = path.node.value;
        if (!collect && (v === 'fr-FR' || v === 'fr') && path.parentPath.isCallExpression() && path.parentPath.node.arguments[0] === path.node) {
          const c = path.parentPath.node.callee; const nm = c.type === 'MemberExpression' ? c.property.name : '';
          if (/^toLocale(Date|Time)?String$/.test(nm)) { this.used.add('__loc'); path.replaceWith(T.identifier('__loc')); return; }
        }
        if (!collect && (v === 'fr-FR' || v === 'fr') && path.parentPath.isNewExpression()) { this.used.add('__loc'); path.replaceWith(T.identifier('__loc')); return; }
        if (!isFrench(v) || !keep(path)) return;
        if (path.parentPath.isCallExpression() && path.parentPath.node.callee.name === '__t') return;
        if (collect) { collect.add(v); return; }
        this.used.add('__t');
        if (path.parentPath.isJSXAttribute()) path.replaceWith(T.jsxExpressionContainer(wrap(T.stringLiteral(v))));
        else path.replaceWith(wrap(T.stringLiteral(v)));
        path.skip();
      },
      JSXText(path) {
        const raw = path.node.value; const v = raw.replace(/\s+/g, ' ').trim();
        const SHORT = /^(ou|et|à|de|du|sur|par|avec|sans|pour|min|jours?|ans|fois|sur \d+)$/;
        if (!isFrench(v) && !/^[A-ZÀ-Ý][a-zà-ÿ]+$/.test(v) && !SHORT.test(v)) return;
        if (!/[a-zà-ÿ]{2,}/i.test(v) && !SHORT.test(v)) return;
        if (collect) { collect.add(v); return; }
        this.used.add('__t');
        const lead = /^\s/.test(raw) && !/\n/.test(raw.match(/^\s*/)[0]) ? ' ' : '';
        const trail = /\s$/.test(raw) && !/\n/.test(raw.match(/\s*$/)[0]) ? ' ' : '';
        path.replaceWith(T.jsxExpressionContainer(wrap(T.stringLiteral(lead + v + trail))));
        path.skip();
      },
      TemplateLiteral(path) {
        if (path.parentPath.isTaggedTemplateExpression()) return;
        // Traduction du Coran selon la langue (fr.hamidullah → en.sahih)
        if (!collect && path.node.quasis.some((x) => x.value.cooked.includes('fr.hamidullah'))) {
          const flat = [];
          path.node.quasis.forEach((x, i) => {
            x.value.cooked.split('fr.hamidullah').forEach((pt, j) => { if (j) flat.push({ e: T.identifier('QTR') }); flat.push({ q: pt }); });
            if (i < path.node.expressions.length) flat.push({ e: path.node.expressions[i] });
          });
          const quasis = [], exprs = []; let cur = '';
          for (const f of flat) { if ('q' in f) cur += f.q; else { quasis.push(T.templateElement({ raw: cur.replace(/[`\\$]/g, '\\$&'), cooked: cur })); exprs.push(f.e); cur = ''; } }
          quasis.push(T.templateElement({ raw: cur.replace(/[`\\$]/g, '\\$&'), cooked: cur }, true));
          this.used.add('QTR');
          path.replaceWith(T.templateLiteral(quasis, exprs));
          path.skip(); return;
        }
        const q = path.node.quasis; const ex = path.node.expressions;
        const tpl = q.map((x, i) => x.value.cooked + (i < ex.length ? `{${i}}` : '')).join('');
        const plain = q.map((x) => x.value.cooked).join(' ');
        if (!isFrench(plain) || !/[a-zà-ÿ]{3,}/i.test(plain) || !keep(path)) return;
        if (/^[a-z0-9:\-\/\[\]\.\s_%#()!,&{}]+$/.test(tpl) && !/[à-ÿ]/.test(tpl) && !/\s(le|la|les|de|du|des|et|tu|à|en)\s/.test(tpl)) return;
        if (/^(https?:|\/)/.test(tpl)) return;
        if (collect) { collect.add(tpl); return; }
        this.used.add('__tf');
        path.replaceWith(T.callExpression(T.identifier('__tf'), [T.stringLiteral(tpl), T.arrayExpression(ex)]));
        path.skip();
      },
    },
  };
};
module.exports.isFrench = isFrench;
