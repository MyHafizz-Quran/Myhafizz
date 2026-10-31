import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, XCircle } from "@phosphor-icons/react";
import { MemorizationProgress } from "@/api/entities";
import { loadSurah } from "@/lib/learningData";
import { SURAHS } from "@/components/quranData";
import { haptic } from "@/hooks/usePlatform";

const LEN = 10;
const MODES = { next: "Quel verset vient après ?", end: "Complète la fin du verset", order: "Remets les mots dans l'ordre" };
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const words = (t) => t.split(/\s+/).filter((w) => w && !/^[\u0660-\u0669\u06DD\u06DE\u06E9]+$/.test(w));
const sname = (n) => SURAHS.find((s) => s.number === n)?.englishName;

function buildQuestions(pool, texts) {
  const all = pool.filter((p) => texts[p.s]?.[p.v - 1]);
  const textOf = (p) => texts[p.s][p.v - 1].text;
  const others = (p, n, fn) => shuffle(all.filter((q) => !(q.s === p.s && q.v === p.v)).map(fn).filter(Boolean))
    .filter((x, i, arr) => arr.indexOf(x) === i).slice(0, n);
  const qs = [];
  let guard = 0;
  while (qs.length < LEN && guard++ < 200) {
    const p = all[Math.floor(Math.random() * all.length)];
    if (!p) break;
    const mode = ["next", "end", "order"][qs.length % 3];
    const w = words(textOf(p));
    if (mode === "next") {
      const nx = texts[p.s][p.v];
      if (!nx) continue;
      const distract = others(p, 4, (q) => textOf(q)).filter((t) => t !== nx.text);
      if (distract.length < 2) continue;
      qs.push({ mode, ref: `${sname(p.s)} · v. ${p.v}`, prompt: textOf(p), answer: nx.text, options: shuffle([nx.text, ...distract.slice(0, 3)]) });
    } else if (mode === "end") {
      if (w.length < 4) continue;
      const cut = Math.ceil(w.length / 2);
      const end = w.slice(cut).join(" ");
      const distract = others(p, 3, (q) => { const ww = words(textOf(q)); return ww.length >= 4 ? ww.slice(Math.ceil(ww.length / 2)).join(" ") : null; }).filter((t) => t !== end);
      if (distract.length < 2) continue;
      qs.push({ mode, ref: `${sname(p.s)} · v. ${p.v}`, prompt: w.slice(0, cut).join(" ") + " …", answer: end, options: shuffle([end, ...distract.slice(0, 3)]) });
    } else {
      if (w.length < 3) continue;
      const seg = w.slice(0, 8);
      qs.push({ mode, ref: `${sname(p.s)} · v. ${p.v}`, answerWords: seg, chips: shuffle(seg.map((t, i) => ({ t, i }))) });
    }
  }
  return qs;
}

export default function Exercises() {
  const navigate = useNavigate();
  const { data: progress } = useQuery({ queryKey: ["memorization-progress"], queryFn: () => MemorizationProgress.list() });
  const [texts, setTexts] = useState(null);
  const [qs, setQs] = useState(null);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [order, setOrder] = useState([]);
  const [score, setScore] = useState(0);

  const pool = useMemo(() => {
    if (!progress) return null;
    let p = [];
    progress.forEach((r) => (r.memorized_verses || []).forEach((v) => p.push({ s: r.surah_number, v })));
    if (p.length < 6) p = [1, 112, 113, 114].flatMap((s) => Array.from({ length: SURAHS[s - 1].numberOfAyahs }, (_, k) => ({ s, v: k + 1 })));
    const surahs = shuffle([...new Set(p.map((x) => x.s))]).slice(0, 4);
    return p.filter((x) => surahs.includes(x.s));
  }, [progress]);

  useEffect(() => {
    if (!pool || texts) return;
    const ss = [...new Set(pool.map((p) => p.s))];
    Promise.all(ss.map((s) => loadSurah(s).then((a) => [s, a]).catch(() => [s, null]))).then((r) => setTexts(Object.fromEntries(r)));
  }, [pool, texts]);
  useEffect(() => { if (texts && pool && !qs) setQs(buildQuestions(pool, texts)); }, [texts, pool, qs]);

  const q = qs?.[i];
  const checked = picked !== null;
  const correct = q && (q.mode === "order" ? order.map((c) => c.t).join(" ") === q.answerWords.join(" ") : picked === q.answer);

  const check = (val) => { haptic(); const ok = q.mode === "order" ? val : val === q.answer; setPicked(q.mode === "order" ? "done" : val); if (ok) setScore((s) => s + 1); };
  const next = () => { setPicked(null); setOrder([]); setI((x) => x + 1); };

  const done = qs && i >= qs.length;
  const pct = qs?.length ? Math.round((i / qs.length) * 100) : 0;

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <div className="max-w-2xl w-full mx-auto px-4 pt-[calc(env(safe-area-inset-top,0px)+14px)] flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-10 h-10 -ml-2 flex items-center justify-center text-muted-foreground" aria-label="Quitter"><X weight="bold" className="w-6 h-6" /></button>
        <div className="flex-1 h-4 rounded-full bg-muted overflow-hidden"><motion.div className="h-full rounded-full bg-primary" animate={{ width: `${pct}%` }} /></div>
      </div>

      <div className="max-w-2xl w-full mx-auto px-4 flex-1 flex flex-col">
        {!qs ? (
          <div className="flex-1 flex items-center justify-center"><div className="w-10 h-10 rounded-full border-4 border-accent border-t-primary animate-spin" /></div>
        ) : done || !qs.length ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 pb-10">
            <CheckCircle weight="fill" className="w-20 h-20 text-primary mb-2" />
            <p className="text-2xl font-extrabold">{qs.length ? `${score}/${qs.length} bonnes réponses` : "Pas assez de versets"}</p>
            <p className="text-muted-foreground font-semibold mb-6">{qs.length ? (score >= qs.length * 0.8 ? "Excellent enchaînement." : "Les versets ratés méritent une révision.") : "Mémorise quelques versets d'abord."}</p>
            <button onClick={() => { setQs(null); setI(0); setScore(0); setTexts(null); }} className="btn-relief w-full max-w-sm h-[52px] bg-primary text-primary-foreground mb-3">Rejouer</button>
            <button onClick={() => navigate("/Revision")} className="font-extrabold text-primary uppercase text-sm tracking-wide">Retour</button>
          </div>
        ) : (
          <>
            <p className="mt-6 text-xl font-extrabold">{MODES[q.mode]}</p>
            <p className="text-sm font-semibold text-muted-foreground mb-4">{q.ref}</p>
            <AnimatePresence mode="wait">
              <motion.div key={i} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }} className="flex flex-col gap-3">
                {q.mode !== "order" ? (
                  <>
                    <div className="card-flat p-4"><p dir="rtl" className="font-arabic text-2xl leading-[2.1] text-center">{q.prompt}</p></div>
                    {q.options.map((o) => {
                      const state = !checked ? "" : o === q.answer ? "border-primary bg-accent" : o === picked ? "border-destructive bg-destructive/10" : "opacity-60";
                      return (
                        <button key={o} disabled={checked} onClick={() => check(o)} className={`card-flat p-3 text-right press ${state}`}>
                          <p dir="rtl" className="font-arabic text-xl leading-[2] line-clamp-2">{o}</p>
                        </button>
                      );
                    })}
                  </>
                ) : (
                  <>
                    <div dir="rtl" className="card-flat p-3 min-h-[96px] flex flex-wrap gap-2 content-start">
                      {order.map((c) => (
                        <button key={c.i} disabled={checked} onClick={() => setOrder((o) => o.filter((x) => x.i !== c.i))} className="px-3 py-1 rounded-xl border-2 border-border bg-card font-arabic text-xl">{c.t}</button>
                      ))}
                    </div>
                    <div dir="rtl" className="flex flex-wrap gap-2 justify-center">
                      {q.chips.map((c) => {
                        const used = order.some((x) => x.i === c.i);
                        return (
                          <button key={c.i} disabled={used || checked} onClick={() => { haptic(); setOrder((o) => [...o, c]); }}
                            className={`px-3 py-1 rounded-xl border-2 border-border font-arabic text-xl ${used ? "bg-muted text-transparent" : "bg-card press"}`} style={{ boxShadow: used ? "none" : "0 3px 0 0 hsl(var(--border))" }}>{c.t}</button>
                        );
                      })}
                    </div>
                    {checked && !correct && <p dir="rtl" className="font-arabic text-xl text-center text-primary">{q.answerWords.join(" ")}</p>}
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="mt-auto pt-5 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
              {checked ? (
                <div className={`rounded-2xl p-4 ${correct ? "bg-accent" : "bg-destructive/10"}`}>
                  <p className={`flex items-center gap-2 font-extrabold mb-3 ${correct ? "text-primary" : "text-destructive"}`}>
                    {correct ? <CheckCircle weight="fill" className="w-6 h-6" /> : <XCircle weight="fill" className="w-6 h-6" />}{correct ? "Bravo !" : "Pas tout à fait"}
                  </p>
                  <button onClick={next} className={`btn-relief w-full h-[52px] ${correct ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground [--relief-color:#B3261E]"}`}>Continuer</button>
                </div>
              ) : q.mode === "order" ? (
                <button disabled={order.length !== q.chips.length} onClick={() => check(order.map((c) => c.t).join(" ") === q.answerWords.join(" "))} className="btn-relief w-full h-[52px] bg-primary text-primary-foreground disabled:opacity-50">Vérifier</button>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
