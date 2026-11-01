import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { SpinnerGap } from "@phosphor-icons/react";
import { HifzPlan } from "@/api/entities";
import { GOALS, goalSurahs } from "@/lib/learningData";
import { useAuth } from "@/lib/AuthContext";
import { haptic } from "@/hooks/usePlatform";
import MhLogo from "@/components/MhLogo";

const PACES = [1, 3, 5];

/** Écran affiché juste après l'inscription : objectif et rythme, pour préparer la première séance. */
export default function Welcome() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [goal, setGoal] = useState("juz_amma");
  const [pace, setPace] = useState(3);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const first = (user?.user_metadata?.full_name || "").trim().split(/\s+/)[0];
  const total = (k) => goalSurahs(k).reduce((n, s) => n + s.numberOfAyahs, 0);
  const days = Math.ceil(total(goal) / pace);
  const end = new Date(Date.now() + days * 86400000);
  const endLabel = end.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const save = async () => {
    setSaving(true); setError(null);
    try {
      const g = GOALS.find((x) => x.key === goal);
      await HifzPlan.save({ goal_label: goal, start_surah: g.start, direction: g.direction, daily_new: pace, manzil_daily: 20, goal_date: end.toISOString().slice(0, 10) });
      qc.invalidateQueries({ queryKey: ["hifz-plan"] });
      navigate("/Dashboard", { replace: true });
    } catch {
      setError("Impossible d'enregistrer pour le moment. Tu pourras le faire depuis l'onglet Réviser.");
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <div className="flex-1 max-w-[460px] w-full mx-auto px-5 pt-[calc(env(safe-area-inset-top,0px)+24px)]">
        <MhLogo size={52} />
        <h1 className="text-[30px] font-black leading-tight mt-4">{first ? `Bienvenue, ${first}` : "Bienvenue"}</h1>
        <p className="font-semibold text-muted-foreground mt-1">Deux questions pour préparer ta première séance.</p>

        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mt-6 mb-2 ml-1">Tu veux mémoriser</p>
        <div className="space-y-2">
          {GOALS.map((g) => (
            <button key={g.key} onClick={() => { haptic(); setGoal(g.key); }}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left ${goal === g.key ? "border-primary bg-accent" : "border-border bg-card"}`}>
              <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${goal === g.key ? "border-primary" : "border-border"}`}>{goal === g.key && <span className="w-3 h-3 rounded-full bg-primary" />}</span>
              <span className="flex-1 min-w-0"><span className={`block font-extrabold ${goal === g.key ? "text-accent-foreground" : ""}`}>{g.label}</span><span className="block text-[12.5px] font-semibold text-muted-foreground">{g.hint}</span></span>
              <span className="text-sm font-extrabold text-muted-foreground">{total(g.key)} v.</span>
            </button>
          ))}
        </div>

        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mt-6 mb-2 ml-1">Ton rythme</p>
        <div className="grid grid-cols-3 gap-1 p-1 rounded-[14px] bg-muted">
          {PACES.map((p) => (
            <button key={p} onClick={() => { haptic(); setPace(p); }} className={`h-11 rounded-[10px] text-sm font-extrabold ${pace === p ? "bg-card text-accent-foreground shadow-[0_2px_0_hsl(var(--border))]" : "text-muted-foreground"}`}>{p} verset{p > 1 ? "s" : ""}/j</button>
          ))}
        </div>
        <p className="text-sm font-semibold text-muted-foreground mt-3 ml-1">À ce rythme, tu termines vers <span className="font-extrabold text-accent-foreground">{endLabel}</span>. Tu pourras changer ces choix à tout moment.</p>
        {error && <p className="mt-3 text-sm font-bold text-destructive">{error}</p>}
      </div>
      <div className="max-w-[460px] w-full mx-auto px-5 pt-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
        <button disabled={saving} onClick={save} className="btn-relief w-full h-[52px] bg-primary text-primary-foreground disabled:opacity-70">
          {saving ? <SpinnerGap weight="bold" className="w-5 h-5 animate-spin" /> : "Voir ma première séance"}
        </button>
        <button onClick={() => navigate("/Dashboard", { replace: true })} className="w-full h-12 font-extrabold text-muted-foreground">Passer</button>
      </div>
    </div>
  );
}
