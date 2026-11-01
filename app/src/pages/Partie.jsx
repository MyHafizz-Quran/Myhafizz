import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, SpeakerHigh, CheckCircle, XCircle, Robot, User, Sword, Lightning, Target, Fire, LockOpen, ArrowCounterClockwise, Timer, UsersThree, Medal, CheckFat } from "@phosphor-icons/react";
import { GAMES, ROBOT, AUDIO, L, buildGame, loadSettings, finishGame, robotAnswers, surahFr, duelGet, duelSubmit, tkGet, tkValidate, tkLevel, tkUnitName, buildSurahGame, loadQuran, TK_ILM } from "@/lib/games";
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

function Choice({ state, onClick, children, ar }) {
  const cls = state === "selected" ? "border-primary bg-accent text-accent-foreground"
    : state === "correct" ? "border-primary bg-accent text-primary"
    : state === "wrong" ? "border-destructive bg-destructive/10 text-destructive"
    : "border-border bg-card text-foreground";
  return (
    <button onClick={onClick} dir={ar ? "rtl" : undefined}
      className={`w-full min-h-[60px] rounded-2xl border-2 border-b-[5px] px-3 py-2.5 font-extrabold transition-colors active:translate-y-[2px] active:border-b-2 ${cls}`}>
      {children}
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
  const duelId = params.get("duel");
  const { data: duel, error: duelError } = useQuery({ queryKey: ["duel-play", duelId], queryFn: () => duelGet(duelId), enabled: !!duelId, staleTime: Infinity, gcTime: 0 });
  if (duel) { params.set("g", duel.game); params.set("l", String(duel.level)); params.set("c", duel.category || "mix"); }
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
  const lv = G.levels.find((l) => l.n === levelN);
  const robotN = Math.max(1, Math.min(3, Number(params.get("r")) || 2));
  const category = params.get("c") || "mix";
  const voice = hasArabicVoice();

  const { data: settings } = useQuery({ queryKey: ["game-settings"], queryFn: loadSettings, staleTime: 60_000 });
  const count = game === "ilm" ? settings?.rules?.ilm_questions ?? 10 : settings?.rules?.questions ?? 5;
  const [seed, setSeed] = useState(0);
  const { data: built, isLoading: building, error: buildError } = useQuery({
    queryKey: ["game-items", game, levelN, category, seed, count, tkId, tkUnit],
    queryFn: () => (tkId && tk.scope !== "ilm" ? buildSurahGame(tkUnit, levelN, count) : buildGame(game, levelN, { count, category })),
    enabled: !!settings && !duelId && (!tkId || (!!tk && (tk.scope === "ilm" || !!tkProfile))), staleTime: Infinity, gcTime: 0,
  });
  const items = duelId ? duel?.items : built;
  const isLoading = duelId ? !duel && !duelError : tkId ? (!tk && !tkError) || building : building;
  const error = duelId ? duelError : tkError || buildError;
  const tkName = tk ? tkUnitName(tk.scope, tkUnit, tkQuran) : "";
  const exitTo = tkId ? `/Equipe?id=${tkId}` : "/Jouer";
  const them = duel?.them?.answers || null;
  const rival = duel?.other?.username ? `@${duel.other.username}` : "Ton adversaire";
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
  // duel déjà joué : direction le résultat
  useEffect(() => { if (duel?.me || (duel && duel.status !== "pending")) navigate(`/Duel?id=${duel.id}`, { replace: true }); }, [duel]);

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
    const ok = forced === undefined ? isCorrect() : forced;
    const t = duelId ? them?.[i] : null;
    const botOk = duelId ? !!t?.ok : robotAnswers(rate);
    answers.current.push({ id: item.id || `${game}-${i}`, ok, timeout: !!timeout, ms: Date.now() - shownAt.current });
    if (ok) setMe((x) => x + 1);
    if (botOk) setBot((x) => x + 1);
    setBotLast(duelId && !t ? null : botOk);
    setResult(ok ? "ok" : "ko"); chime(ok); haptic(ok ? 8 : 30);
    if (!ok && (item.kind === "letter-see" || item.kind === "letter-hear")) setTimeout(() => speak(L[item.answer].nameAr), 300);
    if (item.kind === "suite") setTimeout(() => playUrl(AUDIO(item.next.g)), 300);
  };

  const next = async () => {
    haptic(); stopAudio();
    if (i + 1 >= items.length) {
      const score = answers.current.filter((a) => a.ok).length;
      setEnd({ score, total: items.length, bot, saving: true });
      if (duelId) {
        try {
          await duelSubmit(duelId, answers.current.map(({ ok, ms }) => ({ ok, ms })));
          await finishGame(game, levelN, answers.current.map(({ id, ok }) => ({ id, ok }))).catch(() => {});
          ["game-progress", "game-stats", "duels"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
          navigate(`/Duel?id=${duelId}`, { replace: true });
        } catch { setEnd({ score, total: items.length, bot, offline: true, duel: true }); }
        return;
      }
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
  if (end && tkId) return <TkEnd end={end} tk={tk} name={tkName} quran={tkQuran} mistakes={mistakes} lv={lv} navigate={navigate} replay={replay} retry={() => { setI(items.length - 1); next(); }} />;

  // ── Fin de partie ──
  if (end) {
    const won = end.score > end.bot, draw = end.score === end.bot;
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}>
        <div className="flex-1 max-w-md mx-auto w-full px-6 pt-10 text-center">
          <div className="w-24 h-24 mx-auto rounded-3xl bg-primary text-primary-foreground flex items-center justify-center shadow-[0_5px_0_var(--primary-lip)]"><CheckCircle weight="fill" className="w-12 h-12" /></div>
          <h1 className="text-[28px] font-black mt-6">{duelId ? (end.saving ? "Envoi du duel…" : "Duel non envoyé") : won ? "Victoire !" : draw ? "Égalité" : "Partie terminée"}</h1>
          <p className="font-semibold text-muted-foreground mt-1">{duelId ? `${end.score} / ${end.total} bonnes réponses` : `Toi ${end.score} · Robot ${end.bot} · ${end.score} / ${end.total} bonnes réponses`}</p>
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
      <button onClick={() => navigate(exitTo)} aria-label="Quitter la partie" className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-muted-foreground press"><X weight="bold" className="w-6 h-6" /></button>
      <div className="flex-1 h-4 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${items ? (i / items.length) * 100 : 0}%` }} /></div>
    </div>
  );

  if (isLoading || !settings || error || !items?.length) {
    return (
      <div className="min-h-[100dvh] bg-background" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        {header}
        <p className="text-center font-bold text-muted-foreground mt-24">{error || (items && !items.length) ? "Impossible de préparer la partie. Vérifie ta connexion." : "Préparation de la partie…"}</p>
      </div>
    );
  }

  const st = (val) => (result ? (val === item.answer ? "correct" : val === choice ? "wrong" : null) : choice === val ? "selected" : null);
  const pickV = (val) => { if (result) return; haptic(); setChoice(val); };

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
      <div className="max-w-xl mx-auto w-full px-4 flex items-center justify-between text-[14px] font-extrabold">
        <span className="flex items-center gap-1.5"><User weight="fill" className="w-4 h-4 text-primary" />Toi {me}</span>
        {left != null && <span className={`flex items-center gap-1 ${left < 1.5 ? "text-destructive" : "text-muted-foreground"}`}><Timer weight="bold" className="w-4 h-4" />{left.toFixed(1)} s</span>}
        <span className="flex items-center gap-1.5 text-muted-foreground">{tkId ? <><UsersThree weight="fill" className="w-4 h-4" />{tkName}</> : duelId ? <><Sword weight="fill" className="w-4 h-4" />{rival} {them ? bot : "·"}</> : <><Robot weight="fill" className="w-4 h-4" />Robot {ROBOT[robotN - 1].name.toLowerCase()} {bot}</>}{!tkId && botLast != null && <span className={botLast ? "text-primary" : "text-destructive"}>{botLast ? " ✓" : " ✗"}</span>}</span>
      </div>
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
              {duelId && them?.[i] && (
                <p className="mt-2.5 rounded-xl bg-gold-tint text-[13px] font-extrabold px-3 py-2 flex items-center gap-2"><Sword weight="fill" className="w-4 h-4 text-gold shrink-0" />
                  {rival} {them[i].ok ? "a aussi trouvé" : "s'est trompé"}{them[i].ms ? `, en ${Math.max(1, Math.round(them[i].ms / 1000))} s` : ""}</p>
              )}
            </div>
          )}
          {result
            ? <button onClick={next} className={`btn-relief w-full h-[52px] ${result === "ok" ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"}`} style={result === "ko" ? { boxShadow: "0 4px 0 #B42020" } : undefined}>{i + 1 >= items.length ? "Voir le bilan" : "Continuer"}</button>
            : <button onClick={() => grade()} disabled={!canCheck} className="btn-relief w-full h-[52px] bg-primary text-primary-foreground disabled:opacity-50">Vérifier</button>}
        </div>
      </div>
    </div>
  );
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
