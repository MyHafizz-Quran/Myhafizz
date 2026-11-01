import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, ArrowLeft, Sword, MagnifyingGlass, Shuffle, ShareNetwork, CheckCircle, Lock, Lightning, Trophy, ArrowsClockwise, Hourglass, TextAa, BookOpenText, Headphones, ListNumbers, Lightbulb, Copy } from "@phosphor-icons/react";
import { Profile } from "@/api/entities";
import { GAMES, GAME_ORDER, ILM_CATEGORIES, L, loadSettings, loadProgress, unlockedLevel, duelSearch, duelCreate, duelGet, duelJoin, duelDecline, duelList, duelState } from "@/lib/games";
import { haptic } from "@/hooks/usePlatform";

const ICONS = { lettres: TextAa, suite: BookOpenText, sourate: Headphones, ordre: ListNumbers, ilm: Lightbulb };
const initials = (u) => String(u || "?").replace(/^@/, "").split(/[._\s-]+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase() || "?";
const left = (iso) => { const h = Math.max(0, Math.round((Date.parse(iso) - Date.now()) / 36e5)); return h >= 1 ? `${h} h` : "moins d'1 h"; };
const label = (d) => `${GAMES[d.game]?.title} · Niveau ${d.level}`;

function Avatar({ name, gold, size = 42 }) {
  return <span className={`rounded-full flex items-center justify-center font-black shrink-0 ${gold ? "bg-gold-tint text-[#8A6100]" : "bg-accent text-accent-foreground"}`} style={{ width: size, height: size, fontSize: size * 0.34 }}>{name === "Toi" ? "Toi" : initials(name)}</span>;
}
const Section = ({ children }) => <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mt-5 mb-2">{children}</p>;
const Screen = ({ children, footer }) => (
  <div className="min-h-[100dvh] bg-background" style={{ paddingTop: "env(safe-area-inset-top)" }}>
    <div className={`max-w-xl mx-auto px-4 ${footer ? "pb-40" : "pb-10"}`}>{children}</div>
    {footer && <div className="fixed inset-x-0 bottom-0 bg-background border-t-2 border-border" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}><div className="max-w-xl mx-auto px-4 pt-4 space-y-3">{footer}</div></div>}
  </div>
);
const Head = ({ title, onBack, close }) => (
  <div className="h-14 flex items-center gap-2">
    <button onClick={onBack} aria-label="Retour" className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-muted-foreground press">{close ? <X weight="bold" className="w-6 h-6" /> : <ArrowLeft weight="bold" className="w-6 h-6" />}</button>
    <h1 className="text-[20px] font-black truncate">{title}</h1>
  </div>
);
const Btn = ({ children, secondary, ...p }) => (
  <button {...p} className={`w-full h-[52px] flex items-center justify-center gap-2 disabled:opacity-50 ${secondary ? "rounded-2xl border-2 border-b-[5px] border-border bg-card font-extrabold" : "btn-relief bg-primary text-primary-foreground"}`}>{children}</button>
);

/** Onglet « Duels » de l'écran Jouer. */
export function DuelsTab() {
  const navigate = useNavigate();
  const { data: duels, isLoading, error } = useQuery({ queryKey: ["duels"], queryFn: duelList, refetchInterval: 30_000 });
  const list = duels || [];
  const groups = [
    ["À toi de jouer", list.filter((d) => duelState(d) === "play")],
    ["En attente", list.filter((d) => duelState(d) === "waiting")],
    ["Terminés", list.filter((d) => ["done", "expired", "declined"].includes(duelState(d))).slice(0, 15)],
  ];
  return (
    <div className="mt-4">
      <Btn onClick={() => { haptic(); navigate("/Duel?new=1"); }}><Sword weight="bold" className="w-5 h-5" />Lancer un duel</Btn>
      <p className="text-[13px] font-semibold text-muted-foreground mt-3">Défie un autre joueur sur les mêmes questions. Chacun joue quand il veut, avant l'expiration du défi.</p>
      {isLoading && <p className="text-center font-bold text-muted-foreground mt-10">Chargement…</p>}
      {error && <p className="text-center font-bold text-muted-foreground mt-10">Impossible de charger tes duels. Vérifie ta connexion.</p>}
      {!isLoading && !error && !list.length && <p className="text-center font-bold text-muted-foreground mt-10">Aucun duel pour l'instant.</p>}
      {groups.map(([title, rows]) => rows.length > 0 && (
        <div key={title}>
          <Section>{title}</Section>
          <div className="space-y-2.5">{rows.map((d) => <DuelRow key={d.id} d={d} onClick={() => { haptic(); navigate(`/Duel?id=${d.id}`); }} />)}</div>
        </div>
      ))}
    </div>
  );
}

function DuelRow({ d, onClick }) {
  const s = duelState(d), who = d.other?.username ? `@${d.other.username}` : "Lien d'invitation";
  const sub = s === "play" ? (d.them ? `${label(d)} · a fait ${d.them.score}/${d.total}` : `Te défie · ${label(d)} · expire dans ${left(d.expires_at)}`)
    : s === "waiting" ? `${label(d)} · tu as fait ${d.me.score}/${d.total} · encore ${left(d.expires_at)}`
    : s === "done" ? `${GAMES[d.game]?.title} · ${d.me.score} à ${d.them.score}`
    : s === "declined" ? `${GAMES[d.game]?.title} · refusé` : `${GAMES[d.game]?.title} · expiré`;
  const tag = s === "play" ? null : s === "waiting" ? ["En attente", "bg-muted text-muted-foreground"]
    : s === "done" ? (d.won ? ["Gagné", "bg-accent text-accent-foreground"] : d.draw ? ["Égalité", "bg-muted text-muted-foreground"] : ["Perdu", "bg-muted text-muted-foreground"])
    : [s === "declined" ? "Refusé" : "Expiré", "bg-muted text-muted-foreground"];
  return (
    <button onClick={onClick} className="w-full text-left card-flat p-3.5 flex items-center gap-3 press">
      <Avatar name={d.other?.username || "?"} gold={d.role === "challenger"} />
      <span className="flex-1 min-w-0"><span className="block font-extrabold truncate">{who}</span><span className="block text-[13px] font-semibold text-muted-foreground truncate">{sub}</span></span>
      {tag ? <span className={`h-6 px-2 rounded-lg text-xs font-extrabold flex items-center ${tag[1]}`}>{tag[0]}</span>
        : <span className="btn-relief h-9 px-3.5 bg-primary text-primary-foreground text-[13px] flex items-center">Jouer</span>}
    </button>
  );
}

export default function Duel() {
  const p = new URLSearchParams(window.location.search);
  if (p.get("code")) return <JoinDuel code={p.get("code")} />;
  if (p.get("id")) return <DuelDetail id={p.get("id")} />;
  return <NewDuel rematch={p.get("vs")} rematchGame={p.get("g")} rematchLevel={Number(p.get("l")) || null} />;
}

/* ── Nouveau duel : adversaire, puis jeu et niveau ── */
function NewDuel({ rematch, rematchGame, rematchLevel }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => Profile.get() });
  const { data: settings } = useQuery({ queryKey: ["game-settings"], queryFn: loadSettings, staleTime: 60_000 });
  const { data: progress = {} } = useQuery({ queryKey: ["game-progress"], queryFn: loadProgress });
  const [step, setStep] = useState(rematch ? 2 : 1);
  const [q, setQ] = useState(rematch || "");
  const [target, setTarget] = useState(rematch ? { mode: "user", username: rematch } : null);
  const [game, setGame] = useState(rematchGame || "suite");
  const [level, setLevel] = useState(rematchLevel || 1);
  const [cat, setCat] = useState("mix");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [shared, setShared] = useState(null);

  const term = q.trim().replace(/^@/, "").toLowerCase();
  const { data: found = [], isFetching } = useQuery({ queryKey: ["duel-search", term], queryFn: () => duelSearch(term), enabled: term.length >= 2, staleTime: 30_000 });
  // rematch : retrouver les niveaux de l'adversaire
  useEffect(() => { if (rematch && found.length && !target?.levels) { const u = found.find((x) => x.username === rematch.replace(/^@/, "")); if (u) setTarget({ mode: "user", ...u }); } }, [found]);

  const enabled = GAME_ORDER.filter((g) => settings?.games?.[g] !== false);
  const mine = (g) => unlockedLevel(g, progress, profile);
  const maxLevel = (g) => Math.min(mine(g), target?.levels?.[g] ?? mine(g));
  useEffect(() => { setLevel((l) => Math.max(1, Math.min(rematchLevel && game === rematchGame ? rematchLevel : l, maxLevel(game)))); }, [game, target, progress, profile]);

  const send = async () => {
    setBusy(true); setErr(""); haptic();
    try {
      const count = game === "ilm" ? settings?.rules?.ilm_questions ?? 10 : settings?.rules?.questions ?? 5;
      const r = await duelCreate({ game, level, category: cat, mode: target.mode, username: target.username, count });
      qc.invalidateQueries({ queryKey: ["duels"] });
      if (target.mode === "link") { setShared({ id: r.id, url: `${window.location.origin}/Duel?code=${r.code}` }); return; }
      navigate(`/Partie?duel=${r.id}`, { replace: true });
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  if (shared) {
    const text = `Je te défie sur MyHafizz (${GAMES[game].title}, niveau ${level}). Relève le défi : ${shared.url}`;
    const share = async () => { haptic(); try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(shared.url); setErr("Lien copié."); } } catch { /* annulé */ } };
    return (
      <Screen footer={<><Btn onClick={share}><ShareNetwork weight="bold" className="w-5 h-5" />Partager le lien</Btn><Btn secondary onClick={() => navigate(`/Partie?duel=${shared.id}`, { replace: true })}>Jouer ma partie maintenant</Btn></>}>
        <Head title="Invitation prête" close onBack={() => navigate("/Jouer?tab=duels", { replace: true })} />
        <div className="card-flat p-4 mt-4">
          <p className="font-extrabold">Envoie ce lien à un ami</p>
          <p className="text-[13px] font-semibold text-muted-foreground mt-1">Il jouera les mêmes questions que toi après s'être connecté. Le lien expire dans {settings?.duel?.hours ?? 24} h.</p>
          <button onClick={async () => { try { await navigator.clipboard.writeText(shared.url); setErr("Lien copié."); } catch { /* */ } }} className="mt-3 w-full h-12 rounded-xl bg-muted px-3 flex items-center gap-2 font-bold text-[13px] text-left"><Copy weight="bold" className="w-5 h-5 shrink-0" /><span className="truncate">{shared.url}</span></button>
          {err && <p className="text-[13px] font-bold text-primary mt-2">{err}</p>}
        </div>
      </Screen>
    );
  }

  if (step === 1) {
    return (
      <Screen footer={<><Btn disabled={!target} onClick={() => { haptic(); setStep(2); }}>Continuer</Btn></>}>
        <Head title="Nouveau duel" close onBack={() => navigate("/Jouer?tab=duels")} />
        <Section>Contre qui ?</Section>
        <label className="h-12 rounded-2xl border-2 border-border bg-muted flex items-center gap-2 px-3">
          <MagnifyingGlass weight="bold" className="w-5 h-5 text-muted-foreground" />
          <input value={q} onChange={(e) => { setQ(e.target.value); if (target?.mode === "user") setTarget(null); }} placeholder="Nom d'utilisateur" autoCapitalize="none" autoCorrect="off"
            className="flex-1 bg-transparent outline-none font-extrabold text-[16px] placeholder:text-muted-foreground placeholder:font-semibold" />
        </label>
        <div className="space-y-2.5 mt-3">
          {term.length >= 2 && !isFetching && !found.length && <p className="text-[13px] font-bold text-muted-foreground px-1">Aucun joueur avec ce nom d'utilisateur.</p>}
          {found.map((u) => {
            const on = target?.mode === "user" && target.username === u.username;
            return (
              <button key={u.username} onClick={() => { haptic(); setTarget({ mode: "user", ...u }); }} className={`w-full text-left rounded-2xl border-2 border-b-[5px] px-3 py-2.5 flex items-center gap-3 ${on ? "border-primary bg-accent" : "border-border bg-card"}`}>
                <Avatar name={u.username} gold={!!u.relation} />
                <span className="flex-1 min-w-0"><span className="block font-extrabold truncate">@{u.username}</span>{(u.full_name || u.relation) && <span className="block text-[13px] font-semibold text-muted-foreground truncate">{[u.full_name, u.relation].filter(Boolean).join(" · ")}</span>}</span>
                {on && <CheckCircle weight="fill" className="w-6 h-6 text-primary" />}
              </button>
            );
          })}
        </div>
        <div className="space-y-2.5 mt-4">
          {[["random", Shuffle, "Adversaire au hasard", "Un joueur actif de MyHafizz"], ["link", ShareNetwork, "Inviter par lien", "WhatsApp, SMS… il joue après connexion"]].map(([mode, Icon, t, s]) => (
            <button key={mode} onClick={() => { haptic(); setTarget({ mode }); setQ(""); }} className={`w-full text-left rounded-2xl border-2 border-b-[5px] px-3 py-3 flex items-center gap-3 ${target?.mode === mode ? "border-primary bg-accent" : "border-border bg-card"}`}>
              <Icon weight="bold" className="w-6 h-6 text-primary shrink-0" /><span className="flex-1"><span className="block font-extrabold">{t}</span><span className="block text-[13px] font-semibold text-muted-foreground">{s}</span></span>
              {target?.mode === mode && <CheckCircle weight="fill" className="w-6 h-6 text-primary" />}
            </button>
          ))}
        </div>
      </Screen>
    );
  }

  const who = target?.mode === "user" ? `@${target.username}` : target?.mode === "random" ? "un joueur au hasard" : "un ami";
  const G = GAMES[game], max = maxLevel(game);
  const count = game === "ilm" ? settings?.rules?.ilm_questions ?? 10 : settings?.rules?.questions ?? 5;
  return (
    <Screen footer={<>
      {err && <p className="text-[13px] font-bold text-destructive text-center">{err}</p>}
      <p className="text-[13px] font-bold text-muted-foreground text-center">{count} questions · le duel expire dans {settings?.duel?.hours ?? 24} h</p>
      <Btn disabled={busy || !settings} onClick={send}><Sword weight="bold" className="w-5 h-5" />{busy ? "Préparation…" : "Envoyer le défi"}</Btn>
    </>}>
      <Head title={`Duel contre ${who}`} onBack={() => (rematch ? navigate(-1) : setStep(1))} />
      <Section>Jeu</Section>
      <div className="space-y-2.5">{enabled.map((g) => {
        const Icon = ICONS[g], on = game === g;
        return (
          <button key={g} onClick={() => { haptic(); setGame(g); }} className={`w-full text-left rounded-2xl border-2 border-b-[5px] px-3 py-3 flex items-center gap-3 font-extrabold ${on ? "border-primary bg-accent text-accent-foreground" : "border-border bg-card"}`}>
            <Icon weight={on ? "fill" : "bold"} className="w-6 h-6 text-primary shrink-0" /><span className="flex-1">{GAMES[g].title}</span>{on && <CheckCircle weight="fill" className="w-6 h-6 text-primary" />}
          </button>
        );
      })}</div>
      <Section>Niveau</Section>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${G.levels.length}, minmax(0, 1fr))` }}>
        {G.levels.map((l) => {
          const locked = l.n > max, on = level === l.n;
          return <button key={l.n} disabled={locked} onClick={() => { haptic(); setLevel(l.n); }} className={`h-12 rounded-xl border-2 border-b-4 font-black flex items-center justify-center ${locked ? "border-border bg-muted text-muted-foreground" : on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{locked ? <Lock weight="fill" className="w-4 h-4" /> : l.n}</button>;
        })}
      </div>
      <p className="text-[13px] font-semibold text-muted-foreground mt-2">{target?.mode === "user" ? "Seuls les niveaux ouverts pour vous deux sont proposés. " : ""}Niveau {level} : {G.levels.find((l) => l.n === level)?.desc}</p>
      {game === "ilm" && (<>
        <Section>Domaine</Section>
        <div className="grid grid-cols-2 gap-2.5">{ILM_CATEGORIES.map(([k, l]) => (
          <button key={k} onClick={() => { haptic(); setCat(k); }} className={`h-12 rounded-xl border-2 border-b-4 font-extrabold ${cat === k ? "border-primary bg-accent text-accent-foreground" : "border-border bg-card"}`}>{l}</button>
        ))}</div>
      </>)}
    </Screen>
  );
}

/* ── Rejoindre par lien ── */
function JoinDuel({ code }) {
  const navigate = useNavigate();
  const [err, setErr] = useState("");
  useEffect(() => { duelJoin(code).then((id) => navigate(`/Duel?id=${id}`, { replace: true })).catch((e) => setErr(e.message)); }, [code]);
  return (
    <Screen>
      <Head title="Duel" close onBack={() => navigate("/Jouer?tab=duels", { replace: true })} />
      <p className="text-center font-bold text-muted-foreground mt-24">{err || "Ouverture du duel…"}</p>
    </Screen>
  );
}

/* ── Défi reçu, attente ou résultat ── */
function DuelDetail({ id }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["game-settings"], queryFn: loadSettings, staleTime: 60_000 });
  const { data: d, error, refetch } = useQuery({ queryKey: ["duel", id], queryFn: () => duelGet(id), refetchInterval: (q) => (q.state.data && duelState(q.state.data) === "waiting" ? 20_000 : false) });
  const [busy, setBusy] = useState(false);
  const back = () => navigate("/Jouer?tab=duels", { replace: true });
  if (error) return <Screen><Head title="Duel" close onBack={back} /><p className="text-center font-bold text-muted-foreground mt-24">{error.message}</p></Screen>;
  if (!d) return <Screen><Head title="Duel" close onBack={back} /><p className="text-center font-bold text-muted-foreground mt-24">Chargement…</p></Screen>;
  const s = duelState(d), rival = d.other?.username ? `@${d.other.username}` : "Ton adversaire";
  const G = GAMES[d.game], lv = G?.levels.find((l) => l.n === d.level);

  if (s === "play") {
    const decline = async () => { setBusy(true); try { await duelDecline(id); qc.invalidateQueries({ queryKey: ["duels"] }); back(); } finally { setBusy(false); } };
    return (
      <Screen footer={<><Btn onClick={() => { haptic(); navigate(`/Partie?duel=${id}`); }}>{d.role === "challenger" ? "Jouer ma partie" : "Relever le défi"}</Btn>{d.role === "opponent" && <Btn secondary disabled={busy} onClick={decline}>Refuser</Btn>}</>}>
        <Head title="Duel" close onBack={back} />
        <div className="flex justify-center items-center gap-5 mt-10"><Avatar name={d.other?.username} size={72} /><Sword weight="bold" className="w-8 h-8 text-muted-foreground" /><Avatar name="Toi" gold size={72} /></div>
        <h2 className="text-center text-[22px] font-black mt-5">{d.role === "opponent" ? `${rival} te défie` : `Ton duel contre ${d.other ? rival : "ton ami"}`}</h2>
        <p className="text-center font-semibold text-muted-foreground mt-1">{G?.title}{d.category && d.category !== "mix" ? ` · ${ILM_CATEGORIES.find((c) => c[0] === d.category)?.[1]}` : ""} · Niveau {d.level} · {d.total} questions</p>
        <div className="card-flat p-4 mt-6 grid grid-cols-2 text-center">
          <div><p className="text-[22px] font-black">{d.them ? `${d.them.score}/${d.total}` : "-"}</p><p className="text-[12.5px] font-bold text-muted-foreground">{d.them ? "son score" : "pas encore joué"}</p></div>
          <div><p className="text-[22px] font-black">{left(d.expires_at)}</p><p className="text-[12.5px] font-bold text-muted-foreground">pour jouer</p></div>
        </div>
        <p className="text-center text-[13px] font-semibold text-muted-foreground mt-4">{lv?.desc} {d.them ? "Tu verras ses réponses au fur et à mesure, après avoir répondu." : ""}</p>
      </Screen>
    );
  }

  if (s === "waiting") {
    const url = d.invite_code ? `${window.location.origin}/Duel?code=${d.invite_code}` : null;
    return (
      <Screen footer={<>{url && !d.other && <Btn onClick={async () => { try { if (navigator.share) await navigator.share({ text: `Je te défie sur MyHafizz : ${url}` }); else await navigator.clipboard.writeText(url); } catch { /* */ } }}><ShareNetwork weight="bold" className="w-5 h-5" />Partager le lien</Btn>}<Btn secondary onClick={back}>Retour aux duels</Btn></>}>
        <Head title="Duel" close onBack={back} />
        <div className="w-20 h-20 mx-auto mt-12 rounded-3xl bg-accent text-primary flex items-center justify-center"><Hourglass weight="fill" className="w-10 h-10" /></div>
        <h2 className="text-center text-[22px] font-black mt-5">Tu as fait {d.me.score} / {d.total}</h2>
        <p className="text-center font-semibold text-muted-foreground mt-1">{d.other ? `${rival} a encore ${left(d.expires_at)} pour jouer.` : `En attente d'un ami : le lien est valable ${left(d.expires_at)}.`} Tu recevras le résultat ici.</p>
        <button onClick={() => refetch()} className="mx-auto mt-4 flex items-center gap-1.5 text-[13px] font-extrabold text-primary"><ArrowsClockwise weight="bold" className="w-4 h-4" />Actualiser</button>
      </Screen>
    );
  }

  if (s === "expired" || s === "declined") {
    return (
      <Screen footer={<Btn secondary onClick={back}>Retour aux duels</Btn>}>
        <Head title="Duel" close onBack={back} />
        <h2 className="text-center text-[22px] font-black mt-24">{s === "declined" ? "Défi refusé" : "Duel expiré"}</h2>
        <p className="text-center font-semibold text-muted-foreground mt-1">{s === "declined" ? `${rival} n'a pas pu jouer cette fois.` : "Le temps est écoulé, sans pénalité pour personne."}{d.me ? ` Ton score : ${d.me.score} / ${d.total}.` : ""}</p>
      </Screen>
    );
  }

  // terminé
  const title = d.draw ? "Égalité" : d.won ? "Victoire" : "Défaite";
  const sameScore = d.me.score === d.them.score;
  const mistakes = (d.items || []).map((it, k) => ({ it, k })).filter(({ k }) => !d.them.answers?.[k]?.ok || !d.me.answers?.[k]?.ok);
  const rematchUrl = d.other?.username ? `/Duel?vs=${d.other.username}&g=${d.game}&l=${d.level}` : null;
  return (
    <Screen footer={<>{rematchUrl && <Btn onClick={() => { haptic(); navigate(rematchUrl); }}><ArrowsClockwise weight="bold" className="w-5 h-5" />Revanche</Btn>}<Btn secondary onClick={back}>Retour aux duels</Btn></>}>
      <Head title="Résultat du duel" close onBack={back} />
      <div className="text-center mt-6">
        <div className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center ${d.won ? "bg-primary text-primary-foreground shadow-[0_5px_0_var(--primary-lip)]" : "bg-muted text-muted-foreground"}`}><Trophy weight="fill" className="w-10 h-10" /></div>
        <h2 className="text-[30px] font-black mt-4">{title}</h2>
        <p className="font-semibold text-muted-foreground">contre {rival} · {G?.title}</p>
      </div>
      <div className="flex justify-center items-end gap-6 mt-5">
        <div className="text-center"><Avatar name="Toi" /><p className="text-[40px] font-black leading-tight">{d.me.score}</p></div>
        <p className="font-bold text-muted-foreground pb-3">à</p>
        <div className="text-center"><Avatar name={d.other?.username} gold /><p className="text-[40px] font-black leading-tight text-muted-foreground">{d.them.score}</p></div>
      </div>
      {sameScore && !d.draw && <p className="text-center text-[13px] font-bold text-muted-foreground">Départagés au temps : {(d.me.ms / 1000).toFixed(1).replace(".", ",")} s contre {(d.them.ms / 1000).toFixed(1).replace(".", ",")} s.</p>}
      <div className="grid grid-cols-2 gap-3 mt-5">
        <div className="card-flat p-3 text-center"><Lightning weight="fill" className="w-5 h-5 text-gold mx-auto" /><p className="text-xl font-black">{d.won ? `+${settings?.duel?.win_bonus ?? 20}` : "+0"}</p><p className="text-[12px] font-bold text-muted-foreground">bonus de victoire</p></div>
        <div className="card-flat p-3 text-center"><Sword weight="fill" className="w-5 h-5 text-primary mx-auto" /><p className="text-xl font-black">{d.h2h?.me ?? 0} · {d.h2h?.them ?? 0}</p><p className="text-[12px] font-bold text-muted-foreground">entre vous</p></div>
      </div>
      {mistakes.length > 0 && (
        <>
          <Section>À retenir</Section>
          <div className="space-y-2.5">{mistakes.map(({ it, k }) => (
            <div key={k} className="card-flat p-3.5">
              <p className="text-[12.5px] font-extrabold text-destructive mb-1">Question {k + 1} · {!d.me.answers?.[k]?.ok && !d.them.answers?.[k]?.ok ? "vous vous êtes trompés tous les deux" : !d.me.answers?.[k]?.ok ? "tu t'es trompé" : `${rival} s'est trompé`}</p>
              <Answer it={it} />
            </div>
          ))}</div>
        </>
      )}
    </Screen>
  );
}

/** Bonne réponse résumée (bilan de duel). */
function Answer({ it }) {
  const m = "text-[13.5px] font-semibold text-foreground/80";
  if (it.kind === "ilm") return <><p className="font-extrabold">{it.question}</p><p className={m}>Réponse : {it.choices[it.answer]}. {it.explanation}</p>{it.source && <p className="text-[12px] font-bold text-muted-foreground mt-1">Source : {it.source}</p>}</>;
  if (it.kind === "suite") return <><p className="font-arabic text-[22px] leading-[1.9]" dir="rtl">{it.next.a}</p><p className={m}>{it.next.t} · « {it.next.f} » ({it.surahName} {it.next.k})</p></>;
  if (it.kind === "sourate") return <><p className={m}>« {it.verse.f} »</p><p className="font-extrabold mt-1">Sourate {it.options.find((o) => o.n === it.answer)?.label}</p></>;
  if (it.kind === "ordre") return <><p className="font-extrabold">Sourate {it.surahName}</p><ol className="mt-1 space-y-0.5">{it.seq.map((v) => <li key={v.k} className={m}><span className="font-black">{v.k}.</span> {v.t}</li>)}</ol></>;
  if (it.kind === "syl") return <p className={m}><span className="font-arabic text-[24px]">{it.ar}</span> se lit « {it.answer} »</p>;
  return <p className={m}>La bonne lettre : <span className="font-arabic text-[26px]">{L[it.answer]?.ar}</span> {L[it.answer]?.name} (son « {L[it.answer]?.sound} »)</p>;
}
