import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { CaretRight, SunHorizon, MoonStars, HandsPraying, CalendarBlank, Moon, Target } from "@phosphor-icons/react";
import { loadAdhkar, defaultPeriod, progressFor } from "@/lib/adhkar";
import { upcoming, ramadanInfo, inDaysLabel } from "@/lib/hijri";
import { getSeason, seasonStatus } from "@/lib/season";
import { getLocation, prayerDay, hhmm, onPrayerChange } from "@/lib/prayer";
import { haptic } from "@/hooks/usePlatform";

function Row({ icon: Icon, title, sub, to, last }) {
  const navigate = useNavigate();
  return (
    <button onClick={() => { haptic(); navigate(to); }} className={`w-full flex items-center gap-3 px-4 py-3 text-left active:bg-muted ${last ? "" : "border-b-2 border-border"}`}>
      <span className="w-10 h-10 rounded-xl bg-accent text-primary flex items-center justify-center shrink-0"><Icon weight="fill" className="w-5 h-5" /></span>
      <div className="flex-1 min-w-0">
        <p className="font-extrabold">{title}</p>
        {sub && <p className="text-[12.5px] font-semibold text-muted-foreground truncate">{sub}</p>}
      </div>
      <CaretRight weight="bold" className="w-4 h-4 text-muted-foreground shrink-0" />
    </button>
  );
}

/** Adhkar, tasbih, calendrier et Qiyam regroupés dans une seule carte. */
export function DailyTools({ className = "" }) {
  const period = defaultPeriod();
  const { data } = useQuery({ queryKey: ["adhkar"], queryFn: loadAdhkar, staleTime: Infinity });
  const [, force] = useState(0);
  useEffect(() => { const f = () => force((n) => n + 1); window.addEventListener("mh-adhkar", f); return () => window.removeEventListener("mh-adhkar", f); }, []);
  const p = data ? progressFor(data.items, period) : null;
  const next = useMemo(() => upcoming(30).find((e) => e.inDays <= 7), []);
  const night = new Date().getHours() >= 20 || new Date().getHours() < 5;
  return (
    <div className={`card-flat overflow-hidden ${className}`}>
      <Row icon={period === "matin" ? SunHorizon : MoonStars} title={`Adhkar du ${period}`} to={`/Adhkar?p=${period}`}
        sub={p ? (p.done >= p.total ? "Terminés aujourd'hui" : `${p.done} sur ${p.total}`) : "Hisn al-Muslim"} />
      <Row icon={HandsPraying} title="Tasbih" sub="Chapelet avec vibration" to="/Tasbih" />
      <Row icon={CalendarBlank} title="Calendrier" sub={next ? `${inDaysLabel(next.inDays)} : ${next.white ? "jour blanc" : next.name}` : "Date hégirienne et jours importants"} to="/Calendrier" last={!night} />
      {night && <Row icon={Moon} title="Mode Qiyam" sub="Écran sombre, texte qui défile" to="/Qiyam" last />}
    </div>
  );
}

/** Ramadan en cours : suhur et iftar du jour. Hors Ramadan : rien. */
export function RamadanCard({ className = "" }) {
  const [loc, setLoc] = useState(getLocation);
  useEffect(() => onPrayerChange(() => setLoc(getLocation())), []);
  const r = ramadanInfo();
  if (!r.during) return null;
  const day = loc ? prayerDay(loc) : null;
  const fajr = day?.today.find((x) => x.key === "fajr")?.time, maghrib = day?.today.find((x) => x.key === "maghrib")?.time;
  const juz = Math.min(30, r.day);
  return (
    <div className={`card-flat p-4 ${className}`}>
      <p className="text-[12px] font-extrabold uppercase tracking-wide text-primary">Ramadan · jour {r.day}</p>
      {day ? (
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div><p className="text-[12.5px] font-bold text-muted-foreground">Fin du suhur</p><p className="font-black text-[22px]">{hhmm(fajr)}</p></div>
          <div><p className="text-[12.5px] font-bold text-muted-foreground">Iftar</p><p className="font-black text-[22px]">{hhmm(maghrib)}</p></div>
        </div>
      ) : <p className="text-[13px] font-semibold text-muted-foreground mt-1">Active ta position dans Réglages pour voir le suhur et l'iftar.</p>}
      <p className="text-[13px] font-semibold text-muted-foreground mt-2">Khatma du mois : juz {juz} aujourd'hui pour finir le Coran en 30 jours.</p>
    </div>
  );
}

/** Objectif de saison : avancement et rythme à tenir, ou invitation à en choisir un. */
export function SeasonCard({ progress = [], className = "" }) {
  const navigate = useNavigate();
  const [goal, setGoal] = useState(getSeason);
  useEffect(() => { const f = () => setGoal(getSeason()); window.addEventListener("mh-season", f); return () => window.removeEventListener("mh-season", f); }, []);
  const s = seasonStatus(goal, progress);
  if (!s) {
    return (
      <button onClick={() => { haptic(); navigate("/Objectif"); }} className={`card-flat w-full p-4 flex items-center gap-3 text-left active:bg-muted ${className}`}>
        <span className="w-10 h-10 rounded-xl bg-accent text-primary flex items-center justify-center shrink-0"><Target weight="fill" className="w-5 h-5" /></span>
        <div className="flex-1 min-w-0"><p className="font-extrabold">Objectif de saison</p><p className="text-[12.5px] font-semibold text-muted-foreground">Par exemple Juz Amma avant Ramadan</p></div>
        <CaretRight weight="bold" className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>
    );
  }
  const date = s.deadline.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  return (
    <button onClick={() => { haptic(); navigate("/Objectif"); }} className={`card-flat w-full p-4 text-left active:bg-muted ${className}`}>
      <div className="flex items-center justify-between"><p className="font-extrabold">{s.label}</p><span className="text-[13px] font-extrabold text-muted-foreground">avant le {date}</span></div>
      <div className="h-2.5 rounded-full bg-muted overflow-hidden mt-2"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, s.pct)}%` }} /></div>
      <p className="text-[12.5px] font-semibold text-muted-foreground mt-1.5">
        {s.left === 0 ? "Objectif atteint. Bravo !" : s.daysLeft === 0 ? `Dernier jour : ${s.left} versets restants` : `${s.done} / ${s.total} versets · ${s.perDay} par jour pendant ${s.daysLeft} jours`}
      </p>
    </button>
  );
}
