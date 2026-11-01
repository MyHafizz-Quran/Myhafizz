import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { hadithOfDay, SOURCES } from "@/lib/daily";
import { haptic } from "@/hooks/usePlatform";
import { ShareNetwork } from "@phosphor-icons/react";
import { shareCard } from "@/lib/shareImage";

/** Carte « Hadith du jour » : arabe, français et référence exacte. */
export default function HadithOfDay({ className = "" }) {
  const { data: h, isLoading, isError } = useQuery({ queryKey: ["hadith-of-day", new Date().toDateString()], queryFn: hadithOfDay, staleTime: Infinity, retry: 1 });
  const [open, setOpen] = useState(false);
  if (isError) return null;
  if (isLoading || !h) return <div className={`h-40 rounded-2xl bg-muted animate-pulse ${className}`} />;
  const long = h.fr.length > 260 || h.ar.length > 220;

  return (
    <div className={`card-flat p-4 ${className}`}>
      <p className="font-black text-[17px]">Hadith du jour</p>
      <div className={long && !open ? "max-h-[210px] overflow-hidden" : ""}>
        <p dir="rtl" lang="ar" className="font-arabic text-[20px] leading-[2] text-right mt-2">{h.ar}</p>
        <p className="text-[14px] font-semibold text-muted-foreground mt-1.5">{h.fr}</p>
      </div>
      {long && (
        <button onClick={() => { haptic(); setOpen(!open); }} className="text-sm font-extrabold text-primary mt-1">{open ? "Réduire" : "Lire la suite"}</button>
      )}
      <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t-2 border-border">
        <p className="flex-1 text-[12.5px] font-extrabold text-muted-foreground">{SOURCES[h.src]}, n° {h.n}</p>
        <button onClick={() => { haptic(); shareCard({ arabic: h.ar, french: h.fr, reference: `Rapporté dans ${SOURCES[h.src]}, n° ${h.n}`, kind: "Hadith du jour", quran: false }); }} aria-label="Partager en image" className="w-9 h-9 rounded-lg flex items-center justify-center text-primary"><ShareNetwork weight="bold" className="w-5 h-5" /></button>
      </div>
    </div>
  );
}
