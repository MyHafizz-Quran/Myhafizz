import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarCheck, Fire, CheckCircle, XCircle } from "@phosphor-icons/react";
import { loadDefi, dcBoard, loadSettings } from "@/lib/games";
import { PlayerPic } from "@/pages/Partie";
import { haptic } from "@/hooks/usePlatform";
import ShareResult from "@/components/ShareResult";

const secs = (ms) => `${Math.max(1, Math.round((ms || 0) / 1000))} s`;
const QUESTION = (it) => it.kind === "ilm" ? it.question : it.kind === "suite" ? "Quel est le verset suivant ?" : it.kind === "sourate" ? "À quelle sourate appartient ce verset ?" : it.kind === "ordre" ? "Remets les versets dans l'ordre" : it.kind === "hadith" ? `« ${it.statement} »` : "Quelle est cette lettre ?";
const ANSWER = (it) => it.kind === "ilm" ? it.choices?.[it.answer] : it.kind === "suite" ? `« ${it.next?.f} » (${it.surah}:${it.next?.k})` : it.kind === "sourate" ? it.options?.find((o) => o.n === it.answer)?.label : it.kind === "ordre" ? it.seq?.map((v) => v.k).join(", ") : it.kind === "hadith" ? (it.answer === 0 ? "Hadith authentique" : "Pas un hadith") : null;

export default function Defi() {
  const navigate = useNavigate();
  const [scope, setScope] = useState("all");
  const { data: d, error, isLoading } = useQuery({ queryKey: ["defi"], queryFn: loadDefi, staleTime: 10_000 });
  const { data: settings } = useQuery({ queryKey: ["game-settings"], queryFn: loadSettings, staleTime: 60_000 });
  const { data: board } = useQuery({ queryKey: ["defi-board", scope], queryFn: () => dcBoard(scope), enabled: !!d?.result, refetchInterval: 30_000 });
  const r = d?.result;
  const hours = d ? Math.max(1, Math.round((Date.parse(d.next_at) - Date.parse(d.now)) / 3600e3)) : 0;
  const cfg = settings?.defi || {};
  const wrap = (c, footer) => (
    <div className="min-h-[100dvh] bg-background" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className={`max-w-xl mx-auto px-4 ${footer ? "pb-36" : "pb-12"}`}>
        <div className="h-14 flex items-center gap-2">
          <button onClick={() => navigate("/Jouer", { replace: true })} aria-label="Retour" className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-muted-foreground press"><ArrowLeft weight="bold" className="w-6 h-6" /></button>
          <h1 className="text-[20px] font-black">Défi du jour</h1>
        </div>
        {c}
      </div>
      {footer && <div className="fixed inset-x-0 bottom-0 bg-background border-t-2 border-border" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}><div className="max-w-xl mx-auto px-4 pt-4">{footer}</div></div>}
    </div>
  );
  if (isLoading) return wrap(<p className="text-center font-bold text-muted-foreground mt-16">Préparation du défi…</p>);
  if (error || !d) return wrap(<p className="text-center font-bold text-muted-foreground mt-16">Impossible de charger le défi. Vérifie ta connexion.</p>);
  if (!d.enabled) return wrap(<p className="text-center font-bold text-muted-foreground mt-16">Le défi du jour est en pause pour le moment.</p>);

  if (!r) {
    const left = d.started;
    return wrap(<>
      <div className="text-center mt-6">
        <span className="w-20 h-20 mx-auto rounded-3xl bg-accent text-primary flex items-center justify-center"><CalendarCheck weight="fill" className="w-10 h-10" /></span>
        <p className="text-[24px] font-black mt-4">{new Date(d.now).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</p>
        <p className="font-semibold text-muted-foreground mt-1">{d.total} questions, les mêmes pour tout le monde. Un seul essai, alors prends ton temps : le classement tient compte des bonnes réponses, puis du temps.</p>
      </div>
      <div className="grid grid-cols-3 gap-2.5 mt-6">
        <div className="card-flat p-3 text-center"><p className="text-[20px] font-black">{d.players}</p><p className="text-[12px] font-bold text-muted-foreground">joueurs aujourd'hui</p></div>
        <div className="card-flat p-3 text-center"><p className="text-[20px] font-black flex items-center justify-center gap-1"><Fire weight="fill" className="w-5 h-5 text-gold" />{d.streak}</p><p className="text-[12px] font-bold text-muted-foreground">jours de série</p></div>
        <div className="card-flat p-3 text-center"><p className="text-[20px] font-black">{hours} h</p><p className="text-[12px] font-bold text-muted-foreground">avant le prochain</p></div>
      </div>
      <p className="text-[13px] font-semibold text-muted-foreground mt-4">Points : +{cfg.per_good ?? 5} par bonne réponse, et +{cfg.streak_step ?? 2} par jour de série (jusqu'à +{cfg.streak_max ?? 20}). Chaque erreur est expliquée.</p>
      {left && <p className="text-[13px] font-bold text-destructive mt-3">Tu as déjà commencé le défi : termine-le, ton essai compte.</p>}
    </>, <button onClick={() => { haptic(); navigate("/Partie?defi=1"); }} className="btn-relief w-full h-[52px] bg-primary text-primary-foreground">{left ? "Reprendre le défi" : "Relever le défi"}</button>);
  }

  const streakPts = Math.max(0, (r.points || 0) - r.score * (cfg.per_good ?? 5));
  return wrap(<>
    <div className="text-center mt-2">
      <span className="w-16 h-16 mx-auto rounded-3xl bg-accent text-primary flex items-center justify-center"><CalendarCheck weight="fill" className="w-8 h-8" /></span>
      <p className="text-[24px] font-black mt-3">Défi relevé</p>
      <p className="font-semibold text-muted-foreground">Nouveau défi dans {hours} h. Reviens demain pour garder ta série.</p>
    </div>
    <div className="grid grid-cols-3 gap-2.5 mt-5">
      <div className="card-flat p-3 text-center"><p className="text-[20px] font-black">{r.score} / {r.total}</p><p className="text-[12px] font-bold text-muted-foreground">réponses</p></div>
      <div className="card-flat p-3 text-center"><p className="text-[20px] font-black">{secs(r.ms)}</p><p className="text-[12px] font-bold text-muted-foreground">temps</p></div>
      <div className="card-flat p-3 text-center"><p className="text-[20px] font-black">{r.rank}e</p><p className="text-[12px] font-bold text-muted-foreground">sur {d.players}</p></div>
    </div>
    <ShareResult className="mt-3" build={(me) => ({
      card: { kicker: `Défi du jour · ${new Date(d.now).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`, big: `${r.score} / ${r.total}`, sub: me.grade, rows: [
        ["Temps", secs(r.ms)], ["Classement du jour", `${r.rank}e sur ${d.players}`], ...(r.streak > 1 ? [["Série", `${r.streak} jours`]] : []), ["Points", `+${r.points}`]] },
      text: `Défi du jour MyHafizz : ${r.score}/${r.total} en ${secs(r.ms)}, ${r.rank}e sur ${d.players} joueur${d.players > 1 ? "s" : ""}.\nLes mêmes ${r.total} questions pour tout le monde. Tu fais mieux ?\nmyhafizz.com/Defi`,
    })} />
    <div className="card-flat p-4 mt-3 font-extrabold">
      <p className="flex justify-between"><span>Bonnes réponses</span><span>+{r.score * (cfg.per_good ?? 5)}</span></p>
      {streakPts > 0 && <p className="flex justify-between mt-1.5"><span>Série de {r.streak} jours</span><span>+{streakPts}</span></p>}
      <p className="flex justify-between mt-2 pt-2 border-t-2 border-border text-[18px]"><span>Total</span><span className="text-primary">+{r.points} pts</span></p>
    </div>

    <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mt-6 mb-2">Classement du jour</p>
    <div className="flex bg-muted rounded-2xl p-1 gap-1">
      {[["all", "Tout le monde"], ["groups", "Mes groupes"]].map(([k, l]) => (
        <button key={k} onClick={() => setScope(k)} className={`flex-1 h-10 rounded-xl font-extrabold text-[14px] ${scope === k ? "bg-card text-accent-foreground shadow-[0_2px_0_var(--border)]" : "text-muted-foreground"}`}>{l}</button>
      ))}
    </div>
    <div className="card-flat px-3.5 mt-3">{(board?.top || []).map((x) => (
      <div key={x.p?.id} className={`flex items-center gap-3 py-2.5 border-b-2 border-border/60 last:border-0 font-extrabold ${x.me ? "text-primary" : ""}`}>
        <span className="w-6 text-center text-muted-foreground">{x.pos}</span>
        <PlayerPic p={x.p} size={32} />
        <span className="flex-1 truncate">{x.me ? "Toi" : `@${x.p?.username || "joueur"}`}</span>
        <span className="text-[14px]">{x.score}/{r.total} · {secs(x.ms)}</span>
      </div>
    ))}{!board?.top?.length && <p className="py-4 text-center font-semibold text-muted-foreground">Personne d'autre pour l'instant.</p>}</div>
    {board?.mine && board.mine.pos > 20 && <div className="card-flat p-3 mt-2 flex items-center gap-3 font-extrabold border-primary bg-accent"><span className="w-6 text-center">{board.mine.pos}</span><span className="flex-1">Toi</span><span>{board.mine.score}/{r.total} · {secs(board.mine.ms)}</span></div>}
    <p className="text-[12.5px] font-semibold text-muted-foreground mt-2">Classé par bonnes réponses, puis par temps. Le classement repart à zéro chaque jour à minuit.</p>

    {d.items_done?.length > 0 && <>
      <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mt-6 mb-2">Les réponses du jour</p>
      <div className="space-y-2.5">{d.items_done.map((it, k) => {
        const ok = r.answers?.[k]?.ok;
        return (
          <div key={k} className="card-flat p-3.5 flex gap-3">
            {ok ? <CheckCircle weight="fill" className="w-6 h-6 text-primary shrink-0" /> : <XCircle weight="fill" className="w-6 h-6 text-destructive shrink-0" />}
            <div className="min-w-0 text-[14px]"><p className="font-extrabold">{QUESTION(it)}</p>{ANSWER(it) && <p className="font-semibold text-muted-foreground mt-0.5">Réponse : {ANSWER(it)}</p>}{it.explanation && <p className="font-semibold text-muted-foreground mt-0.5">{it.explanation}</p>}</div>
          </div>
        );
      })}</div>
    </>}
  </>);
}
