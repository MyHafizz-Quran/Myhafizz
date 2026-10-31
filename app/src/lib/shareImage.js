// Carte image sobre (palette Lagon) pour partager un verset ou un hadith.
function wrap(ctx, text, maxW) {
  const words = text.split(/\s+/); const lines = []; let line = "";
  for (const w of words) { const t = line ? line + " " + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line); return lines;
}
/** Dessine la carte et renvoie un Blob PNG (1080 × 1350). */
export async function renderShareCard({ arabic, french, reference, kind = "Verset du jour", quran = true }) {
  const arFont = quran ? '"Amiri Quran", "Amiri", serif' : '"Amiri", serif';
  try { await Promise.all([document.fonts.load(`62px ${arFont}`), document.fonts.load("600 36px Nunito"), document.fonts.load("800 34px Nunito")]); } catch { /* polices système */ }
  const W = 1080, H = 1350, P = 96;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#EFF9F9"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#FFFFFF"; roundRect(ctx, 48, 48, W - 96, H - 96, 48); ctx.fill();
  ctx.fillStyle = "#00A3A8"; ctx.font = "800 34px Nunito, system-ui, sans-serif"; ctx.textAlign = "left"; ctx.fillText(kind.toUpperCase(), P, 150);
  let y = 250;
  ctx.direction = "rtl"; ctx.textAlign = "right"; ctx.fillStyle = "#0E2A2B";
  let size = arabic.length > 260 ? 44 : arabic.length > 140 ? 52 : 62;
  ctx.font = `${size}px ${arFont}`;
  for (const l of wrap(ctx, arabic, W - 2 * P).slice(0, 9)) { ctx.fillText(l, W - P, y); y += size * 1.75; }
  ctx.direction = "ltr"; ctx.textAlign = "left"; y += 20;
  size = french.length > 420 ? 30 : 36;
  ctx.fillStyle = "#3D5556"; ctx.font = `600 ${size}px Nunito, system-ui, sans-serif`;
  const fr = wrap(ctx, french, W - 2 * P); const maxLines = Math.floor((H - 260 - y) / (size * 1.45));
  fr.slice(0, maxLines).forEach((l, i) => { ctx.fillText(i === maxLines - 1 && fr.length > maxLines ? l + "…" : l, P, y); y += size * 1.45; });
  ctx.fillStyle = "#00666A"; ctx.font = "800 32px Nunito, system-ui, sans-serif"; ctx.fillText(reference, P, H - 170);
  ctx.fillStyle = "#8AA3A4"; ctx.font = "800 30px Nunito, system-ui, sans-serif"; ctx.textAlign = "right"; ctx.fillText("myhafizz.com", W - P, H - 110);
  return new Promise((r) => c.toBlob(r, "image/png"));
}
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

/** Partage natif (WhatsApp, statuts…) ou téléchargement si le partage de fichiers n'est pas possible. */
export async function shareCard(data) {
  const blob = await renderShareCard(data);
  const file = new File([blob], "myhafizz.png", { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], text: "myhafizz.com" }); return "shared"; } catch (e) { if (e?.name === "AbortError") return "cancelled"; }
  }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "myhafizz.png"; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000); return "downloaded";
}
