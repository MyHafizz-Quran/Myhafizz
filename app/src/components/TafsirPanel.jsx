import React, { useEffect, useRef, useState } from "react";
import { SOURCES, getSrc, setSrc, srcOf, tafsirOne } from "@/lib/tafsir";
import { haptic } from "@/hooks/usePlatform";

/** Choix du tafsir (le dernier choix est gardé). */
export function TafsirChips({ value, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
      {SOURCES.map((s) => (
        <button key={s.key} onClick={() => { haptic(); setSrc(s.key); onChange(s.key); }}
          className={`shrink-0 h-9 px-3 rounded-xl border-2 font-extrabold text-[13px] ${value === s.key ? "border-primary bg-accent text-accent-foreground" : "border-border bg-card"}`}>
          {s.label} · {s.lang === "ar" ? userLang().toUpperCase() : s.lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

/** Langue de l'utilisateur pour les tafsirs arabes (celle de l'app : fr par défaut, en si choisi). */
export const userLang = () => {
  try { const l = localStorage.getItem("mh_lang"); if (l === "fr" || l === "en") return l; } catch { /* ignore */ }
  return typeof navigator !== "undefined" && /^en/i.test(navigator.language || "") ? "en" : "fr";
};
const TR_URL = "https://superagent-54460fe8.base44.app/functions/myhafizzTafsirTr";
const trCache = new Map();
/** Traduction (mise en cache côté serveur) d'un tafsir arabe pour le verset de référence. */
function translate(src, surah, ayah, lang) {
  const k = `${src}:${surah}:${ayah}:${lang}`;
  if (!trCache.has(k)) trCache.set(k, fetch(TR_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ src, surah, ayah, lang }) })
    .then((r) => r.json()).then((d) => { if (typeof d.body !== "string") throw new Error(d.error || "traduction"); return d.body; })
    .catch((e) => { trCache.delete(k); throw e; }));
  return trCache.get(k);
}
/** Vrai quand l'élément est (presque) à l'écran : on ne traduit que ce qui est lu. */
function useInView(ref) {
  const [v, setV] = useState(false);
  useEffect(() => {
    if (v || !ref.current) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true); }, { rootMargin: "300px" });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [v]);
  return v;
}

/** Texte d'une explication. Les tafsirs arabes s'affichent traduits dans la langue de l'utilisateur, l'original reste à un geste. */
export function TafsirText({ src, data, compact, surah }) {
  const s = srcOf(src);
  const lang = userLang();
  const ref = useRef(null);
  const [orig, setOrig] = useState(false);
  const [tr, setTr] = useState({ st: "idle" });
  const needTr = s.lang === "ar" && !!surah && !!data?.body;
  const inView = useInView(ref);
  const refAyah = data?.from || data?.ayah;
  useEffect(() => {
    if (!needTr || !inView || orig) return;
    let alive = true; setTr({ st: "loading" });
    translate(src, surah, refAyah, lang).then((b) => alive && setTr({ st: "ok", body: b }), () => alive && setTr({ st: "error" }));
    return () => { alive = false; };
  }, [needTr, inView, orig, src, surah, refAyah, lang]);
  if (!data?.body) return <p className="text-[13px] font-semibold text-muted-foreground">Pas d'explication pour ce verset dans ce tafsir.</p>;
  const group = data.from !== data.to ? `Explication des versets ${data.from} à ${data.to}` : null;
  const box = compact ? "max-h-[50vh] overflow-y-auto" : "";
  const showAr = s.lang === "ar" && (!needTr || orig || tr.st === "error");
  return (
    <div ref={ref} className="rounded-2xl border-2 border-accent bg-accent/40 p-3.5">
      {group && <p className="text-[12px] font-black text-muted-foreground mb-1.5">{group}</p>}
      {s.lang !== "ar"
        ? <p className="text-[15px] font-semibold leading-relaxed text-foreground/85 whitespace-pre-line">{data.body}</p>
        : showAr
          ? <div dir="rtl" lang="ar" className={`font-arabic text-right text-foreground leading-[2] whitespace-pre-line ${compact ? "text-[18px]" : "text-[19px]"} ${box}`}>{data.body}</div>
          : tr.st === "ok"
            ? <p className={`text-[15px] font-semibold leading-relaxed text-foreground/85 whitespace-pre-line ${box}`}>{tr.body}</p>
            : <p className="text-[13px] font-semibold text-muted-foreground">{lang === "en" ? "Translating…" : "Traduction en cours…"}</p>}
      {tr.st === "error" && !orig && <p className="text-[12px] font-bold text-muted-foreground mt-2">{lang === "en" ? "Translation unavailable right now, here is the Arabic original." : "Traduction indisponible pour le moment, voici l'original en arabe."}</p>}
      <p className="text-[11.5px] font-bold text-muted-foreground mt-2">
        {s.credit}{needTr && !showAr && tr.st === "ok" ? (lang === "en" ? " · translated from Arabic" : " · traduit de l'arabe") : ""}
      </p>
      {needTr && tr.st !== "error" && (
        <button onClick={() => { haptic(); setOrig((o) => !o); }} className="text-[12.5px] font-extrabold text-primary mt-1">
          {orig ? (lang === "en" ? "Show the translation" : "Voir la traduction") : (lang === "en" ? "See the Arabic original" : "Voir l'original en arabe")}
        </button>
      )}
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
        : <TafsirText src={src} data={state === "none" ? null : state} compact surah={surah} />}
    </div>
  );
}
