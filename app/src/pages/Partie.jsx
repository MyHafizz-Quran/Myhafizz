import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, SpeakerHigh, CheckCircle, XCircle, Robot, User, Sword, Lightning, Target, Fire, LockOpen, ArrowCounterClockwise, Timer, UsersThree, Medal, CheckFat, Hourglass, SignOut, CalendarCheck } from "@phosphor-icons/react";
import { GAMES, ROBOT, AUDIO, L, buildGame, loadSettings, finishGame, robotAnswers, surahFr, ldState, ldAnswer, ldQuit, dcStart, dcSubmit, dcAnswer, tkGet, tkValidate, tkLevel, tkUnitName, buildSurahGame, loadQuran, TK_ILM } from "@/lib/games";
import { Profile } from "@/api/entities";
import { speak, playUrl, stopAudio, hasArabicVoice } from "@/lib/qaida";
import { haptic } from "@/hooks/usePlatform";

const AR = "font-arabic";

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

function Listen({ onPlay, big, label }) {
  return (
    <button onClick={() => { haptic(); onPlay(); }} aria-label="Écouter"
      className={`btn-relief bg-primary text-primary-foreground ${big ? "h-14 px-5 gap-2 w-full" : "w-12 h-12"} flex items-center justify-center`}>
      <SpeakerHigh weight="fill" className="w-6 h-6" />{big && <span>{label || "Écouter"}</span>}
    </button>
  );
}

function Choice({ state: raw, onClick, children, ar }) {
  const [state, mark] = String(raw || "").split("+");
  const cls = state === "selected" ? "border-primary bg-accent text-accent-foreground"
    : state === "correct" ? "border-primary bg-accent text-primary"
    : state === "wrong" ? "border-destructive bg-destructive/10 text-destructive"
    : "border-border bg-card text-foreground";
  return (
    <button onClick={onClick} dir={ar ? "rtl" : undefined}
      className={`relative w-full min-h-[60px] rounded-2xl border-2 border-b-[5px] px-3 py-2.5 font-extrabold transition-colors active:translate-y-[2px] active:border-b-2 ${cls}`}>
      {children}
      {mark === "them" && <span className="absolute -top-2.5 -right-2 h-6 px-2 rounded-full bg-gold-tint text-[#8A6100] border-2 border-gold text-[11px] font-black flex items-center">Adversaire</span>}
    </button>
  );
}

/** Verset : arabe et/ou phonétique selon l'aide du niveau. */
function VerseText({ v, aid, size = 26, center }) {
  return (
    <span className={`block ${center ? "text-center" : ""}`}>
      {aid !== "phon" && <span className={`${AR} block leading-[2]`} style={{ fontSize: size }} dir="rtl">{v.a}</span>}
      {aid !== "ar" && <span className={`block ${aid === "phon" ? "text-[16px] font-extrabold" : "text-[13px] font-bold text-muted-foreground"} italic`} dir="ltr">{v.t}</span>}
    </span>
  );
}

export default function Partie() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  // Duel en direct : l'état vient du serveur (question en cours, chrono, réponses), relu chaque seconde
  const liveId = params.get("live");
  const duelId = liveId;
  const [ls, setLs] = useState(null);
  const [lsError, setLsError] = useState(null);
  const offset = useRef(0);
  const defi = params.get("defi");
  const { data: dc, error: dcError } = useQuery({ queryKey: ["defi-play"], queryFn: dcStart, enabled: !!defi, staleTime: Infinity, gcTime: 0, retry: 1 });
  const t0 = useRef(null);
  const { data: liveProfile } = useQuery({ queryKey: ["profile"], queryFn: () => Profile.get(), enabled: !!liveId || !!defi });
  useEffect(() => {
    if (!liveId) return;
    let alive = true, t;
    const tick = async () => {
      try { const s = await ldState(liveId); if (!alive) return; offset.current = Date.parse(s.now) - Date.now(); setLs(s); setLsError(null); }
      catch (e) { if (alive) setLsError(e); }
      if (alive) t = setTimeout(tick, 900);
    };
    tick();
    return () => { alive = false; clearTimeout(t); };
  }, [liveId]);
  // Khatma d'équipe : une partie sur une sourate (ou un thème Al-Ilm) pour l'équipe
  const tkId = params.get("tk");
  const tkUnit = Number(params.get("u")) || 0;
  const { data: tk, error: tkError } = useQuery({ queryKey: ["tk", tkId], queryFn: () => tkGet(tkId), enabled: !!tkId, staleTime: 30_000 });
  const { data: tkProfile } = useQuery({ queryKey: ["profile"], queryFn: () => Profile.get(), enabled: !!tkId });
  const { data: tkQuran } = useQuery({ queryKey: ["quran-names"], queryFn: loadQuran, enabled: !!tkId, staleTime: Infinity });
  if (tk) {
    if (tk.scope === "ilm") { params.set("g", "ilm"); params.set("l", "1"); params.set("c", TK_ILM[tkUnit - 1]?.[0] || "mix"); }
    else { params.set("g", "suite"); params.set("l", String(tkLevel(tkProfile?.arabic_level))); }
  }
  const game = GAMES[params.get("g")] ? params.get("g") : "lettres";
  const G = GAMES[game];
  const levelN = Math.max(1, Math.min(G.levels.length, Number(params.get("l")) || 1));
  const liveAid = liveProfile?.arabic_level === "good" ? "ar" : liveProfile?.arabic_level === "some" ? "both" : "phon";
  const lv = liveId || defi ? { n: 1, aid: liveAid, timer: 0 } : G.levels.find((l) => l.n === levelN);
  const robotN = Math.max(1, Math.min(3, Number(params.get("r")) || 2));
  const category = params.get("c") || "mix";
  const voice = hasArabicVoice();

  const { data: settings } = useQuery({ queryKey: ["game-settings"], queryFn: loadSettings, staleTime: 60_000 });
  const count = game === "ilm" ? settings?.rules?.ilm_questions ?? 10 : settings?.rules?.questions ?? 5;
  const [seed, setSeed] = useState(0);
  const { data: built, isLoading: building, error: buildError } = useQuery({
    queryKey: ["game-items", game, levelN, category, seed, count, tkId, tkUnit],
    queryFn: () => (tkId && tk.scope !== "ilm" ? buildSurahGame(tkUnit, levelN, count) : buildGame(game, levelN, { count, category })),
    enabled: !!settings && !duelId && !defi && (!tkId || (!!tk && (tk.scope === "ilm" || !!tkProfile))), staleTime: Infinity, gcTime: 0,
  });
  const items = liveId ? ls?.items : defi ? dc?.items : built;
  const isLoading = liveId ? !ls?.items && !lsError : defi ? !dc && !dcError : tkId ? (!tk && !tkError) || building : building;
  const error = liveId ? lsError : defi ? dcError : tkError || buildError;
  const tkName = tk ? tkUnitName(tk.scope, tkUnit, tkQuran) : "";
  const exitTo = tkId ? `/Equipe?id=${tkId}` : defi ? "/Defi" : "/Jouer";
  // défi déjà relevé aujourd'hui : direction le résultat
  useEffect(() => {
    if (!dc) return;
    if (dc.played || !dc.items) { navigate("/Defi", { replace: true }); return; }
    if (!t0.current) {
      t0.current = Date.now();
      // reprise : on repart à la question suivante (les réponses déjà données sont gardées par le serveur)
      const done = Math.min(dc.progress || 0, dc.items.length);
      if (done >= dc.items.length) { submitDefi(); return; }
      if (done > 0) { answers.current = Array.from({ length: done }, () => ({ ok: false })); setI(done); }
    }
  }, [dc]);
  const submitDefi = async () => {
    try { await dcSubmit(answers.current.map(({ ok, ms }) => ({ ok: !!ok, ms: ms || 0 })), Date.now() - (t0.current || Date.now())); } catch { /* compté comme joué côté serveur */ }
    ["defi", "game-stats", "player"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    navigate("/Defi", { replace: true });
  };
  const rival = ls?.them?.username ? `@${ls.them.username}` : "Ton adversaire";
  const [submitted, setSubmitted] = useState(false);
  const [quitAsk, setQuitAsk] = useState(false);
  const [now, setNow] = useState(Date.now());
  const shownAt = useRef(Date.now());

  const [i, setI] = useState(0);
  const [choice, setChoice] = useState(null);
  const [order, setOrder] = useState([]);
  const [result, setResult] = useState(null); // null | ok | ko
  const [me, setMe] = useState(0);
  const [bot, setBot] = useState(0);
  const [botLast, setBotLast] = useState(null);
  const answers = useRef([]);
  const [end, setEnd] = useState(null);
  const [left, setLeft] = useState(null);
  useEffect(() => () => stopAudio(), []);
  useEffect(() => { shownAt.current = Date.now(); }, [i, items]);
  // duel en direct : suivre le serveur
  useEffect(() => {
    if (!liveId || !ls) return;
    if (ls.status === "done" || ls.status === "declined" || ls.status === "expired" || ls.status === "cancelled") { stopAudio(); navigate(ls.tournament ? `/Tournoi?id=${ls.tournament}` : `/Duel?id=${liveId}`, { replace: true }); return; }
    if (ls.status !== "playing") return;
    if (ls.q !== i) { stopAudio(); setI(ls.q); setChoice(null); setOrder([]); setResult(null); setSubmitted(false); return; }
    if (ls.q_closed_at && !result) {
      const ok = !!ls.my_answer?.ok;
      setResult(ok ? "ok" : "ko"); chime(ok); haptic(ok ? 8 : 30);
      const it = ls.items[ls.q];
      if (it?.kind === "suite") setTimeout(() => playUrl(AUDIO(it.next.g)), 300);
    }
  }, [ls]);
  useEffect(() => { if (!liveId) return; const t = setInterval(() => setNow(Date.now()), 200); return () => clearInterval(t); }, [liveId]);

  const item = items?.[i];
  const rate = settings?.robot?.[robotN] ?? [0.3, 0.15, 0.05][robotN - 1];
  const timerS = lv.timer === "flash" ? settings?.rules?.flash_seconds ?? 3 : lv.timer || 0;

  const playItem = (it = item) => {
    if (!it) return;
    if (it.kind === "letter-hear" || it.kind === "letter-see") return speak(L[it.letter].nameAr);
    if (it.kind === "syl") return speak(it.ar);
    if (it.kind === "suite") return playUrl(AUDIO(it.cur.g));
    if (it.kind === "sourate") return playUrl(AUDIO(it.verse.g));
    if (it.kind === "ordre") return playUrl(AUDIO(it.seq[0].g));
  };

  // son automatique : écoute (lettres niveau 2, sourate à l'oreille, niveaux phonétiques)
  useEffect(() => {
    if (!item || result) return;
    const auto = item.kind === "letter-hear" || (item.kind === "sourate" && item.mode !== "texte") || (item.kind === "suite" && lv.aid === "phon");
    if (auto) { const t = setTimeout(() => playItem(item), 400); return () => clearTimeout(t); }
  }, [i, items]);  

  // chrono (lettres)
  useEffect(() => {
    if (!item || result || !timerS) { setLeft(null); return; }
    const t0 = Date.now(); setLeft(timerS);
    const id = setInterval(() => {
      const l = Math.max(0, timerS - (Date.now() - t0) / 1000);
      setLeft(l);
      if (l <= 0) { clearInterval(id); grade(false, true); }
    }, 100);
    return () => clearInterval(id);
  }, [i, items, result === null]);  

  const isCorrect = () => {
    if (!item) return false;
    if (item.kind === "ordre") return order.map((t) => item.tiles[t].k).join(",") === item.seq.map((v) => v.k).join(",");
    if (item.kind === "suite") return choice === item.answer;
    return choice === item.answer;
  };

  const grade = (forced, timeout) => {
    if (result) return;
    if (liveId) {
      if (submitted || !ls) return;
      const ok = isCorrect(); haptic();
      setSubmitted(true);
      ldAnswer(liveId, ls.q, item.kind === "ordre" ? order : choice, ok).then(setLs).catch(() => setSubmitted(false));
      return;
    }
    const ok = forced === undefined ? isCorrect() : forced;
    const botOk = robotAnswers(rate);
    answers.current.push({ id: item.id || `${game}-${i}`, ok, timeout: !!timeout, ms: Date.now() - shownAt.current });
    if (defi) dcAnswer(i, ok, Date.now() - shownAt.current);
    if (ok) setMe((x) => x + 1);
    if (botOk) setBot((x) => x + 1);
    setBotLast(botOk);
    setResult(ok ? "ok" : "ko"); chime(ok); haptic(ok ? 8 : 30);
    if (!ok && (item.kind === "letter-see" || item.kind === "letter-hear")) setTimeout(() => speak(L[item.answer].nameAr), 300);
    if (item.kind === "suite") setTimeout(() => playUrl(AUDIO(item.next.g)), 300);
  };

  const next = async () => {
    haptic(); stopAudio();
    if (i + 1 >= items.length) {
      if (defi) { setEnd({ saving: true, score: 0, total: items.length }); return submitDefi(); }
      const score = answers.current.filter((a) => a.ok).length;
      setEnd({ score, total: items.length, bot, saving: true });
      if (tkId) {
        try {
          const v = await tkValidate(tkId, tkUnit, score, items.length);
          const r = await finishGame(game, levelN, answers.current.map(({ id, ok }) => ({ id, ok }))).catch(() => ({}));
          setEnd({ score, total: items.length, bot, ...r, tk: v });
          ["game-progress", "game-stats", "tk", "tk-list"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
        } catch { setEnd({ score, total: items.length, bot, offline: true, tkRetry: true }); }
        return;
      }
      try {
        const r = await finishGame(game, levelN, answers.current.map(({ id, ok }) => ({ id, ok })));
        setEnd({ score, total: items.length, bot, ...r });
        ["game-progress", "game-stats"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      } catch { setEnd({ score, total: items.length, bot, offline: true }); }
      return;
    }
    setI(i + 1); setChoice(null); setOrder([]); setResult(null); setBotLast(null);
  };

  const replay = () => { answers.current = []; setI(0); setMe(0); setBot(0); setChoice(null); setOrder([]); setResult(null); setEnd(null); setSeed((s) => s + 1); };

  const mistakes = useMemo(() => (end && items ? items.filter((_, k) => answers.current[k] && !answers.current[k].ok) : []), [end]);  

  // ── Fin de partie (khatma d'équipe) ──
  if (end && defi) return <div className="min-h-[100dvh] bg-background flex items-center justify-center"><p className="font-bold text-muted-foreground">Calcul de ton résultat…</p></div>;
  if (end && tkId) return <TkEnd end={end} tk={tk} name={tkName} quran={tkQuran} mistakes={mistakes} lv={lv} navigate={navigate} replay={replay} retry={() => { setI(items.length - 1); next(); }} />;

  // ── Fin de partie ──
  if (end) {
    const won = end.score > end.bot, draw = end.score === end.bot;
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}>
        <div className="flex-1 max-w-md mx-auto w-full px-6 pt-10 text-center">
          <div className="w-24 h-24 mx-auto rounded-3xl bg-primary text-primary-foreground flex items-center justify-center shadow-[0_5px_0_var(--primary-lip)]"><CheckCircle weight="fill" className="w-12 h-12" /></div>
          <h1 className="text-[28px] font-black mt-6">{won ? "Victoire !" : draw ? "Égalité" : "Partie terminée"}</h1>
          <p className="font-semibold text-muted-foreground mt-1">{`Toi ${end.score} · Robot ${end.bot} · ${end.score} / ${end.total} bonnes réponses`}</p>
          <div className="grid grid-cols-2 gap-3 mt-7">
            <div className="card-flat p-4"><Lightning weight="fill" className="w-6 h-6 text-gold mx-auto" /><p className="text-2xl font-black mt-1">{end.saving ? "…" : `+${end.xp ?? 0}`}</p><p className="text-xs font-bold text-muted-foreground">points</p></div>
            <div className="card-flat p-4">{end.mult > 1 ? <Fire weight="fill" className="w-6 h-6 text-gold mx-auto" /> : <Target weight="fill" className="w-6 h-6 text-primary mx-auto" />}<p className="text-2xl font-black mt-1">{end.mult > 1 ? `x${Number(end.mult).toFixed(1)}` : `${Math.round((end.score / end.total) * 100)} %`}</p><p className="text-xs font-bold text-muted-foreground">{end.mult > 1 ? `série de ${end.streak} jours` : "de réussite"}</p></div>
          </div>
          {end.unlocked && (
            <div className="card-flat w-full p-3.5 mt-3 flex items-center gap-3 text-left border-gold">
              <span className="w-10 h-10 rounded-xl bg-gold-tint text-gold flex items-center justify-center shrink-0"><LockOpen weight="fill" className="w-5 h-5" /></span>
              <div><p className="font-extrabold">Niveau {end.level} débloqué</p><p className="text-[12.5px] font-semibold text-muted-foreground">{G.levels.find((l) => l.n === end.level)?.name} : {G.levels.find((l) => l.n === end.level)?.desc}</p></div>
            </div>
          )}
          {end.offline && <p className="text-[13px] font-bold text-muted-foreground mt-3">{end.duel ? "Pas de connexion : ton duel n'a pas pu être envoyé. Reste sur cette page et réessaie." : "Pas de connexion : la partie n'a pas été enregistrée."}</p>}
          {end.duel && <button onClick={() => { setI(items.length - 1); next(); }} className="btn-relief h-[52px] w-full mt-3 bg-primary text-primary-foreground">Réessayer l'envoi</button>}
          {mistakes.length > 0 && (
            <div className="text-left mt-6">
              <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mb-2">À retenir</p>
              <div className="space-y-2.5">{mistakes.map((it, k) => <div key={k} className="card-flat p-3.5"><Correction item={it} lv={lv} compact /></div>)}</div>
            </div>
          )}
        </div>
        <div className="px-4 max-w-md mx-auto w-full grid grid-cols-2 gap-3 mt-6">
          <button onClick={replay} className="h-[52px] rounded-2xl border-2 border-b-[5px] border-border bg-card font-extrabold flex items-center justify-center gap-2"><ArrowCounterClockwise weight="bold" className="w-5 h-5" />Rejouer</button>
          <button onClick={() => navigate("/Jouer", { replace: true })} className="btn-relief h-[52px] bg-primary text-primary-foreground">Terminer</button>
        </div>
      </div>
    );
  }

  const header = (
    <div className="max-w-xl mx-auto w-full px-4 h-14 flex items-center gap-3">
      <button onClick={() => ((liveId && ls?.status === "playing") || (defi && items?.length) ? setQuitAsk(true) : navigate(exitTo))} aria-label="Quitter la partie" className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-muted-foreground press"><X weight="bold" className="w-6 h-6" /></button>
      <div className="flex-1 h-4 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${items ? (i / items.length) * 100 : 0}%` }} /></div>
    </div>
  );

  if (isLoading || !settings || error || !items?.length || !item) {
    return (
      <div className="min-h-[100dvh] bg-background" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        {header}
        <p className="text-center font-bold text-muted-foreground mt-24">{error || (items && !items.length) ? "Impossible de préparer la partie. Vérifie ta connexion." : "Préparation de la partie…"}</p>
      </div>
    );
  }

  const theirPick = liveId && result ? ls?.their_answer?.c : undefined;
  const stBase = (val) => (result ? (val === item.answer ? "correct" : val === choice ? "wrong" : null) : choice === val ? "selected" : null);
  const st = (val) => { const b = stBase(val); return theirPick !== undefined && theirPick === val ? `${b || "none"}+them` : b; };
  const pickV = (val) => { if (result || submitted) return; haptic(); setChoice(val); };

  const body = () => {
    switch (item.kind) {
      case "letter-see":
      case "letter-hear":
        return (<>
          <h2 className="text-[22px] font-black mb-4">{item.kind === "letter-hear" ? "Quelle lettre entends-tu ?" : "Quelle est cette lettre ?"}</h2>
          {item.kind === "letter-hear"
            ? <div className="flex justify-center mb-6"><Listen big label="Réécouter" onPlay={() => playItem()} /></div>
            : <div className="flex flex-col items-center mb-6"><div className={`${AR} text-[110px] leading-[1.6]`}>{L[item.letter].ar}</div>{voice && lv.aid === "phon" && <Listen onPlay={() => playItem()} />}</div>}
          <div className="grid grid-cols-2 gap-3">
            {item.options.map((id) => (
              <Choice key={id} state={st(id)} onClick={() => pickV(id)}>
                {item.kind === "letter-hear"
                  ? <span className="block"><span className={`${AR} block text-[38px] leading-[1.7]`} dir="rtl">{L[id].ar}</span>{lv.aid !== "ar" && <span className="block text-[13px] font-bold text-muted-foreground">{L[id].name}</span>}</span>
                  : <span className="block text-[18px]">{L[id].name}<span className="block text-[12.5px] font-bold text-muted-foreground">son « {L[id].sound} »</span></span>}
              </Choice>
            ))}
          </div>
        </>);
      case "syl":
        return (<>
          <h2 className="text-[22px] font-black mb-4">Comment se lit cette syllabe ?</h2>
          <div className={`${AR} text-[104px] leading-[1.7] text-center mb-6`}>{item.ar}</div>
          <div className="grid grid-cols-2 gap-3">{item.options.map((o) => <Choice key={o} state={st(o)} onClick={() => pickV(o)}><span className="text-[20px]">{o}</span></Choice>)}</div>
        </>);
      case "suite":
        return (<>
          <p className="text-[13px] font-extrabold text-muted-foreground">Sourate {item.surahName} ({item.surah}:{item.cur.k})</p>
          <h2 className="text-[22px] font-black mb-3">Quel est le verset suivant ?</h2>
          <div className="card-flat p-4 mb-5">
            <div className="flex items-start gap-3"><div className="flex-1"><VerseText v={item.cur} aid={lv.aid} size={28} /></div><Listen onPlay={() => playItem()} /></div>
            {lv.aid === "phon" && <p className="text-[13px] font-semibold text-muted-foreground mt-2">« {item.cur.f} »</p>}
          </div>
          <div className="space-y-3">{item.options.map((v) => (
            <Choice key={v.g} state={st(v.g)} onClick={() => pickV(v.g)} ar={lv.aid === "ar"}>
              <VerseText v={v} aid={lv.aid} size={24} />
              {lv.aid === "phon" && <span className="block text-[12.5px] font-semibold text-muted-foreground mt-0.5">« {v.f} »</span>}
            </Choice>
          ))}</div>
        </>);
      case "sourate":
        return (<>
          <h2 className="text-[22px] font-black mb-3">À quelle sourate appartient ce verset ?</h2>
          <div className="card-flat p-4 mb-5">
            {item.mode === "texte" && <span className={`${AR} block text-[28px] leading-[2]`} dir="rtl">{item.verse.a}</span>}
            {item.mode === "sens" && <p className="text-[17px] font-bold">« {item.verse.f} »</p>}
            {item.mode === "audio" && <p className="text-[15px] font-bold text-muted-foreground mb-1">Écoute l'extrait récité par Mishary Alafasy.</p>}
            {item.mode !== "texte" && <div className="mt-3"><Listen big label={item.mode === "audio" ? "Écouter l'extrait" : "Écouter le verset"} onPlay={() => playItem()} /></div>}
          </div>
          <div className="space-y-3">{item.options.map((o) => (
            <Choice key={o.n} state={st(o.n)} onClick={() => pickV(o.n)}>
              <span className="flex items-center justify-between gap-3 text-left"><span><span className="block text-[17px]">{o.label}</span><span className="block text-[12.5px] font-bold text-muted-foreground">{o.fr}</span></span>{lv.aid !== "phon" && <span className={`${AR} text-[24px] leading-[1.8] font-normal`} dir="rtl">{o.ar}</span>}</span>
            </Choice>
          ))}</div>
        </>);
      case "ordre": {
        const placed = order.map((t) => item.tiles[t]);
        return (<>
          <p className="text-[13px] font-extrabold text-muted-foreground">Sourate {item.surahName} ({item.surah})</p>
          <h2 className="text-[22px] font-black mb-1">Remets les versets dans l'ordre</h2>
          <p className="text-[13px] font-semibold text-muted-foreground mb-4">Touche les versets du premier au dernier. Touche un verset placé pour le retirer.</p>
          {lv.aid === "phon" && <div className="mb-4"><Listen big label="Écouter le premier verset" onPlay={() => playItem()} /></div>}
          <div className="space-y-2 mb-4">
            {item.seq.map((_, k) => {
              const v = placed[k];
              const ok = result && v && v.k === item.seq[k].k;
              return (
                <button key={k} onClick={() => { if (!result && v) { haptic(); setOrder(order.filter((_, j) => j !== k)); } }}
                  className={`w-full min-h-[56px] rounded-2xl border-2 px-3 py-2 flex items-center gap-3 text-left ${v ? (result ? (ok ? "border-primary bg-accent" : "border-destructive bg-destructive/10") : "border-primary bg-card") : "border-dashed border-border"}`}>
                  <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center font-black shrink-0">{k + 1}</span>
                  <span className="flex-1 min-w-0">{v ? <VerseText v={v} aid={lv.aid} size={22} /> : null}</span>
                </button>
              );
            })}
          </div>
          {!result && (
            <div className="space-y-2">{item.tiles.map((v, t) => order.includes(t) ? null : (
              <button key={t} onClick={() => { haptic(); setOrder([...order, t]); }} className="w-full min-h-[56px] rounded-2xl border-2 border-b-[5px] border-border bg-card px-3 py-2 text-left active:translate-y-[2px] active:border-b-2">
                <VerseText v={v} aid={lv.aid} size={22} />
              </button>
            ))}</div>
          )}
        </>);
      }
      case "hadith":
        return (<>
          <p className="text-[13px] font-extrabold text-muted-foreground">Hadith ou pas ? · Phrase {i + 1} / {items.length}</p>
          <h2 className="text-[20px] font-black mb-4 leading-snug">Cette phrase est-elle un hadith authentique du Prophète ﷺ ?</h2>
          <div className="card-flat p-5 text-center text-[18px] font-extrabold leading-relaxed">« {item.statement} »</div>
          <div className="grid grid-cols-2 gap-3 mt-5">{[[1, "Pas un hadith"], [0, "Hadith authentique"]].map(([k, l]) => (
            <Choice key={k} state={st(k)} onClick={() => pickV(k)}><span className="text-[15px] leading-tight">{l}</span></Choice>
          ))}</div>
        </>);
      case "ilm":
        return (<>
          <p className="text-[13px] font-extrabold text-muted-foreground">Al-Ilm · Question {i + 1} / {items.length}</p>
          <h2 className="text-[21px] font-black mb-5 leading-snug">{item.question}</h2>
          <div className="space-y-3">{item.choices.map((c, k) => (
            <Choice key={k} state={st(k)} onClick={() => pickV(k)}><span className="flex items-center gap-3 text-left text-[16px]"><span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center font-black shrink-0">{item.type === "vrai_faux" ? (k ? "F" : "V") : "ABCD"[k]}</span>{c}</span></Choice>
          ))}</div>
        </>);
      default: return null;
    }
  };

  const canCheck = item.kind === "ordre" ? order.length === item.seq.length : choice != null;

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      {header}
      {liveId ? <LiveBar ls={ls} now={now + offset.current} /> : defi ? (
      <div className="max-w-xl mx-auto w-full px-4 flex items-center justify-between text-[14px] font-extrabold text-muted-foreground">
        <span className="flex items-center gap-1.5"><CalendarCheck weight="fill" className="w-4 h-4 text-primary" />Défi du jour</span>
        <span>Question {i + 1} sur {items.length}</span>
      </div>) : (
      <div className="max-w-xl mx-auto w-full px-4 flex items-center justify-between text-[14px] font-extrabold">
        <span className="flex items-center gap-1.5"><User weight="fill" className="w-4 h-4 text-primary" />Toi {me}</span>
        {left != null && <span className={`flex items-center gap-1 ${left < 1.5 ? "text-destructive" : "text-muted-foreground"}`}><Timer weight="bold" className="w-4 h-4" />{left.toFixed(1)} s</span>}
        <span className="flex items-center gap-1.5 text-muted-foreground">{tkId ? <><UsersThree weight="fill" className="w-4 h-4" />{tkName}</> : <><Robot weight="fill" className="w-4 h-4" />Robot {ROBOT[robotN - 1].name.toLowerCase()} {bot}</>}{!tkId && botLast != null && <span className={botLast ? "text-primary" : "text-destructive"}>{botLast ? " ✓" : " ✗"}</span>}</span>
      </div>)}
      <div className="flex-1 max-w-xl mx-auto w-full px-4 pt-4 pb-72">{body()}</div>

      <div className={`fixed inset-x-0 bottom-0 z-40 border-t-2 transition-colors ${result === "ok" ? "bg-accent border-primary/30" : result === "ko" ? "bg-[#FDECEC] dark:bg-destructive/15 border-destructive/30" : "bg-background border-border"}`}
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}>
        <div className="max-w-xl mx-auto px-4 pt-4">
          {result && (
            <div className="mb-4 max-h-[42vh] overflow-y-auto">
              <div className={`flex items-center gap-2 mb-1.5 ${result === "ok" ? "text-primary" : "text-destructive"}`}>
                {result === "ok" ? <CheckCircle weight="fill" className="w-7 h-7" /> : <XCircle weight="fill" className="w-7 h-7" />}
                <p className="text-[19px] font-black">{result === "ok" ? "Bonne réponse !" : answers.current[answers.current.length - 1]?.timeout ? "Temps écoulé" : "Pas tout à fait"}</p>
              </div>
              <Correction item={item} lv={lv} ok={result === "ok"} />
              {liveId && (
                <p className="mt-2.5 rounded-xl bg-gold-tint text-[13px] font-extrabold px-3 py-2 flex items-center gap-2"><Sword weight="fill" className="w-4 h-4 text-gold shrink-0" />
                  {rival} {!ls?.their_answer ? "n'a pas répondu à temps" : ls.their_answer.ok ? (result === "ok" ? "a aussi trouvé" : "a trouvé") : "s'est trompé"}{ls?.their_answer?.ms ? `, en ${Math.max(1, Math.round(ls.their_answer.ms / 1000))} s` : ""}</p>
              )}
            </div>
          )}
          {liveId ? (result
            ? <p className="h-[52px] flex items-center justify-center font-extrabold text-muted-foreground">{ls?.q + 1 >= ls?.total ? "Résultat dans" : "Question suivante dans"} {Math.max(1, Math.ceil((Date.parse(ls?.q_closed_at) + 4000 - (now + offset.current)) / 1000))} s</p>
            : submitted ? <p className="h-[52px] flex items-center justify-center gap-2 font-extrabold text-muted-foreground"><Hourglass weight="bold" className="w-5 h-5" />{ls?.their_answered ? "Correction…" : `En attente de ${rival}…`}</p>
            : <button onClick={() => grade()} disabled={!canCheck} className="btn-relief w-full h-[52px] bg-primary text-primary-foreground disabled:opacity-50">Valider</button>)
          : result
            ? <button onClick={next} className={`btn-relief w-full h-[52px] ${result === "ok" ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"}`} style={result === "ko" ? { boxShadow: "0 4px 0 #B42020" } : undefined}>{i + 1 >= items.length ? "Voir le bilan" : "Continuer"}</button>
            : <button onClick={() => grade()} disabled={!canCheck} className="btn-relief w-full h-[52px] bg-primary text-primary-foreground disabled:opacity-50">Vérifier</button>}
        </div>
      </div>
      {liveId && ls?.status === "playing" && Date.parse(ls.q_started_at) > now + offset.current && ls.q === 0 && (
        <div className="fixed inset-0 z-50 bg-background/95 flex flex-col items-center justify-center">
          <p className="font-extrabold text-muted-foreground">Le duel commence</p>
          <p className="text-[96px] font-black text-primary leading-none mt-2">{Math.max(1, Math.ceil((Date.parse(ls.q_started_at) - (now + offset.current)) / 1000))}</p>
        </div>
      )}
      {quitAsk && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl border-2 border-border p-5 w-full max-w-sm text-center">
            <span className="w-16 h-16 mx-auto rounded-full bg-destructive/10 text-destructive flex items-center justify-center"><SignOut weight="fill" className="w-8 h-8" /></span>
            <p className="text-[20px] font-black mt-3">{defi ? "Quitter le défi ?" : "Quitter le duel ?"}</p>
            {defi ? <p className="font-semibold text-muted-foreground mt-1">Il n'y a qu'un essai par jour : tes réponses données jusqu'ici seront comptées.</p>
              : <p className="font-semibold text-muted-foreground mt-1">Abandonner te retire <b className="text-destructive">{settings?.duel?.quit ?? 20} points</b> et donne la victoire à {rival}.</p>}
            <div className="grid gap-2.5 mt-4">
              <button onClick={() => setQuitAsk(false)} className="btn-relief h-[52px] bg-primary text-primary-foreground">Continuer à jouer</button>
              <button onClick={async () => { setQuitAsk(false); if (defi) return submitDefi(); try { await ldQuit(liveId); } catch { /* le serveur clôt de toute façon */ } navigate(ls?.tournament ? `/Tournoi?id=${ls.tournament}` : `/Duel?id=${liveId}`, { replace: true }); }} className="h-[52px] rounded-2xl border-2 border-b-[5px] border-border bg-card font-extrabold text-destructive">{defi ? "Quitter et valider" : ls?.tournament ? "Quitter (tu es éliminé)" : `Quitter (−${settings?.duel?.quit ?? 20})`}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Barre du duel en direct : les deux joueurs, leurs scores, le chrono de la question. */
function LiveBar({ ls, now }) {
  if (!ls) return null;
  const leftS = ls.q_closed_at ? 0 : Math.max(0, (Date.parse(ls.q_started_at) + ls.secs * 1000 - now) / 1000);
  const P = ({ p, score, right }) => (
    <span className={`flex items-center gap-2 min-w-0 ${right ? "flex-row-reverse text-right" : ""}`}>
      <PlayerPic p={p} size={38} />
      <span className="min-w-0"><span className="block text-[13px] font-extrabold truncate max-w-[96px]">{right ? `@${p?.username || "?"}` : "Toi"}</span><span className={`block text-[20px] font-black leading-none ${right ? "" : "text-primary"}`}>{score}</span></span>
    </span>
  );
  return (
    <div className="max-w-xl mx-auto w-full px-4 flex items-center justify-between">
      <P p={ls.me} score={ls.my_score} />
      <span className={`w-[52px] h-[52px] rounded-full border-[5px] flex items-center justify-center font-black text-[18px] ${ls.q_closed_at ? "border-border text-muted-foreground" : leftS < 4 ? "border-destructive text-destructive" : "border-primary"}`}>{ls.q_closed_at ? "·" : Math.ceil(leftS)}</span>
      <P p={ls.them} score={ls.their_score} right />
    </div>
  );
}

export function PlayerPic({ p, size = 42, ring }) {
  const name = p?.username || p?.name || "?";
  const ini = name.replace(/^@/, "").split(/[._\s-]+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase() || "?";
  const style = { width: size, height: size, fontSize: size * 0.36 };
  const cls = `rounded-full shrink-0 ${ring ? "ring-[5px] ring-gold ring-offset-2 ring-offset-background" : ""}`;
  return p?.image ? <img src={p.image} alt="" referrerPolicy="no-referrer" className={`${cls} object-cover`} style={style} />
    : <span className={`${cls} bg-accent text-accent-foreground flex items-center justify-center font-black`} style={style}>{ini}</span>;
}

/** Bonne réponse + explication, affichée après chaque réponse (et dans le bilan). */
function Correction({ item, lv, ok, compact }) {
  const muted = "text-[13.5px] font-semibold text-foreground/80";
  switch (item.kind) {
    case "letter-see":
    case "letter-hear": {
      const l = L[item.answer];
      return (<div className={muted}>
        <p className="flex items-baseline gap-2 font-extrabold text-[15px] text-foreground"><span className={`${AR} text-[28px] font-normal`}>{l.ar}</span><span>{l.name} · son « {l.sound} »</span></p>
        <p>{l.hint}</p>
      </div>);
    }
    case "syl":
      return (<div className={muted}><p className="flex items-baseline gap-2 font-extrabold text-[15px] text-foreground"><span className={`${AR} text-[28px] font-normal`}>{item.ar}</span><span>se lit « {item.answer} »</span></p><p>La lettre {L[item.letter].name} avec sa voyelle : trait au-dessus = a, trait en dessous = i, petit wâw = ou.</p></div>);
    case "suite":
      return (<div className={muted}>
        {!ok && !compact && <p className="mb-1">La bonne suite :</p>}
        {compact && <p className="font-extrabold text-foreground">Après {item.surahName} {item.surah}:{item.cur.k}</p>}
        <VerseText v={item.next} aid={lv.aid === "phon" ? "both" : lv.aid} size={22} />
        <p className="mt-1">« {item.next.f} » · Sourate {item.surahName} ({item.surah}:{item.next.k})</p>
      </div>);
    case "sourate":
      return (<div className={muted}>
        <p className="font-extrabold text-foreground">Sourate {item.options.find((o) => o.n === item.answer)?.label} · {surahFr(item.answer)}</p>
        <p>Verset {item.verse.k} : « {item.verse.f} »</p>
      </div>);
    case "ordre":
      return (<div className={muted}>
        {!ok && !compact && <p className="mb-1">Le bon ordre :</p>}
        {compact && <p className="font-extrabold text-foreground">Sourate {item.surahName} ({item.surah})</p>}
        <ol className="space-y-1">{item.seq.map((v) => <li key={v.k} className="flex gap-2"><span className="font-black text-foreground shrink-0">{v.k}.</span><span className="min-w-0"><VerseText v={v} aid={lv.aid === "phon" ? "both" : lv.aid} size={19} /></span></li>)}</ol>
      </div>);
    case "hadith":
      return (<div className={muted}>
        {compact && <p className="font-extrabold text-foreground">« {item.statement} »</p>}
        <p className="font-extrabold text-foreground">{item.answer === 0 ? "Hadith authentique" : "Ce n'est pas un hadith"}</p>
        {item.explanation && <p className="mt-0.5">{item.explanation}</p>}
        {item.source && <p className="mt-0.5 text-[12px] font-bold text-muted-foreground">Source : {item.source}</p>}
      </div>);
    case "ilm":
      return (<div className={muted}>
        {compact && <p className="font-extrabold text-foreground">{item.question}</p>}
        <p className="font-extrabold text-foreground">Réponse : {item.choices[item.answer]}</p>
        {item.explanation && <p className="mt-0.5">{item.explanation}</p>}
        {item.source && <p className="mt-0.5 text-[12px] font-bold text-muted-foreground">Source : {item.source}</p>}
        {item.note && <p className="mt-0.5 text-[12px] font-bold text-muted-foreground">{item.note}</p>}
      </div>);
    default: return null;
  }
}

/** Fin d'une partie de khatma d'équipe : sourate validée (ou pas encore), progression de l'équipe. */
function TkEnd({ end, tk, name, quran, mistakes, lv, navigate, replay, retry }) {
  const v = end.tk;
  const pct = Math.round((end.score / end.total) * 100);
  const nextName = v?.next ? tkUnitName(tk?.scope, v.next, quran) : null;
  const unitWord = tk?.scope === "ilm" ? "thème" : "sourate";
  const title = end.offline ? "Partie non envoyée" : v?.finished ? "Khatma terminée" : v?.validated ? `${name} validée` : v?.already ? `${name} déjà validée` : v?.status && v.status !== "active" ? "Khatma close" : "Pas encore validée";
  const sub = end.offline ? "Pas de connexion. Reste sur cette page et réessaie."
    : v?.finished ? `Toute l'équipe gagne +${v.bonus} points. Qu'Allah l'accepte de vous.`
    : v?.validated ? `${end.score} / ${end.total} bonnes réponses · ${pct} %. Ta part fait avancer l'équipe.`
    : v?.already ? `${end.score} / ${end.total} · cette ${unitWord} était déjà validée par l'équipe. Bon entraînement.`
    : v?.status && v.status !== "active" ? `${end.score} / ${end.total} · cette khatma n'accepte plus de parties.`
    : `${end.score} / ${end.total} · ${pct} %. Il faut ${v?.pct ?? 80} % pour valider. Revois les corrections et retente.`;
  const good = v?.validated || v?.finished;
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}>
      <div className="flex-1 max-w-md mx-auto w-full px-6 pt-10 text-center">
        <div className={`w-24 h-24 mx-auto rounded-3xl flex items-center justify-center ${v?.finished ? "bg-gold-tint text-gold" : good ? "bg-primary text-primary-foreground shadow-[0_5px_0_var(--primary-lip)]" : "bg-muted text-muted-foreground"}`}>
          {v?.finished ? <Medal weight="fill" className="w-12 h-12" /> : good ? <CheckFat weight="fill" className="w-12 h-12" /> : <ArrowCounterClockwise weight="bold" className="w-11 h-11" />}
        </div>
        <h1 className="text-[28px] font-black mt-6">{title}</h1>
        <p className="font-semibold text-muted-foreground mt-1">{sub}</p>
        {v && (
          <div className="card-flat p-4 mt-6 text-left">
            <div className="flex items-center gap-3"><div className="flex-1 h-3 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${(v.done / v.total) * 100}%` }} /></div><b>{v.done} / {v.total}</b></div>
            <p className="text-[13px] font-semibold text-muted-foreground mt-2">{v.finished || v.done >= v.total ? `${tk?.group?.name || "L'équipe"} a tout validé.` : `Encore ${v.total - v.done} ${unitWord}${v.total - v.done > 1 ? "s" : ""} pour ${tk?.group?.name || "l'équipe"}.`}</p>
          </div>
        )}
        {end.offline && <button onClick={retry} className="btn-relief h-[52px] w-full mt-4 bg-primary text-primary-foreground">Réessayer l'envoi</button>}
        {mistakes.length > 0 && (
          <div className="text-left mt-6">
            <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mb-2">À retenir</p>
            <div className="space-y-2.5">{mistakes.map((it, k) => <div key={k} className="card-flat p-3.5"><Correction item={it} lv={lv} compact /></div>)}</div>
          </div>
        )}
      </div>
      <div className="px-4 max-w-md mx-auto w-full space-y-3 mt-6">
        {!end.offline && !good && !v?.already && v?.status === "active" && <button onClick={replay} className="btn-relief h-[52px] w-full bg-primary text-primary-foreground">Retenter {name}</button>}
        {!end.offline && v?.status === "active" && nextName && (good || v?.already) && <button onClick={() => navigate(`/Partie?tk=${tk.id}&u=${v.next}`, { replace: true })} className="btn-relief h-[52px] w-full bg-primary text-primary-foreground">{unitWord === "thème" ? "Thème suivant" : "Sourate suivante"} : {nextName}</button>}
        <button onClick={() => navigate(`/Equipe?id=${tk?.id}`, { replace: true })} className="h-[52px] w-full rounded-2xl border-2 border-b-[5px] border-border bg-card font-extrabold">Retour à la khatma</button>
      </div>
    </div>
  );
}
