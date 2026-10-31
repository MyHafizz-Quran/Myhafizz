import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Circle } from "@phosphor-icons/react";
import PageHeader from "@/components/PageHeader";
import { VerseReview, ActivityDays } from "@/api/entities";
import { ReadingSessions } from "@/api/entities/learning";
import { weekStats, daysAgo, summaryLine, kahfRead, setKahfRead } from "@/lib/weekly";
import { currentStreak } from "@/lib/srs";
import { haptic } from "@/hooks/usePlatform";

const DAYS = ["D", "L", "M", "M", "J", "V", "S"];

function Stat({ value, label, hint }) {
  return (
    <div className="card-flat p-4">
      <p className="text-[28px] leading-none font-black">{value}</p>
      <p className="text-[13px] font-extrabold mt-1.5">{label}</p>
      {hint && <p className="text-[12px] font-semibold text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

const delta = (a, b, unit) => {
  if (b === 0 && a === 0) return null;
  if (a === b) return `Comme la semaine dernière`;
  return a > b ? `${a - b} ${unit} de plus que la semaine dernière` : `Semaine dernière : ${b}`;
};

/** Bilan des 7 derniers jours, pensé pour la veille et le jour de Jumu'a. */
export default function Bilan() {
  const navigate = useNavigate();
  const { data: reviews = [], isLoading } = useQuery({ queryKey: ["verse-reviews"], queryFn: () => VerseReview.list() });
  const { data: days = [] } = useQuery({ queryKey: ["activity-days"], queryFn: () => ActivityDays.list() });
  const { data: readSessions = [] } = useQuery({ queryKey: ["reading-sessions-14"], queryFn: () => ReadingSessions.since(daysAgo(13).toISOString()) });
  const s = useMemo(() => weekStats({ reviews, days, readSessions }), [reviews, days, readSessions]);
  const streak = currentStreak(days);
  const [read, setRead] = useState(() => kahfRead());
  const toggleKahf = () => { haptic(); setKahfRead(!read); setRead(!read); };

  return (
    <div className="min-h-[100dvh] bg-background pb-nav">
      <div className="px-4"><PageHeader title="Bilan de la semaine" back="/Dashboard" /></div>
      <div className="max-w-md lg:max-w-2xl mx-auto px-4 pt-4">
        <p className="text-[13px] font-bold text-muted-foreground">7 derniers jours</p>
        <p className="font-black text-[19px] leading-snug mt-1">{isLoading ? " " : summaryLine(s)}</p>

        <div className="card-flat p-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="font-extrabold">Régularité</p>
            <p className="text-[13px] font-extrabold text-muted-foreground">{s.active} jour{s.active > 1 ? "s" : ""} sur 7{streak > 0 ? ` · série de ${streak}` : ""}</p>
          </div>
          <div className="grid grid-cols-7 gap-1.5 mt-3">
            {s.timeline.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div className={`w-full aspect-square max-w-[40px] rounded-xl ${d.done ? "bg-gold" : "bg-muted"}`} />
                <span className={`text-[12px] font-extrabold ${i === 6 ? "text-primary" : "text-muted-foreground"}`}>{DAYS[d.date.getDay()]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <Stat value={s.learned} label={`Verset${s.learned > 1 ? "s" : ""} appris`} hint={delta(s.learned, s.learnedPrev, "")?.replace("  ", " ")} />
          <Stat value={s.revised} label={`Verset${s.revised > 1 ? "s" : ""} révisé${s.revised > 1 ? "s" : ""}`} hint="Acquis déjà en mémoire" />
          <Stat value={s.total} label="Versets en mémoire" hint="Au total" />
          <Stat value={s.lessons} label={`Leçon${s.lessons > 1 ? "s" : ""} de lecture`} hint="Apprendre à lire" />
        </div>

        {s.fragile > 0 && (
          <button onClick={() => { haptic(); navigate("/Revision"); }} className="card-flat w-full p-4 mt-3 text-left flex items-center gap-3 active:bg-muted">
            <div className="flex-1">
              <p className="font-extrabold">{s.fragile} verset{s.fragile > 1 ? "s" : ""} à consolider</p>
              <p className="text-[12.5px] font-semibold text-muted-foreground">Oubliés au moins une fois récemment. Une révision avant le week-end les remet en place.</p>
            </div>
            <span className="btn-relief h-10 px-4 bg-primary text-primary-foreground text-sm shrink-0">Réviser</span>
          </button>
        )}

        <p className="text-[13px] font-extrabold text-muted-foreground mt-6 mb-2">Jumu'a</p>
        <div className="card-flat flex items-center gap-3 p-3 pl-4">
          <button onClick={toggleKahf} aria-pressed={read} aria-label={read ? "Al-Kahf lue" : "Marquer Al-Kahf comme lue"} className="shrink-0">
            {read ? <CheckCircle weight="fill" className="w-7 h-7 text-primary" /> : <Circle weight="bold" className="w-7 h-7 text-muted-foreground" />}
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold">Sourate Al-Kahf</p>
            <p className="text-[12.5px] font-semibold text-muted-foreground">Recommandée du jeudi soir (après Maghrib) au vendredi soir.</p>
          </div>
          <button onClick={() => { haptic(); navigate("/Memorize?surah=18"); }} className="btn-relief h-10 px-4 bg-primary text-primary-foreground text-sm shrink-0">Lire</button>
        </div>
      </div>
    </div>
  );
}
