import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Lock, Star, Trophy, Microphone, Play, Pause, Repeat, CheckCircle, XCircle, X, SpeakerHigh, BookOpen, BookmarkSimple, CaretRight } from "@phosphor-icons/react";
import PageHeader from "@/components/PageHeader";
import KaraokeVerse from "@/components/KaraokeVerse";
import { AUDIO } from "@/lib/games";
import { playUrl, currentPlayer } from "@/lib/qaida";
import { haptic } from "@/hooks/usePlatform";
import { useToast } from "@/components/ui/use-toast";
import { surahMeta } from "@/lib/tafsir";
import { RECITERS, getReciter, setReciter, reciterOf, playVerse, stopAudio, tajwidAll, tajwidDone, tajwidMemo, buildExercises, progressOf } from "@/lib/tajwid";

const OFFSET = [0, 44, 64, 44, 0, -44, -64, -44, 0];
export const useTajwid = () => useQuery({ queryKey: ["tajwid"], queryFn: tajwidAll, staleTime: 5 * 60_000 });

export default function Tajwid() {
  const p = new URLSearchParams(useLocation().search);
  if (p.has("u")) return <Lesson key={p.get("u")} unit={Number(p.get("u"))} />;
  if (p.has("poeme")) return <Poem />;
  return <Home />;
}

/* ---------- Choix du récitant ---------- */
function useReciter(data) {
  const [r, setR] = useState(() => getReciter(data?.audio));
  useEffect(() => { if (data?.audio) setR(getReciter(data.audio)); }, [!!data?.audio]);
  return [r, (id) => { setReciter(id); setR(id); }];
}

function ReciterSheet({ data, value, onChange, onClose }) {
  const has = (id) => Object.keys(data?.audio?.[id] || {}).length > 0;
  useEffect(() => () => stopAudio(), []);
  return (
    <div className="fixed inset-0 z-[80] flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-foreground/30" />
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-xl mx-auto bg-card rounded-t-[26px] border-t-2 border-border px-4 pt-2.5" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)" }}>
        <div className="w-10 h-1.5 rounded-full bg-border mx-auto mb-3" />
        <p className="text-[18px] font-black">Choisir le récitant</p>
        <p className="text-[13px] font-semibold text-muted-foreground">Ton choix est gardé pour toutes les leçons.</p>
        <div className="space-y-2.5 mt-3">
          {RECITERS.filter((r) => has(r.id)).map((r) => (
            <div key={r.id} className={`rounded-2xl border-2 border-b-4 p-3 flex items-center gap-3 ${value === r.id ? "border-primary bg-accent/40" : "border-border"}`}>
              <button onClick={() => { haptic(); onChange(r.id); }} className="flex-1 flex items-center gap-3 text-left press">
                <span className="w-11 h-11 rounded-full bg-accent text-primary flex items-center justify-center shrink-0"><Microphone weight="fill" className="w-5 h-5" /></span>
                <span className="flex-1 min-w-0"><span className="block font-black">{r.name}</span><span className="block text-[12.5px] font-semibold text-muted-foreground">{r.info}</span></span>
              </button>
              <button onClick={() => { haptic(); playVerse(data.audio, r.id, 7); }} aria-label={`Écouter ${r.name}`} className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 press"><Play weight="fill" className="w-5 h-5" /></button>
              {value === r.id && <CheckCircle weight="fill" className="w-6 h-6 text-primary shrink-0" />}
            </div>
          ))}
        </div>
        <button onClick={onClose} className="btn-relief w-full h-[52px] mt-4 bg-primary text-primary-foreground">Valider</button>
        <p className="text-[11px] font-semibold text-muted-foreground text-center mt-2.5">Enregistrements publiés sur archive.org</p>
      </div>
    </div>
  );
}

/* ---------- Accueil : parcours ---------- */
function Home() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, isLoading } = useTajwid();
  const [rec, setRec] = useReciter(data);
  const [sheet, setSheet] = useState(false);
  const pr = progressOf(data);
  const units = data?.units || [];
  const cur = pr.current;
  const vCount = data?.verses?.length || 61;

  const open = (u, state) => {
    haptic();
    if (state === "locked") { toast({ title: "Unité verrouillée", description: "Réussis d'abord l'unité précédente (80 % de bonnes réponses)." }); return; }
    navigate(`/Tajwid?u=${u.n}`);
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-nav">
      <div className="max-w-xl mx-auto px-4">
        <PageHeader title="Tajwid" back="/Lire" />
        <div className="card-flat p-4 mt-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-black">Tuḥfat al-Aṭfāl</p>
            <p className="text-[13px] font-semibold text-muted-foreground">{vCount} vers · Sulaymān al-Jamzūrī · lecture de Ḥafṣ</p>
          </div>
          <button onClick={() => { haptic(); setSheet(true); }} className="h-9 px-3 rounded-full border-2 border-primary bg-accent text-accent-foreground font-black text-[12.5px] flex items-center gap-1.5 press shrink-0">
            <Microphone weight="fill" className="w-4 h-4" />{reciterOf(rec).short}
          </button>
        </div>

        {cur ? (
          <div className="rounded-2xl bg-primary text-primary-foreground p-4 mt-3" style={{ boxShadow: "0 4px 0 var(--primary-lip)" }}>
            <p className="text-[12px] font-black uppercase tracking-wide opacity-80">{cur.n === 0 ? "Introduction" : `Unité ${cur.n} sur ${units.length - 1}`}</p>
            <p className="text-[20px] font-black leading-tight">{cur.title}</p>
            <p className="text-[13.5px] font-bold opacity-90">Vers {cur.v_from}{cur.v_to !== cur.v_from ? ` à ${cur.v_to}` : ""} · {cur.sub}</p>
          </div>
        ) : units.length > 0 && (
          <div className="card-flat p-4 mt-3 flex items-center gap-3">
            <Trophy weight="fill" className="w-8 h-8 text-gold shrink-0" />
            <p className="font-black">Parcours terminé. Tu peux réviser chaque unité ou réciter tout le poème.</p>
          </div>
        )}

        {isLoading && <p className="text-center font-bold text-muted-foreground mt-10">Chargement…</p>}
        <div className="flex flex-col items-center gap-5 pt-14 pb-4">
          {units.map((u, i) => {
            const m = pr.me.get(u.n);
            const prevOk = i === 0 || pr.me.get(units[i - 1].n)?.passed;
            const state = m?.passed ? "done" : prevOk ? "current" : "locked";
            const isCur = cur && cur.n === u.n;
            return (
              <div key={u.n} className="flex flex-col items-center" style={{ transform: `translateX(${OFFSET[i % OFFSET.length]}px)` }}>
                <button onClick={() => open(u, state)} aria-label={u.title}
                  className={`relative w-[70px] h-[70px] rounded-full flex items-center justify-center press ${state === "locked" ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"}`}
                  style={{ boxShadow: state === "locked" ? "0 5px 0 hsl(var(--border))" : "0 5px 0 var(--primary-lip)", outline: isCur ? "6px solid hsl(var(--accent))" : "none" }}>
                  {isCur && <span className="absolute -top-12 left-1/2 -translate-x-1/2 bg-card border-2 border-border rounded-xl px-3 py-1.5 font-black text-primary text-sm whitespace-nowrap">{m ? "Continuer" : "Commencer"}</span>}
                  {state === "done" ? <Check weight="bold" className="w-8 h-8" /> : state === "locked" ? <Lock weight="fill" className="w-7 h-7" /> : i === units.length - 1 ? <Trophy weight="fill" className="w-8 h-8" /> : <Star weight="fill" className="w-8 h-8" />}
                </button>
                <p className="text-[12px] font-black text-muted-foreground mt-2 max-w-[150px] text-center leading-tight">{u.n}. {u.title}</p>
              </div>
            );
          })}
        </div>

        <button onClick={() => { haptic(); navigate("/Tajwid?poeme"); }} className="card-flat w-full p-4 mt-2 mb-6 flex items-center gap-3 text-left press">
          <span className="w-11 h-11 rounded-xl bg-accent text-accent-foreground flex items-center justify-center shrink-0"><BookOpen weight="fill" className="w-6 h-6" /></span>
          <span className="flex-1 min-w-0"><span className="block font-black">Tout le poème</span><span className="block text-[13px] font-semibold text-muted-foreground">Écouter, lire et mémoriser vers par vers{data?.me?.memo?.length ? ` · ${data.me.memo.length} à mémoriser` : ""}</span></span>
          <CaretRight weight="bold" className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
      {sheet && <ReciterSheet data={data} value={rec} onChange={setRec} onClose={() => { stopAudio(); setSheet(false); }} />}
    </div>
  );
}

/* ---------- Un vers du poème ---------- */
function useClip() {
  const [on, setOn] = useState(null);
  useEffect(() => () => stopAudio(), []);
  return [on, (data, rec, n, times = 1) => {
    if (on === n) { stopAudio(); setOn(null); return; }
    const ok = playVerse(data?.audio, rec, n, times, () => setOn(null));
    setOn(ok ? n : null);
  }];
}

function VerseCard({ v, data, rec, playing, onPlay, memo, onMemo, big = true }) {
  return (
    <div className="card-flat p-4">
      <p dir="rtl" lang="ar" className={`font-arabic text-center ${big ? "text-[23px] leading-[2.1]" : "text-[21px] leading-[2]"}`}>{v.a}<span className="text-primary mx-2">·</span>{v.b}</p>
      <p className="italic font-semibold text-[13.5px] text-accent-foreground text-center mt-1">{v.p}</p>
      <p className="text-[14px] font-semibold text-foreground/75 text-center mt-2 leading-relaxed">{v.f}</p>
      <div className="flex items-center justify-center gap-2 mt-3">
        <button onClick={() => { haptic(); onPlay(1); }} aria-label="Écouter le vers" className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center press" style={{ boxShadow: "0 3px 0 var(--primary-lip)" }}>
          {playing ? <Pause weight="fill" className="w-5 h-5" /> : <Play weight="fill" className="w-5 h-5" />}
        </button>
        <button onClick={() => { haptic(); onPlay(3); }} className="h-9 px-3 rounded-full border-2 border-border bg-card font-black text-[12.5px] flex items-center gap-1.5 press"><Repeat weight="bold" className="w-4 h-4" />3 fois</button>
        {onMemo && <button onClick={() => { haptic(); onMemo(!memo); }} className={`h-9 px-3 rounded-full border-2 font-black text-[12.5px] flex items-center gap-1.5 press ${memo ? "border-primary bg-accent text-accent-foreground" : "border-border bg-card"}`}>
          <BookmarkSimple weight={memo ? "fill" : "bold"} className="w-4 h-4" />{memo ? "À mémoriser" : "Mémoriser"}</button>}
      </div>
      <p className="text-[11px] font-black text-muted-foreground text-center mt-2">VERS {v.n}</p>
    </div>
  );
}

function useMemo_(data) {
  const qc = useQueryClient();
  const set = new Set(data?.me?.memo || []);
  const toggle = async (n, on) => {
    qc.setQueryData(["tajwid"], (d) => d && { ...d, me: { ...(d.me || {}), memo: on ? [...(d.me?.memo || []), n] : (d.me?.memo || []).filter((x) => x !== n) } });
    try { await tajwidMemo(n, on); } catch { qc.invalidateQueries({ queryKey: ["tajwid"] }); }
  };
  return [set, toggle];
}

/* ---------- Tout le poème ---------- */
function Poem() {
  const { data } = useTajwid();
  const [rec, setRec] = useReciter(data);
  const [sheet, setSheet] = useState(false);
  const [on, play] = useClip();
  const [memo, toggle] = useMemo_(data);
  const [onlyMemo, setOnlyMemo] = useState(false);
  const units = data?.units || [];
  return (
    <div className="min-h-[100dvh] bg-background pb-nav">
      <div className="max-w-xl mx-auto px-4">
        <PageHeader title="Le poème" back="/Tajwid" right={<button onClick={() => setSheet(true)} className="h-9 px-3 rounded-full border-2 border-border bg-card font-black text-[12.5px] flex items-center gap-1.5 press"><Microphone weight="fill" className="w-4 h-4 text-primary" />{reciterOf(rec).short}</button>} />
        <div className="flex gap-2 mt-3">
          {[["Tout", false], [`À mémoriser (${memo.size})`, true]].map(([l, v]) => (
            <button key={l} onClick={() => setOnlyMemo(v)} className={`h-9 px-3.5 rounded-full border-2 font-black text-[13px] ${onlyMemo === v ? "border-primary bg-accent text-accent-foreground" : "border-border bg-card text-muted-foreground"}`}>{l}</button>
          ))}
        </div>
        {units.map((u) => {
          const vs = (data?.verses || []).filter((v) => v.unit === u.n && (!onlyMemo || memo.has(v.n)));
          if (!vs.length) return null;
          return (
            <div key={u.n} className="mt-5">
              <p className="text-[12px] font-black tracking-wide text-muted-foreground uppercase">{u.n}. {u.title}</p>
              <p dir="rtl" className="font-arabic text-[17px] text-primary">{u.title_ar}</p>
              <div className="space-y-3 mt-2">
                {vs.map((v) => <VerseCard key={v.n} v={v} data={data} rec={rec} big={false} playing={on === v.n} onPlay={(t) => play(data, rec, v.n, t)} memo={memo.has(v.n)} onMemo={(x) => toggle(v.n, x)} />)}
              </div>
            </div>
          );
        })}
        {onlyMemo && memo.size === 0 && <p className="text-center font-semibold text-muted-foreground mt-8">Touche « Mémoriser » sous un vers pour l'ajouter ici.</p>}
        <p className="text-[11.5px] font-semibold text-muted-foreground text-center my-8">Traduction et phonétique MyHafizz. Enregistrements publiés sur archive.org.</p>
      </div>
      {sheet && <ReciterSheet data={data} value={rec} onChange={setRec} onClose={() => { stopAudio(); setSheet(false); }} />}
    </div>
  );
}

/* ---------- Exemple du Coran (curseur mot à mot + mots de la règle) ---------- */
function QuranExample({ e, phon = "small" }) {
  const name = surahMeta(e.s)?.englishName || "";
  return (
    <div className="card-flat p-4">
      <div className="flex items-center gap-2">
        <p className="flex-1 text-[12px] font-black text-muted-foreground">DANS LE CORAN · {name.toUpperCase()} {e.s}:{e.a}</p>
        <button onClick={() => { haptic(); playUrl(AUDIO(e.g)); }} aria-label="Écouter le verset" className="w-9 h-9 rounded-full bg-accent text-accent-foreground flex items-center justify-center shrink-0 press"><SpeakerHigh weight="fill" className="w-5 h-5" /></button>
      </div>
      <div className="mt-1"><KaraokeVerse surah={e.s} ayah={e.a} url={AUDIO(e.g)} arabic={e.t} phon={phon} mark={e.w} arClass="text-[24px] leading-[2.1]" /></div>
    </div>
  );
}

function RuleCard({ r }) {
  return (
    <div className="rounded-2xl bg-accent p-4">
      <p className="font-black text-accent-foreground text-[17px]">{r.name}</p>
      <p dir="rtl" className="font-arabic text-[18px] text-primary">{r.ar}</p>
      <p className="text-[14.5px] font-semibold text-foreground/80 mt-1 leading-relaxed">{r.body}</p>
      {r.letters && r.letters.split(" ").every((x) => x.length <= 2) && (
        <div dir="rtl" className="flex flex-wrap justify-center gap-1.5 mt-3">
          {r.letters.split(" ").map((l, i) => <span key={i} className="font-arabic w-10 h-11 rounded-xl bg-card border-2 border-b-4 border-border flex items-center justify-center text-[22px] text-accent-foreground">{l}</span>)}
        </div>
      )}
      {r.verses && <p className="text-[11.5px] font-black text-muted-foreground mt-2">VERS {r.verses}</p>}
    </div>
  );
}

/* ---------- Leçon d'une unité ---------- */
function Lesson({ unit }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data } = useTajwid();
  const [rec] = useReciter(data);
  const [on, play] = useClip();
  const [memo, toggle] = useMemo_(data);
  const [step, setStep] = useState(0);
  const [pick, setPick] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [saved, setSaved] = useState(null);
  const [round, setRound] = useState(0);
  const U = data?.units?.find((u) => u.n === unit);

  // étapes : vers, puis la règle quand ses vers sont lus, puis les exercices
  const steps = useMemo(() => {
    if (!data || !U) return [];
    const out = [];
    const rules = (data.rules || []).filter((r) => r.unit === unit);
    const endOf = (r) => Math.max(...String(r.verses).split(/[,-]/).map(Number).filter(Boolean));
    const vs = (data.verses || []).filter((v) => v.unit === unit);
    for (const v of vs) {
      out.push({ t: "verse", v });
      for (const r of rules.filter((r) => endOf(r) === v.n)) out.push({ t: "rule", r });
    }
    for (const r of rules.filter((r) => !vs.some((v) => v.n === endOf(r)))) out.push({ t: "rule", r });
    if (round === 0) out.push({ t: "intro" });
    for (const x of buildExercises(data, unit)) out.push({ t: "ex", x });
    return round === 0 ? out : out.filter((s) => s.t === "ex");
  }, [!!data, unit, round]);

  const exs = steps.filter((s) => s.t === "ex");
  const total = steps.length;
  const cur = steps[step];
  useEffect(() => () => stopAudio(), []);
  useEffect(() => { if (cur?.t === "verse") { const t = setTimeout(() => play(data, rec, cur.v.n), 350); return () => clearTimeout(t); } }, [step, round]);
  useEffect(() => {
    if (!U || !total || step < total || saved) return;
    const ok = answers.filter((a) => a.ok).length;
    tajwidDone(unit, ok, exs.length, answers.filter((a) => a.id)).then((r) => setSaved(r || {}), () => setSaved({ offline: true }));
  }, [step, total]);
  useEffect(() => { if (saved) qc.invalidateQueries({ queryKey: ["tajwid"] }); }, [saved]);

  if (!data || !U) return <div className="min-h-[100dvh] flex items-center justify-center font-bold text-muted-foreground">Chargement…</div>;
  const close = () => { stopAudio(); navigate("/Tajwid", { replace: true }); };
  const next = () => { haptic(); stopAudio(); setPick(null); setStep((x) => x + 1); };

  if (step >= total) {
    const ok = answers.filter((a) => a.ok).length;
    const pass = exs.length ? ok * 100 >= exs.length * 80 : true;
    const nextU = data.units.find((u) => u.n === unit + 1);
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col">
        <div className="max-w-xl mx-auto w-full px-4 flex-1 flex flex-col" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 28px)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}>
          <div className="text-center">
            <span className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center ${pass ? "bg-accent text-primary" : "bg-muted text-muted-foreground"}`}>{pass ? <Trophy weight="fill" className="w-11 h-11" /> : <Repeat weight="bold" className="w-10 h-10" />}</span>
            <p className="text-[24px] font-black mt-3">{pass ? "Unité réussie" : "Presque !"}</p>
            <p className="font-semibold text-muted-foreground">{ok} bonne{ok > 1 ? "s" : ""} réponse{ok > 1 ? "s" : ""} sur {exs.length}{pass ? "" : " · il en faut 80 % pour passer à la suite"}</p>
          </div>
          <div className="card-flat p-4 mt-5">
            <p className="font-black">{U.title}</p>
            <p className="text-[13.5px] font-semibold text-muted-foreground mt-0.5">Vers {U.v_from}{U.v_to !== U.v_from ? ` à ${U.v_to}` : ""} · {U.sub}</p>
            <ul className="mt-2 space-y-1.5">
              {(data.rules || []).filter((r) => r.unit === unit).map((r) => <li key={r.id} className="text-[14px] font-semibold text-foreground/80 flex gap-2"><CheckCircle weight="fill" className="w-5 h-5 text-primary shrink-0" /><span><b>{r.name}</b> · {r.label.split(" · ")[1] || r.ar}</span></li>)}
            </ul>
          </div>
          {saved && !saved.offline && <p className="text-center text-[13px] font-semibold text-muted-foreground mt-3">Ta journée d'apprentissage est comptée pour la série et la ligue.</p>}
          <div className="flex-1" />
          {pass && nextU ? <button onClick={() => navigate(`/Tajwid?u=${nextU.n}`, { replace: true })} className="btn-relief w-full h-[54px] bg-primary text-primary-foreground">Unité suivante</button>
            : !pass ? <button onClick={() => { setAnswers([]); setSaved(null); setPick(null); setStep(0); setRound((r) => r + 1); }} className="btn-relief w-full h-[54px] bg-primary text-primary-foreground">Refaire les exercices</button> : null}
          <button onClick={close} className="btn-relief w-full h-[54px] mt-2.5 bg-card border-2 border-border">Retour au parcours</button>
        </div>
      </div>
    );
  }

  const x = cur.t === "ex" ? cur.x : null;
  const answered = x && pick != null;
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <div className="max-w-xl mx-auto w-full px-4 flex-1 flex flex-col" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}>
        <div className="flex items-center gap-3 h-12">
          <button onClick={close} aria-label="Fermer" className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-muted-foreground press"><X weight="bold" className="w-6 h-6" /></button>
          <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(step / total) * 100}%` }} /></div>
          <span className="text-[13px] font-black text-muted-foreground">{step + 1}/{total}</span>
        </div>

        {cur.t === "verse" && (
          <>
            <p className="text-[12px] font-black tracking-wide text-muted-foreground mt-3 uppercase">{U.title} · vers {cur.v.n}</p>
            <div className="mt-2"><VerseCard v={cur.v} data={data} rec={rec} playing={on === cur.v.n} onPlay={(t) => play(data, rec, cur.v.n, t)} memo={memo.has(cur.v.n)} onMemo={(m) => toggle(cur.v.n, m)} /></div>
            <div className="flex-1 min-h-4" />
            <button onClick={next} className="btn-relief w-full h-[54px] mt-4 bg-primary text-primary-foreground">Continuer</button>
          </>
        )}

        {cur.t === "rule" && (
          <>
            <p className="text-[12px] font-black tracking-wide text-muted-foreground mt-3">LA RÈGLE</p>
            <div className="mt-2"><RuleCard r={cur.r} /></div>
            {cur.r.ex?.[0] && <div className="mt-3"><QuranExample e={cur.r.ex[0]} /></div>}
            {cur.r.ex?.[0] && <p className="text-[12.5px] font-semibold text-muted-foreground mt-2">Les mots encadrés montrent la règle. Le curseur suit la récitation de Mishary al-Afasy.</p>}
            <div className="flex-1 min-h-4" />
            <button onClick={next} className="btn-relief w-full h-[54px] mt-4 bg-primary text-primary-foreground">J'ai compris</button>
          </>
        )}

        {cur.t === "intro" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <span className="w-20 h-20 rounded-3xl bg-accent text-primary flex items-center justify-center"><Star weight="fill" className="w-11 h-11" /></span>
            <p className="text-[22px] font-black mt-3">À toi de jouer</p>
            <p className="font-semibold text-muted-foreground mt-1 max-w-xs">{exs.length} exercices pour vérifier que tu as compris. Il faut 80 % de bonnes réponses pour débloquer la suite.</p>
            <button onClick={next} className="btn-relief w-full h-[54px] mt-8 bg-primary text-primary-foreground">Commencer</button>
          </div>
        )}

        {x && (
          <>
            <p className="text-[12px] font-black tracking-wide text-muted-foreground mt-3">{x.kind === "rule" ? "QUELLE RÈGLE ?" : x.kind === "verse" ? "LE POÈME" : "QUESTION"}</p>
            <p className="text-[20px] font-black mt-1 leading-snug">{x.prompt}</p>
            {x.kind === "rule" && <div className="mt-3"><QuranExample e={x.ex} phon="none" /></div>}
            {x.kind === "verse" && <div className="card-flat p-4 mt-3"><p dir="rtl" lang="ar" className="font-arabic text-[23px] leading-[2.1] text-center">{x.verse.a} <span className="text-primary">· …</span></p><p className="italic font-semibold text-[13px] text-muted-foreground text-center">{x.verse.p.split(" · ")[0]}</p></div>}
            <div className="space-y-2.5 mt-4">
              {x.choices.map((c, k) => {
                const st = !answered ? "" : k === x.answer ? "border-primary bg-accent text-accent-foreground" : k === pick ? "border-destructive bg-destructive/10 text-destructive" : "opacity-60";
                return (
                  <button key={k} disabled={answered} onClick={() => { haptic(k === x.answer ? 8 : 30); setPick(k); setAnswers((a) => [...a, { id: x.id, ok: k === x.answer }]); }}
                    className={`w-full rounded-2xl border-2 border-b-4 border-border bg-card px-4 py-3 font-extrabold flex items-center gap-2 ${x.arabic ? "justify-center" : "text-left text-[15px]"} ${st}`}>
                    {answered && k === x.answer && <CheckCircle weight="fill" className="w-5 h-5 shrink-0" />}
                    {answered && k === pick && k !== x.answer && <XCircle weight="fill" className="w-5 h-5 shrink-0" />}
                    <span dir={x.arabic ? "rtl" : undefined} className={x.arabic ? "font-arabic font-normal text-[20px] leading-[1.9]" : ""}>{c}</span>
                  </button>
                );
              })}
            </div>
            {answered && (
              <div className={`rounded-2xl border-2 p-3.5 mt-3 ${pick === x.answer ? "border-primary bg-accent/50" : "border-destructive/50 bg-destructive/5"}`}>
                <p className={`font-black ${pick === x.answer ? "text-primary" : "text-destructive"}`}>{pick === x.answer ? "Bonne réponse" : "Pas tout à fait"}</p>
                {pick !== x.answer && <p className="text-[14px] font-extrabold mt-1">Bonne réponse : <span dir="auto" className={x.arabic ? "font-arabic font-normal text-[18px]" : ""}>{x.choices[x.answer]}</span></p>}
                <p className="text-[14px] font-semibold text-foreground/80 mt-1 leading-relaxed">{x.explain}</p>
              </div>
            )}
            <div className="flex-1 min-h-4" />
            <button disabled={!answered} onClick={next} className="btn-relief w-full h-[54px] mt-4 bg-primary text-primary-foreground disabled:opacity-50">Continuer</button>
          </>
        )}
      </div>
    </div>
  );
}
