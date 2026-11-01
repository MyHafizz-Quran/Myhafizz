import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, SpeakerHigh, CheckCircle, XCircle, Eraser, Lightning, Target, Medal } from "@phosphor-icons/react";
import { ReadingLessons } from "@/api/entities";
import { ReadingSessions } from "@/api/entities/learning";
import { getGoal, todayCount, weekStart, earnedBadges } from "@/lib/readingGame";
import { L, HARAKAT, POSITIONS, formsOf, lessonById, buildLesson, speak, hasArabicVoice, PLACEMENT_UNLOCKS, RULES, playUrl, stopAudio } from "@/lib/qaida";
import { haptic } from "@/hooks/usePlatform";

const AR = "font-arabic";
const DANGER_LIP = "#B42020";

// petit son de validation (sans fichier)
function chime(ok) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.value = ok ? 880 : 220;
    if (ok) o.frequency.setValueAtTime(660, ctx.currentTime), o.frequency.setValueAtTime(990, ctx.currentTime + 0.09);
    g.gain.setValueAtTime(0.08, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28);
    o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.3);
  } catch { /* ignore */ }
}

function SpeakBtn({ text, audio, big, auto }) {
  const say = () => (audio ? playUrl(audio, text) : speak(text));
  useEffect(() => { if (auto) { const t = setTimeout(say, 350); return () => clearTimeout(t); } }, [text, audio, auto]);  
  return (
    <button onClick={() => { haptic(); say(); }} aria-label="Écouter"
      className={`btn-relief bg-primary text-primary-foreground ${big ? "w-24 h-24 rounded-3xl" : "w-12 h-12"}`}>
      <SpeakerHigh weight="fill" className={big ? "w-10 h-10" : "w-6 h-6"} />
    </button>
  );
}

function Option({ children, state, onClick, ar }) {
  const cls = state === "selected" ? "border-primary bg-accent text-accent-foreground"
    : state === "correct" ? "border-primary bg-accent text-primary"
    : state === "wrong" ? "border-destructive bg-destructive/10 text-destructive"
    : "border-border bg-card text-foreground";
  return (
    <button onClick={onClick} className={`min-h-[76px] rounded-2xl border-2 border-b-[5px] px-3 py-3 font-extrabold transition-colors active:translate-y-[2px] active:border-b-2 ${cls} ${ar === "word" ? `${AR} text-[26px] leading-[2] break-words` : ar ? `${AR} text-[38px] leading-[1.9]` : "text-[17px]"}`} dir={ar ? "rtl" : undefined}>
      {children}
    </button>
  );
}

/* ── Tracé de la lettre au doigt ── */
function Trace({ letter, onInk, resetKey, registerCheck }) {
  const guide = useRef(null), ink = useRef(null), strokes = useRef([]), drawing = useRef(false);
  const [size, setSize] = useState(300);
  const wrap = useRef(null);
  useEffect(() => { const w = Math.min(320, (wrap.current?.clientWidth || 300)); setSize(w); }, []);
  const fontPx = size * 0.58;
  // la lettre est mesurée puis centrée sur son encre réelle : jamais coupée, quelle que soit sa forme
  const draw = (ctx, s, fill) => {
    const fam = 'Amiri, "Amiri Quran", serif';
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.direction = "rtl";
    let fs = s * 0.5; ctx.font = `${fs}px ${fam}`;
    let m = ctx.measureText(letter.ar);
    const w0 = (m.actualBoundingBoxLeft + m.actualBoundingBoxRight) || fs * 0.6, h0 = (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) || fs;
    fs = Math.min(s * 0.62, fs * Math.min((s * 0.66) / w0, (s * 0.66) / h0));
    ctx.font = `${fs}px ${fam}`; m = ctx.measureText(letter.ar);
    const L = m.actualBoundingBoxLeft || 0, R = m.actualBoundingBoxRight || fs * 0.6, A = m.actualBoundingBoxAscent || fs * 0.7, D = m.actualBoundingBoxDescent || 0;
    const x = (s - (L + R)) / 2 + L, y = (s - (A + D)) / 2 + A;
    if (fill) ctx.fillText(letter.ar, x, y);
    return [x, y];
  };
  useEffect(() => {
    const dpr = window.devicePixelRatio || 1;
    [guide.current, ink.current].forEach((c) => { c.width = size * dpr; c.height = size * dpr; c.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0); });
    strokes.current = []; onInk(false);
    const paint = () => {
      const g = guide.current.getContext("2d"); g.clearRect(0, 0, size, size);
      g.fillStyle = "rgba(0,163,168,.16)"; draw(g, size, true);
      ink.current.getContext("2d").clearRect(0, 0, size, size);
    };
    (document.fonts?.load ? document.fonts.load(`${Math.round(fontPx)}px Amiri`).catch(() => {}) : Promise.resolve()).then(paint);
     
  }, [letter.id, size, resetKey]);

  const pos = (e) => { const r = ink.current.getBoundingClientRect(); return [(e.clientX - r.left), (e.clientY - r.top)]; };
  const down = (e) => { e.preventDefault(); ink.current.setPointerCapture?.(e.pointerId); drawing.current = true; strokes.current.push([pos(e)]); };
  const move = (e) => {
    if (!drawing.current) return; e.preventDefault();
    const s = strokes.current[strokes.current.length - 1]; const p = pos(e); s.push(p);
    const ctx = ink.current.getContext("2d"); ctx.strokeStyle = "#00666A"; ctx.lineWidth = size * 0.055; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); const a = s[s.length - 2] || p; ctx.moveTo(a[0], a[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
    onInk(true);
  };
  const up = () => { drawing.current = false; };

  // évaluation : l'encre reste sur la lettre (précision) et la couvre assez (rappel)
  useEffect(() => {
    registerCheck(() => {
      const S = 120, k = S / size;
      const mk = () => { const c = document.createElement("canvas"); c.width = S; c.height = S; return c.getContext("2d", { willReadFrequently: true }); };
      const fill = mk(); fill.fillStyle = "#000"; draw(fill, S, true);
      const dil = mk(); dil.fillStyle = "#000"; dil.strokeStyle = "#000"; dil.lineWidth = S * 0.11; dil.lineJoin = "round"; const [dx, dy] = draw(dil, S, true); dil.strokeText(letter.ar, dx, dy);
      const paintInk = (w) => { const c = mk(); c.strokeStyle = "#000"; c.lineWidth = w; c.lineCap = "round"; c.lineJoin = "round"; strokes.current.forEach((st) => { c.beginPath(); st.forEach(([x, y], i) => (i ? c.lineTo(x * k, y * k) : c.moveTo(x * k, y * k))); if (st.length === 1) c.lineTo(st[0][0] * k + 0.1, st[0][1] * k); c.stroke(); }); return c; };
      const thin = paintInk(S * 0.04), thick = paintInk(S * 0.14);
      const A = (c) => c.getImageData(0, 0, S, S).data;
      const F = A(fill), D = A(dil), T = A(thin), K = A(thick);
      let inkN = 0, inkIn = 0, fillN = 0, fillCov = 0;
      for (let i = 3; i < F.length; i += 4) {
        if (T[i] > 60) { inkN++; if (D[i] > 30) inkIn++; }
        if (F[i] > 120) { fillN++; if (K[i] > 60) fillCov++; }
      }
      const precision = inkN ? inkIn / inkN : 0, recall = fillN ? fillCov / fillN : 0;
      return precision > 0.72 && recall > 0.55;
    });
  });

  return (
    <div ref={wrap} className="w-full flex justify-center">
      <div className="relative rounded-3xl border-2 border-border bg-card" style={{ width: size, height: size, touchAction: "none" }}>
        <canvas ref={guide} className="absolute inset-0" style={{ width: size, height: size }} />
        <canvas ref={ink} className="absolute inset-0" style={{ width: size, height: size, touchAction: "none" }}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up} />
      </div>
    </div>
  );
}

/* ── Paires ── */
function Pairs({ pairs, arBoth, onDone }) {
  const left = useMemo(() => pairs.map((p) => ({ id: p[0], label: p[1] })), [pairs]);
  const right = useMemo(() => [...pairs].sort(() => Math.random() - 0.5).map((p) => ({ id: p[0], label: p[2] })), [pairs]);
  const [sel, setSel] = useState(null), [done, setDone] = useState([]), [bad, setBad] = useState(null), mistakes = useRef(0);
  const tap = (side, id) => {
    haptic();
    if (done.includes(id)) return;
    if (!sel || sel.side === side) { setSel({ side, id }); if (side === "l" || arBoth) speakFor(id); return; }
    if (sel.id === id) { const d = [...done, id]; setDone(d); setSel(null); chime(true); if (d.length === pairs.length) setTimeout(() => onDone(mistakes.current === 0), 350); }
    else { mistakes.current++; setBad([sel.id, id, sel.side]); setSel(null); chime(false); setTimeout(() => setBad(null), 500); }
  };
  const speakFor = (id) => { const p = pairs.find((x) => x[0] === id); if (p && hasArabicVoice()) speak(L[id]?.nameAr || p[1]); };
  const st = (side, id) => done.includes(id) ? "opacity-40 border-border bg-muted" : sel?.side === side && sel.id === id ? "border-primary bg-accent" : bad && ((bad[2] === side && bad[0] === id) || (bad[2] !== side && bad[1] === id)) ? "border-destructive bg-destructive/10" : "border-border bg-card";
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-3">{left.map((x) => <button key={x.id} disabled={done.includes(x.id)} onClick={() => tap("l", x.id)} className={`w-full min-h-[68px] px-2 py-1 rounded-2xl border-2 border-b-[5px] ${AR} ${[...x.label].length > 5 ? "text-[22px]" : "text-[30px]"} leading-[1.9] break-words ${st("l", x.id)}`} dir="rtl">{x.label}</button>)}</div>
      <div className="space-y-3">{right.map((x) => <button key={x.id} disabled={done.includes(x.id)} onClick={() => tap("r", x.id)} className={`w-full min-h-[68px] px-2 py-1 rounded-2xl border-2 border-b-[5px] font-extrabold ${arBoth ? `${AR} text-[30px] leading-[1.9]` : "text-[16px] leading-tight"} ${st("r", x.id)}`}>{x.label}</button>)}</div>
    </div>
  );
}

const QUESTION = {
  read: "Quelle est cette lettre ?", listen: "Écoute et choisis la lettre", form: "À quelle lettre correspond cette forme ?",
  position: "Où se trouve cette lettre dans le mot ?", "read-syl": "Comment se lit cette syllabe ?", "listen-syl": "Écoute et choisis la syllabe",
  pairs: "Associe les paires", trace: "Trace la lettre avec ton doigt", build: "Compose la syllabe",
  "listen-word": "Écoute et choisis le mot", "read-word": "Comment se lit ce mot ?", meaning: "Que veut dire ce mot ?",
  lam: "Le l de « al- » se prononce-t-il ?", order: "Remets les mots du verset dans l'ordre", missing: "Quel mot manque ?",
};
const LAM = { dit: "On prononce le l", muet: "Le l est muet" };
const vText = (v) => v.words.map((w) => w.ar).join(" ");

export default function Lecon() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const lessonId = new URLSearchParams(window.location.search).get("id");
  const lesson = lessonById(lessonId);
  const voice = hasArabicVoice();
  const initial = useMemo(() => {
    if (!lesson) return [];
    // Sans voix arabe sur l'appareil, les exercices d'écoute deviennent des exercices de lecture
    return buildLesson(lesson).map((x) => {
      if (voice) return x;
      if (x.type === "listen") return { ...x, type: "read", prompt: L[x.answer].ar, show: "name" };
      if (x.type === "listen-syl") return { ...x, type: "read-ar", prompt: null };
      return x;
    }).filter((x) => x.type !== "read-ar");
  }, [lessonId]);  

  const [queue, setQueue] = useState(initial);
  const [i, setI] = useState(0);
  const [choice, setChoice] = useState(null);
  const [build, setBuild] = useState({ l: null, h: null });
  const [order, setOrder] = useState([]);
  useEffect(() => () => stopAudio(), []);
  const [result, setResult] = useState(null); // null | "ok" | "ko"
  const [hasInk, setHasInk] = useState(false);
  const [traceKey, setTraceKey] = useState(0);
  const traceCheck = useRef(() => false);
  const stats = useRef({ graded: 0, firstOk: 0, missed: new Set(), start: Date.now() });
  const [finished, setFinished] = useState(false);

  const { data: rows = [] } = useQuery({ queryKey: ["reading-lessons"], queryFn: () => ReadingLessons.list() });
  const prev = rows.find((r) => r.lesson_id === lessonId);
  const { data: sessions = [] } = useQuery({ queryKey: ["reading-sessions"], queryFn: () => ReadingSessions.since(weekStart().toISOString()) });
  const save = useMutation({
    mutationFn: async ({ score, xp }) => {
      if (lessonId !== "placement") return ReadingLessons.complete(lessonId, score, xp, prev);
      if (score >= 80) return ReadingLessons.completeMany(PLACEMENT_UNLOCKS.filter((id) => !rows.some((r) => r.lesson_id === id)));
    },
    onSuccess: () => { ["reading-lessons", "reading-sessions", "activity-days", "reading-leaderboard"].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); },
  });

  if (!lesson) return <div className="min-h-[100dvh] flex items-center justify-center font-bold text-muted-foreground">Leçon introuvable.</div>;

  const item = queue[i];
  if (typeof window !== "undefined" && localStorage.getItem("mh_test") === "1") window.__mhItem = item;
  const total = queue.length;
  const isIntro = item?.type?.startsWith("intro");

  const next = () => {
    haptic();
    stopAudio();
    setChoice(null); setBuild({ l: null, h: null }); setOrder([]); setResult(null); setHasInk(false); setTraceKey((k) => k + 1);
    if (i + 1 >= queue.length) {
      const s = stats.current;
      const score = s.graded ? Math.round((s.firstOk / s.graded) * 100) : 100;
      const xp = lessonId === "placement" ? 0 : 10 + (score === 100 ? 5 : 0);
      // gains de fin de leçon : objectif du jour, nouveaux badges
      let goalReached = false, newBadges = [];
      if (lessonId !== "placement") {
        const goal = getGoal(), before = todayCount(sessions);
        goalReached = before < goal && before + 1 >= goal;
        const after = [...rows.filter((r) => r.lesson_id !== lessonId), { lesson_id: lessonId, attempts: (prev?.attempts || 0) + 1, best_score: Math.max(score, prev?.best_score || 0) }];
        const had = new Set(earnedBadges(rows).map((b) => b.id));
        newBadges = earnedBadges(after).filter((b) => !had.has(b.id));
      }
      setFinished({ score, xp, goalReached, newBadges, secs: Math.round((Date.now() - s.start) / 1000) });
      save.mutate({ score, xp });
      return;
    }
    setI(i + 1);
  };

  const grade = (ok) => {
    const s = stats.current;
    if (!s.missed.has(item.key)) { s.graded++; if (ok) s.firstOk++; }
    if (!ok && !s.missed.has(item.key)) { s.missed.add(item.key); setQueue((q) => [...q, { ...item, key: item.key + "-r", retry: true }]); }
    if (!ok) s.missed.add(item.key + "-r");
    setResult(ok ? "ok" : "ko"); chime(ok); haptic(ok ? 8 : 30);
  };

  const check = () => {
    if (item.type === "trace") return grade(traceCheck.current());
    if (item.type === "build") return grade(build.l === item.target.letter && build.h === item.target.h);
    if (item.type === "order") { const ok = order.map((t) => item.tiles[t].ar).join(" ") === vText(item.v); if (ok) playUrl(item.v.audio); return grade(ok); }
    if (item.type === "missing" && choice === item.answer) playUrl(item.audio);
    grade(choice === item.answer);
  };

  const canCheck = item && (item.type === "trace" ? hasInk : item.type === "build" ? build.l && build.h : item.type === "order" ? order.length === item.tiles.length : choice != null);

  const correctText = () => {
    if (!item) return "";
    if (["read", "listen", "form"].includes(item.type)) return `${L[item.answer].ar}  ·  ${L[item.answer].name}`;
    if (item.type === "position") return POSITIONS[item.answer];
    if (item.type === "read-syl" || item.type === "listen-syl") return item.type === "read-syl" ? `${item.prompt}  ·  ${item.answer}` : item.answer;
    if (item.type === "build") return `${item.target.ar}  ·  ${item.target.latin}`;
    if (item.type === "trace") return "Suis bien la forme en couleur, points compris.";
    if (item.type === "listen-word" || item.type === "missing") return item.answer;
    if (item.type === "read-word") return `${item.prompt}  ·  ${item.answer}`;
    if (item.type === "meaning") return item.answer;
    if (item.type === "lam") return `${LAM[item.answer]} : ${item.tr}`;
    if (item.type === "order") return vText(item.v);
    return "";
  };

  // ── Fin de leçon ──
  if (finished) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-md mx-auto w-full">
          <div className="w-24 h-24 rounded-3xl bg-primary text-primary-foreground flex items-center justify-center shadow-[0_5px_0_var(--primary-lip)]"><CheckCircle weight="fill" className="w-12 h-12" /></div>
          <h1 className="text-[28px] font-black mt-6">{lessonId === "placement" ? (finished.score >= 80 ? "Niveau validé" : "Test terminé") : "Leçon terminée"}</h1>
          <p className="font-semibold text-muted-foreground mt-1">{lessonId === "placement" ? (finished.score >= 80 ? "Tu connais déjà les lettres et les voyelles courtes : on passe directement à l'unité 4." : "Pas encore assez sûr : on reprend depuis les lettres, ça ira vite.") : lesson.review ? "Belle révision." : finished.score === 100 ? "Sans aucune erreur, macha'Allah." : "Continue comme ça, chaque leçon compte."}</p>
          <div className={`grid ${lessonId === "placement" ? "grid-cols-1" : "grid-cols-2"} gap-3 w-full mt-7`}>
            {lessonId !== "placement" && <div className="card-flat p-4"><Lightning weight="fill" className="w-6 h-6 text-[#F2B530] mx-auto" /><p className="text-2xl font-black mt-1">+{finished.xp}</p><p className="text-xs font-bold text-muted-foreground">points</p></div>}
            <div className="card-flat p-4"><Target weight="fill" className="w-6 h-6 text-primary mx-auto" /><p className="text-2xl font-black mt-1">{finished.score} %</p><p className="text-xs font-bold text-muted-foreground">du premier coup</p></div>
          </div>
          {finished.goalReached && (
            <div className="card-flat w-full p-3.5 mt-3 flex items-center gap-3 text-left border-gold">
              <span className="w-10 h-10 rounded-xl bg-gold-tint text-gold flex items-center justify-center shrink-0"><Target weight="fill" className="w-5 h-5" /></span>
              <div><p className="font-extrabold">Objectif du jour atteint</p><p className="text-[12.5px] font-semibold text-muted-foreground">Reviens demain pour garder ta série.</p></div>
            </div>
          )}
          {finished.newBadges?.map((b) => (
            <div key={b.id} className="card-flat w-full p-3.5 mt-3 flex items-center gap-3 text-left border-gold">
              <span className="w-10 h-10 rounded-full bg-gold-tint text-gold flex items-center justify-center shrink-0"><Medal weight="fill" className="w-5 h-5" /></span>
              <div><p className="font-extrabold">Nouveau badge : {b.name}</p><p className="text-[12.5px] font-semibold text-muted-foreground">{b.hint}</p></div>
            </div>
          ))}
        </div>
        <div className="px-4 max-w-md mx-auto w-full">
          <button onClick={() => navigate("/Lire", { replace: true })} className="btn-relief w-full h-[52px] bg-primary text-primary-foreground">Continuer</button>
        </div>
      </div>
    );
  }

  const opts = (render, ar) => (
    <div className="grid grid-cols-2 gap-3">
      {item.options.map((o) => {
        const state = result ? (o === item.answer ? "correct" : o === choice ? "wrong" : null) : choice === o ? "selected" : null;
        return <Option key={o} ar={ar} state={state} onClick={() => { if (result) return; haptic(); setChoice(o); if (ar && voice && item.type === "listen") speak(L[o].nameAr); }}>{render(o)}</Option>;
      })}
    </div>
  );

  const body = () => {
    switch (item.type) {
      case "intro": {
        const l = L[item.letter];
        return (
          <div className="flex flex-col items-center text-center">
            <p className="text-sm font-extrabold uppercase tracking-wide text-primary">Nouvelle lettre</p>
            <div className={`${AR} text-[150px] leading-[1.25] mt-2`}>{l.ar}</div>
            <p className="flex items-baseline justify-center gap-3 text-[26px] font-black"><span>{l.name}</span><span className={`${AR} text-accent-foreground font-normal`} dir="rtl">{l.nameAr}</span></p>
            <p className="font-semibold text-muted-foreground mt-2 max-w-xs">{l.hint}</p>
            {voice && <div className="mt-6"><SpeakBtn text={l.nameAr} auto /></div>}
          </div>
        );
      }
      case "intro-forms": {
        const l = L[item.letter], f = formsOf(l);
        return (
          <div className="text-center">
            <p className="text-sm font-extrabold uppercase tracking-wide text-primary">{l.name} dans un mot</p>
            <div className="grid grid-cols-2 gap-3 mt-4" dir="rtl">
              {["iso", "ini", "med", "fin"].map((k) => (
                <div key={k} className="card-flat py-3"><div className={`${AR} text-[52px] leading-[1.9]`}>{f[k]}</div><p className="text-xs font-extrabold text-muted-foreground" dir="ltr">{POSITIONS[k]}</p></div>
              ))}
            </div>
            {l.joins === false && <p className="text-sm font-bold text-muted-foreground mt-4">Cette lettre ne s'attache jamais à la lettre qui suit.</p>}
            {voice && <div className="mt-5 flex justify-center"><SpeakBtn text={l.nameAr} /></div>}
          </div>
        );
      }
      case "intro-haraka":
        return (
          <div className="text-center">
            <p className="text-sm font-extrabold uppercase tracking-wide text-primary">{item.label}</p>
            <div className={`${AR} text-[110px] leading-[1.75]`}>{"\u25CC" + item.mark}</div>
            <p className="text-[26px] font-black">{item.name}</p>
            <p className="font-semibold text-muted-foreground mt-1 max-w-xs mx-auto">{item.hint}</p>
            <div className="flex justify-center gap-3 mt-6">
              {item.examples.map((s) => (
                <button key={s.ar} onClick={() => voice && speak(s.ar)} className="card-flat w-[92px] py-2 press">
                  <div className={`${AR} text-[40px] leading-[1.6]`}>{s.ar}</div>
                  <p className="text-sm font-extrabold text-muted-foreground">{s.latin}</p>
                </button>
              ))}
            </div>
            {voice && <p className="text-xs font-bold text-muted-foreground mt-3">Touche un exemple pour l'écouter</p>}
          </div>
        );
      case "intro-word": {
        const w = item.w;
        return (
          <div className="flex flex-col items-center text-center">
            <p className="text-sm font-extrabold uppercase tracking-wide text-primary">Nouveau mot</p>
            <div className={`${AR} text-[84px] leading-[1.6] mt-2`} dir="rtl">{w.ar}</div>
            <p className="text-[24px] font-black">{w.tr}</p>
            <p className="font-semibold text-muted-foreground mt-1">« {w.fr} »</p>
            <div className="mt-6"><SpeakBtn text={w.ar} audio={w.audio} auto /></div>
            <p className="text-xs font-bold text-muted-foreground mt-3">Récitation de Mishary al-ʿAfâsy</p>
          </div>
        );
      }
      case "intro-rule": {
        const r = RULES[item.rule];
        return (
          <div className="text-center">
            <p className="text-sm font-extrabold uppercase tracking-wide text-primary">Règle de lecture</p>
            <p className="text-[26px] font-black mt-2">{r.title}</p>
            <p className="font-semibold text-muted-foreground mt-2 max-w-sm mx-auto">{r.hint}</p>
            <p className="text-sm font-semibold text-muted-foreground mt-2 max-w-sm mx-auto">Le petit signe sur l'alif (ٱ) indique qu'on ne le lit pas quand le mot est relié au précédent.</p>
            <div className="flex flex-col gap-2.5 mt-6 max-w-xs mx-auto">
              {item.examples.map((w) => (
                <button key={w.id} onClick={() => playUrl(w.audio, w.ar)} className="card-flat px-4 py-2 flex items-center justify-between press">
                  <span className="font-extrabold text-muted-foreground">{w.tr}</span><span className={`${AR} text-[32px] leading-[1.7]`} dir="rtl">{w.ar}</span>
                </button>
              ))}
            </div>
          </div>
        );
      }
      case "intro-verse": {
        const v = item.v;
        return (
          <div className="text-center">
            <p className="text-sm font-extrabold uppercase tracking-wide text-primary">Verset {v.key}</p>
            <div className="flex flex-wrap justify-center gap-x-2 gap-y-3 mt-4" dir="rtl">
              {v.words.map((w, k) => (
                <button key={k} onClick={() => { haptic(); playUrl(w.audio, w.ar); }} className="rounded-xl px-2 py-1 hover:bg-muted active:bg-accent">
                  <span className={`${AR} block text-[34px] leading-[1.8]`}>{w.ar}</span>
                  <span className="block text-[12px] font-extrabold text-muted-foreground" dir="ltr">{w.tr}</span>
                </button>
              ))}
            </div>
            <div className="mt-5 flex justify-center"><SpeakBtn text={vText(v)} audio={v.audio} auto /></div>
            <p className="font-semibold text-muted-foreground mt-5 max-w-sm mx-auto">{v.fr}</p>
            <p className="text-[11px] font-bold text-muted-foreground mt-1">Sens rapproché, trad. M. Hamidullah · touche un mot pour l'écouter</p>
          </div>
        );
      }
      case "listen-word":
        return (<><div className="flex justify-center mb-8"><SpeakBtn text={item.say} audio={item.audio} big auto /></div>{opts((o) => o, "word")}</>);
      case "read-word":
        return (<><div className={`${AR} text-[56px] leading-[1.9] text-center mb-6 break-words`} dir="rtl">{item.prompt}</div>{opts((o) => o)}</>);
      case "meaning":
        return (<><div className={`${AR} text-[56px] leading-[1.9] text-center mb-6 break-words`} dir="rtl">{item.prompt}</div>{opts((o) => o)}</>);
      case "lam":
        return (<><div className={`${AR} text-[56px] leading-[1.9] text-center mb-6 break-words`} dir="rtl">{item.prompt}</div>{opts((o) => LAM[o])}</>);
      case "missing": {
        const v = item.v;
        return (<>
          <div className="card-flat p-4 mb-6 flex flex-wrap justify-center gap-x-2 gap-y-2" dir="rtl">
            {v.words.map((w, k) => k === item.missing
              ? <span key={k} className={`${AR} text-[30px] leading-[1.9] min-w-[72px] px-2 rounded-xl border-2 border-dashed ${choice ? "border-primary text-primary" : "border-border text-transparent"}`}>{choice || "…"}</span>
              : <span key={k} className={`${AR} text-[30px] leading-[1.9]`}>{w.ar}</span>)}
          </div>
          {opts((o) => o, "word")}
        </>);
      }
      case "order": {
        const used = new Set(order);
        return (<>
          <div className="min-h-[132px] rounded-2xl border-2 border-dashed border-border p-3 mb-5 flex flex-wrap content-start justify-start gap-2" dir="rtl">
            {order.map((t, k) => (
              <button key={k} onClick={() => { if (!result) { haptic(); setOrder(order.filter((_, j) => j !== k)); } }}
                className={`${AR} text-[26px] leading-[1.95] px-3 rounded-xl border-2 border-b-4 bg-card ${result === "ok" ? "border-primary text-primary" : result === "ko" ? "border-destructive text-destructive" : "border-border"}`}>{item.tiles[t].ar}</button>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-2" dir="rtl">
            {item.tiles.map((tl, t) => (
              <button key={t} disabled={used.has(t) || !!result} onClick={() => { haptic(); playUrl(item.v.words[tl.i].audio); setOrder([...order, t]); }}
                className={`${AR} text-[26px] leading-[1.95] px-3 rounded-xl border-2 border-b-4 ${used.has(t) ? "bg-muted border-muted text-transparent" : "bg-card border-border"}`}>{tl.ar}</button>
            ))}
          </div>
        </>);
      }
      case "read": case "form":
        return (<><div className={`${AR} text-[104px] leading-[1.75] text-center mb-6`}>{item.prompt}</div>{opts((o) => item.show === "letter" ? L[o].ar : L[o].name, item.show === "letter")}</>);
      case "listen":
        return (<><div className="flex justify-center mb-8"><SpeakBtn text={item.say} big auto /></div>{opts((o) => L[o].ar, true)}</>);
      case "position":
        return (<><div className={`${AR} text-[104px] leading-[1.75] text-center mb-6`}>{item.prompt}</div>{opts((o) => POSITIONS[o])}</>);
      case "read-syl":
        return (<><div className={`${AR} text-[104px] leading-[1.75] text-center mb-6`}>{item.prompt}</div>{opts((o) => o)}</>);
      case "listen-syl":
        return (<><div className="flex justify-center mb-8"><SpeakBtn text={item.say} big auto /></div>{opts((o) => o, true)}</>);
      case "pairs":
        return <Pairs key={item.key} pairs={item.pairs} arBoth={item.arBoth} onDone={(clean) => grade(clean)} />;
      case "trace":
        return (<>
          <p className="flex items-baseline justify-center gap-2 font-extrabold mb-3"><span>{L[item.letter].name}</span><span className={`${AR} font-normal`} dir="rtl">{L[item.letter].ar}</span></p>
          <Trace letter={L[item.letter]} onInk={setHasInk} resetKey={traceKey} registerCheck={(fn) => { traceCheck.current = fn; }} />
          {!result && <div className="flex justify-center mt-3"><button onClick={() => { haptic(); setTraceKey((k) => k + 1); }} className="h-10 px-4 rounded-xl border-2 border-border bg-card font-extrabold text-sm flex items-center gap-2 press"><Eraser weight="bold" className="w-4 h-4" />Effacer</button></div>}
        </>);
      case "build": {
        const preview = build.l ? (L[build.l].ar + (build.h ? HARAKAT[build.h].mark : "")) : "\u25CC";
        return (<>
          <div className="flex items-center justify-center gap-4 mb-2">
            <p className="text-[34px] font-black text-primary">« {item.target.latin} »</p>
            {voice && <SpeakBtn text={item.target.ar} />}
          </div>
          <div className="mx-auto w-36 h-32 rounded-3xl border-2 border-dashed border-border flex items-center justify-center mb-5"><span className={`${AR} text-[76px] leading-none`}>{preview}</span></div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mb-2">La lettre</p>
          <div className="grid grid-cols-3 gap-3 mb-4">{item.letters.map((id) => <Option key={id} ar state={build.l === id ? "selected" : null} onClick={() => { if (!result) { haptic(); setBuild((b) => ({ ...b, l: id })); } }}>{L[id].ar}</Option>)}</div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mb-2">La voyelle</p>
          <div className="grid grid-cols-3 gap-3">{item.harakat.map((h) => <Option key={h} ar state={build.h === h ? "selected" : null} onClick={() => { if (!result) { haptic(); setBuild((b) => ({ ...b, h })); } }}>{"\u25CC" + HARAKAT[h].mark}</Option>)}</div>
        </>);
      }
      default: return null;
    }
  };

  const pct = Math.round((i / total) * 100);

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="max-w-xl mx-auto w-full px-4 h-14 flex items-center gap-3">
        <button onClick={() => navigate("/Lire")} aria-label="Quitter la leçon" className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted press"><X weight="bold" className="w-6 h-6" /></button>
        <div className="flex-1 h-4 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} /></div>
      </div>

      <div className="flex-1 max-w-xl mx-auto w-full px-4 pt-3 pb-44">
        {!isIntro && <h2 className="text-[22px] font-black mb-5">{item.retry ? "On réessaie : " : ""}{item.word ? "Comment se lit ce mot ?" : QUESTION[item.type]}</h2>}
        {body()}
      </div>

      {/* Pied : vérifier / résultat */}
      <div className={`fixed inset-x-0 bottom-0 z-40 border-t-2 transition-colors ${result === "ok" ? "bg-accent border-primary/30" : result === "ko" ? "bg-[#FDECEC] dark:bg-destructive/15 border-destructive/30" : "bg-background border-border"}`}
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}>
        <div className="max-w-xl mx-auto px-4 pt-4">
          {result && (
            <div className={`flex items-start gap-3 mb-4 ${result === "ok" ? "text-primary" : "text-destructive"}`}>
              {result === "ok" ? <CheckCircle weight="fill" className="w-8 h-8 shrink-0" /> : <XCircle weight="fill" className="w-8 h-8 shrink-0" />}
              <div className="min-w-0">
                <p className="text-[20px] font-black">{result === "ok" ? ["Bien joué !", "Excellent !", "Parfait !", "Bravo !"][i % 4] : "Pas tout à fait"}</p>
                {result === "ko" && item.type !== "pairs" && <p className={`font-bold ${["trace", "meaning", "lam"].includes(item.type) ? "" : `${AR} text-[22px] leading-[1.9]`} text-destructive/90`} dir="auto">{item.type === "trace" ? correctText() : `Réponse : ${correctText()}`}</p>}
                {result === "ko" && <p className="text-xs font-bold text-destructive/70 mt-0.5">Cette question reviendra à la fin.</p>}
              </div>
            </div>
          )}
          {isIntro ? (
            <button onClick={next} className="btn-relief w-full h-[52px] bg-primary text-primary-foreground">Continuer</button>
          ) : result ? (
            <button onClick={next} className={`btn-relief w-full h-[52px] text-white ${result === "ok" ? "bg-primary" : "bg-destructive"}`} style={result === "ko" ? { "--relief-color": DANGER_LIP } : undefined}>Continuer</button>
          ) : item.type === "pairs" ? (
            <p className="h-[52px] flex items-center justify-center text-sm font-bold text-muted-foreground">Touche une case à gauche puis sa paire à droite</p>
          ) : (
            <button onClick={check} disabled={!canCheck} className="btn-relief w-full h-[52px] bg-primary text-primary-foreground disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none">Vérifier</button>
          )}
        </div>
      </div>
    </div>
  );
}
