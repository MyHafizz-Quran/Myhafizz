// Centrage optique du texte arabe court (lettres, mots, choix de jeux).
// Les polices Amiri / Amiri Quran ont des métriques très hautes : posées dans un
// cadre, les lettres tombent vers le bas, débordent ou chevauchent la ligne
// suivante. Ici on mesure le dessin réel (encre) de chaque texte arabe court et on
// le recentre dans son cadre, en agrandissant la ligne si l'encre ne tient pas.
// Désactivable sur un élément avec data-ar-nofit.

const AR = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
const MAX_LEN = 28;
const cache = new Map();
let cv;

function ink(text, font) {
  const k = font + "|" + text;
  let v = cache.get(k);
  if (!v) {
    cv = cv || document.createElement("canvas").getContext("2d");
    cv.font = font;
    const m = cv.measureText(text);
    v = { a: m.actualBoundingBoxAscent, d: m.actualBoundingBoxDescent };
    if (cache.size > 2000) cache.clear();
    cache.set(k, v);
  }
  return v;
}

const visibleBox = (cs) =>
  parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderBottomWidth) > 0 || cs.backgroundColor !== "rgba(0, 0, 0, 0)" || cs.overflow !== "visible";

// cadre visible proche (3 niveaux) dont ce texte est le seul contenu
function soleFrame(el, text) {
  let c = el.parentElement;
  // élément d'une rangée (flex horizontal) à cadre visible : voisins à côté, pas dessus
  if (c) { const k = getComputedStyle(c); if (k.display.includes("flex") && k.flexDirection === "row" && k.flexWrap === "nowrap" && visibleBox(k)) return c; }
  for (let i = 0; c && i < 3; i++, c = c.parentElement) {
    if (c.textContent.trim() !== text) return null;
    if (visibleBox(getComputedStyle(c))) return c;
  }
  return null;
}

function reset(el) {
  if (!el.__arFit) return;
  const s = el.style, o = el.__arFit;
  s.paddingTop = o.pt; s.paddingBottom = o.pb; s.top = o.top; s.position = o.pos; s.lineHeight = o.lh; s.display = o.disp;
  el.__arFit = null;
}

function fit(el) {
  const text = el.textContent.trim();
  if (!text || text.length > MAX_LEN || !AR.test(text) || el.closest("[data-ar-nofit]")) return;
  if ([...el.childNodes].some((n) => n.nodeType === 1 && n.tagName !== "BR")) return; // texte seul
  reset(el);
  let cs = getComputedStyle(el);
  if (cs.display === "none") return;
  el.__arFit = { pt: el.style.paddingTop, pb: el.style.paddingBottom, top: el.style.top, pos: el.style.position, lh: el.style.lineHeight, disp: el.style.display };
  // mot arabe dans une phrase : bloc en ligne pour que la ligne s'agrandisse si besoin
  // (uniquement au milieu d'un texte latin : les mots d'un verset restent en ligne)
  if (cs.display === "inline") {
    if (!/[A-Za-zÀ-ÿ]/.test(el.parentElement?.textContent || "")) return;
    el.style.display = "inline-block"; cs = getComputedStyle(el);
  }
  const node = [...el.childNodes].find((n) => n.nodeType === 3 && n.data.trim());
  if (!node) return;
  const r = document.createRange(); r.selectNodeContents(node);
  const lines = [...r.getClientRects()].filter((x) => x.width > 0);
  const tops = new Set(lines.map((x) => Math.round(x.top)));
  if (tops.size !== 1) return; // une seule ligne
  const fs = parseFloat(cs.fontSize);
  const m = ink(text, `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`);
  const inkH = m.a + m.d;
  // 1) la ligne doit contenir l'encre avec une petite marge
  const lh = parseFloat(cs.lineHeight) || fs * 1.2;
  if (lh < inkH + fs * 0.16) el.style.lineHeight = `${Math.ceil(inkH + fs * 0.16)}px`;
  // 2) mesure de la ligne de base
  const probe = document.createElement("span");
  probe.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
  el.insertBefore(probe, node);
  const base = probe.getBoundingClientRect().bottom;
  probe.remove();
  const box = el.getBoundingClientRect();
  const ecs = getComputedStyle(el);
  const top = box.top + parseFloat(ecs.borderTopWidth) + parseFloat(ecs.paddingTop);
  const bottom = box.bottom - parseFloat(ecs.borderBottomWidth) - parseFloat(ecs.paddingBottom);
  let frame;
  const dy = Math.round((top + bottom) / 2 - (base + (m.d - m.a) / 2));
  if (visibleBox(ecs)) {
    if (Math.abs(dy) < 2) return;
    // cadre visible : on déplace le contenu en jouant sur les marges internes
    const pt = parseFloat(ecs.paddingTop), pb = parseFloat(ecs.paddingBottom);
    // décalage du centre = (haut - bas) / 2 : on garde le total si possible
    const diff = pt - pb + 2 * dy, total = pt + pb;
    let nt = (total + diff) / 2, nb = (total - diff) / 2;
    if (nb < 0) { nb = 0; nt = diff; }
    if (nt < 0) { nt = 0; nb = -diff; }
    el.style.paddingTop = `${nt}px`;
    el.style.paddingBottom = `${nb}px`;
  } else if ((frame = soleFrame(el, text))) {
    // seul texte d'un cadre (aperçu de lettre, ligne de liste) : on le centre dans ce cadre
    const f = frame.getBoundingClientRect(), fcs = getComputedStyle(frame);
    const ft = f.top + parseFloat(fcs.borderTopWidth) + parseFloat(fcs.paddingTop);
    const fb = f.bottom - parseFloat(fcs.borderBottomWidth) - parseFloat(fcs.paddingBottom);
    const fdy = Math.round((ft + fb) / 2 - (base + (m.d - m.a) / 2));
    if (Math.abs(fdy) >= 2 && fb - ft >= inkH) {
      if (ecs.position === "static") el.style.position = "relative";
      el.style.top = `${fdy}px`;
    }
  } else {
    // pas de cadre visible : on ne déplace rien, on réserve seulement la place de
    // l'encre qui dépasse (jamais de chevauchement avec le texte voisin)
    const inkTop = base - m.a, inkBot = base + m.d;
    const over = Math.ceil(Math.max(0, box.top - inkTop) + 1), under = Math.ceil(Math.max(0, inkBot - box.bottom) + 1);
    if (over > 2) el.style.paddingTop = `${parseFloat(ecs.paddingTop) + over}px`;
    if (under > 2) el.style.paddingBottom = `${parseFloat(ecs.paddingBottom) + under}px`;
  }
}

let queued = new Set(), raf = 0;
function flush() {
  raf = 0;
  const els = [...queued]; queued = new Set();
  for (const el of els) if (el.isConnected) { try { fit(el); } catch { /* jamais bloquant */ } }
}
function queue(root) {
  if (!root || root.nodeType !== 1) root = root?.parentElement;
  if (!root) return;
  const list = root.matches?.(".font-arabic, .font-arabic *") ? [root] : [];
  root.querySelectorAll?.(".font-arabic, .font-arabic *").forEach((e) => list.push(e));
  for (const e of list) queued.add(e);
  if (!raf) raf = requestAnimationFrame(flush);
}

export function startArabicFit() {
  if (typeof window === "undefined" || window.__arFitOn) return;
  window.__arFitOn = true;
  queue(document.body);
  new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === "characterData") queue(m.target.parentElement);
      else m.addedNodes.forEach((n) => queue(n.nodeType === 1 ? n : n.parentElement));
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
  document.fonts?.addEventListener?.("loadingdone", () => { cache.clear(); queue(document.body); });
  let t; window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(() => queue(document.body), 150); });
}
