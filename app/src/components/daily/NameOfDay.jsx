import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { SpeakerHigh, Stop } from "@phosphor-icons/react";
import { haptic } from "@/hooks/usePlatform";
import { loadNames, nameOfDayIndex, playVerse, stopVerse } from "@/lib/names";

/** Carte « Le nom du jour » (99 noms d'Allah) sur l'accueil. */
export default function NameOfDay({ className = "" }) {
  const navigate = useNavigate();
  const { data: names } = useQuery({ queryKey: ["allah-names"], queryFn: loadNames, staleTime: Infinity, retry: 1 });
  const [playing, setPlaying] = useState(false);
  if (!names?.length) return null;
  const x = names[nameOfDayIndex(names.length)];
  return (
    <div className={`card-flat p-4 ${className}`}>
      <div className="flex items-center">
        <p className="font-black text-[17px] flex-1">Le nom du jour <span className="text-muted-foreground text-[14px]">· {x.n} sur 99</span></p>
        {x.verse_ref && (
          <button onClick={() => { haptic(); if (playing) { stopVerse(); setPlaying(false); } else { setPlaying(true); playVerse(x.verse_ref, () => setPlaying(false)); } }}
            aria-label={playing ? "Arrêter" : "Écouter le verset"} className="w-9 h-9 rounded-lg flex items-center justify-center text-primary">
            {playing ? <Stop weight="fill" className="w-5 h-5" /> : <SpeakerHigh weight="fill" className="w-5 h-5" />}
          </button>
        )}
      </div>
      <p dir="rtl" lang="ar" className="font-arabic text-[40px] leading-[1.9] text-center mt-1 pb-1">{x.ar}</p>
      <p className="text-center font-black">{x.translit}</p>
      <p className="text-center text-[14px] font-semibold text-muted-foreground">{x.meaning}</p>
      <p className="text-[14px] font-semibold mt-2.5">{x.explanation}</p>
      <div className="grid grid-cols-2 gap-2.5 mt-3">
        <button onClick={() => { haptic(); navigate(`/Noms?n=${x.n}`); }} className="btn-relief h-11 bg-card text-foreground border-2 border-border text-sm">Voir la carte</button>
        <button onClick={() => { haptic(); navigate("/Noms"); }} className="btn-relief h-11 bg-primary text-primary-foreground text-sm">Les 99 noms</button>
      </div>
    </div>
  );
}
