import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check, Lock, Star, Trophy, Lightning, SpeakerSlash, Exam, CaretRight, Target, Medal, CheckCircle, BookOpenText, Brain, Plus } from "@phosphor-icons/react";
import { ReadingSessions } from "@/api/entities/learning";
import { getGoal, setGoal, GOAL_CHOICES, todayCount, weekStart, BADGES, earnedBadges, weeklyChallenges } from "@/lib/readingGame";
import { ReadingLessons } from "@/api/entities";
import { UNITS, ALL_LESSONS, hasArabicVoice } from "@/lib/qaida";
import { haptic } from "@/hooks/usePlatform";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/PageHeader";
import { useTajwid } from "@/pages/Tajwid";
import { progressOf } from "@/lib/tajwid";

// décalage en zigzag façon chemin
const OFFSET = [0, 44, 64, 44, 0, -44, -64, -44];

export default function Lire() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: rows = [], isLoading } = useQuery({ queryKey: ["reading-lessons"], queryFn: () => ReadingLessons.list() });
  const done = new Set(rows.map((r) => r.lesson_id));
  const currentId = ALL_LESSONS.find((l) => !done.has(l.id))?.id;
  const xp = rows.reduce((t, r) => t + (r.xp || 0), 0);
  const allDone = !currentId;
  const cu = Math.max(0, UNITS.findIndex((u) => u.lessons.some((l) => l.id === currentId)));
  const cn = UNITS[cu].lessons.filter((l) => done.has(l.id)).length;
  const voice = hasArabicVoice();
  const { data: sessions = [] } = useQuery({ queryKey: ["reading-sessions"], queryFn: () => ReadingSessions.since(weekStart().toISOString()) });
  const [goal, setGoalState] = useState(getGoal());
  const [editGoal, setEditGoal] = useState(false);
  const today = todayCount(sessions);
  const goalDone = today >= goal;
  const earned = new Set(earnedBadges(rows).map((b) => b.id));
  const challenges = weeklyChallenges(sessions);
  const chDone = challenges.filter((c) => c.done).length;
  const { data: tj } = useTajwid();
  const tp = progressOf(tj);

  const open = (l, state) => {
    haptic();
    if (state === "locked") { toast({ title: "Leçon verrouillée", description: "Termine d'abord la leçon précédente." }); return; }
    navigate(`/Lecon?id=${l.id}`);
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-nav">
      <div className="max-w-xl mx-auto px-4">
        <PageHeader title="Apprendre" right={<span className="h-9 px-3 rounded-xl border-2 border-border bg-card flex items-center gap-1.5 font-black text-sm"><Lightning weight="fill" className="w-4 h-4 text-gold" />{xp}</span>} />
        <p className="font-semibold text-muted-foreground mt-1">Mémoriser, réviser, comprendre et apprendre à lire.</p>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <button onClick={() => { haptic(); navigate("/ReviewSession?part=sabaq"); }} className="card-flat p-4 text-left press">
            <span className="w-11 h-11 rounded-xl bg-accent text-accent-foreground flex items-center justify-center"><Plus weight="bold" className="w-6 h-6" /></span>
            <span className="block font-black mt-2">Mémoriser</span><span className="block text-[13px] font-semibold text-muted-foreground">Nouveaux versets du jour</span>
          </button>
          <button onClick={() => { haptic(); navigate("/Revision"); }} className="card-flat p-4 text-left press">
            <span className="w-11 h-11 rounded-xl bg-accent text-accent-foreground flex items-center justify-center"><Brain weight="fill" className="w-6 h-6" /></span>
            <span className="block font-black mt-2">Réviser</span><span className="block text-[13px] font-semibold text-muted-foreground">Sourates et versets fragiles</span>
          </button>
        </div>
        <button onClick={() => { haptic(); navigate("/Tafsir"); }} className="card-flat w-full p-4 mt-3 flex items-center gap-3 text-left press">
          <span className="w-11 h-11 rounded-xl bg-accent text-accent-foreground flex items-center justify-center shrink-0"><BookOpenText weight="fill" className="w-6 h-6" /></span>
          <span className="flex-1 min-w-0"><span className="block font-black">Tafsir</span><span className="block text-[13px] font-semibold text-muted-foreground">Comprendre ce que tu récites, verset par verset</span></span>
          <CaretRight weight="bold" className="w-5 h-5 text-muted-foreground" />
        </button>
        <button onClick={() => { haptic(); navigate("/Noms"); }} className="card-flat w-full p-4 mt-3 flex items-center gap-3 text-left press">
          <span dir="rtl" className="w-11 h-11 rounded-xl bg-accent text-accent-foreground flex items-center justify-center shrink-0 font-arabic text-[19px] leading-none">الله</span>
          <span className="flex-1 min-w-0"><span className="block font-black">Les 99 noms d'Allah</span><span className="block text-[13px] font-semibold text-muted-foreground">Une carte par nom : sens, verset, invocation</span></span>
          <CaretRight weight="bold" className="w-5 h-5 text-muted-foreground" />
        </button>

        <button onClick={() => { haptic(); navigate("/LireArabe"); }} className="card-flat w-full p-4 mt-3 flex items-center gap-3 text-left press">
          <span dir="rtl" className="w-11 h-11 rounded-xl bg-accent text-accent-foreground flex items-center justify-center shrink-0 font-arabic text-[22px] leading-none">ب</span>
          <span className="flex-1 min-w-0">
            <span className="block font-black">Lire l'arabe</span>
            <span className="block text-[13px] font-semibold text-muted-foreground truncate">{allDone ? "Parcours terminé · bravo" : `Unité ${cu + 1} · ${UNITS[cu].title} · ${cn} / ${UNITS[cu].lessons.length} leçons`}</span>
            <span className="block h-2 rounded-full bg-muted overflow-hidden mt-2"><span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(4, Math.round((done.size / ALL_LESSONS.length) * 100))}%` }} /></span>
          </span>
          <CaretRight weight="bold" className="w-5 h-5 text-muted-foreground" />
        </button>
        <button onClick={() => { haptic(); navigate("/Tajwid"); }} className="card-flat w-full p-4 mt-3 mb-6 flex items-center gap-3 text-left press">
          <span dir="rtl" className="w-11 h-11 rounded-xl bg-accent text-accent-foreground flex items-center justify-center shrink-0 font-arabic text-[20px] leading-none">تج</span>
          <span className="flex-1 min-w-0">
            <span className="block font-black">Tajwid · Tuḥfat al-Aṭfāl</span>
            <span className="block text-[13px] font-semibold text-muted-foreground truncate">{tp.passed ? (tp.current ? `Unité ${tp.current.n} · ${tp.current.title}` : "Poème terminé · bravo") : cu >= 3 || allDone ? "Le poème d'al-Jamzūrī, avec les exemples du Coran" : "Conseillé après l'unité 4 de Lire l'arabe"}</span>
            <span className="block h-2 rounded-full bg-muted overflow-hidden mt-2"><span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(4, tp.pct)}%` }} /></span>
          </span>
          <CaretRight weight="bold" className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

/** Parcours « Lire l'arabe » : objectif du jour, défis, test de niveau, chemin des leçons et badges. */
export function LireArabe() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: rows = [], isLoading } = useQuery({ queryKey: ["reading-lessons"], queryFn: () => ReadingLessons.list() });
  const done = new Set(rows.map((r) => r.lesson_id));
  const currentId = ALL_LESSONS.find((l) => !done.has(l.id))?.id;
  const xp = rows.reduce((t, r) => t + (r.xp || 0), 0);
  const voice = hasArabicVoice();
  const { data: sessions = [] } = useQuery({ queryKey: ["reading-sessions"], queryFn: () => ReadingSessions.since(weekStart().toISOString()) });
  const [goal, setGoalState] = useState(getGoal());
  const [editGoal, setEditGoal] = useState(false);
  const today = todayCount(sessions);
  const goalDone = today >= goal;
  const earned = new Set(earnedBadges(rows).map((b) => b.id));
  const challenges = weeklyChallenges(sessions);
  const chDone = challenges.filter((c) => c.done).length;

  const open = (l, state) => {
    haptic();
    if (state === "locked") { toast({ title: "Leçon verrouillée", description: "Termine d'abord la leçon précédente." }); return; }
    navigate(`/Lecon?id=${l.id}`);
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-nav">
      <div className="max-w-xl mx-auto px-4">
        <PageHeader title="Lire l'arabe" back="/Lire" right={<span className="h-9 px-3 rounded-xl border-2 border-border bg-card flex items-center gap-1.5 font-black text-sm"><Lightning weight="fill" className="w-4 h-4 text-gold" />{xp}</span>} />
        {!voice && (
          <div className="card-flat p-3.5 mt-4 flex items-start gap-3">
            <SpeakerSlash weight="bold" className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-muted-foreground">Ton appareil n'a pas de voix arabe installée : les exercices d'écoute seront remplacés par des exercices de lecture.</p>
          </div>
        )}

        {/* Objectif du jour */}
        <div className="card-flat p-4 mt-4">
          <div className="flex items-center gap-3">
            <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${goalDone ? "bg-gold-tint text-gold" : "bg-accent text-primary"}`}>{goalDone ? <CheckCircle weight="fill" className="w-6 h-6" /> : <Target weight="fill" className="w-6 h-6" />}</span>
            <div className="flex-1 min-w-0">
              <p className="font-extrabold">{goalDone ? "Objectif du jour atteint" : "Objectif du jour"}</p>
              <p className="text-[12.5px] font-semibold text-muted-foreground">{Math.min(today, goal)} / {goal} leçon{goal > 1 ? "s" : ""} aujourd'hui</p>
            </div>
            <button onClick={() => { haptic(); setEditGoal(!editGoal); }} className="text-sm font-extrabold text-primary px-2 py-1 rounded-lg hover:bg-muted">Modifier</button>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden mt-3"><div className={`h-full rounded-full ${goalDone ? "bg-gold" : "bg-primary"}`} style={{ width: `${Math.max(4, Math.min(100, (today / goal) * 100))}%` }} /></div>
          {editGoal && (
            <div className="grid grid-cols-4 gap-2 mt-3">
              {GOAL_CHOICES.map((n) => (
                <button key={n} onClick={() => { haptic(); setGoal(n); setGoalState(n); setEditGoal(false); }}
                  className={`h-11 rounded-xl border-2 border-b-4 font-extrabold text-sm ${n === goal ? "border-primary bg-accent text-primary" : "border-border bg-card"}`}>{n} / jour</button>
              ))}
            </div>
          )}
        </div>

        <button onClick={() => { haptic(); navigate("/Challenges"); }} className="card-flat w-full p-4 mt-3 flex items-center gap-3 text-left press">
          <span className="w-11 h-11 rounded-xl bg-accent text-primary flex items-center justify-center shrink-0"><Trophy weight="fill" className="w-6 h-6" /></span>
          <div className="flex-1 min-w-0"><p className="font-extrabold">Défis de la semaine</p><p className="text-[12.5px] font-semibold text-muted-foreground">{chDone} / {challenges.length} réussis · classement lecture</p></div>
          <CaretRight weight="bold" className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>

        {done.size === 0 && !isLoading && (
          <button onClick={() => { haptic(); navigate("/Lecon?id=placement"); }} className="card-flat w-full p-4 mt-4 flex items-center gap-3 text-left press">
            <span className="w-11 h-11 rounded-xl bg-accent text-primary flex items-center justify-center shrink-0"><Exam weight="fill" className="w-6 h-6" /></span>
            <div className="flex-1 min-w-0"><p className="font-extrabold">Je connais déjà les lettres</p><p className="text-[12.5px] font-semibold text-muted-foreground">12 questions pour passer directement à l'unité 4</p></div>
            <CaretRight weight="bold" className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        )}

        {UNITS.map((u, ui) => {
          const n = u.lessons.filter((l) => done.has(l.id)).length;
          return (
            <section key={u.id} className="mt-6">
              <div className="rounded-2xl bg-primary text-primary-foreground p-4 shadow-[0_4px_0_var(--primary-lip)]">
                <p className="text-xs font-extrabold uppercase tracking-wide opacity-80">Unité {ui + 1} · {n}/{u.lessons.length}</p>
                <p className="text-[20px] font-black leading-tight mt-0.5">{u.title}</p>
                <p className="text-sm font-semibold opacity-90">{u.subtitle}</p>
              </div>
              <div className="flex flex-col items-center gap-5 pt-16 pb-7">
                {u.lessons.map((l, li) => {
                  const state = done.has(l.id) ? "done" : l.id === currentId ? "current" : "locked";
                  const Icon = state === "done" ? Check : state === "locked" ? Lock : l.review ? Trophy : Star;
                  return (
                    <div key={l.id} className="relative flex flex-col items-center" style={{ transform: `translateX(${OFFSET[li % OFFSET.length]}px)` }}>
                      {state === "current" && !isLoading && (
                        <div className="absolute -top-11 whitespace-nowrap rounded-xl border-2 border-border bg-card px-3 py-1.5 text-sm font-black text-primary animate-bounce [animation-duration:1.6s]">
                          {done.size ? "Continuer" : "Commencer"}
                          <span className="absolute left-1/2 -bottom-[7px] -translate-x-1/2 w-3 h-3 rotate-45 bg-card border-r-2 border-b-2 border-border" />
                        </div>
                      )}
                      <button onClick={() => open(l, state)} aria-label={`${l.title}${state === "locked" ? " (verrouillée)" : ""}`}
                        className={`btn-relief w-[72px] h-[72px] !rounded-full ${state === "locked" ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"} ${state === "current" ? "ring-4 ring-primary/25 ring-offset-4 ring-offset-background" : ""}`}
                        style={state === "locked" ? { "--relief-color": "hsl(var(--border))" } : undefined}>
                        <Icon weight={state === "done" ? "bold" : "fill"} className="w-8 h-8" />
                      </button>
                      {(() => { const arOnly = ["u1", "u2"].includes(u.id) && !l.review; return (
                        <p className={`mt-2 text-center max-w-[150px] ${arOnly ? "font-arabic text-[21px] leading-[1.9]" : "text-sm font-extrabold"} ${state === "locked" ? "text-muted-foreground" : "text-foreground"}`} dir={arOnly ? "rtl" : "ltr"}>{l.title}</p>
                      ); })()}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* Badges */}
        <div className="flex items-baseline justify-between mt-2 mb-2 ml-1">
          <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Badges</p>
          <p className="text-xs font-extrabold text-muted-foreground">{earned.size} / {BADGES.length}</p>
        </div>
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {BADGES.map((b) => {
            const on = earned.has(b.id);
            return (
              <button key={b.id} onClick={() => { haptic(); toast({ title: b.name, description: on ? "Badge obtenu." : b.hint }); }} className="card-flat p-3 flex flex-col items-center text-center press">
                <span className={`w-11 h-11 rounded-full flex items-center justify-center ${on ? "bg-gold-tint text-gold" : "bg-muted text-muted-foreground"}`}>{on ? <Medal weight="fill" className="w-6 h-6" /> : <Lock weight="bold" className="w-5 h-5" />}</span>
                <p className={`text-[12px] font-extrabold mt-1.5 leading-tight ${on ? "" : "text-muted-foreground"}`}>{b.name}</p>
              </button>
            );
          })}
        </div>

        <button onClick={() => { haptic(); navigate("/SurahList"); }} className="card-flat w-full p-4 mb-6 text-center press">
          <p className="font-extrabold">Et après ?</p>
          <p className="text-sm font-semibold text-muted-foreground mt-0.5">Quand tu sais lire, passe à la mémorisation dans l'onglet Coran.</p>
        </button>
      </div>
    </div>
  );
}
