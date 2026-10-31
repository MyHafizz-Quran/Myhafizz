import React, { useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { WhatsappLogo, ShareNetwork, Copy, Check, DownloadSimple, UsersThree, GraduationCap, House } from "@phosphor-icons/react";
import Sheet from "@/components/community/Sheet";
import MhLogo from "@/components/MhLogo";
import { KIND_LABEL } from "@/api/entities";

const LOGO_LIP = "M48 236V136c0-46 36-74 80-96 44 22 80 50 80 96v100z";
const LOGO = "M48 222V122c0-46 36-74 80-96 44 22 80 50 80 96v100z M80 160q24-14 48 6 24-20 48-6v34q-24-12-48 8-24-20-48-8z";
const KIND_ICON = { class: GraduationCap, family: House, circle: UsersThree };
const shortUrl = (u) => u.replace(/^https?:\/\//, "").replace(/\?.*$/, "");
const memberCount = (g) => (Array.isArray(g?.members) ? g.members.length : g?.members ?? 1);

export function inviteData({ kind, group, stats, name }) {
  const origin = window.location.origin;
  if (kind === "group") {
    // nom, type et hôte dans le lien : la page d'invitation s'affiche même sans compte
    const q = new URLSearchParams({ g: group.name, k: group.kind, ...(name ? { de: name } : {}) });
    const url = `${origin}/rejoindre/${group.invite_code}?${q.toString()}`;
    const where = group.kind === "class" ? "ma classe" : group.kind === "family" ? "notre famille" : group.kind === "duo" ? "mon binôme de révision" : "notre cercle";
    return {
      url,
      title: `Rejoins « ${group.name} »`,
      text: `Salam ! Rejoins ${where} « ${group.name} » sur MyHafizz pour apprendre le Coran ensemble. Ouvre ce lien : ${url} (code ${group.invite_code})`,
    };
  }
  const url = origin;
  const extra = stats?.verses ? ` J'en suis à ${stats.verses} verset${stats.verses > 1 ? "s" : ""} mémorisé${stats.verses > 1 ? "s" : ""}.` : "";
  return {
    url,
    title: "Rejoins-moi sur MyHafizz",
    text: `Salam ! J'apprends le Coran avec MyHafizz : une séance par jour, les révisions au bon moment, et un parcours pour apprendre à lire l'arabe.${extra} Rejoins-moi : ${url}`,
  };
}

/** Image de partage (format statut / story), dessinée sur un canvas */
async function renderCard({ kind, group, name, stats, qrCanvas, data }) {
  const W = 1080, H = 1350, c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d");
  try { await Promise.all(["900", "800"].map((w) => document.fonts.load(`${w} 40px Nunito`))); } catch { /* ignore */ }
  const F = (w, s) => `${w} ${s}px Nunito, system-ui, sans-serif`;
  const rr = (X, Y, w, h, r) => { x.beginPath(); if (x.roundRect) x.roundRect(X, Y, w, h, r); else x.rect(X, Y, w, h); };
  x.fillStyle = "#EFF9F9"; x.fillRect(0, 0, W, H);
  x.fillStyle = "#E5E5E5"; rr(60, 72, W - 120, H - 132, 56); x.fill();
  x.fillStyle = "#FFFFFF"; rr(60, 60, W - 120, H - 132, 56); x.fill();
  x.save(); x.translate(W / 2 - 64, 120); x.scale(0.5, 0.5);
  x.fillStyle = "#007C80"; x.fill(new Path2D(LOGO_LIP)); x.fillStyle = "#00A3A8"; x.fill(new Path2D(LOGO), "evenodd"); x.restore();
  x.textAlign = "center"; x.fillStyle = "#1F2937"; x.font = F(900, 46); x.fillText("MyHafizz", W / 2, 300);
  const wrap = (txt, maxW, y, lh) => {
    const words = txt.split(" "); let line = ""; const lines = [];
    words.forEach((w) => { const t = line ? `${line} ${w}` : w; if (x.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; });
    lines.push(line); lines.slice(0, 3).forEach((l, i) => x.fillText(l, W / 2, y + i * lh)); return y + Math.min(3, lines.length) * lh;
  };
  let y = 400;
  if (kind === "group") {
    const n = memberCount(group);
    x.fillStyle = "#6B7280"; x.font = F(800, 38); x.fillText(`${name || "On"} t'invite à rejoindre`, W / 2, y); y += 82;
    x.fillStyle = "#1F2937"; x.font = F(900, 64); y = wrap(group.name, W - 260, y, 74);
    x.fillStyle = "#00666A"; x.font = F(800, 34); x.fillText(`${KIND_LABEL[group.kind] || "Groupe"} · ${n} membre${n > 1 ? "s" : ""}`, W / 2, y + 10);
    y += 60;
    x.fillStyle = "#D5F3F3"; rr(W / 2 - 250, y, 500, 120, 28); x.fill();
    x.fillStyle = "#00666A"; x.font = F(900, 70); x.fillText(group.invite_code.split("").join(" "), W / 2, y + 84);
    y += 170;
  } else {
    x.fillStyle = "#1F2937"; x.font = F(900, 60);
    y = wrap(`${name || "Un proche"} t'invite à mémoriser le Coran`, W - 240, y, 72) + 10;
    const cells = [[stats?.verses ?? 0, "versets"], [stats?.streak ?? 0, "jours de série"], [stats?.surahs ?? 0, "sourates"]];
    const cw = 270, gap = 24, x0 = (W - (cw * 3 + gap * 2)) / 2;
    cells.forEach(([v, l], i) => {
      const cx = x0 + i * (cw + gap);
      x.fillStyle = "#E5E5E5"; rr(cx, y, cw, 160, 30); x.fill();
      x.fillStyle = "#FFFFFF"; rr(cx + 4, y + 4, cw - 8, 152, 27); x.fill();
      x.fillStyle = i === 1 ? "#C98E14" : "#00A3A8"; x.font = F(900, 64); x.fillText(String(v), cx + cw / 2, y + 86);
      x.fillStyle = "#6B7280"; x.font = F(800, 28); x.fillText(l, cx + cw / 2, y + 128);
    });
    y += 220;
  }
  const q = 300, qx = W / 2 - q / 2, qy = Math.min(y, H - 72 - 150 - q);
  x.fillStyle = "#E5E5E5"; rr(qx - 24, qy - 24, q + 48, q + 48, 32); x.fill();
  x.fillStyle = "#FFFFFF"; rr(qx - 20, qy - 20, q + 40, q + 40, 30); x.fill();
  if (qrCanvas) x.drawImage(qrCanvas, qx, qy, q, q);
  x.fillStyle = "#6B7280"; x.font = F(800, 30); x.fillText("Scanne ou ouvre", W / 2, qy + q + 70);
  x.fillStyle = "#00666A"; x.font = F(900, 34); x.fillText(shortUrl(data.url), W / 2, qy + q + 116);
  return new Promise((res) => c.toBlob((b) => res(b), "image/png"));
}

/**
 * Feuille d'invitation : carte claire + WhatsApp, partage natif, copie du message, image.
 * kind = "app" (inviter un proche) ou "group" (inviter dans un groupe).
 */
export default function InviteSheet({ open, onClose, kind = "app", group, name, stats }) {
  const qrRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const data = useMemo(() => (open && (kind !== "group" || group) ? inviteData({ kind, group, stats, name }) : null), [open, kind, group, stats, name]);
  const Icon = kind === "group" && group ? KIND_ICON[group.kind] || UsersThree : null;
  const n = memberCount(group);

  const whatsapp = () => window.open(`https://wa.me/?text=${encodeURIComponent(data.text)}`, "_blank", "noopener");
  const copy = async () => {
    try { await navigator.clipboard.writeText(data.text); } catch {
      const t = document.createElement("textarea"); t.value = data.text; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove();
    }
    setCopied(true); setTimeout(() => setCopied(false), 1600);
  };
  const image = async () => {
    setBusy(true);
    try {
      const blob = await renderCard({ kind, group, name, stats, qrCanvas: qrRef.current, data });
      const file = new File([blob], kind === "group" ? `invitation-${group.invite_code}.png` : "invitation-myhafizz.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], text: data.text }); return; }
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch { /* partage annulé */ } finally { setBusy(false); }
  };
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: data.title, text: data.text }); } catch { /* annulé */ } return; }
    copy();
  };

  return (
    <Sheet open={!!(open && data)} onClose={onClose} title={kind === "group" ? "Inviter dans le groupe" : "Inviter un proche"}>
      {data && (
        <>
          <div className="rounded-3xl border-2 border-border bg-background p-5 text-center" data-invite-card>
            <div className="flex items-center justify-center gap-2"><MhLogo size={30} /><span className="font-black text-[17px]">MyHafizz</span></div>
            {kind === "group" ? (
              <>
                <p className="text-sm font-extrabold text-muted-foreground mt-4">{name ? `${name} t'invite à rejoindre` : "Invitation à rejoindre"}</p>
                <p className="text-[22px] leading-tight font-black mt-1 break-words">{group.name}</p>
                <p className="text-[13px] font-bold text-accent-foreground mt-1.5 flex items-center justify-center gap-1.5">{Icon && <Icon weight="fill" className="w-4 h-4" />}{KIND_LABEL[group.kind]} · {n} membre{n > 1 ? "s" : ""}</p>
                <div className="mt-4 inline-flex items-center rounded-2xl bg-accent px-5 h-14"><span className="text-[28px] font-black tracking-[0.3em] text-accent-foreground pl-[0.3em]">{group.invite_code}</span></div>
              </>
            ) : (
              <>
                <p className="text-[21px] leading-tight font-black mt-4">{name ? `${name} t'invite à mémoriser le Coran` : "Mémorise le Coran avec MyHafizz"}</p>
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {[[stats?.verses ?? 0, "versets"], [stats?.streak ?? 0, "jours de série"], [stats?.surahs ?? 0, "sourates"]].map(([v, l], i) => (
                    <div key={l} className="rounded-2xl border-2 border-border bg-card py-2.5">
                      <p className={`text-[22px] font-black ${i === 1 ? "text-gold-lip" : "text-primary"}`}>{v}</p>
                      <p className="text-[11px] font-extrabold text-muted-foreground">{l}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div className="mt-4 inline-block rounded-2xl border-2 border-border bg-white p-2.5 leading-none">
              <QRCodeCanvas ref={qrRef} value={data.url} size={132} level="M" fgColor="#00666A" bgColor="#FFFFFF" />
            </div>
            <p className="text-[12.5px] font-extrabold text-muted-foreground mt-2 break-all">{shortUrl(data.url)}</p>
          </div>

          <button onClick={whatsapp} className="btn-relief w-full h-[52px] mt-4 bg-[#25D366] text-white" style={{ "--relief-color": "#1A9E4B" }}><WhatsappLogo weight="fill" className="w-6 h-6" /> Envoyer sur WhatsApp</button>
          <div className="grid grid-cols-3 gap-2.5 mt-3">
            <Action icon={ShareNetwork} label="Partager" onClick={share} />
            <Action icon={copied ? Check : Copy} label={copied ? "Copié" : "Copier"} onClick={copy} on={copied} />
            <Action icon={DownloadSimple} label={busy ? "…" : "Image"} onClick={image} />
          </div>
          <p className="text-xs font-semibold text-muted-foreground text-center mt-3">
            {kind === "group"
              ? group.kind === "class" ? "Tes élèves ouvrent le lien, créent leur compte et arrivent directement dans ta classe." : "Ils ouvrent le lien, créent leur compte et arrivent directement dans le groupe."
              : "L'image est pratique pour un statut WhatsApp ou une story."}
          </p>
        </>
      )}
    </Sheet>
  );
}

function Action({ icon: I, label, onClick, on }) {
  return (
    <button onClick={onClick} className={`h-[68px] rounded-2xl border-2 border-b-4 flex flex-col items-center justify-center gap-1 font-extrabold text-[13px] active:translate-y-[2px] active:border-b-2 ${on ? "border-primary bg-accent text-primary" : "border-border bg-card"}`}>
      <I weight="bold" className="w-6 h-6" />{label}
    </button>
  );
}
