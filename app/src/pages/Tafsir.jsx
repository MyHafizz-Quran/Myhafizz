import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpenText, Books, CheckCircle, XCircle, X, SpeakerHigh, CaretRight, MagnifyingGlass } from "@phosphor-icons/react";
import PageHeader from "@/components/PageHeader";
import { TafsirChips, TafsirText } from "@/components/TafsirPanel";
import { getSrc, lessonsOf, surahMeta, tafsirRange, tafsirOne, tafsirQuestions, tafsirDone, tafsirMe, DEFAULT_SRC } from "@/lib/tafsir";
import { loadSurah, myQuranScope, AUDIO, surahFr } from "@/lib/games";
import { playUrl, stopAudio } from "@/lib/qaida";
import { db } from "@/api/neonClient";
import { haptic } from "@/hooks/usePlatform";

const PATH = [1, ...Array.from({ length: 37 }, (_, i) => 114 - i)];
const nameOf = (n) => `${surahMeta(n)?.englishName || ""}`;
const firstSentence = (t) => { const s = String(t || "").replace(/\s+/g, " ").trim(); const m = s.match(/^.{20,220}?[.!?](\s|$)/); return m ? m[0].trim() : s.length > 220 ? `${s.slice(0, 217).trim()}…` : s; };

async function loadDone() {
  const { data, error } = await db.from("tafsir_progress").select("surah,ayah").limit(7000);
  if (error) throw error;
  const m = new Map();
  for (const r of data || []) { if (!m.has(r.surah)) m.set(r.surah, new Set()); m.get(r.surah).add(r.ayah); }
  return m;
}

export default function Tafsir() {
  const loc = useLocation();
  const p = new URLSearchParams(loc.search);
  const s = Number(p.get("s")), l = p.get("l"), read = Number(p.get("read"));
  if (s && l != null) return <Lesson key={`${s}-${l}`} surah={s} index={Number(l)} />;
  if (read) return <Reader key={read} surah={read} />;
  if (p.has("read")) return <Pick />;
  return <Home />;
}

function Ring({ pct }) {
  return <div className="h-2.5 rounded-full bg-muted overflow-hidden mt-1.5"><div className="h-full bg-primary rounded-full" style={{ width: `${Math.round(pct)}%` }} /></div>;
}

function SurahRow({ n, done, onClick }) {
  const total = surahMeta(n)?.numberOfAyahs || 1;
  const k = done?.get(n)?.size || 0;
  const full = k >= total;
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 py-2.5 border-t-2 border-border/60 first:border-t-0 text-left press">
      <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${full ? "bg-accent text-primary" : "bg-accent text-accent-foreground"}`}>
        {full ? <CheckCircle weight="fill" className="w-6 h-6" /> : <BookOpenText weight="fill" className="w-6 h-6" />}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-black truncate">{n}. {nameOf(n)}</span>
        <span className="block text-[13px] font-semibold text-muted-foreground">{full ? `${total} / ${total} · comprise` : `${k} / ${total} versets`}</span>
        <Ring pct={(k / total) * 100} />
      </span>
    </button>
  );
}

function Home() {
  const navigate = useNavigate();
  const { data: done } = useQuery({ queryKey: ["tafsir-done"], queryFn: loadDone });
  const { data: me } = useQuery({ queryKey: ["tafsir-me"], queryFn: tafsirMe });
  const { data: scope } = useQuery({ queryKey: ["my-scope"], queryFn: myQuranScope, staleTime: 60_000 });
  const memSurahs = useMemo(() => [...new Set((scope?.mem || []).map((x) => Number(x.s)))].sort((a, b) => b - a).slice(0, 6), [scope]);
  const comprised = useMemo(() => [...(done || new Map())].filter(([n, set]) => set.size >= (surahMeta(n)?.numberOfAyahs || 1e9)).length, [done]);
  // prochaine leçon : la sourate en cours, sinon la première sourate mémorisée pas encore comprise, sinon Al-Fatiha
  const { data: next } = useQuery({
    queryKey: ["tafsir-next", me?.last?.surah, memSurahs.join(","), done?.size],
    enabled: !!done && !!me,
    queryFn: async () => {
      const cands = [me.last?.surah, ...memSurahs, ...PATH].filter(Boolean);
      for (const n of cands) {
        const set = done.get(n) || new Set();
        if (set.size >= surahMeta(n).numberOfAyahs) continue;
        const ls = await lessonsOf(n);
        const L = ls.find((x) => { for (let a = x.from; a <= x.to; a++) if (!set.has(a)) return true; return false; });
        if (L) return { n, L, total: ls.length };
      }
      return null;
    },
  });
  return (
    <div className="min-h-[100dvh] bg-background pb-nav">
      <div className="max-w-xl mx-auto px-4">
        <PageHeader title="Tafsir" back="/Lire" />
        <p className="font-semibold text-muted-foreground mt-1">Comprendre ce que tu récites, verset par verset.</p>
        {next && (
          <div className="card-flat p-4 mt-4 border-primary">
            <p className="text-[12px] font-black tracking-wide text-primary">CONTINUER</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="w-11 h-11 rounded-xl bg-accent text-accent-foreground flex items-center justify-center shrink-0"><BookOpenText weight="fill" className="w-6 h-6" /></span>
              <div className="min-w-0">
                <p className="font-black truncate">{nameOf(next.n)} ({next.n})</p>
                <p className="text-[13px] font-semibold text-muted-foreground">Leçon {next.L.i + 1} sur {next.total} · versets {next.L.from} à {next.L.to} · {next.L.min} min</p>
              </div>
            </div>
            <button onClick={() => { haptic(); navigate(`/Tafsir?s=${next.n}&l=${next.L.i}`); }} className="btn-relief w-full h-[52px] mt-3 bg-primary text-primary-foreground">{done?.get(next.n)?.size ? "Reprendre la leçon" : "Commencer"}</button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2.5 mt-3">
          <div className="card-flat p-3 text-center"><p className="text-[22px] font-black">{comprised}</p><p className="text-[12.5px] font-semibold text-muted-foreground">sourates comprises</p></div>
          <div className="card-flat p-3 text-center"><p className="text-[22px] font-black">{me?.verses ?? 0}</p><p className="text-[12.5px] font-semibold text-muted-foreground">versets étudiés</p></div>
        </div>
        {memSurahs.length > 0 && (
          <div className="card-flat p-4 mt-3">
            <p className="font-black">Les sourates que tu mémorises</p>
            <p className="text-[13px] font-semibold text-muted-foreground mb-1">Comprendre aide à retenir : on commence par elles.</p>
            {memSurahs.map((n) => <SurahRow key={n} n={n} done={done} onClick={() => navigate(`/Tafsir?read=${n}`)} />)}
          </div>
        )}
        <div className="card-flat p-4 mt-3">
          <p className="font-black">Le parcours</p>
          <p className="text-[13px] font-semibold text-muted-foreground mb-1">Al-Fatiha puis le Juz Amma, de la plus courte à la plus longue.</p>
          {PATH.slice(0, 12).map((n) => <SurahRow key={n} n={n} done={done} onClick={() => navigate(`/Tafsir?read=${n}`)} />)}
        </div>
        <button onClick={() => { haptic(); navigate("/Tafsir?read"); }} className="card-flat w-full p-4 mt-3 mb-6 flex items-center gap-3 text-left press">
          <span className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center shrink-0"><Books weight="fill" className="w-6 h-6" /></span>
          <span className="flex-1"><span className="block font-black">Lecture libre</span><span className="block text-[13px] font-semibold text-muted-foreground">Les 114 sourates, au choix du tafsir</span></span>
          <CaretRight weight="bold" className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

function Pick() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const list = Array.from({ length: 114 }, (_, i) => i + 1).filter((n) => !q || `${n} ${nameOf(n)} ${surahFr(n)} ${surahMeta(n)?.name}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="min-h-[100dvh] bg-background pb-nav">
      <div className="max-w-xl mx-auto px-4">
        <PageHeader title="Lecture libre" back="/Tafsir" />
        <label className="mt-2 h-12 rounded-2xl border-2 border-border bg-card flex items-center gap-2 px-3">
          <MagnifyingGlass weight="bold" className="w-5 h-5 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher une sourate" className="flex-1 bg-transparent outline-none font-semibold text-[16px]" />
        </label>
        <div className="card-flat px-4 py-1 mt-3 mb-6">
          {list.map((n) => (
            <button key={n} onClick={() => navigate(`/Tafsir?read=${n}`)} className="w-full flex items-center gap-3 py-3 border-t-2 border-border/60 first:border-t-0 text-left press">
              <span className="w-9 text-center font-black text-muted-foreground">{n}</span>
              <span className="flex-1 min-w-0"><span className="block font-black truncate">{nameOf(n)}</span><span className="block text-[13px] font-semibold text-muted-foreground truncate">{surahFr(n)} · {surahMeta(n)?.numberOfAyahs} versets</span></span>
              <span dir="rtl" className="font-arabic text-[20px]">{surahMeta(n)?.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Reader({ surah }) {
  const navigate = useNavigate();
  const [src, setS] = useState(getSrc());
  const [upto, setUpto] = useState(20);
  const total = surahMeta(surah)?.numberOfAyahs || 0;
  const { data: verses } = useQuery({ queryKey: ["surah-v", surah], queryFn: () => loadSurah(surah), staleTime: Infinity });
  const { data: ex, isLoading } = useQuery({ queryKey: ["tafsir-read", src, surah, upto], queryFn: () => tafsirRange(src, surah, 1, Math.min(upto, total)), placeholderData: (prev) => prev });
  const { data: ls = [] } = useQuery({ queryKey: ["tafsir-lessons", surah], queryFn: () => lessonsOf(surah) });
  const byA = new Map((ex || []).map((r) => [r.ayah, r]));
  useEffect(() => () => stopAudio(), []);
  return (
    <div className="min-h-[100dvh] bg-background pb-nav">
      <div className="max-w-xl mx-auto px-4">
        <PageHeader title={nameOf(surah)} back="/Tafsir" />
        <p className="font-semibold text-muted-foreground mt-1">{surahFr(surah)} · {total} versets</p>
        <div className="mt-3"><TafsirChips value={src} onChange={setS} /></div>
        {ls.length > 0 && <button onClick={() => { haptic(); navigate(`/Tafsir?s=${surah}&l=0`); }} className="btn-relief w-full h-[50px] mt-3 bg-primary text-primary-foreground">Étudier en leçons ({ls.length})</button>}
        <div className="space-y-3 mt-3 mb-4">
          {(verses?.v || []).slice(0, upto).map((v) => {
            const r = byA.get(v.k);
            return (
              <div key={v.k} className="card-flat p-4">
                <div className="flex items-start gap-2">
                  <button onClick={() => { haptic(); playUrl(AUDIO(v.g)); }} aria-label="Écouter" className="w-9 h-9 rounded-full bg-accent text-accent-foreground flex items-center justify-center shrink-0 press"><SpeakerHigh weight="fill" className="w-5 h-5" /></button>
                  <p dir="rtl" lang="ar" className="flex-1 font-arabic text-[24px] leading-[2.1] text-right">{v.a} <span className="text-primary text-[18px]">﴿{v.k}﴾</span></p>
                </div>
                <p className="text-[14.5px] font-semibold text-foreground/75 mt-1">{v.f}</p>
                {r?.body ? <div className="mt-2"><TafsirText src={src} data={r} /></div>
                  : r && r.from !== v.k ? <p className="text-[12.5px] font-bold text-muted-foreground mt-2">Expliqué avec le verset {r.from}, plus haut.</p>
                  : isLoading ? <p className="text-[13px] font-semibold text-muted-foreground mt-2">Chargement…</p> : null}
              </div>
            );
          })}
        </div>
        {upto < total && <button onClick={() => setUpto((u) => u + 20)} className="btn-relief w-full h-[50px] mb-6 bg-card border-2 border-border">Voir la suite</button>}
        <p className="text-[12px] font-semibold text-muted-foreground text-center mb-8">Les explications sont reproduites sans modification. Traduction des versets : Muhammad Hamidullah.</p>
      </div>
    </div>
  );
}

function Lesson({ surah, index }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [src, setS] = useState(getSrc());
  const [step, setStep] = useState(0);
  const [pick, setPick] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [saved, setSaved] = useState(null);
  const { data: ls } = useQuery({ queryKey: ["tafsir-lessons", surah], queryFn: () => lessonsOf(surah) });
  const L = ls?.[index];
  const { data: verses } = useQuery({ queryKey: ["surah-v", surah], queryFn: () => loadSurah(surah), staleTime: Infinity });
  const { data: scope } = useQuery({ queryKey: ["my-scope"], queryFn: myQuranScope, staleTime: 60_000 });
  const { data: fr } = useQuery({ queryKey: ["tafsir-l", DEFAULT_SRC, surah, L?.from, L?.to], enabled: !!L, queryFn: () => tafsirRange(DEFAULT_SRC, surah, L.from, L.to) });
  const { data: qs = [] } = useQuery({ queryKey: ["tafsir-q", surah, L?.from, L?.to], enabled: !!L, queryFn: () => tafsirQuestions(surah, L.from, L.to) });
  const vs = (verses?.v || []).filter((v) => L && v.k >= L.from && v.k <= L.to);
  const nV = vs.length, nQ = qs.length, total = nV + nQ;
  const cur = step < nV ? vs[step] : null;
  const q = step >= nV && step < total ? qs[step - nV] : null;
  const { data: ex } = useQuery({ queryKey: ["tafsir-one", src, surah, cur?.k], enabled: !!cur, queryFn: () => tafsirOne(src, surah, cur.k) });
  const level = scope?.level;
  useEffect(() => () => stopAudio(), []);
  useEffect(() => { if (cur) { const t = setTimeout(() => playUrl(AUDIO(cur.g)), 350); return () => clearTimeout(t); } }, [cur?.g]);
  useEffect(() => {
    if (!L || step < total || total === 0 || saved) return;
    tafsirDone(surah, L.from, L.to, answers).then((r) => setSaved(r || {}), () => setSaved({ offline: true }));
    ["tafsir-done", "tafsir-me", "tafsir-next"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  }, [step, total]);

  if (!L || !verses) return <div className="min-h-[100dvh] flex items-center justify-center font-bold text-muted-foreground">Chargement…</div>;
  const close = () => navigate(`/Tafsir?read=${surah}`, { replace: true });
  const nextL = ls[index + 1];

  if (step >= total) {
    const ok = answers.filter((a) => a.ok).length;
    const byA = new Map((fr || []).map((r) => [r.ayah, r.body]));
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col">
        <div className="max-w-xl mx-auto w-full px-4 flex-1 flex flex-col" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 28px)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}>
          <div className="text-center">
            <span className="w-20 h-20 mx-auto rounded-3xl bg-accent text-primary flex items-center justify-center"><CheckCircle weight="fill" className="w-11 h-11" /></span>
            <p className="text-[24px] font-black mt-3">{nextL ? "Leçon terminée" : `${nameOf(surah)} comprise`}</p>
            <p className="font-semibold text-muted-foreground">Versets {L.from} à {L.to}{nQ ? ` · ${ok} bonne${ok > 1 ? "s" : ""} réponse${ok > 1 ? "s" : ""} sur ${nQ}` : ""}</p>
          </div>
          <div className="card-flat p-4 mt-5">
            <p className="font-black">Ce que tu retiens</p>
            <ol className="mt-2 space-y-1.5 text-[14.5px] font-semibold text-foreground/80 list-decimal pl-5">
              {vs.map((v) => byA.get(v.k) && <li key={v.k}>{firstSentence(byA.get(v.k))}</li>)}
            </ol>
            <p className="text-[11.5px] font-bold text-muted-foreground mt-2">D'après L'Abrégé de l'exégèse du Coran</p>
          </div>
          {saved && !saved.offline && <p className="text-center text-[13px] font-semibold text-muted-foreground mt-3">Ta journée d'apprentissage est comptée pour la série et la ligue.</p>}
          <div className="flex-1" />
          {nextL
            ? <button onClick={() => navigate(`/Tafsir?s=${surah}&l=${index + 1}`, { replace: true })} className="btn-relief w-full h-[54px] bg-primary text-primary-foreground">Leçon suivante</button>
            : <button onClick={() => navigate(`/Memorize?surah=${surah}`)} className="btn-relief w-full h-[54px] bg-primary text-primary-foreground">Mémoriser cette sourate</button>}
          <button onClick={() => navigate("/Tafsir", { replace: true })} className="btn-relief w-full h-[54px] mt-2.5 bg-card border-2 border-border">Retour au tafsir</button>
        </div>
      </div>
    );
  }

  const progress = (step / total) * 100;
  const answered = q && pick != null;
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <div className="max-w-xl mx-auto w-full px-4 flex-1 flex flex-col" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}>
        <div className="flex items-center gap-3 h-12">
          <button onClick={close} aria-label="Fermer" className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-muted-foreground press"><X weight="bold" className="w-6 h-6" /></button>
          <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} /></div>
          <span className="text-[13px] font-black text-muted-foreground">{step + 1}/{total}</span>
        </div>
        {cur && (
          <>
            <p className="text-[12px] font-black tracking-wide text-muted-foreground mt-3">{nameOf(surah).toUpperCase()} · VERSET {cur.k}</p>
            <div className="card-flat p-4 mt-2">
              <p dir="rtl" lang="ar" className="font-arabic text-[27px] leading-[2.15] text-right">{cur.a}</p>
              {level !== "good" && cur.t && <p className={`italic font-semibold text-muted-foreground mt-1 ${level === "some" ? "text-[13px]" : "text-[15px]"}`}>{cur.t}</p>}
              <div className="flex items-center gap-3 mt-2">
                <button onClick={() => { haptic(); playUrl(AUDIO(cur.g)); }} className="shrink-0 h-9 px-3 rounded-xl border-2 border-border bg-card flex items-center gap-1.5 font-extrabold text-[13px] press"><SpeakerHigh weight="fill" className="w-4 h-4" />Écouter</button>
                <p className="text-[14px] font-semibold text-foreground/75">{cur.f}</p>
              </div>
            </div>
            <p className="font-black mt-4 mb-2">L'explication</p>
            {ex ? <TafsirText src={src} data={ex} compact /> : <p className="text-[13px] font-semibold text-muted-foreground">Chargement…</p>}
            <div className="mt-3"><TafsirChips value={src} onChange={setS} /></div>
            <div className="flex-1 min-h-4" />
            <button onClick={() => { haptic(); stopAudio(); setStep((x) => x + 1); }} className="btn-relief w-full h-[54px] mt-4 bg-primary text-primary-foreground">J'ai compris</button>
          </>
        )}
        {q && (
          <>
            <p className="text-[12px] font-black tracking-wide text-muted-foreground mt-3">QUESTION DE COMPRÉHENSION · VERSET {q.ayah}</p>
            <p className="text-[20px] font-black mt-2 leading-snug">{q.question}</p>
            <div className="space-y-2.5 mt-4">
              {q.choices.map((c, k) => {
                const st = !answered ? "" : k === q.answer ? "border-primary bg-accent text-accent-foreground" : k === pick ? "border-destructive bg-destructive/10 text-destructive" : "opacity-60";
                return (
                  <button key={k} disabled={answered} onClick={() => { haptic(k === q.answer ? 8 : 30); setPick(k); setAnswers((a) => [...a, { id: q.id, ok: k === q.answer }]); }}
                    className={`w-full text-left rounded-2xl border-2 border-b-4 border-border bg-card px-4 py-3 font-extrabold text-[15px] flex items-center gap-2 ${st}`}>
                    {answered && k === q.answer && <CheckCircle weight="fill" className="w-5 h-5 shrink-0" />}
                    {answered && k === pick && k !== q.answer && <XCircle weight="fill" className="w-5 h-5 shrink-0" />}
                    <span>{c}</span>
                  </button>
                );
              })}
            </div>
            {answered && (
              <div className={`rounded-2xl border-2 p-3.5 mt-3 ${pick === q.answer ? "border-primary bg-accent/50" : "border-destructive/50 bg-destructive/5"}`}>
                <p className={`font-black ${pick === q.answer ? "text-primary" : "text-destructive"}`}>{pick === q.answer ? "Bonne réponse" : "Pas tout à fait"}</p>
                <p className="text-[14px] font-semibold text-foreground/80 mt-1 leading-relaxed">{q.explanation}</p>
                {q.source && <p className="text-[11.5px] font-bold text-muted-foreground mt-1.5">{q.source}</p>}
              </div>
            )}
            <div className="flex-1 min-h-4" />
            <button disabled={!answered} onClick={() => { haptic(); setPick(null); setStep((x) => x + 1); }} className="btn-relief w-full h-[54px] mt-4 bg-primary text-primary-foreground disabled:opacity-50">Continuer</button>
          </>
        )}
      </div>
    </div>
  );
}
