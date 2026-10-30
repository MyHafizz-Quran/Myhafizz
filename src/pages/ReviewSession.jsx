import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, SpeakerHigh, Pause, Lightbulb, CheckCircle, Repeat } from "@phosphor-icons/react";
import { MemorizationProgress, VerseReview, HifzPlan } from "@/api/entities";
import { buildSession, schedule, maskWords, GRADES, key, todayStr, strength } from "@/lib/srs";
import { loadSurah, audioUrl } from "@/lib/learningData";
import { SURAHS } from "@/components/quranData";
import { usePreferences } from "@/components/usePreferences";
import { haptic } from "@/hooks/usePlatform";

const TITLES = { sabaq: "Nouvelle leçon", sabqi: "Révision récente", manzil: "Révision ancienne", weak: "Versets à renforcer" };
const MASK_LABEL = ["Texte complet", "Premières lettres", "Masqué"];

export default function ReviewSession() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const part = new URLSearchParams(window.location.search).get("part") || "sabqi";
  const isSabaq = part === "sabaq";
  const { reciter = "ar.alafasy" } = usePreferences();

  const { data: progress } = useQuery({ queryKey: ["memorization-progress"], queryFn: () => MemorizationProgress.list() });
  const { data: reviews } = useQuery({ queryKey: ["verse-reviews"], queryFn: () => VerseReview.list() });
  const { data: plan, isFetched: planFetched } = useQuery({ queryKey: ["hifz-plan"], queryFn: () => HifzPlan.get() });

  // La file est figée au démarrage pour ne pas bouger pendant la session
  const [queue, setQueue] = useState(null);
  useEffect(() => {
    if (queue || !progress || !reviews || !planFetched) return;
    if (part === "weak") {
      const rv = new Map(reviews.map((r) => [key(r.surah_number, r.verse_number), r]));
      const weak = [];
      progress.forEach((p) => (p.memorized_verses || []).forEach((v) => {
        const r = rv.get(key(p.surah_number, v));
        if (r && r.last_grade != null && (r.last_grade === 0 || strength(r) < 30)) weak.push({ surah_number: p.surah_number, verse_number: v, w: r?.last_grade === 0 ? 0 : 1 });
      }));
      setQueue(weak.sort((a, b) => a.w - b.w || a.surah_number - b.surah_number || a.verse_number - b.verse_number).slice(0, 20));
      return;
    }
    setQueue(buildSession({ plan, progress, reviews })[part] || []);
  }, [queue, progress, reviews, plan, planFetched, part]);

  const [idx, setIdx] = useState(0);
  const [ayahs, setAyahs] = useState({});
  const [mask, setMask] = useState(isSabaq ? 0 : 2);
  const [revealed, setRevealed] = useState(isSabaq);
  const [stats, setStats] = useState({ easy: 0, hard: 0, forgot: 0, learned: 0 });
  const [saving, setSaving] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [plays, setPlays] = useState(0);
  const audioRef = useRef(null);

  const item = queue?.[idx];
  const surah = item && SURAHS.find((s) => s.number === item.surah_number);

  useEffect(() => {
    if (!queue) return;
    [...new Set(queue.map((q) => q.surah_number))].forEach((n) => {
      loadSurah(n).then((list) => setAyahs((m) => ({ ...m, [n]: list }))).catch(() => {});
    });
  }, [queue]);

  const ayah = item ? ayahs[item.surah_number]?.[item.verse_number - 1] : null;

  useEffect(() => () => audioRef.current?.pause(), []);
  const stopAudio = () => { audioRef.current?.pause(); setPlaying(false); };
  const play = () => {
    if (!ayah) return;
    if (playing) return stopAudio();
    const a = audioRef.current || new Audio();
    audioRef.current = a;
    a.src = audioUrl(ayah.number, reciter);
    a.onended = () => { setPlaying(false); setPlays((n) => n + 1); };
    a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };

  const next = () => {
    stopAudio(); setPlays(0);
    setMask(isSabaq ? 0 : 2); setRevealed(isSabaq);
    setIdx((i) => i + 1);
  };

  const existing = useMemo(() => new Map((reviews || []).map((r) => [key(r.surah_number, r.verse_number), r])), [reviews]);

  const grade = async (g) => {
    if (!item || saving) return;
    haptic(); setSaving(true);
    try {
      const prev = existing.get(key(item.surah_number, item.verse_number));
      await VerseReview.upsert([{ surah_number: item.surah_number, verse_number: item.verse_number, ...schedule(prev, g) }]);
      setStats((s) => ({ ...s, [g === GRADES.EASY ? "easy" : g === GRADES.HARD ? "hard" : "forgot"]: s[g === GRADES.EASY ? "easy" : g === GRADES.HARD ? "hard" : "forgot"] + 1 }));
      next();
    } finally { setSaving(false); }
  };

  const learned = async () => {
    if (!item || saving) return;
    haptic(); setSaving(true);
    try {
      const row = (progress || []).find((p) => p.surah_number === item.surah_number);
      const set = new Set(row?.memorized_verses || []); set.add(item.verse_number);
      const arr = [...set].sort((a, b) => a - b);
      const total = surah.numberOfAyahs;
      const data = { surah_number: item.surah_number, memorized_verses: arr, total_verses: total,
        status: arr.length >= total ? "completed" : "in_progress", last_reviewed: new Date().toISOString() };
      if (row) await MemorizationProgress.update(row.id, data); else await MemorizationProgress.create(data);
      const d = new Date(); d.setDate(d.getDate() + 1);
      await VerseReview.upsert([{ surah_number: item.surah_number, verse_number: item.verse_number, interval_days: 1, reps: 0, due_date: todayStr(d) }]);
      await qc.invalidateQueries({ queryKey: ["memorization-progress"] });
      setStats((s) => ({ ...s, learned: s.learned + 1 }));
      next();
    } finally { setSaving(false); }
  };

  const finish = () => {
    qc.invalidateQueries({ queryKey: ["verse-reviews"] });
    qc.invalidateQueries({ queryKey: ["memorization-progress"] });
    navigate("/Revision", { replace: true });
  };

  const total = queue?.length || 0;
  const doneAll = queue && idx >= total;
  const pct = total ? Math.round((Math.min(idx, total) / total) * 100) : 0;

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <div className="max-w-2xl w-full mx-auto px-4 pt-[calc(env(safe-area-inset-top,0px)+14px)] flex items-center gap-3">
        <button onClick={finish} className="w-10 h-10 -ml-2 flex items-center justify-center text-muted-foreground" aria-label="Quitter"><X weight="bold" className="w-6 h-6" /></button>
        <div className="flex-1 h-4 rounded-full bg-muted overflow-hidden"><motion.div className="h-full rounded-full bg-primary" animate={{ width: `${pct}%` }} /></div>
        <span className="text-sm font-extrabold text-muted-foreground w-12 text-right">{Math.min(idx + 1, total)}/{total}</span>
      </div>

      <div className="max-w-2xl w-full mx-auto px-4 flex-1 flex flex-col">
        {!queue ? (
          <div className="flex-1 flex items-center justify-center"><div className="w-10 h-10 rounded-full border-4 border-accent border-t-primary animate-spin" /></div>
        ) : doneAll ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col items-center justify-center text-center gap-2 pb-10">
            <CheckCircle weight="fill" className="w-20 h-20 text-primary mb-2" />
            <p className="text-2xl font-extrabold">{total ? "Session terminée" : "Rien à faire ici"}</p>
            <p className="text-muted-foreground font-semibold mb-6">
              {isSabaq ? `${stats.learned} nouveau${stats.learned > 1 ? "x" : ""} verset${stats.learned > 1 ? "s" : ""} appris.`
                : total ? `${stats.easy} facile · ${stats.hard} hésité · ${stats.forgot} oublié` : "Reviens demain, ou commence une nouvelle leçon."}
            </p>
            <button onClick={finish} className="btn-relief w-full max-w-sm h-[52px] bg-primary text-primary-foreground">Continuer</button>
          </motion.div>
        ) : (
          <>
            <p className="mt-6 text-xs font-extrabold uppercase tracking-wide text-primary">{TITLES[part]}</p>
            <p className="text-lg font-extrabold mb-4">{surah?.englishName} <span className="text-muted-foreground font-semibold">· verset {item.verse_number}</span></p>

            <AnimatePresence mode="wait">
              <motion.div key={idx} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}
                className="card-flat p-5 flex-1 max-h-[46dvh] overflow-y-auto flex flex-col">
                {!ayah ? (
                  <div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-accent border-t-primary animate-spin" /></div>
                ) : (
                  <>
                    <p dir="rtl" className={`font-arabic text-3xl leading-[2.2] text-center my-auto ${mask === 2 && !revealed ? "text-muted-foreground/50 tracking-widest" : "text-foreground"}`}>
                      {revealed && !isSabaq ? ayah.text : maskWords(ayah.text, mask)}
                    </p>
                    {revealed && ayah.translation && <p className="text-sm text-muted-foreground font-semibold text-center mt-4">{ayah.translation}</p>}
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-center gap-3 mt-4">
              <button onClick={play} className={`h-11 px-4 rounded-2xl border-2 flex items-center gap-2 font-extrabold text-sm press ${playing ? "border-primary text-primary bg-accent" : "border-border bg-card"}`}>
                {playing ? <Pause weight="fill" /> : <SpeakerHigh weight="fill" />} Écouter
              </button>
              {isSabaq ? (
                <button onClick={() => { haptic(); setMask((m) => (m + 1) % 3); }} className="h-11 px-4 rounded-2xl border-2 border-border bg-card flex items-center gap-2 font-extrabold text-sm press">
                  <Repeat weight="bold" /> {MASK_LABEL[mask]}
                </button>
              ) : !revealed && (
                <button onClick={() => { haptic(); setMask((m) => Math.max(0, m - 1)); }} disabled={mask === 0} className="h-11 px-4 rounded-2xl border-2 border-border bg-card flex items-center gap-2 font-extrabold text-sm press disabled:opacity-50">
                  <Lightbulb weight="fill" /> Indice
                </button>
              )}
            </div>
            {isSabaq && <p className="text-center text-xs font-semibold text-muted-foreground mt-2">Écoute, répète, puis masque le texte et récite de mémoire.{plays > 0 && ` Écouté ${plays} fois.`}</p>}

            <div className="mt-auto pt-5 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
              {isSabaq ? (
                <button disabled={saving || !ayah} onClick={learned} className="btn-relief w-full h-[52px] bg-primary text-primary-foreground disabled:opacity-60">Je le connais</button>
              ) : !revealed ? (
                <button disabled={!ayah} onClick={() => { haptic(); setRevealed(true); setMask(0); }} className="btn-relief w-full h-[52px] bg-primary text-primary-foreground disabled:opacity-60">Vérifier</button>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <button disabled={saving} onClick={() => grade(GRADES.FORGOT)} className="btn-relief h-[52px] bg-destructive text-destructive-foreground text-sm [--relief-color:#B3261E]">Oublié</button>
                  <button disabled={saving} onClick={() => grade(GRADES.HARD)} className="btn-relief h-[52px] bg-[#F2B530] text-[#4A3500] text-sm [--relief-color:#C48F12]">Hésité</button>
                  <button disabled={saving} onClick={() => grade(GRADES.EASY)} className="btn-relief h-[52px] bg-primary text-primary-foreground text-sm">Facile</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
