import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { X, Play, Pause, Minus, Plus } from "@phosphor-icons/react";
import { MemorizationProgress } from "@/api/entities";
import { SURAHS } from "@/components/quranData";
import { loadSurah } from "@/lib/learningData";

/** Mode Qiyam : écran très sombre, texte qui défile seul, écran maintenu allumé. */
export default function Qiyam() {
  const navigate = useNavigate();
  const { data: progress = [] } = useQuery({ queryKey: ["memorization-progress"], queryFn: () => MemorizationProgress.list() });
  const mine = SURAHS.filter((s) => progress.some((p) => p.surah_number === s.number && (p.memorized_verses?.length || 0) > 0));
  const [surah, setSurah] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);
  const box = useRef(null);
  const { data: ayahs = [], isLoading } = useQuery({ queryKey: ["surah-text", surah], queryFn: () => loadSurah(surah), enabled: !!surah, staleTime: Infinity });

  // écran allumé
  useEffect(() => {
    let lock = null;
    if (surah && "wakeLock" in navigator) navigator.wakeLock.request("screen").then((l) => { lock = l; }).catch(() => {});
    return () => { lock?.release?.().catch(() => {}); };
  }, [surah]);
  // défilement
  useEffect(() => {
    if (!playing) return;
    let raf, last = performance.now();
    const step = (t) => { const el = box.current; if (el) { el.scrollTop += ((t - last) / 1000) * speed * 9; if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) setPlaying(false); } last = t; raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed]);

  return (
    <div className="fixed inset-0 z-[300] bg-[#050707] text-[#8C9A9A] flex flex-col" style={{ paddingTop: "env(safe-area-inset-top,0px)", paddingBottom: "env(safe-area-inset-bottom,0px)" }}>
      <div className="flex items-center gap-2 px-3 h-14 shrink-0">
        <button onClick={() => (surah ? (setSurah(null), setPlaying(false)) : navigate(-1))} aria-label="Fermer" className="w-11 h-11 rounded-full flex items-center justify-center"><X weight="bold" className="w-5 h-5" /></button>
        <p className="flex-1 font-extrabold text-[15px] truncate">{surah ? SURAHS[surah - 1].englishName : "Qiyam al-layl"}</p>
      </div>
      {!surah ? (
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <p className="text-[13px] font-bold mb-3">Choisis une sourate que tu as mémorisée. Le texte défilera doucement pour t'accompagner dans la prière de nuit.</p>
          {mine.length === 0 && <p className="text-[14px] font-semibold mt-6">Aucune sourate mémorisée pour l'instant. Voici les dernières sourates du Coran.</p>}
          <div className="space-y-2">
            {(mine.length ? mine : SURAHS.slice(-10)).map((s) => (
              <button key={s.number} onClick={() => setSurah(s.number)} className="w-full flex items-center gap-3 px-4 h-14 rounded-2xl bg-[#0E1313] text-left">
                <span className="w-8 text-[13px] font-black">{s.number}</span>
                <span className="flex-1 font-extrabold text-[#B5C2C2]">{s.englishName}</span>
                <span className="font-arabic text-[20px]" dir="rtl">{s.name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div ref={box} className="flex-1 overflow-y-auto no-scrollbar px-6" onClick={() => setPlaying((p) => !p)}>
            <div className="h-[30vh]" />
            {isLoading ? <p className="text-center">Chargement…</p> : ayahs.map((a) => (
              <p key={a.numberInSurah} dir="rtl" className="font-arabic text-[34px] leading-[2.3] text-right text-[#9FB0B0] mb-4">
                {a.text} <span className="text-[18px] text-[#4A5858]">﴿{a.numberInSurah}﴾</span>
              </p>
            ))}
            <div className="h-[50vh]" />
          </div>
          <div className="flex items-center justify-center gap-4 h-20 shrink-0">
            <button onClick={() => setSpeed((v) => Math.max(1, v - 1))} aria-label="Plus lent" className="w-11 h-11 rounded-full bg-[#0E1313] flex items-center justify-center"><Minus weight="bold" /></button>
            <button onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Défiler"} className="w-14 h-14 rounded-full bg-[#0E1313] flex items-center justify-center">{playing ? <Pause weight="fill" className="w-6 h-6" /> : <Play weight="fill" className="w-6 h-6" />}</button>
            <button onClick={() => setSpeed((v) => Math.min(8, v + 1))} aria-label="Plus rapide" className="w-11 h-11 rounded-full bg-[#0E1313] flex items-center justify-center"><Plus weight="bold" /></button>
            <span className="text-[12px] font-extrabold w-10">×{speed}</span>
          </div>
        </>
      )}
    </div>
  );
}
