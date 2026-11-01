import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { SpinnerGap, ArrowLeft, Play, Pause, Check, Bell } from "@phosphor-icons/react";
import { HifzPlan } from "@/api/entities";
import { GOALS, goalSurahs, audioUrl } from "@/lib/learningData";
import { useAuth } from "@/lib/AuthContext";
import { haptic } from "@/hooks/usePlatform";
import { PRAYERS, pushSupport, saveReminder } from "@/lib/reminders";

/**
 * Accueil des nouveaux inscrits, modèle « Essai d'abord » :
 * 1. essai immédiat du cache-mots sur Al-Fatiha v. 1, 2. objectif, 3. rythme et date, 4. rappels.
 */
export const ONBOARDED_KEY = "mh_onboarded";
const PACES = [1, 3, 5];
const BASMALA = ["بِسْمِ", "ٱللَّهِ", "ٱلرَّحْمَٰنِ", "ٱلرَّحِيمِ"];
const STEPS = 4;

function Trial({ onDone }) {
  const [hidden, setHidden] = useState(0);
  const [peek, setPeek] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const audio = useRef(null);
  useEffect(() => () => audio.current?.pause(), []);
  const play = () => {
    haptic();
    if (!audio.current) { audio.current = new Audio(audioUrl(1)); audio.current.onended = () => setPlaying(false); }
    if (playing) { audio.current.pause(); setPlaying(false); } else { audio.current.currentTime = 0; audio.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); }
  };
  // Les mots disparaissent de la fin vers le début, comme dans la séance de mémorisation.
  const isHidden = (i) => i >= BASMALA.length - hidden && peek !== i;
  const done = hidden === BASMALA.length;
  return (
    <>
      <h1 className="text-[28px] font-black leading-tight">Essaie tout de suite</h1>
      <p className="font-semibold text-muted-foreground mt-1">Écoute le verset, puis cache les mots un à un et récite de mémoire.</p>
      <div className="mt-6 rounded-2xl border-2 border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Al-Fatiha · verset 1</span>
          <button onClick={play} aria-label={playing ? "Pause" : "Écouter"} className="w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center">
            {playing ? <Pause weight="fill" className="w-5 h-5" /> : <Play weight="fill" className="w-5 h-5" />}
          </button>
        </div>
        <p dir="rtl" lang="ar" className="font-arabic text-[32px] leading-[1.9] text-center mt-4 flex flex-wrap justify-center gap-x-3">
          {BASMALA.map((w, i) => (
            <button key={i} onClick={() => isHidden(i) || peek === i ? setPeek(peek === i ? -1 : i) : null}
              className={`rounded-lg px-1 transition-colors ${isHidden(i) ? "bg-muted text-transparent select-none" : ""}`}>{w}</button>
          ))}
        </p>
        <p className="text-center text-sm font-semibold text-muted-foreground mt-2">Au nom d'Allah, le Tout Miséricordieux, le Très Miséricordieux</p>
        {hidden > 0 && <p className="text-center text-xs font-bold text-muted-foreground mt-3">Touche un mot caché pour le revoir un instant.</p>}
      </div>
      <div className="grid grid-cols-2 gap-2 mt-4">
        <button disabled={hidden === 0} onClick={() => { haptic(); setPeek(-1); setHidden(hidden - 1); }} className="h-12 rounded-2xl border-2 border-border bg-card font-extrabold disabled:opacity-40">Montrer un mot</button>
        <button disabled={done} onClick={() => { haptic(); setPeek(-1); setHidden(hidden + 1); }} className="h-12 rounded-2xl border-2 border-border bg-card font-extrabold disabled:opacity-40">Cacher un mot</button>
      </div>
      {done && <p className="mt-4 text-sm font-bold text-accent-foreground flex items-center gap-2"><Check weight="bold" className="w-4 h-4" />Tout est caché. Si tu l'as récité, c'est exactement ainsi que se passent tes séances.</p>}
      <Footer label={done ? "Continuer" : "J'ai compris, continuer"} onNext={onDone} />
    </>
  );
}

function Footer({ label, onNext, busy, secondary, onSecondary }) {
  return (
    <div className="fixed inset-x-0 bottom-0 bg-background">
      <div className="max-w-[460px] mx-auto px-5 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
        <button disabled={busy} onClick={onNext} className="btn-relief w-full h-[52px] bg-primary text-primary-foreground disabled:opacity-70">
          {busy ? <SpinnerGap weight="bold" className="w-5 h-5 animate-spin" /> : label}
        </button>
        {secondary && <button onClick={onSecondary} className="w-full h-12 font-extrabold text-muted-foreground">{secondary}</button>}
      </div>
    </div>
  );
}

export default function Welcome() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState("juz_amma");
  const [pace, setPace] = useState(3);
  const [prayers, setPrayers] = useState(["fajr", "maghrib"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const first = (user?.user_metadata?.full_name || "").trim().split(/\s+/)[0];
  const total = (k) => goalSurahs(k).reduce((n, s) => n + s.numberOfAyahs, 0);
  const end = new Date(Date.now() + Math.ceil(total(goal) / pace) * 86400000);
  const endLabel = end.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const push = pushSupport();
  const goalLabel = GOALS.find((g) => g.key === goal)?.label;

  const next = () => { haptic(); setError(null); setStep((s) => s + 1); window.scrollTo(0, 0); };
  const finish = () => { localStorage.setItem(ONBOARDED_KEY, "1"); navigate("/Dashboard", { replace: true }); };

  const savePlan = async () => {
    setBusy(true); setError(null);
    try {
      const g = GOALS.find((x) => x.key === goal);
      await HifzPlan.save({ goal_label: goal, start_surah: g.start, direction: g.direction, daily_new: pace, manzil_daily: 20, goal_date: end.toISOString().slice(0, 10) });
      qc.invalidateQueries({ queryKey: ["hifz-plan"] });
      next();
    } catch {
      setError("Impossible d'enregistrer pour le moment. Tu pourras le faire depuis l'onglet Réviser.");
    } finally { setBusy(false); }
  };

  const enableReminders = async () => {
    if (!prayers.length) return finish();
    setBusy(true); setError(null);
    try { await saveReminder({ prayers, offset_min: 15 }); finish(); }
    catch (e) {
      setError(e?.message === "permission" ? "Notifications refusées. Tu pourras les activer plus tard dans Réglages." : e?.message === "geo" ? "Position introuvable. Tu pourras régler les rappels plus tard dans Réglages." : "Impossible d'activer les rappels pour le moment. Réessaie depuis Réglages.");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="max-w-[460px] mx-auto px-5 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-40">
        <div className="flex items-center gap-3 h-11">
          {step > 0 ? (
            <button onClick={() => setStep(step - 1)} aria-label="Retour" className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-muted-foreground"><ArrowLeft weight="bold" className="w-5 h-5" /></button>
          ) : <span className="w-8" />}
          <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((step + 1) / STEPS) * 100}%` }} /></div>
          <button onClick={finish} className="text-sm font-extrabold text-muted-foreground">Passer</button>
        </div>
        <div className="mt-6">
          {step === 0 && <Trial onDone={next} />}

          {step === 1 && (
            <>
              <h1 className="text-[28px] font-black leading-tight">{first ? `${first}, que veux-tu mémoriser ?` : "Que veux-tu mémoriser ?"}</h1>
              <p className="font-semibold text-muted-foreground mt-1">Tu pourras changer d'objectif à tout moment.</p>
              <div className="space-y-2 mt-6">
                {GOALS.map((g) => (
                  <button key={g.key} onClick={() => { haptic(); setGoal(g.key); }}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left ${goal === g.key ? "border-primary bg-accent" : "border-border bg-card"}`}>
                    <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${goal === g.key ? "border-primary" : "border-border"}`}>{goal === g.key && <span className="w-3 h-3 rounded-full bg-primary" />}</span>
                    <span className="flex-1 min-w-0"><span className={`block font-extrabold ${goal === g.key ? "text-accent-foreground" : ""}`}>{g.label}</span><span className="block text-[12.5px] font-semibold text-muted-foreground">{g.hint}</span></span>
                    <span className="text-sm font-extrabold text-muted-foreground">{total(g.key)} v.</span>
                  </button>
                ))}
              </div>
              <Footer label="Continuer" onNext={next} />
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="text-[28px] font-black leading-tight">Ton rythme</h1>
              <p className="font-semibold text-muted-foreground mt-1">Combien de nouveaux versets par jour ? Les révisions s'ajoutent automatiquement.</p>
              <div className="grid grid-cols-3 gap-1 p-1 rounded-[14px] bg-muted mt-6">
                {PACES.map((p) => (
                  <button key={p} onClick={() => { haptic(); setPace(p); }} className={`h-12 rounded-[10px] text-sm font-extrabold ${pace === p ? "bg-card text-accent-foreground shadow-[0_2px_0_hsl(var(--border))]" : "text-muted-foreground"}`}>{p} verset{p > 1 ? "s" : ""}/j</button>
                ))}
              </div>
              <div className="mt-5 rounded-2xl border-2 border-border bg-card p-5">
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Fin estimée</p>
                <p className="text-[26px] font-black text-accent-foreground mt-1 first-letter:uppercase">{endLabel}</p>
                <p className="text-sm font-semibold text-muted-foreground mt-1">{goalLabel} · {total(goal)} versets à {pace} par jour</p>
              </div>
              {error && <p className="mt-3 text-sm font-bold text-destructive">{error}</p>}
              <Footer label="Valider mon programme" busy={busy} onNext={savePlan} />
            </>
          )}

          {step === 3 && (
            <>
              <h1 className="text-[28px] font-black leading-tight">Un rappel après la prière ?</h1>
              <p className="font-semibold text-muted-foreground mt-1">Une notification 15 minutes après les prières choisies, pour ne jamais oublier ta séance.</p>
              {push === "ok" ? (
                <div className="flex flex-wrap gap-2 mt-6">
                  {PRAYERS.map((p) => {
                    const on = prayers.includes(p.key);
                    return (
                      <button key={p.key} onClick={() => { haptic(); setPrayers(on ? prayers.filter((x) => x !== p.key) : [...prayers, p.key]); }}
                        className={`h-11 px-4 rounded-full border-2 font-extrabold ${on ? "border-primary bg-accent text-accent-foreground" : "border-border bg-card text-muted-foreground"}`}>{p.label}</button>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border-2 border-border bg-card p-4 flex gap-3">
                  <Bell weight="fill" className="w-6 h-6 text-primary shrink-0" />
                  <p className="text-sm font-semibold text-muted-foreground">{push === "install" ? "Sur iPhone, les rappels fonctionnent une fois MyHafizz ajouté à l'écran d'accueil. Tu pourras les activer ensuite dans Réglages." : "Ce navigateur ne permet pas les notifications. Tu pourras réessayer depuis Réglages sur un autre appareil."}</p>
                </div>
              )}
              {error && <p className="mt-3 text-sm font-bold text-destructive">{error}</p>}
              {push === "ok"
                ? <Footer label={prayers.length ? "Activer les rappels" : "Commencer"} busy={busy} onNext={enableReminders} secondary="Plus tard" onSecondary={finish} />
                : <Footer label="Commencer" onNext={finish} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
