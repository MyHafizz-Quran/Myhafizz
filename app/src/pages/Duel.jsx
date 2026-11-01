import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, ArrowLeft, Sword, MagnifyingGlass, Trophy, ArrowsClockwise, Hourglass, CaretRight, Handshake } from "@phosphor-icons/react";
import { ldSearch, ldInvite, ldState, ldCancel, playerProfile, gradeOf } from "@/lib/games";
import { PlayerPic } from "@/pages/Partie";
import { haptic } from "@/hooks/usePlatform";
import ShareResult from "@/components/ShareResult";
import { report, userMsg } from "@/lib/report";

const Section = ({ children }) => <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mt-5 mb-2">{children}</p>;
const Screen = ({ children, footer }) => (
  <div className="min-h-[100dvh] bg-background" style={{ paddingTop: "env(safe-area-inset-top)" }}>
    <div className={`max-w-xl mx-auto px-4 ${footer ? "pb-44" : "pb-10"}`}>{children}</div>
    {footer && <div className="fixed inset-x-0 bottom-0 bg-background border-t-2 border-border" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}><div className="max-w-xl mx-auto px-4 pt-4 space-y-3">{footer}</div></div>}
  </div>
);
const Head = ({ title, onBack, close }) => (
  <div className="h-14 flex items-center gap-2">
    <button onClick={onBack} aria-label="Retour" className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-muted-foreground press">{close ? <X weight="bold" className="w-6 h-6" /> : <ArrowLeft weight="bold" className="w-6 h-6" />}</button>
    <h1 className="text-[20px] font-black truncate">{title}</h1>
  </div>
);
const Btn = ({ children, secondary, gold, ...p }) => (
  <button {...p} className={`w-full h-[52px] flex items-center justify-center gap-2 disabled:opacity-50 ${secondary ? "rounded-2xl border-2 border-b-[5px] border-border bg-card font-extrabold" : gold ? "btn-relief bg-gold text-[#4A3300]" : "btn-relief bg-primary text-primary-foreground"}`} style={gold ? { "--relief-color": "#C48F12" } : undefined}>{children}</button>
);
const pts = (n) => `${Number(n || 0).toLocaleString("fr-FR")} pts`;
const signed = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0");

/** Onglet « Duels » de l'écran Jouer : lancer un duel, mon grade, mes derniers duels. */
export function DuelsTab() {
  const navigate = useNavigate();
  const { data: me } = useQuery({ queryKey: ["player", ""], queryFn: () => playerProfile(), staleTime: 15_000 });
  const g = gradeOf(me?.points || 0);
  return (
    <div className="mt-4">
      <Btn onClick={() => { haptic(); navigate("/Duel?new=1"); }}><Sword weight="bold" className="w-5 h-5" />Lancer un duel</Btn>
      <p className="text-[13px] font-semibold text-muted-foreground mt-3">Défie un joueur par son nom d'utilisateur. Vous jouez en même temps, en direct : 7 questions tirées au hasard, tous les jeux mélangés.</p>
      {me && (
        <button onClick={() => { haptic(); navigate("/Joueur"); }} className="w-full text-left card-flat p-3.5 mt-4 flex items-center gap-3 press">
          <PlayerPic p={me} size={48} />
          <span className="flex-1 min-w-0"><span className="block font-extrabold truncate">{g.label} · {pts(me.points)}</span>
            <span className="block h-2.5 rounded-full bg-muted overflow-hidden mt-1.5"><span className="block h-full rounded-full bg-primary" style={{ width: `${g.pct}%` }} /></span>
            <span className="block text-[12.5px] font-semibold text-muted-foreground mt-1">{me.stats?.wins || 0} victoires · {me.badges?.length || 0} badges{g.nextLabel ? ` · ${g.toNext} pts avant ${g.nextLabel}` : ""}</span></span>
          <CaretRight weight="bold" className="w-5 h-5 text-muted-foreground" />
        </button>
      )}
      {me?.history?.length > 0 && <Section>Derniers duels</Section>}
      <div className="space-y-2.5">{(me?.history || []).slice(0, 8).map((h) => <HistoryRow key={h.id} h={h} onClick={() => navigate(`/Duel?id=${h.id}`)} />)}</div>
    </div>
  );
}

export function HistoryRow({ h, onClick }) {
  const tag = h.quit === "me" ? "Abandon" : h.quit === "them" ? "Abandon adverse" : h.result === "win" ? "Victoire" : h.result === "draw" ? "Égalité" : "Défaite";
  return (
    <button onClick={onClick} className="w-full text-left card-flat p-3 flex items-center gap-3 press">
      <PlayerPic p={h.them} size={38} />
      <span className="flex-1 min-w-0"><span className="block font-extrabold truncate">@{h.them?.username || "joueur"} · {h.mine}–{h.theirs}</span><span className="block text-[12.5px] font-semibold text-muted-foreground">{tag} · {new Date(h.at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span></span>
      <span className={`font-black ${h.points > 0 ? "text-primary" : h.points < 0 ? "text-destructive" : "text-muted-foreground"}`}>{signed(h.points)}</span>
    </button>
  );
}

export default function Duel() {
  const p = new URLSearchParams(window.location.search);
  if (p.get("wait")) return <Waiting id={p.get("wait")} />;
  if (p.get("id")) return <Result id={p.get("id")} />;
  return <NewDuel />;
}

function NewDuel() {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState("");
  const q = term.trim().replace(/^@/, "").toLowerCase();
  const { data: found = [], isFetching } = useQuery({ queryKey: ["ld-search", q], queryFn: () => ldSearch(q), staleTime: 10_000 });
  const defy = async (u) => {
    haptic(); setBusy(u.username); setErr("");
    try { const id = await ldInvite(u.username); navigate(`/Duel?wait=${id}`, { replace: true }); }
    catch (e) { setErr(userMsg(e, "duel:invite") || ""); setBusy(null); }
  };
  return (
    <Screen>
      <Head title="Nouveau duel" close onBack={() => navigate("/Jouer?tab=duels", { replace: true })} />
      <label className="h-[52px] rounded-2xl border-2 border-border bg-card flex items-center gap-2 px-3.5 focus-within:border-primary">
        <MagnifyingGlass weight="bold" className="w-5 h-5 text-muted-foreground" />
        <span className="font-extrabold text-muted-foreground">@</span>
        <input autoFocus value={term} onChange={(e) => setTerm(e.target.value)} placeholder="nom d'utilisateur" autoCapitalize="none" autoCorrect="off" spellCheck={false} className="flex-1 bg-transparent outline-none font-extrabold text-[16px]" />
      </label>
      {err && <p className="text-[13px] font-bold text-destructive mt-3">{err}</p>}
      <Section>{q.length >= 2 ? (isFetching ? "Recherche…" : found.length ? "Joueurs" : "Aucun joueur trouvé") : "Récents"}</Section>
      <div className="space-y-2.5">{found.map((u) => (
        <div key={u.id} className="card-flat p-3 flex items-center gap-3">
          <PlayerPic p={u} size={44} />
          <span className="flex-1 min-w-0"><span className="block font-extrabold truncate">@{u.username}</span><span className="block text-[12.5px] font-semibold text-muted-foreground">{gradeOf(u.points).label} · {pts(u.points)}{u.online ? " · en ligne" : ""}</span></span>
          <button disabled={!!busy} onClick={() => defy(u)} className="btn-relief h-10 px-4 bg-primary text-primary-foreground text-[14px] disabled:opacity-50">{busy === u.username ? "…" : "Défier"}</button>
        </div>
      ))}</div>
      {q.length < 2 && !found.length && <p className="text-[13px] font-semibold text-muted-foreground">Tape au moins 2 lettres du nom d'utilisateur de ton adversaire.</p>}
      <div className="card-flat p-3.5 mt-5 text-[13px] font-semibold text-muted-foreground"><b className="text-foreground">Comment ça marche.</b> Ton adversaire reçoit une notification. Il a 60 secondes pour accepter, puis vous jouez en même temps. Victoire +30, égalité +5, défaite −10, abandon −20.</div>
    </Screen>
  );
}

/** J'ai défié quelqu'un : j'attends sa réponse, puis la partie démarre toute seule. */
function Waiting({ id }) {
  const navigate = useNavigate();
  const { data: s } = useQuery({ queryKey: ["ld", id], queryFn: () => ldState(id), refetchInterval: 1000, gcTime: 0 });
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, []);
  useEffect(() => { if (s?.status === "playing") navigate(`/Partie?live=${id}`, { replace: true }); }, [s?.status]);
  const off = s ? Date.parse(s.now) - Date.now() : 0;
  const left = s ? Math.max(0, Math.ceil((Date.parse(s.invite_expires_at) - (now + off)) / 1000)) : 60;
  const ended = s && ["declined", "expired", "cancelled"].includes(s.status);
  return (
    <Screen footer={ended ? <><Btn onClick={() => navigate("/Duel?new=1", { replace: true })}>Défier quelqu'un d'autre</Btn><Btn secondary onClick={() => navigate("/Jouer?tab=duels", { replace: true })}>Retour</Btn></>
      : <Btn secondary onClick={async () => { await ldCancel(id).catch(() => {}); navigate("/Jouer?tab=duels", { replace: true }); }}>Annuler</Btn>}>
      <Head title="" close onBack={async () => { if (!ended) await ldCancel(id).catch(() => {}); navigate("/Jouer?tab=duels", { replace: true }); }} />
      <div className="text-center mt-10">
        <div className="flex justify-center gap-3"><PlayerPic p={s?.me} size={84} /><PlayerPic p={s?.them} size={84} /></div>
        <h1 className="text-[24px] font-black mt-6">{ended ? (s.status === "declined" ? "Défi refusé" : s.status === "cancelled" ? "Défi annulé" : "Pas de réponse") : s?.rematch_of ? "Revanche demandée" : "Défi envoyé"}</h1>
        <p className="font-semibold text-muted-foreground mt-1">{ended ? (s.status === "declined" ? `@${s.them?.username} ne peut pas jouer maintenant.` : `@${s?.them?.username} n'a pas répondu à temps. Il retrouvera ton défi dans ses notifications.`) : `En attente de @${s?.them?.username || "…"}…`}</p>
        {!ended && <>
          <div className="h-3 rounded-full bg-muted overflow-hidden mt-8"><div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${(left / 60) * 100}%` }} /></div>
          <p className="font-extrabold text-muted-foreground mt-2 flex items-center justify-center gap-1.5"><Hourglass weight="bold" className="w-4 h-4" />{left} s</p>
          <p className="text-[13px] font-semibold text-muted-foreground mt-4">Dès qu'il accepte, la partie démarre toute seule.</p>
        </>}
      </div>
    </Screen>
  );
}

/** Fin du duel : le gagnant en grand, le perdant en dessous, revanche. */
function Result({ id }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: s, error } = useQuery({ queryKey: ["ld", id], queryFn: () => ldState(id), refetchInterval: (q) => (q.state.data?.rematch?.status === "invited" || q.state.data?.status === "playing" ? 1000 : 5000), gcTime: 0 });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { qc.invalidateQueries({ queryKey: ["player"] }); qc.invalidateQueries({ queryKey: ["game-stats"] }); }, [s?.status]);
  useEffect(() => {
    if (s?.status === "playing") navigate(`/Partie?live=${id}`, { replace: true });
    if (s?.rematch?.status === "playing") navigate(`/Partie?live=${s.rematch.id}`, { replace: true });
  }, [s?.status, s?.rematch?.status]);
  const back = () => navigate("/Jouer?tab=duels", { replace: true });
  if (error) return <Screen><Head title="Duel" onBack={back} /><p className="text-center font-bold text-muted-foreground mt-16">{error.message}</p></Screen>;
  if (!s) return <Screen><Head title="Duel" onBack={back} /><p className="text-center font-bold text-muted-foreground mt-16">Chargement…</p></Screen>;
  if (s.status !== "done") return <Waiting id={id} />;
  const draw = !s.winner, iWon = s.winner === "me";
  const top = draw || iWon ? { p: s.me, score: s.my_score, pts: s.my_points, me: true } : { p: s.them, score: s.their_score, pts: s.their_points };
  const low = draw || iWon ? { p: s.them, score: s.their_score, pts: s.their_points } : { p: s.me, score: s.my_score, pts: s.my_points, me: true };
  const rm = s.rematch;
  const askRematch = async () => { haptic(); setBusy(true); setErr(""); try { await ldInvite("", id); await qc.invalidateQueries({ queryKey: ["ld", id] }); } catch (e) { setErr(e.message); } setBusy(false); };
  const label = s.quit === "me" ? "Tu as abandonné" : s.quit === "them" ? "Ton adversaire a abandonné" : draw ? "Égalité" : iWon ? "Victoire" : "Défaite";
  return (
    <Screen footer={<>
      {err && <p className="text-[13px] font-bold text-destructive text-center">{err}</p>}
      {rm?.status === "invited" && rm.mine ? <Btn secondary disabled><Hourglass weight="bold" className="w-5 h-5" />Revanche demandée, en attente…</Btn>
        : rm?.status === "invited" && !rm.mine ? <p className="text-center font-extrabold text-muted-foreground">@{s.them?.username} demande une revanche : réponds dans la fenêtre qui s'affiche.</p>
        : <Btn gold disabled={busy} onClick={askRematch}><ArrowsClockwise weight="bold" className="w-5 h-5" />{rm?.status === "declined" ? "Revanche refusée, redemander" : rm?.status === "expired" ? "Pas de réponse, redemander" : "Revanche"}</Btn>}
      {(iWon || draw) && s.quit !== "me" && <ShareResult label={iWon ? "Partager ma victoire" : "Partager"} build={(me) => ({
        card: { kicker: s.tournament ? "Match de tournoi" : "Duel en direct", big: iWon ? "Victoire" : "Égalité", sub: `contre @${s.them?.username}`, rows: [
          ["Score", `${s.my_score} – ${s.their_score}`], ...(s.tournament ? [] : [["Points", signed(s.my_points)]]), ...(me.grade ? [["Grade", me.grade]] : [])] },
        text: `${iWon ? "Victoire" : "Égalité"} ${s.my_score} – ${s.their_score} contre @${s.them?.username} en duel sur MyHafizz.\n${me.username ? `Défie-moi : mon nom d'utilisateur est @${me.username}.` : "Viens me défier."}\nmyhafizz.com`,
      })} />}
      <Btn secondary onClick={back}>Quitter</Btn>
    </>}>
      <Head title="" close onBack={back} />
      <div className="text-center">
        <span className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-xl font-extrabold text-[14px] ${draw ? "bg-muted text-muted-foreground" : iWon ? "bg-gold-tint text-[#8A6100]" : "bg-muted text-muted-foreground"}`}>{draw ? <Handshake weight="fill" className="w-4 h-4" /> : <Trophy weight="fill" className="w-4 h-4" />}{label}</span>
        <div className="flex justify-center mt-5"><PlayerPic p={top.p} size={150} ring={!draw} /></div>
        <p className="text-[24px] font-black mt-4">{top.me ? "Toi" : `@${top.p?.username}`}</p>
        <p className="font-semibold text-muted-foreground">{gradeOf(top.p?.points).label}</p>
        <p className={`text-[44px] font-black leading-tight mt-1 ${top.pts > 0 ? "text-primary" : top.pts < 0 ? "text-destructive" : ""}`}>{signed(top.pts)}</p>
        <p className="font-semibold text-muted-foreground">points · {top.score} / {s.total} bonnes réponses</p>
      </div>
      <div className="card-flat p-3.5 mt-6 flex items-center gap-3">
        <PlayerPic p={low.p} size={56} />
        <span className="flex-1 min-w-0"><span className="block font-extrabold truncate">{low.me ? "Toi" : `@${low.p?.username}`}</span><span className="block text-[13px] font-semibold text-muted-foreground">{low.score} / {s.total} bonnes réponses</span></span>
        <span className={`text-[22px] font-black ${low.pts > 0 ? "text-primary" : low.pts < 0 ? "text-destructive" : ""}`}>{signed(low.pts)}</span>
      </div>
      <button onClick={() => navigate("/Joueur")} className="w-full mt-3 h-12 rounded-2xl font-extrabold text-primary">Voir mon profil joueur</button>
    </Screen>
  );
}
