import React, { useState } from "react";
import { useAvatar } from "@/lib/avatars";

const initialsOf = (name) => String(name || "?").replace(/^@/, "").split(/[._\s-]+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase() || "?";

/** Photo de profil ronde, initiales si le joueur n'a pas de photo. */
export default function PlayerPic({ p, size = 42, ring, className = "", tone = "accent" }) {
  const src = useAvatar(p);
  const [broken, setBroken] = useState(null);
  const name = p?.username || p?.name || p?.display_name || p?.full_name || p?.user_name || "?";
  const style = { width: size, height: size, fontSize: Math.round(size * 0.36) };
  const cls = `rounded-full shrink-0 ${ring ? "ring-[5px] ring-gold ring-offset-2 ring-offset-background" : ""} ${className}`;
  if (src && broken !== src) return <img src={src} alt="" referrerPolicy="no-referrer" loading="lazy" onError={() => setBroken(src)} className={`${cls} object-cover bg-muted`} style={style} />;
  const colors = tone === "primary" ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground";
  return <span className={`${cls} ${colors} flex items-center justify-center font-black leading-none`} style={style}>{initialsOf(name)}</span>;
}
