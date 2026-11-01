import React, { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, X, SpeakerHigh, Stop, ShareNetwork, Check } from "@phosphor-icons/react";
import PageHeader from "@/components/PageHeader";
import { loadNames, myNames, markName, playVerse, stopVerse, buildQuiz } from "@/lib/names";
import { shareCard } from "@/lib/shareImage";
import { haptic } from "@/hooks/usePlatform";

const useNamesData = () => {
  const names = useQuery({ queryKey: ["allah-names"], queryFn: loadNames, staleTime: Infinity, retry: 1 });
  const prog = useQuery({ queryKey: ["allah-names-me"], queryFn: myNames, staleTime: 30000 });
  return { names: names.data || [], loading: names.isLoading, prog: prog.data || {} };
};

export default function Noms() {
  const p = new URLSearchParams(useLocation().search);
  if (p.get("quiz")) return <Quiz />;
  if (p.get("n")) return <Fiche key={p.get("n")} n={Number(p.get("n"))} />;
  return <Grille />;
}

function Grille() {
  const navigate = useNavigate();
  const { names, loading, prog } = useNamesData();
  const [tab, setTab] = useState("all");
  const learned = names.filter((x) => prog[x.n]?.learned).length;
  const nextName = names.find((x) => !prog[x.n]?.learned);
  const list = names.filter((x) => tab === "all" || (tab === "ok" ? prog[x.n]?.learned : prog[x.n]?.again));
  return (
    <div className="min-h-[100dvh] bg-background pb-nav">
      <div className="max-w-xl mx-auto px-4">
        <PageHeader title="Les 99 noms d'Allah" back="/Lire" />
        <div className="card-flat p-4 mt-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-black">{learned} appris sur 99</p>
            {nextName && <p className="text-[13px] font-bold text-muted-foreground truncate">Prochain : {nextName.translit}</p>}
          </div>
          <div className="h-2.5 rounded-full bg-muted mt-2 overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${(learned / 99) * 100}%` }} /></div>
          <button onClick={() => { haptic(); navigate("/Noms?quiz=1"); }} className="btn-relief w-full h-11 mt-3 bg-primary text-primary-foreground text-sm">Réviser en quiz (5 noms)</button>
        </div>
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-muted mt-3">
          {[["all", "Tous"], ["ok", "Appris"], ["again", "À revoir"]].map(([k, l]) => (
            <button key={k} onClick={() => { haptic(); setTab(k); }} className={`h-9 rounded-lg text-[13.5px] font-extrabold ${tab === k ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>{l}</button>
          ))}
        </div>
        {loading && <div className="h-40 rounded-2xl bg-muted animate-pulse mt-3" />}
        {!loading && !list.length && <p className="text-center text-[14px] font-semibold text-muted-foreground mt-8">{tab === "again" ? "Aucun nom à revoir. Les noms ratés au quiz apparaîtront ici." : "Aucun nom appris pour l'instant."}</p>}
        <div className="grid grid-cols-3 gap-2 mt-3 pb-6">
          {list.map((x) => {
            const ok = prog[x.n]?.learned;
            return (
              <button key={x.n} onClick={() => { haptic(); navigate(`/Noms?n=${x.n}`); }}
                className={`rounded-2xl border-2 border-b-4 p-2 text-center press min-w-0 ${ok ? "border-primary bg-accent/40" : "border-border bg-card"}`}>
                <span className={`flex items-center gap-0.5 text-[11px] font-black ${ok ? "text-primary" : "text-muted-foreground"}`}>{x.n}{ok && <Check weight="bold" className="w-3 h-3" />}</span>
                <span dir="rtl" lang="ar" className="block font-arabic text-[22px] leading-[1.7] truncate">{x.ar}</span>
                <span className="block text-[12.5px] font-black truncate">{x.translit}</span>
                <span className="block text-[11.5px] font-semibold text-muted-foreground leading-tight line-clamp-2 min-h-[2.4em]">{x.meaning}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Fiche({ n }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { names, prog } = useNamesData();
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const x = names.find((y) => y.n === n);
  if (!x) return <div className="min-h-[100dvh] bg-background"><div className="max-w-xl mx-auto px-4"><PageHeader title="Les 99 noms d'Allah" back="/Noms" /><div className="h-60 rounded-2xl bg-muted animate-pulse mt-3" /></div></div>;
  const ok = prog[n]?.learned;
  const toggle = async () => {
    haptic(); setBusy(true);
    try { await markName(n, !ok, ok ? null : false); await qc.invalidateQueries({ queryKey: ["allah-names-me"] }); } catch { /* hors ligne */ }
    setBusy(false);
  };
  const share = () => { haptic(); shareCard({ arabic: x.ar, french: `${x.translit} : ${x.meaning}. ${x.explanation}`, reference: x.verse_ref ? `Coran ${x.verse_ref}` : "Les 99 noms d'Allah", kind: `Les 99 noms d'Allah · ${x.n}`, quran: false,
    text: `${x.translit} (${x.ar}) : ${x.meaning}.\n${x.explanation}\n\nLes 99 noms d'Allah, un par jour, sur MyHafizz.\nmyhafizz.com` }); };
  return (
    <div className="min-h-[100dvh] bg-background pb-8">
      <div className="max-w-xl mx-auto px-4">
        <PageHeader title={`${x.n} sur 99`} back="/Noms" />
        <div className="card-flat p-5 mt-3 text-center">
          <p dir="rtl" lang="ar" className="font-arabic text-[52px] leading-[1.6]">{x.ar}</p>
          <div className="flex items-center justify-center gap-3 mt-1">
            <div className="min-w-0"><p className="text-[22px] font-black">{x.translit}</p><p className="font-semibold text-muted-foreground">{x.meaning}</p></div>
            {x.verse_ref && (
              <button onClick={() => { haptic(); if (playing) { stopVerse(); setPlaying(false); } else { setPlaying(true); playVerse(x.verse_ref, () => setPlaying(false)); } }}
                aria-label={playing ? "Arrêter" : "Écouter le verset"} className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-[0_3px_0_var(--primary-lip)]">
                {playing ? <Stop weight="fill" className="w-5 h-5" /> : <SpeakerHigh weight="fill" className="w-6 h-6" />}
              </button>
            )}
          </div>
        </div>
        <div className="card-flat p-4 mt-3">
          <p className="text-[12px] font-black tracking-wide text-muted-foreground">SON SENS</p>
          <p className="text-[15px] font-semibold mt-1.5 leading-relaxed">{x.explanation}</p>
        </div>
        {x.verse_ar && (
          <div className="card-flat p-4 mt-3">
            <p className="text-[12px] font-black tracking-wide text-muted-foreground">DANS LE CORAN · {x.verse_ref}</p>
            <p dir="rtl" lang="ar" className="font-arabic text-[21px] leading-[2] text-right mt-1.5">{x.verse_ar}</p>
            {x.verse_fr && <p className="text-[14px] font-semibold text-muted-foreground mt-1 leading-relaxed">« {x.verse_fr} » <span className="text-[12px]">(trad. Hamidullah)</span></p>}
          </div>
        )}
        {x.invocation && (
          <div className="card-flat p-4 mt-3">
            <p className="text-[12px] font-black tracking-wide text-muted-foreground">POUR LE VIVRE</p>
            <p className="text-[14.5px] font-semibold mt-1.5 leading-relaxed">{x.invocation}</p>
            {x.invocation_src && <p className="text-[12px] font-bold text-muted-foreground mt-1.5">{x.invocation_src}</p>}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2.5 mt-4">
          <button onClick={share} className="btn-relief h-[52px] bg-card text-foreground border-2 border-border flex items-center justify-center gap-2"><ShareNetwork weight="bold" className="w-5 h-5" />Partager</button>
          <button onClick={toggle} disabled={busy} className={`btn-relief h-[52px] ${ok ? "bg-card text-primary border-2 border-primary" : "bg-primary text-primary-foreground"}`}>{ok ? "Appris" : "Je l'ai appris"}</button>
        </div>
        <div className="grid grid-cols-2 gap-2.5 mt-2.5">
          <button disabled={n <= 1} onClick={() => navigate(`/Noms?n=${n - 1}`, { replace: true })} className="h-11 rounded-xl font-extrabold text-muted-foreground disabled:opacity-40">Précédent</button>
          <button disabled={n >= 99} onClick={() => navigate(`/Noms?n=${n + 1}`, { replace: true })} className="h-11 rounded-xl font-extrabold text-primary disabled:opacity-40">Suivant</button>
        </div>
      </div>
    </div>
  );
}

function Quiz() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { names, prog } = useNamesData();
  const [seed, setSeed] = useState(0);
  const qs = useMemo(() => (names.length ? buildQuiz(names, prog) : []), [names.length, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [pick, setPick] = useState(null);
  const [score, setScore] = useState(0);
  if (!qs.length) return <div className="min-h-[100dvh] bg-background"><div className="max-w-xl mx-auto px-4"><PageHeader title="Quiz" back="/Noms" /><div className="h-60 rounded-2xl bg-muted animate-pulse mt-3" /></div></div>;
  if (i >= qs.length) return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <div className="max-w-xl w-full mx-auto px-4 flex-1 flex flex-col justify-center text-center">
        <p className="text-[56px] font-black text-primary">{score}/{qs.length}</p>
        <p className="text-[20px] font-black">{score === qs.length ? "Parfait, macha'Allah" : score >= 3 ? "Bien joué" : "Continue, ça viendra"}</p>
        <p className="font-semibold text-muted-foreground mt-1">Les noms ratés sont rangés dans « À revoir ».</p>
        <button onClick={() => { haptic(); setSeed((s) => s + 1); setI(0); setScore(0); setPick(null); }} className="btn-relief w-full h-[54px] mt-8 bg-primary text-primary-foreground">Encore 5 noms</button>
        <button onClick={() => navigate("/Noms", { replace: true })} className="btn-relief w-full h-[54px] mt-2.5 bg-card border-2 border-border">Retour aux 99 noms</button>
      </div>
    </div>
  );
  const q = qs[i]; const answered = pick != null; const good = pick === q.answer;
  const wrongName = answered && !good ? q.others.find((o) => o.meaning === q.choices[pick]) : null;
  const answer = (k) => {
    haptic(k === q.answer ? 8 : 30); setPick(k);
    if (k === q.answer) setScore((s) => s + 1);
    markName(q.name.n, null, k !== q.answer).then(() => qc.invalidateQueries({ queryKey: ["allah-names-me"] })).catch(() => {});
  };
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <div className="max-w-xl w-full mx-auto px-4 flex-1 flex flex-col pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
        <div className="flex items-center gap-3 pt-[calc(env(safe-area-inset-top,0px)+14px)]">
          <button onClick={() => navigate("/Noms", { replace: true })} aria-label="Quitter" className="w-9 h-9 flex items-center justify-center text-muted-foreground"><X weight="bold" className="w-6 h-6" /></button>
          <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary rounded-full transition-all" style={{ width: `${((i + (answered ? 1 : 0)) / qs.length) * 100}%` }} /></div>
        </div>
        <p className="text-[12px] font-black tracking-wide text-muted-foreground mt-5">QUE SIGNIFIE CE NOM ?</p>
        <p dir="rtl" lang="ar" className="font-arabic text-[48px] leading-[1.7] text-center mt-2">{q.name.ar}</p>
        <p className="text-center font-black text-muted-foreground">{q.name.translit}</p>
        <div className="space-y-2.5 mt-4">
          {q.choices.map((c, k) => {
            const st = !answered ? "" : k === q.answer ? "border-primary bg-accent text-accent-foreground" : k === pick ? "border-destructive bg-destructive/10 text-destructive" : "opacity-60";
            return (
              <button key={k} disabled={answered} onClick={() => answer(k)} className={`w-full text-left rounded-2xl border-2 border-b-4 border-border bg-card px-4 py-3 font-extrabold text-[15px] flex items-center gap-2 ${st}`}>
                {answered && k === q.answer && <CheckCircle weight="fill" className="w-5 h-5 shrink-0" />}
                {answered && k === pick && k !== q.answer && <XCircle weight="fill" className="w-5 h-5 shrink-0" />}
                <span>{c}</span>
              </button>
            );
          })}
        </div>
        {answered && (
          <div className={`rounded-2xl border-2 p-3.5 mt-3 ${good ? "border-primary bg-accent/50" : "border-destructive/50 bg-destructive/5"}`}>
            <p className={`font-black ${good ? "text-primary" : "text-destructive"}`}>{good ? "Bonne réponse" : "Pas tout à fait"}</p>
            <p className="text-[14px] font-semibold text-foreground/80 mt-1 leading-relaxed">
              {!good && <>Bonne réponse : <b>{q.name.meaning}</b>. </>}{q.name.translit} : {q.name.explanation}
              {wrongName && <> « {wrongName.meaning} », c'est {wrongName.translit}.</>}
            </p>
          </div>
        )}
        <div className="flex-1 min-h-4" />
        <button disabled={!answered} onClick={() => { haptic(); setPick(null); setI((x) => x + 1); }} className="btn-relief w-full h-[54px] mt-4 bg-primary text-primary-foreground disabled:opacity-50">Continuer</button>
      </div>
    </div>
  );
}
