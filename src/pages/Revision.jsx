import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpenText, ArrowsClockwise, Books, CheckCircle, CaretRight, Target, SlidersHorizontal, X, Minus, Plus } from "@phosphor-icons/react";
import { MemorizationProgress, VerseReview, HifzPlan } from "@/api/entities";
import { buildSession, goalPace, key } from "@/lib/srs";
import { GOALS, goalSurahs } from "@/lib/learningData";
import { SURAHS } from "@/components/quranData";
import { haptic } from "@/hooks/usePlatform";

const BLOCKS = [
  { part: "sabaq", title: "Sabaq", sub: "Nouvelle leçon", icon: BookOpenText },
  { part: "sabqi", title: "Sabqi", sub: "Révision récente", icon: ArrowsClockwise },
  { part: "manzil", title: "Manzil", sub: "Révision ancienne", icon: Books },
];

const surahName = (n) => SURAHS.find((s) => s.number === n)?.englishName || `Sourate ${n}`;

function describe(part, items) {
  if (!items.length) return part === "sabaq" ? "Leçon du jour terminée" : "Rien à réviser aujourd'hui";
  if (part === "sabaq") {
    const s = items[0].surah_number, a = items[0].verse_number, b = items[items.length - 1].verse_number;
    return `${surahName(s)} · v. ${a}${b !== a ? `–${b}` : ""}`;
  }
  const surahs = [...new Set(items.map((i) => i.surah_number))];
  return `${items.length} verset${items.length > 1 ? "s" : ""} · ${surahs.slice(0, 2).map(surahName).join(", ")}${surahs.length > 2 ? "…" : ""}`;
}

function Stepper({ value, onChange, min, max, step = 1 }) {
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => onChange(Math.max(min, value - step))} className="w-10 h-10 rounded-xl border-2 border-border flex items-center justify-center press"><Minus weight="bold" /></button>
      <span className="w-8 text-center text-lg font-extrabold">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + step))} className="w-10 h-10 rounded-xl border-2 border-border flex items-center justify-center press"><Plus weight="bold" /></button>
    </div>
  );
}

function PlanSheet({ plan, onClose, onSave, saving }) {
  const [goal, setGoal] = useState(plan?.goal_label || "juz_amma");
  const [dailyNew, setDailyNew] = useState(plan?.daily_new ?? 3);
  const [manzil, setManzil] = useState(plan?.manzil_daily ?? 20);
  const [goalDate, setGoalDate] = useState(plan?.goal_date || (() => { const d = new Date(); d.setMonth(d.getMonth() + 3); return d.toISOString().slice(0, 10); })());
  const g = GOALS.find((x) => x.key === goal);
  const total = goalSurahs(goal).reduce((n, s) => n + s.numberOfAyahs, 0);
  const days = Math.max(1, Math.ceil((new Date(goalDate) - new Date()) / 86400000));
  const suggested = Math.max(1, Math.ceil(total / days));

  return (
    <motion.div className="fixed inset-0 z-[200] flex items-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-foreground/30" onClick={onClose} />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative w-full bg-card rounded-t-3xl p-5 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-extrabold">Mon programme</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center" aria-label="Fermer"><X weight="bold" /></button>
        </div>

        <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mb-2">Objectif</p>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {GOALS.map((o) => (
            <button key={o.key} type="button" onClick={() => { haptic(); setGoal(o.key); }}
              className={`text-left p-3 rounded-2xl border-2 press ${goal === o.key ? "border-primary bg-accent" : "border-border"}`}>
              <p className={`font-extrabold text-sm ${goal === o.key ? "text-primary" : ""}`}>{o.label}</p>
              <p className="text-xs text-muted-foreground font-semibold">{o.hint}</p>
            </button>
          ))}
        </div>

        <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mb-2">Date visée</p>
        <input type="date" value={goalDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setGoalDate(e.target.value)}
          className="w-full h-12 px-4 rounded-2xl border-2 border-border bg-card font-bold mb-2" />
        <p className="text-sm text-muted-foreground font-semibold mb-5">
          {total} versets en {days} jours : environ <span className="text-primary font-extrabold">{suggested} par jour</span>.
          {suggested !== dailyNew && <button type="button" onClick={() => setDailyNew(Math.min(20, suggested))} className="ml-1 text-primary font-extrabold underline">Appliquer</button>}
        </p>

        <div className="flex items-center justify-between py-3 border-t-2 border-border">
          <div><p className="font-extrabold">Nouveaux versets / jour</p><p className="text-xs text-muted-foreground font-semibold">Sabaq</p></div>
          <Stepper value={dailyNew} onChange={setDailyNew} min={1} max={20} />
        </div>
        <div className="flex items-center justify-between py-3 border-t-2 border-border mb-5">
          <div><p className="font-extrabold">Révision ancienne / jour</p><p className="text-xs text-muted-foreground font-semibold">Manzil, en versets</p></div>
          <Stepper value={manzil} onChange={setManzil} min={5} max={100} step={5} />
        </div>

        <button disabled={saving} onClick={() => onSave({ goal_label: goal, start_surah: g.start, direction: g.direction, daily_new: dailyNew, manzil_daily: manzil, goal_date: goalDate })}
          className="btn-relief w-full h-[52px] bg-primary text-primary-foreground disabled:opacity-60">
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function Revision() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [sheet, setSheet] = useState(false);
  const { data: progress = [], isLoading: l1 } = useQuery({ queryKey: ["memorization-progress"], queryFn: () => MemorizationProgress.list() });
  const { data: reviews = [], isLoading: l2 } = useQuery({ queryKey: ["verse-reviews"], queryFn: () => VerseReview.list() });
  const { data: plan, isLoading: l3 } = useQuery({ queryKey: ["hifz-plan"], queryFn: () => HifzPlan.get() });
  const save = useMutation({
    mutationFn: (p) => HifzPlan.save(p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hifz-plan"] }); setSheet(false); },
  });

  const session = useMemo(() => buildSession({ plan, progress, reviews }), [plan, progress, reviews]);
  const pace = useMemo(() => {
    if (!plan) return null;
    const set = new Set();
    progress.forEach((p) => (p.memorized_verses || []).forEach((v) => set.add(key(p.surah_number, v))));
    return goalPace({ surahs: goalSurahs(plan.goal_label), memorizedSet: set, goalDate: plan.goal_date });
  }, [plan, progress]);
  const loading = l1 || l2 || l3;
  const goal = GOALS.find((g) => g.key === plan?.goal_label);
  const pct = pace?.total ? Math.round((pace.done / pace.total) * 100) : 0;
  const remainingToday = session.sabaq.length + session.sabqi.length + session.manzil.length;

  return (
    <div className="min-h-[100dvh] bg-background pb-nav">
      <div className="max-w-2xl mx-auto px-4 pt-[calc(env(safe-area-inset-top,0px)+16px)]">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-extrabold">Réviser</h1>
          <button onClick={() => setSheet(true)} className="w-10 h-10 rounded-xl border-2 border-border bg-card flex items-center justify-center press" aria-label="Mon programme">
            <SlidersHorizontal weight="bold" className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm font-semibold text-muted-foreground mb-5">
          {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          {!loading && (remainingToday ? ` · ${remainingToday} verset${remainingToday > 1 ? "s" : ""} au programme` : " · Session du jour terminée")}
        </p>

        {loading ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />)}</div>
        ) : (
          <>
            {!plan ? (
              <div className="card-flat p-5 mb-4">
                <Target weight="fill" className="w-8 h-8 text-primary mb-2" />
                <p className="font-extrabold text-lg">Crée ton programme</p>
                <p className="text-sm text-muted-foreground font-semibold mb-4">Choisis un objectif et un rythme. Chaque jour, l'app prépare ta leçon et tes révisions.</p>
                <button onClick={() => setSheet(true)} className="btn-relief w-full h-[50px] bg-primary text-primary-foreground">Commencer</button>
              </div>
            ) : (
              <button onClick={() => setSheet(true)} className="card-flat w-full text-left p-4 mb-4 press">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-extrabold">{goal?.label || "Mon objectif"}</p>
                  <p className="text-sm font-extrabold text-primary">{pct} %</p>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden mb-2"><div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
                <p className="text-xs font-semibold text-muted-foreground">
                  {pace.done}/{pace.total} versets
                  {pace.perDay != null && (pace.left === 0 ? " · Objectif atteint, Macha'Allah"
                    : plan.daily_new >= pace.perDay ? ` · Dans les temps (${pace.perDay}/jour nécessaires)`
                    : ` · En retard : il faudrait ${pace.perDay} versets/jour`)}
                </p>
              </button>
            )}

            <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mb-2">Session du jour</p>
            <div className="space-y-3">
              {BLOCKS.map(({ part, title, sub, icon: Icon }) => {
                const items = session[part];
                const disabled0 = part === "sabaq" && !plan;
                const done = !disabled0 && !items.length;
                const disabled = disabled0;
                return (
                  <button key={part} disabled={done || disabled} onClick={() => { haptic(); navigate(`/ReviewSession?part=${part}`); }}
                    className={`card-flat w-full flex items-center gap-4 p-4 text-left press ${done || disabled ? "opacity-70" : ""}`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${done ? "bg-muted text-muted-foreground" : "bg-accent text-primary"}`}>
                      {done ? <CheckCircle weight="fill" className="w-7 h-7 text-primary" /> : <Icon weight="fill" className="w-7 h-7" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold">{title} <span className="text-muted-foreground font-semibold text-sm">· {sub}</span></p>
                      <p className="text-sm text-muted-foreground font-semibold truncate">{disabled ? "Crée ton programme d'abord" : describe(part, items)}</p>
                    </div>
                    {!done && !disabled && <CaretRight weight="bold" className="w-5 h-5 text-muted-foreground" />}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="card-flat p-4"><p className="text-2xl font-extrabold">{session.totalMemorized}</p><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Versets mémorisés</p></div>
              <div className="card-flat p-4"><p className="text-2xl font-extrabold">{session.doneToday}</p><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Révisés aujourd'hui</p></div>
            </div>
          </>
        )}
      </div>
      <AnimatePresence>{sheet && <PlanSheet plan={plan} onClose={() => setSheet(false)} onSave={(p) => save.mutate(p)} saving={save.isPending} />}</AnimatePresence>
    </div>
  );
}
