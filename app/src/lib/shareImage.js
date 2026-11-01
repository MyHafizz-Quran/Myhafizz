// Cartes image sobres (palette Lagon) à partager : verset, hadith, résultats de jeux.
function wrap(ctx, text, maxW) {
  const words = String(text || "").split(/\s+/); const lines = []; let line = "";
  for (const w of words) { const t = line ? line + " " + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line); return lines;
}
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
const loadImg = (src) => new Promise((ok) => {
  if (!src) return ok(null);
  const i = new Image(); i.crossOrigin = "anonymous"; i.referrerPolicy = "no-referrer";
  i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src;
  setTimeout(() => ok(null), 4000);
});
const W = 1080, H = 1350, P = 96, NUN = "Nunito, system-ui, sans-serif";
async function base() {
  try { await Promise.all([document.fonts.load("600 36px Nunito"), document.fonts.load("800 34px Nunito"), document.fonts.load("900 40px Nunito")]); } catch { /* polices système */ }
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#EFF9F9"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#FFFFFF"; roundRect(ctx, 48, 48, W - 96, H - 96, 48); ctx.fill();
  return { c, ctx };
}
// Pied de carte : logo, nom, phrase et adresse
async function footer(ctx) {
  const y = H - 230;
  ctx.fillStyle = "#EEF3F3"; ctx.fillRect(P, y, W - 2 * P, 4);
  const logo = await loadImg("/logo-192.png");
  const ly = y + 44, ls = 84;
  ctx.save(); roundRect(ctx, P, ly, ls, ls, 22); ctx.clip();
  if (logo) ctx.drawImage(logo, P, ly, ls, ls); else { ctx.fillStyle = "#00A3A8"; ctx.fillRect(P, ly, ls, ls); }
  ctx.restore();
  ctx.direction = "ltr"; ctx.textAlign = "left";
  ctx.fillStyle = "#0E2A2B"; ctx.font = `900 36px ${NUN}`; ctx.fillText("MyHafizz", P + ls + 28, ly + 36);
  ctx.fillStyle = "#6B8586"; ctx.font = `700 28px ${NUN}`; ctx.fillText("Mémorise le Coran à ton rythme · myhafizz.com", P + ls + 28, ly + 76);
}
const toBlob = (c) => new Promise((r) => c.toBlob(r, "image/png"));

/** Verset ou hadith du jour (1080 × 1350). */
export async function renderShareCard({ arabic, french, reference, kind = "Verset du jour", quran = true }) {
  const arFont = quran ? '"Amiri Quran", "Amiri", serif' : '"Amiri", serif';
  try { await document.fonts.load(`62px ${arFont}`); } catch { /* */ }
  const { c, ctx } = await base();
  ctx.fillStyle = "#00A3A8"; ctx.font = `800 34px ${NUN}`; ctx.textAlign = "left"; ctx.fillText(kind.toUpperCase(), P, 150);
  let y = 260;
  ctx.direction = "rtl"; ctx.textAlign = "right"; ctx.fillStyle = "#0E2A2B";
  let size = arabic.length > 260 ? 44 : arabic.length > 140 ? 52 : 62;
  ctx.font = `${size}px ${arFont}`;
  for (const l of wrap(ctx, arabic, W - 2 * P).slice(0, 8)) { ctx.fillText(l, W - P, y); y += size * 1.75; }
  ctx.direction = "ltr"; ctx.textAlign = "left"; y += 16;
  size = french.length > 420 ? 30 : 36;
  ctx.fillStyle = "#3D5556"; ctx.font = `600 ${size}px ${NUN}`;
  const fr = wrap(ctx, `« ${french} »`, W - 2 * P); const maxLines = Math.max(1, Math.floor((H - 330 - y) / (size * 1.45)));
  fr.slice(0, maxLines).forEach((l, i) => { ctx.fillText(i === maxLines - 1 && fr.length > maxLines ? l + "…" : l, P, y); y += size * 1.45; });
  ctx.fillStyle = "#00666A"; ctx.font = `800 32px ${NUN}`;
  wrap(ctx, reference, W - 2 * P).slice(0, 2).forEach((l, i) => ctx.fillText(l, P, H - 300 + i * 40 - (wrap(ctx, reference, W - 2 * P).length > 1 ? 40 : 0)));
  await footer(ctx);
  return toBlob(c);
}

/** Résultat de partie : joueur, grand résultat, lignes de détail. */
export async function renderResultCard({ kicker, big, user = {}, sub, rows = [] }) {
  const { c, ctx } = await base();
  ctx.fillStyle = "#00A3A8"; ctx.textAlign = "left";
  let ks = 34; do { ctx.font = `800 ${ks}px ${NUN}`; } while (ctx.measureText(kicker.toUpperCase()).width > W - 2 * P && --ks > 20);
  ctx.fillText(kicker.toUpperCase(), P, 150);
  const fitText = (t, weight, size, maxW) => { let z = size; do { ctx.font = `${weight} ${z}px ${NUN}`; } while (ctx.measureText(t).width > maxW && --z > 18); };
  // joueur
  const ps = 150, py = 220;
  const img = await loadImg(user.image);
  ctx.save(); ctx.beginPath(); ctx.arc(P + ps / 2, py + ps / 2, ps / 2, 0, Math.PI * 2); ctx.clip();
  if (img) ctx.drawImage(img, P, py, ps, ps);
  else {
    ctx.fillStyle = "#D5F3F3"; ctx.fillRect(P, py, ps, ps);
    const ini = String(user.username || user.name || "?").replace(/^@/, "").split(/[._\s-]+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase() || "?";
    ctx.fillStyle = "#00666A"; ctx.font = `900 58px ${NUN}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(ini, P + ps / 2, py + ps / 2 + 3); ctx.textBaseline = "alphabetic";
  }
  ctx.restore();
  const nameW = W - 2 * P - ps - 36, who = user.username ? `@${user.username}` : user.name || "Joueur";
  ctx.textAlign = "left"; ctx.fillStyle = "#0E2A2B"; fitText(who, 900, 50, nameW);
  ctx.fillText(who, P + ps + 36, py + 68);
  if (sub) { ctx.fillStyle = "#6B8586"; fitText(sub, 700, 34, nameW); ctx.fillText(sub, P + ps + 36, py + 118); }
  // résultat
  ctx.fillStyle = "#00666A"; fitText(big, 900, 132, W - 2 * P); ctx.fillText(big, P - 4, py + ps + 190);
  // détails
  let y = py + ps + 280;
  for (const [a, b] of rows.slice(0, 4)) {
    ctx.fillStyle = "#6B8586"; ctx.font = `800 36px ${NUN}`; ctx.textAlign = "left"; ctx.fillText(a, P, y);
    const lw = ctx.measureText(a).width; ctx.fillStyle = "#0E2A2B"; fitText(String(b), 900, 36, W - 2 * P - lw - 40); ctx.textAlign = "right"; ctx.fillText(String(b), W - P, y);
    ctx.fillStyle = "#F2F5F5"; ctx.fillRect(P, y + 28, W - 2 * P, 4);
    y += 92;
  }
  ctx.textAlign = "left";
  await footer(ctx);
  return toBlob(c);
}

async function shareBlob(blob, text) {
  const file = new File([blob], "myhafizz.png", { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], text }); return "shared"; } catch (e) { if (e?.name === "AbortError") return "cancelled"; }
  }
  try { await navigator.clipboard?.writeText(text); } catch { /* */ }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "myhafizz.png"; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000); return "downloaded";
}

/** Partage natif (WhatsApp, statuts…) d'un verset ou d'un hadith, avec un message d'accompagnement. */
export async function shareCard(data) {
  const intro = data.kind?.startsWith("Hadith") ? "Un hadith authentique chaque jour, avec sa source, sur MyHafizz." : "Chaque jour, un verset à méditer et à mémoriser sur MyHafizz.";
  const text = data.text || `« ${data.french} »\n${data.reference}\n\n${intro}\nmyhafizz.com`;
  return shareBlob(await renderShareCard(data), text);
}
/** Partage d'un résultat de jeu. */
export async function shareResult(card, text) {
  return shareBlob(await renderResultCard(card), text);
}
