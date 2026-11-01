import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { SpinnerGap, ArrowLeft, Bell, Check, X, BookOpenText, Waveform, Target, CalendarCheck } from "@phosphor-icons/react";
import { HifzPlan, Profile, usernameAvailable, cleanUsername, USERNAME_RE } from "@/api/entities";
import { GOALS, goalSurahs } from "@/lib/learningData";
import { useAuth } from "@/lib/AuthContext";
import { haptic } from "@/hooks/usePlatform";
import { PRAYERS, pushSupport, saveReminder } from "@/lib/reminders";

/**
 * Onboarding modèle 1 « Questions rapides » : objectif, niveau d'arabe, rythme, récap + rappels.
 * Les réponses alimentent le programme (hifz_plans) et le profil (profiles.arabic_level, goal, onboarded_at),
 * utilisés ensuite pour adapter le parcours et les rappels.
 * Les comptes sans nom d'utilisateur (inscription Google) le choisissent en premier.
 */
export const ONBOARDED_KEY = "mh_onboarded";
const PACES = [
  { v: 1, hint: "5 à 10 min par jour" },
  { v: 3, hint: "15 à 20 min par jour", rec: true },
  { v: 5, hint: "25 à 30 min par jour" },
];
const LEVELS = [
  { key: "good", label: "Je lis bien l'arabe", hint: "Lecture fluide du Coran sans aide.", icon: BookOpenText },
  { key: "some", label: "Je lis un peu", hint: "Je déchiffre avec toutes les voyelles.", icon: Waveform },
  { key: "none", label: "Pas encore", hint: "J'ai besoin de la phonétique et de l'audio.", icon: Target },
];

function Choice({ on, onClick, title, hint, right, icon: Icon }) {
  return (
    <button onClick={() => { haptic(); onClick(); }}
      className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left ${on ? "border-primary bg-accent" : "border-border bg-card"}`}>
      {Icon
        ? <Icon weight={on ? "fill" : "bold"} className={`w-7 h-7 shrink-0 ${on ? "text-primary" : "text-muted-foreground"}`} />
        : <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${on ? "border-primary" : "border-border"}`}>{on && <span className="w-3 h-3 rounded-full bg-primary" />}</span>}
      <span className="flex-1 min-w-0"><span className={`block font-extrabold ${on ? "text-accent-foreground" : ""}`}>{title}</span>{hint && <span className="block text-[12.5px] font-semibold text-muted-foreground">{hint}</span>}</span>
      {right && <span className="text-sm font-extrabold text-muted-foreground shrink-0">{right}</span>}
    </button>
  );
}

function Footer({ label, onNext, busy, disabled, secondary, onSecondary }) {
  return (
    <div className="fixed inset-x-0 bottom-0 bg-background border-t-2 border-border">
      <div className="max-w-[460px] mx-auto px-5 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
        <button disabled={busy || disabled} onClick={onNext} className="btn-relief w-full h-[52px] bg-primary text-primary-foreground disabled:opacity-60">
          {busy ? <SpinnerGap weight="bold" className="w-5 h-5 animate-spin" /> : label}
        </button>
        {secondary && <button onClick={onSecondary} className="w-full h-12 font-extrabold text-muted-foreground">{secondary}</button>}
      </div>
    </div>
  );
}

const H = ({ title, sub }) => (
  <>
    <h1 className="text-[28px] font-black leading-tight">{title}</h1>
    {sub && <p className="font-semibold text-muted-foreground mt-1">{sub}</p>}
  </>
);

export default function Welcome() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [needUser, setNeedUser] = useState(false);
  const [step, setStep] = useState(0);
  const [username, setUsername] = useState("");
  const [userState, setUserState] = useState(null);
  const [goal, setGoal] = useState("juz_amma");
  const [level, setLevel] = useState(null);
  const [pace, setPace] = useState(3);
  const [prayers, setPrayers] = useState(["fajr", "maghrib"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Profile.get().then((p) => { if (p && !p.username) setNeedUser(true); }).catch(() => {});
  }, []);
  useEffect(() => {
    const u = cleanUsername(username);
    if (!u) { setUserState(null); return; }
    if (!USERNAME_RE.test(u)) { setUserState("format"); return; }
    setUserState("checking");
    const t = setTimeout(async () => setUserState((await usernameAvailable(u)) === false ? "taken" : "free"), 400);
    return () => clearTimeout(t);
  }, [username]);

  const first = (user?.user_metadata?.full_name || "").trim().split(/\s+/)[0];
  const total = (k) => goalSurahs(k).reduce((n, s) => n + s.numberOfAyahs, 0);
  const end = new Date(Date.now() + Math.ceil(total(goal) / pace) * 86400000);
  const endLabel = end.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const goalLabel = GOALS.find((g) => g.key === goal)?.label;
  const push = pushSupport();

  // Étapes : [nom d'utilisateur], objectif, niveau, rythme, récap
  const steps = [...(needUser ? ["user"] : []), "goal", "level", "pace", "recap"];
  const cur = steps[Math.min(step, steps.length - 1)];
  const next = () => { haptic(); setError(null); setStep((s) => s + 1); window.scrollTo(0, 0); };

  const saveUser = async () => {
    setBusy(true); setError(null);
    try { await Profile.update({ username: cleanUsername(username) }); next(); }
    catch (e) { setError(e.message === "taken" ? "Ce nom d'utilisateur est déjà pris." : "Impossible d'enregistrer. Réessaie."); if (e.message === "taken") setUserState("taken"); }
    finally { setBusy(false); }
  };

  const done = (to) => { localStorage.setItem(ONBOARDED_KEY, "1"); navigate(to, { replace: true }); };

  const finish = async (withReminders) => {
    setBusy(true); setError(null);
    try {
      const g = GOALS.find((x) => x.key === goal);
      await HifzPlan.save({ goal_label: goal, start_surah: g.start, direction: g.direction, daily_new: pace, manzil_daily: 20, goal_date: end.toISOString().slice(0, 10) });
      await Profile.update({ arabic_level: level, goal, onboarded_at: new Date().toISOString() });
      qc.invalidateQueries({ queryKey: ["hifz-plan"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch {
      setError("Impossible d'enregistrer ton programme pour le moment. Vérifie ta connexion et réessaie.");
      setBusy(false); return;
    }
    if (withReminders && prayers.length && push === "ok") {
      try { await saveReminder({ prayers: [...prayers, "kahf", "verset", "bravo", "hebdo", "tafsir", "arabe", "dates"], offset_min: 15 }); }
      catch (e) {
        setBusy(false);
        setError(e?.message === "permission" ? "Notifications refusées. Ton programme est enregistré, tu pourras activer les rappels dans Réglages." : "Rappels non activés. Ton programme est enregistré, tu pourras réessayer dans Réglages.");
        setTimeout(() => done(level === "none" ? "/LireArabe" : "/Dashboard"), 2500);
        return;
      }
    }
    // Pas encore lecteur : on commence par le parcours « Lire l'arabe ».
    done(level === "none" ? "/LireArabe" : "/Dashboard");
  };

  const userHint = { checking: ["Vérification…", "text-muted-foreground"], free: ["Disponible", "text-primary"], taken: ["Déjà pris", "text-destructive"], format: ["3 à 20 caractères : a-z, 0-9, point ou tiret bas", "text-muted-foreground"] }[userState];

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="max-w-[460px] mx-auto px-5 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-44">
        <div className="flex items-center gap-3 h-11">
          {step > 0
            ? <button onClick={() => { setError(null); setStep(step - 1); }} aria-label="Retour" className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-muted-foreground"><ArrowLeft weight="bold" className="w-5 h-5" /></button>
            : <span className="w-8" />}
          <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
          {cur !== "user" ? <button onClick={() => done("/Dashboard")} className="text-sm font-extrabold text-muted-foreground">Passer</button> : <span className="w-8" />}
        </div>
        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mt-4">Étape {step + 1} sur {steps.length}</p>

        <div className="mt-2">
          {cur === "user" && (
            <>
              <H title="Choisis ton nom d'utilisateur" sub="Il s'affiche dans les groupes, les jeux et les classements." />
              <div className="relative mt-6">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-extrabold text-muted-foreground">@</span>
                <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))} autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={20} placeholder="ibrahim.k" autoFocus
                  className="w-full h-[52px] pl-9 pr-4 rounded-2xl border-2 border-border bg-card font-bold placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
              </div>
              {userHint && <p className={`mt-1.5 flex items-center gap-1 text-[13px] font-bold ${userHint[1]}`}>{userState === "free" && <Check weight="bold" />}{userState === "taken" && <X weight="bold" />}{userHint[0]}</p>}
              {error && <p className="mt-3 text-sm font-bold text-destructive">{error}</p>}
              <Footer label="Continuer" busy={busy} disabled={userState !== "free"} onNext={saveUser} />
            </>
          )}

          {cur === "goal" && (
            <>
              <H title={first ? `${first}, quel est ton objectif ?` : "Quel est ton objectif ?"} sub="Choisis la partie du Coran que tu veux mémoriser." />
              <div className="space-y-2 mt-6">
                {GOALS.map((g) => <Choice key={g.key} on={goal === g.key} onClick={() => setGoal(g.key)} title={g.label} hint={g.hint} right={`${total(g.key)} v.`} />)}
              </div>
              <Footer label="Continuer" onNext={next} />
            </>
          )}

          {cur === "level" && (
            <>
              <H title="Quel est ton niveau en arabe ?" sub="On adapte l'audio, la phonétique et ton point de départ." />
              <div className="space-y-2 mt-6">
                {LEVELS.map((l) => <Choice key={l.key} on={level === l.key} onClick={() => setLevel(l.key)} title={l.label} hint={l.hint} icon={l.icon} />)}
              </div>
              {level === "none" && <p className="mt-3 text-sm font-semibold text-muted-foreground">Tu commenceras par le parcours « Lire l'arabe », avec l'audio. La mémorisation reste accessible à tout moment.</p>}
              <Footer label="Continuer" disabled={!level} onNext={next} />
            </>
          )}

          {cur === "pace" && (
            <>
              <H title="Quel est ton rythme ?" sub="Nombre de nouveaux versets par jour. Les révisions s'ajoutent automatiquement." />
              <div className="space-y-2 mt-6">
                {PACES.map((p) => (
                  <Choice key={p.v} on={pace === p.v} onClick={() => setPace(p.v)} title={`${p.v} verset${p.v > 1 ? "s" : ""} par jour`} hint={p.rec ? `Recommandé · ${p.hint}` : p.hint} />
                ))}
              </div>
              <p className="text-sm font-semibold text-muted-foreground mt-4 ml-1">{goalLabel} terminé vers <span className="font-extrabold text-accent-foreground">{endLabel}</span>.</p>
              <Footer label="Continuer" onNext={next} />
            </>
          )}

          {cur === "recap" && (
            <>
              <H title="Ton programme est prêt" sub="Tu pourras tout changer plus tard dans l'onglet Réviser." />
              <div className="mt-6 rounded-2xl border-2 border-border bg-card divide-y-2 divide-border">
                {[
                  [Target, "Objectif", `${goalLabel} · ${total(goal)} versets`],
                  [BookOpenText, "Niveau", LEVELS.find((l) => l.key === level)?.label],
                  [Waveform, "Rythme", `${pace} verset${pace > 1 ? "s" : ""} par jour`],
                  [CalendarCheck, "Fin estimée", endLabel],
                ].map(([Icon, k, v]) => (
                  <div key={k} className="flex items-center gap-3 px-4 py-3">
                    <Icon weight="bold" className="w-5 h-5 text-primary shrink-0" />
                    <span className="text-sm font-bold text-muted-foreground w-24 shrink-0">{k}</span>
                    <span className="font-extrabold first-letter:uppercase">{v}</span>
                  </div>
                ))}
              </div>

              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mt-6 mb-2 ml-1">Rappel après la prière</p>
              {push === "ok" ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    {PRAYERS.map((p) => {
                      const on = prayers.includes(p.key);
                      return (
                        <button key={p.key} onClick={() => { haptic(); setPrayers(on ? prayers.filter((x) => x !== p.key) : [...prayers, p.key]); }}
                          className={`h-11 px-4 rounded-full border-2 font-extrabold ${on ? "border-primary bg-accent text-accent-foreground" : "border-border bg-card text-muted-foreground"}`}>{p.label}</button>
                      );
                    })}
                  </div>
                  <p className="text-sm font-semibold text-muted-foreground mt-2 ml-1">Une notification 15 minutes après chaque prière choisie, avec ton travail du jour.</p>
                </>
              ) : (
                <div className="rounded-2xl border-2 border-border bg-card p-4 flex gap-3">
                  <Bell weight="fill" className="w-6 h-6 text-primary shrink-0" />
                  <p className="text-sm font-semibold text-muted-foreground">{push === "install" ? "Sur iPhone, les rappels fonctionnent une fois MyHafizz ajouté à l'écran d'accueil. Tu pourras les activer ensuite dans Réglages." : "Ce navigateur ne permet pas les notifications. Tu pourras les activer dans Réglages sur un autre appareil."}</p>
                </div>
              )}
              {error && <p className="mt-3 text-sm font-bold text-destructive">{error}</p>}
              {push === "ok" && prayers.length
                ? <Footer label="Activer les rappels et commencer" busy={busy} onNext={() => finish(true)} secondary="Commencer sans rappel" onSecondary={() => finish(false)} />
                : <Footer label="Commencer" busy={busy} onNext={() => finish(false)} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
