import React, { useState } from "react";
import { ShareNetwork } from "@phosphor-icons/react";
import { shareResult } from "@/lib/shareImage";
import { playerProfile, gradeOf } from "@/lib/games";
import { db } from "@/api/neonClient";
import { haptic } from "@/hooks/usePlatform";
import { report, userMsg } from "@/lib/report";

// Le joueur connecté, avec sa photo (profil ou Google)
async function meCard() {
  let p = {};
  try { p = (await playerProfile()) || {}; } catch { /* hors ligne */ }
  if (!p.image && p.id) { try { const { data } = await db.rpc("avatar_map", { p_ids: [p.id] }); p.image = data?.[0]?.img || null; } catch { /* */ } }
  return { ...p, grade: p.points != null ? gradeOf(p.points).label : null };
}

/** Bouton « Partager » d'un écran de résultat : build(me) renvoie { card, text }. */
export default function ShareResult({ build, className = "", label = "Partager" }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const go = async () => {
    haptic(); setBusy(true); setMsg("");
    try {
      const me = await meCard();
      const { card, text } = build(me);
      const r = await shareResult({ ...card, user: { username: me.username, name: me.name, image: me.image } }, text);
      if (r === "downloaded") setMsg("Image enregistrée, message copié.");
    } catch (e) { if (e?.name !== "AbortError") report(e, "share:result"); }
    setBusy(false);
  };
  return (
    <div className={className}>
      <button onClick={go} disabled={busy} className="w-full h-[52px] rounded-2xl border-2 border-b-[5px] border-border bg-card font-extrabold flex items-center justify-center gap-2 text-primary disabled:opacity-60">
        <ShareNetwork weight="bold" className="w-5 h-5" />{busy ? "Préparation…" : label}
      </button>
      {msg && <p className="text-[12.5px] font-bold text-muted-foreground text-center mt-1.5">{msg}</p>}
    </div>
  );
}
