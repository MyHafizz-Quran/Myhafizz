import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Play, Pause } from "@phosphor-icons/react";
import { verseOfDay } from "@/lib/daily";
import { usePreferences } from "@/components/usePreferences";
import { useAudioManager } from "@/lib/AudioManager";
import { haptic } from "@/hooks/usePlatform";

/** Carte « Verset du jour » : texte, traduction, écoute et accès à la mémorisation. */
export default function VerseOfDay({ className = "" }) {
  const navigate = useNavigate();
  const { reciter } = usePreferences();
  const audioMgr = useAudioManager();
  const { data: v, isLoading, isError } = useQuery({ queryKey: ["verse-of-day", new Date().toDateString()], queryFn: verseOfDay, staleTime: Infinity, retry: 1 });
  const audio = useRef(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => audio.current?.pause(), []);

  if (isError) return null;
  if (isLoading || !v) return <div className={`h-48 rounded-2xl bg-muted animate-pulse ${className}`} />;

  const toggle = () => {
    haptic();
    if (playing) { audio.current?.pause(); return; }
    audioMgr?.stopLoop?.();
    if (!audio.current) {
      audio.current = new Audio(`https://cdn.islamic.network/quran/audio/128/${reciter || "ar.alafasy"}/${v.number}.mp3`);
      audio.current.onplay = () => setPlaying(true);
      audio.current.onpause = audio.current.onended = () => setPlaying(false);
    }
    audio.current.currentTime = 0;
    audio.current.play().catch(() => setPlaying(false));
  };

  return (
    <div className={`card-flat p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <p className="font-black text-[17px]">Verset du jour</p>
        <span className="text-sm font-extrabold text-muted-foreground">{v.surahName} · {v.ayah}</span>
      </div>
      <p dir="rtl" lang="ar" className="font-arabic text-[24px] leading-[2.1] text-right mt-2">{v.ar}</p>
      <p className="text-[14px] font-semibold text-muted-foreground mt-1.5">{v.fr}</p>
      <div className="flex gap-2 mt-3">
        <button onClick={toggle} className="btn-relief h-[46px] w-[52px] bg-card text-primary border-2 border-border [--relief-color:hsl(var(--border))] flex items-center justify-center shrink-0" aria-label={playing ? "Pause" : "Écouter"}>
          {playing ? <Pause weight="fill" className="w-5 h-5" /> : <Play weight="fill" className="w-5 h-5" />}
        </button>
        <button onClick={() => { haptic(); navigate(`/Memorize?surah=${v.surah}&verse=${v.ayah}`); }} className="btn-relief h-[46px] flex-1 bg-primary text-primary-foreground">Mémoriser</button>
      </div>
    </div>
  );
}
