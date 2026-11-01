import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Fire, BookOpen, Lightning, CaretRight, Target, Trophy, UserPlus, CheckCircle, Circle } from "@phosphor-icons/react";
import { MemorizationProgress, VerseReview, HifzPlan, ActivityDays } from "@/api/entities";
import { ReadingSessions } from "@/api/entities/learning";
import { buildSession, todayStr, currentStreak } from "@/lib/srs";
import { getGoal, todayCount, weekStart, weeklyChallenges } from "@/lib/readingGame";
import { useAuth } from "@/lib/AuthContext";
import { useKidMode } from "@/lib/kidMode";
import InviteSheet from "@/components/InviteSheet";

const PARTS = [
  { part: "sabaq", label: "Sabaq", sub: "nouveau" },
  { part: "sabqi", label: "Sabqi", sub: "récent" },
  { part: "manzil", label: "Manzil", sub: "ancien" },
];

function Box({ title, action, onAction, children }) {
  return (
    <section className="card-flat p-4">
      {title && (
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-black text-[15px]">{title}</h2>
          {action && <button onClick={onAction} className="text-[12.5px] font-black uppercase tracking-wide text-primary hover:underline">{action}</button>}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * Colonne de droite sur grand écran (≥ 1280 px), comme sur Duolingo :
 * série, séance du jour, objectif de lecture, défis de la semaine, invitation.
 * Les données partagent le cache des autres pages (mêmes clés de requête).
 */
export default function DesktopRail() {
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 1280px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const on = () => setWide(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return wide ? <Rail /> : null;
}

function Rail() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const kid = useKidMode();
  const [invite, setInvite] = useState(false);

  const { data: progress = [] } = useQuery({ queryKey: ["memorization-progress"], queryFn: () => MemorizationProgress.list() });
  const { data: reviews = [] } = useQuery({ queryKey: ["verse-reviews"], queryFn: () => VerseReview.list() });
  const { data: plan } = useQuery({ queryKey: ["hifz-plan"], queryFn: () => HifzPlan.get() });
  const { data: days = [] } = useQuery({ queryKey: ["activity-days"], queryFn: () => ActivityDays.list() });
  const { data: sessions = [] } = useQuery({ queryKey: ["reading-sessions"], queryFn: () => ReadingSessions.since(weekStart().toISOString()) });

  const session = useMemo(() => buildSession({ plan, progress, reviews }), [plan, progress, reviews]);
  const streak = currentStreak(days);
  const memorized = progress.reduce((n, p) => n + (p.memorized_verses?.length || 0), 0);
  const weekXp = sessions.reduce((t, s) => t + (s.xp || 0), 0);
  const goal = getGoal(), today = todayCount(sessions);
  const challenges = weeklyChallenges(sessions);
  const firstName = (user?.user_metadata?.full_name || "").trim().split(/\s+/)[0];

  const week = useMemo(() => {
    const set = new Set(days), now = new Date();
    const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    return ["L", "M", "M", "J", "V", "S", "D"].map((l, i) => {
      const d = new Date(monday); d.setDate(monday.getDate() + i);
      const s = todayStr(d);
      return { l, done: set.has(s), today: s === todayStr(now) };
    });
  }, [days]);

  const parts = PARTS.map((p) => ({ ...p, n: session[p.part]?.length || 0 }));
  const left = parts.reduce((t, p) => t + p.n, 0);

  return (
    <aside className="hidden xl:block fixed inset-y-0 right-0 w-[320px] overflow-y-auto no-scrollbar px-5 py-8 z-[var(--z-bottom-nav)]" aria-label="Résumé">
      <div className="space-y-4">
        {/* Chiffres clés */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Fire, v: streak, l: "jours de série", c: "text-gold" },
            { icon: BookOpen, v: memorized, l: "versets", c: "text-primary" },
            { icon: Lightning, v: weekXp, l: "points semaine", c: "text-primary" },
          ].map(({ icon: I, v, l, c }) => (
            <div key={l} className="card-flat px-2 py-2.5 text-center">
              <I weight="fill" className={`w-5 h-5 mx-auto ${c}`} />
              <p className="text-[19px] font-black leading-tight mt-0.5">{v}</p>
              <p className="text-[10.5px] font-extrabold text-muted-foreground leading-tight">{l}</p>
            </div>
          ))}
        </div>

        {/* Semaine */}
        <Box title="Cette semaine">
          <div className="flex justify-between">
            {week.map((d, i) => (
              <div key={i} className="text-center text-[11px] font-extrabold text-muted-foreground">
                <div className={`w-8 h-8 rounded-full mb-1 flex items-center justify-center ${d.done ? "bg-gold text-white" : d.today ? "border-2 border-gold text-gold-lip" : "bg-muted"}`}>
                  {(d.done || d.today) && <Fire weight="fill" className="w-4 h-4" />}
                </div>
                {d.l}
              </div>
            ))}
          </div>
        </Box>

        {/* Séance du jour */}
        <Box title="Séance du jour" action={plan ? "Ouvrir" : null} onAction={() => navigate("/Revision")}>
          {plan ? (
            <>
              <div className="space-y-2">
                {parts.map((p) => (
                  <div key={p.part} className="flex items-center gap-2.5">
                    {p.n ? <Circle weight="bold" className="w-5 h-5 text-muted-foreground" /> : <CheckCircle weight="fill" className="w-5 h-5 text-primary" />}
                    <span className={`font-extrabold text-sm flex-1 ${p.n ? "" : "text-muted-foreground"}`}>{p.label} <span className="font-bold text-muted-foreground">· {p.sub}</span></span>
                    <span className="text-xs font-black text-muted-foreground">{p.n ? `${p.n} v.` : "fait"}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate("/Revision")} className="btn-relief w-full h-11 mt-3.5 bg-primary text-primary-foreground text-sm">{left ? "Continuer la séance" : "Séance terminée"}</button>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-muted-foreground">Choisis ton objectif et ton rythme : MyHafizz prépare chaque jour ta séance sabaq, sabqi et manzil.</p>
              <button onClick={() => navigate("/Bienvenue")} className="btn-relief w-full h-11 mt-3 bg-primary text-primary-foreground text-sm">Créer mon programme</button>
            </>
          )}
        </Box>

        {/* Lecture */}
        <Box title="Lire l'arabe" action="Continuer" onAction={() => navigate("/LireArabe")}>
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-accent text-primary flex items-center justify-center shrink-0"><Target weight="fill" className="w-5 h-5" /></span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-extrabold">{today >= goal ? "Objectif du jour atteint" : `Objectif : ${goal} leçon${goal > 1 ? "s" : ""} par jour`}</p>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden mt-1.5"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (today / goal) * 100)}%` }} /></div>
            </div>
            <span className="text-xs font-black text-muted-foreground">{Math.min(today, goal)}/{goal}</span>
          </div>
        </Box>

        {/* Défis */}
        <Box title="Défis de la semaine" action="Tout voir" onAction={() => navigate("/Challenges")}>
          <div className="space-y-3">
            {challenges.map((c) => (
              <div key={c.id} className="flex items-center gap-3">
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${c.done ? "bg-primary text-primary-foreground" : "bg-accent text-primary"}`}><Trophy weight="fill" className="w-[18px] h-[18px]" /></span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-extrabold truncate">{c.desc}</p>
                  <div className="h-2 rounded-full bg-muted overflow-hidden mt-1"><div className="h-full rounded-full bg-primary" style={{ width: `${c.pct}%` }} /></div>
                </div>
                <span className="text-[11px] font-black text-muted-foreground whitespace-nowrap">{Math.min(c.value, c.target)}/{c.target}</span>
              </div>
            ))}
          </div>
        </Box>

        {/* Invitation */}
        {!kid.on && (
          <button onClick={() => setInvite(true)} className="card-flat w-full p-4 flex items-center gap-3 text-left hover:bg-muted/60 transition-colors">
            <span className="w-10 h-10 rounded-xl bg-accent text-primary flex items-center justify-center shrink-0"><UserPlus weight="fill" className="w-5 h-5" /></span>
            <span className="flex-1"><span className="block font-extrabold text-sm">Inviter un proche</span><span className="block text-xs font-semibold text-muted-foreground">Apprendre à plusieurs, c'est plus facile</span></span>
            <CaretRight weight="bold" className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>
      <InviteSheet open={invite} onClose={() => setInvite(false)} kind="app" name={firstName} stats={{ verses: memorized, streak, surahs: progress.filter((p) => p.status === "completed").length }} />
    </aside>
  );
}
