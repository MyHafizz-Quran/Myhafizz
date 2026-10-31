import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CaretLeft, Play, Stop, Minus, Plus } from "@phosphor-icons/react";
import { SURAHS } from "@/components/quranData";
import { loadSurah, audioUrl } from "@/lib/learningData";
import { usePreferences } from "@/components/usePreferences";
import { useAudioManager } from "@/lib/AudioManager";
import { haptic } from "@/hooks/usePlatform";

const REPEATS = [1, 3, 5, 10, 20];
const RANGE_REPEATS = [{ v: 1, l: "1×" }, { v: 3, l: "3×" }, { v: 0, l: "∞" }];
const SPEEDS = [0.75, 1, 1.25];
const GAPS = [{ v: "none", l: "Aucune" }, { v: "short", l: "2 s" }, { v: "same", l: "Durée du verset" }];
const LS = "mh_repeat_settings";

function Chips({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const v = typeof o === "object" ? o.v : o;
        const l = typeof o === "object" ? o.l : `${o}`;
        return (
          <button key={String(v)} type="button" onClick={() => { haptic(); onChange(v); }}
            className={`h-10 min-w-[48px] px-3 rounded-xl border-2 font-extrabold text-sm press ${value === v ? "border-primary bg-accent text-primary" : "border-border bg-card"}`}>{l}</button>
        );
      })}
    </div>
  );
}

function VerseStepper({ label, value, onChange, min, max }) {
  return (
    <div className="flex-1">
      <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mb-2">{label}</p>
      <div className="flex items-center justify-between card-flat px-2 h-12">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} className="w-9 h-9 flex items-center justify-center press" aria-label="Moins"><Minus weight="bold" /></button>
        <span className="font-extrabold text-lg">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} className="w-9 h-9 flex items-center justify-center press" aria-label="Plus"><Plus weight="bold" /></button>
      </div>
    </div>
  );
}

export default function Repeat() {
  const navigate = useNavigate();
  const n = parseInt(new URLSearchParams(window.location.search).get("surah") || "1", 10);
  const surah = SURAHS.find((s) => s.number === n) || SURAHS[0];
  const { reciter = "ar.alafasy" } = usePreferences();
  const { stopLoop } = useAudioManager();

  const saved = (() => { try { return JSON.parse(localStorage.getItem(LS) || "{}"); } catch { return {}; } })();
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(Math.min(surah.numberOfAyahs, 3));
  const [repeats, setRepeats] = useState(saved.repeats ?? 3);
  const [rangeRepeats, setRangeRepeats] = useState(saved.rangeRepeats ?? 1);
  const [speed, setSpeed] = useState(saved.speed ?? 1);
  const [gap, setGap] = useState(saved.gap ?? "same");
  const [ayahs, setAyahs] = useState(null);
  const [state, setState] = useState({ playing: false, verse: null, rep: 0, round: 0, pausing: false });

  const audio = useRef(null);
  const timer = useRef(null);
  const run = useRef({ active: false });

  useEffect(() => { loadSurah(n).then(setAyahs).catch(() => setAyahs([])); }, [n]);
  useEffect(() => { localStorage.setItem(LS, JSON.stringify({ repeats, rangeRepeats, speed, gap })); }, [repeats, rangeRepeats, speed, gap]);
  useEffect(() => { if (audio.current) audio.current.playbackRate = speed; }, [speed]);
  useEffect(() => () => stop(), []);  

  const setMedia = (v) => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title: `${surah.englishName} · verset ${v}`, artist: "MyHafizz · Répétition", artwork: [{ src: "/logo-512.png", sizes: "512x512", type: "image/png" }] });
    navigator.mediaSession.setActionHandler("pause", () => stop());
    navigator.mediaSession.setActionHandler("stop", () => stop());
  };

  const playStep = (v, rep, round) => {
    if (!run.current.active) return;
    const a = ayahs?.[v - 1];
    if (!a) return stop();
    setState({ playing: true, verse: v, rep, round, pausing: false });
    setMedia(v);
    const el = audio.current;
    el.src = audioUrl(a.number, reciter);
    el.playbackRate = speed;
    el.onended = () => {
      if (!run.current.active) return;
      let nv = v, nrep = rep + 1, nround = round;
      if (nrep >= repeats) { nrep = 0; nv = v + 1; }
      if (nv > to) { nv = from; nround = round + 1; }
      if (rangeRepeats !== 0 && nround >= rangeRepeats) return stop(true);
      const wait = gap === "none" ? 0 : gap === "short" ? 2000 : Math.min(20000, (el.duration || 3) * 1000 / speed);
      setState((s) => ({ ...s, pausing: wait > 0 }));
      timer.current = setTimeout(() => playStep(nv, nrep, nround), wait);
    };
    el.play().catch(() => stop());
  };

  const start = () => {
    haptic();
    stopLoop?.();
    if (!audio.current) audio.current = new Audio();
    run.current.active = true;
    playStep(from, 0, 0);
  };

  function stop(finished = false) {
    run.current.active = false;
    clearTimeout(timer.current);
    audio.current?.pause();
    setState({ playing: false, verse: null, rep: 0, round: 0, pausing: false, finished });
  }

  const current = state.verse && ayahs?.[state.verse - 1];

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <div className="max-w-2xl w-full mx-auto px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] flex items-center gap-2">
        <button onClick={() => { stop(); navigate(-1); }} className="w-10 h-10 -ml-2 flex items-center justify-center" aria-label="Retour"><CaretLeft weight="bold" className="w-6 h-6" /></button>
        <div>
          <h1 className="text-lg font-extrabold leading-tight">Répétition</h1>
          <p className="text-xs font-semibold text-muted-foreground">{surah.englishName} · {surah.numberOfAyahs} versets</p>
        </div>
      </div>

      <div className="max-w-2xl w-full mx-auto px-4 flex-1 flex flex-col gap-5 mt-4">
        {state.playing ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-flat p-5 flex-1 flex flex-col">
            <p className="text-xs font-extrabold uppercase tracking-wide text-primary">
              Verset {state.verse} · écoute {state.rep + 1}/{repeats}{rangeRepeats !== 1 && ` · tour ${state.round + 1}${rangeRepeats ? `/${rangeRepeats}` : ""}`}
            </p>
            <p dir="rtl" className="font-arabic text-3xl leading-[2.2] text-center my-auto">{current?.text}</p>
            <p className={`text-center font-extrabold text-sm ${state.pausing ? "text-primary" : "text-muted-foreground"}`}>{state.pausing ? "À toi : répète le verset" : "Écoute"}</p>
          </motion.div>
        ) : (
          <>
            {state.finished && <p className="card-flat p-4 font-extrabold text-center">Répétition terminée, Macha'Allah.</p>}
            <div className="flex gap-3">
              <VerseStepper label="Du verset" value={from} min={1} max={surah.numberOfAyahs} onChange={(v) => { setFrom(v); if (v > to) setTo(v); }} />
              <VerseStepper label="Au verset" value={to} min={1} max={surah.numberOfAyahs} onChange={(v) => { setTo(v); if (v < from) setFrom(v); }} />
            </div>
            <div><p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mb-2">Écoutes par verset</p><Chips options={REPEATS} value={repeats} onChange={setRepeats} /></div>
            <div><p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mb-2">Répéter la plage</p><Chips options={RANGE_REPEATS} value={rangeRepeats} onChange={setRangeRepeats} /></div>
            <div><p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mb-2">Pause pour répéter</p><Chips options={GAPS} value={gap} onChange={setGap} /></div>
            <div><p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mb-2">Vitesse</p><Chips options={SPEEDS.map((s) => ({ v: s, l: `${s}×` }))} value={speed} onChange={setSpeed} /></div>
            <p className="text-xs font-semibold text-muted-foreground">
              {(to - from + 1) * repeats * (rangeRepeats || 1)} écoutes au total{rangeRepeats === 0 ? " par tour, en boucle" : ""}. La lecture continue écran verrouillé.
            </p>
          </>
        )}

        <div className="mt-auto pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
          {state.playing ? (
            <button onClick={() => stop()} className="btn-relief w-full h-[52px] bg-card text-foreground border-2 border-border [--relief-color:hsl(var(--border))]"><Stop weight="fill" /> Arrêter</button>
          ) : (
            <button disabled={!ayahs?.length} onClick={start} className="btn-relief w-full h-[52px] bg-primary text-primary-foreground disabled:opacity-60"><Play weight="fill" /> Lancer</button>
          )}
        </div>
      </div>
    </div>
  );
}
