import React, { useEffect, useState } from "react";
import { SOURCES, getSrc, setSrc, srcOf, tafsirOne } from "@/lib/tafsir";
import { haptic } from "@/hooks/usePlatform";

/** Choix du tafsir (le dernier choix est gardé). */
export function TafsirChips({ value, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
      {SOURCES.map((s) => (
        <button key={s.key} onClick={() => { haptic(); setSrc(s.key); onChange(s.key); }}
          className={`shrink-0 h-9 px-3 rounded-xl border-2 font-extrabold text-[13px] ${value === s.key ? "border-primary bg-accent text-accent-foreground" : "border-border bg-card"}`}>
          {s.label}{s.lang === "fr" ? " · FR" : " · AR"}
        </button>
      ))}
    </div>
  );
}

/** Texte d'une explication, fidèle à la source. */
export function TafsirText({ src, data, compact }) {
  const s = srcOf(src);
  if (!data?.body) return <p className="text-[13px] font-semibold text-muted-foreground">Pas d'explication pour ce verset dans ce tafsir.</p>;
  const group = data.from !== data.to ? `Explication des versets ${data.from} à ${data.to}` : null;
  return (
    <div className="rounded-2xl border-2 border-accent bg-accent/40 p-3.5">
      {group && <p className="text-[12px] font-black text-muted-foreground mb-1.5">{group}</p>}
      {s.lang === "ar"
        ? <div dir="rtl" lang="ar" className={`font-arabic text-right text-foreground leading-[2] whitespace-pre-line ${compact ? "text-[18px] max-h-[50vh] overflow-y-auto" : "text-[19px]"}`}>{data.body}</div>
        : <p className="text-[15px] font-semibold leading-relaxed text-foreground/85 whitespace-pre-line">{data.body}</p>}
      <p className="text-[11.5px] font-bold text-muted-foreground mt-2">{s.credit}</p>
    </div>
  );
}

/** Panneau « Explication » d'un verset (utilisé dans la lecture du Coran). */
export default function TafsirPanel({ surah, ayah }) {
  const [src, setS] = useState(getSrc());
  const [state, setState] = useState("loading");
  useEffect(() => {
    let alive = true; setState("loading");
    tafsirOne(src, surah, ayah).then((d) => alive && setState(d || "none"), () => alive && setState("error"));
    return () => { alive = false; };
  }, [src, surah, ayah]);
  return (
    <div className="mt-2 space-y-2.5">
      <TafsirChips value={src} onChange={setS} />
      {state === "loading" ? <p className="text-[13px] font-semibold text-muted-foreground">Chargement…</p>
        : state === "error" ? <p className="text-[13px] font-semibold text-muted-foreground">Explication indisponible pour le moment. Vérifie ta connexion.</p>
        : <TafsirText src={src} data={state === "none" ? null : state} compact />}
    </div>
  );
}
