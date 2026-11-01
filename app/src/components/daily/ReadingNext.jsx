import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { haptic } from "@/hooks/usePlatform";
import { ALL_LESSONS, UNITS } from "@/lib/qaida";
import { ReadingLessons } from "@/api/entities";

/** Profil « je ne lis pas encore l'arabe » : la prochaine leçon de lecture, en haut de l'accueil. */
export default function ReadingNext({ className = "" }) {
  const navigate = useNavigate();
  const { data: rows, isLoading } = useQuery({ queryKey: ["reading-lessons"], queryFn: () => ReadingLessons.list() });
  if (isLoading || !rows) return null;
  const done = new Set(rows.map((r) => r.lesson_id));
  const next = ALL_LESSONS.find((l) => !done.has(l.id));
  if (!next) return null;
  const unit = UNITS.findIndex((u) => u.id === next.unit);
  const pct = Math.round((done.size / ALL_LESSONS.length) * 100);
  return (
    <div className={`card-flat p-4 ${className}`}>
      <p className="font-black text-[17px]">Lire l'arabe</p>
      <p className="text-[13px] font-semibold text-muted-foreground">Unité {unit + 1} · {/[\u0600-\u06FF]/.test(next.title) ? <span className="font-arabic text-[15px]" dir="rtl">{next.title}</span> : next.title}</p>
      <div className="h-2.5 rounded-full bg-muted mt-2.5 overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${Math.max(pct, 3)}%` }} /></div>
      <p className="text-[12px] font-bold text-muted-foreground mt-1">{done.size} leçon{done.size > 1 ? "s" : ""} sur {ALL_LESSONS.length}</p>
      <button onClick={() => { haptic(); navigate(`/Lecon?id=${next.id}`); }} className="btn-relief w-full h-[50px] mt-3 bg-primary text-primary-foreground">
        {done.size ? "Continuer la leçon" : "Commencer la première leçon"}
      </button>
    </div>
  );
}
