import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { wordAt } from "@/lib/words";
import { currentPlayer } from "@/lib/qaida";

/** Mots (arabe + phonétique) et minutages Al-Afasy d'une sourate, par verset : { [ayah]: { w: [{a, t}], s: segments } }. */
async function loadChapter(surah) {
  const [w, s] = await Promise.all([
    fetch(`https://api.quran.com/api/v4/verses/by_chapter/${surah}?words=true&word_fields=text_uthmani&per_page=300`).then((r) => r.json()),
    fetch(`https://api.quran.com/api/v4/recitations/7/by_chapter/${surah}?per_page=300&fields=segments`).then((r) => r.json()),
  ]);
  const out = {};
  for (const v of w.verses || []) {
    const k = Number(v.verse_key.split(":")[1]);
    out[k] = { w: (v.words || []).filter((x) => x.char_type_name !== "end").map((x) => ({ a: x.text_uthmani, t: x.transliteration?.text || "" })), s: [] };
  }
  for (const af of s.audio_files || []) { const k = Number(af.verse_key.split(":")[1]); if (out[k]) out[k].s = af.segments || []; }
  return out;
}

/** Index du mot récité par le lecteur partagé (playUrl) pour ce verset, ou -1. */
function useActiveWord(segments, url, getPlayer) {
  const [i, setI] = useState(-1);
  useEffect(() => {
    if (!segments?.length) return;
    let raf = 0;
    const tick = () => {
      const p = getPlayer();
      setI(p && !p.paused && (!url || p.src === url) ? wordAt(segments, p.currentTime * 1000) : -1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [segments, url, getPlayer]);
  return i;
}

/**
 * Verset avec curseur mot à mot sur l'arabe ET la phonétique.
 * phon : "none" (pas de phonétique), "small" (sous l'arabe) ou "first" (phonétique en grand, pour ceux qui ne lisent pas encore l'arabe).
 */
export default function KaraokeVerse({ surah, ayah, url, arabic, translit, phon = "small", arClass = "text-[27px] leading-[2.15]", getPlayer = currentPlayer, timed = true, mark = null }) {
  const { data } = useQuery({ queryKey: ["karaoke", surah], queryFn: () => loadChapter(surah), staleTime: Infinity, retry: 1 });
  const v = data?.[ayah];
  const words = v?.w?.length ? v.w : null;
  const active = useActiveWord(timed ? v?.s : null, url, getPlayer);
  const mk = mark ? new Set(mark) : null;
  const hl = (i) => (i === active ? "bg-primary text-primary-foreground" : mk?.has(i) ? "bg-accent text-primary ring-2 ring-primary/40" : "");
  const phonText = phon !== "none" && (words && words.every((x) => x.t)
    ? words.map((x, i) => <React.Fragment key={i}><span className={`rounded-md px-[2px] transition-colors duration-150 ${hl(i)} ${i === active ? "not-italic" : ""}`}>{x.t}</span>{" "}</React.Fragment>)
    : translit);
  return (
    <>
      <p dir="rtl" lang="ar" className={`font-arabic ${arClass} text-right`}>
        {words ? words.map((x, i) => <React.Fragment key={i}><span className={`rounded-lg px-[3px] transition-colors duration-150 ${hl(i)}`}>{x.a}</span>{" "}</React.Fragment>) : arabic}
      </p>
      {phonText && <p className={`italic font-semibold mt-1 leading-relaxed ${phon === "first" ? "text-[17px] text-foreground" : "text-[13px] text-muted-foreground"}`}>{phonText}</p>}
    </>
  );
}
