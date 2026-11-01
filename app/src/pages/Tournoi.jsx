import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trophy, Crown, Flag, CaretRight, Plus, UsersThree } from "@phosphor-icons/react";
import { tnList, tnState, tnJoin, tnCreate, tnCancel, roundName, buildDuelPool, loadSettings } from "@/lib/games";
import { PlayerPic } from "@/pages/Partie";
import { haptic } from "@/hooks/usePlatform";

const pad = (x) => String(x).padStart(2, "0");
function left(ms) {
  if (ms <= 0) return "maintenant";
  const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return d ? `${d} j ${h} h` : h ? `${h} h ${pad(m)}` : `${m}:${pad(s % 60)}`;
}
const when = (iso) => new Date(iso).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).replace(":", " h ");
const Btn = ({ children, kind, ...p }) => <button {...p} className={kind === "ghost" ? "w-full h-[52px] rounded-2xl border-2 border-b-[5px] border-border bg-card font-extrabold disabled:opacity-60" : "btn-relief w-full h-[52px] bg-primary text-primary-foreground disabled:opacity-60"}>{children}</button>;

function Shell({ title, back = "/Jouer", children, footer }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-[100dvh] bg-background" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className={`max-w-xl mx-auto px-4 ${footer ? "pb-36" : "pb-12"}`}>
        <div className="h-14 flex items-center gap-2">
          <button onClick={() => navigate(back, { replace: true })} aria-label="Retour" className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-muted-foreground press"><ArrowLeft weight="bold" className="w-6 h-6" /></button>
          <h1 className="text-[20px] font-black flex-1 truncate">{title}</h1>
        </div>
        {children}
      </div>
      {footer && <div className="fixed inset-x-0 bottom-0 bg-background border-t-2 border-border" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}><div className="max-w-xl mx-auto px-4 pt-4 space-y-2">{footer}</div></div>}
    </div>
  );
}

function Match({ m }) {
  const pl = (p, s, k) => (
    <div className={`flex items-center gap-2.5 px-3 py-2 font-extrabold text-[14px] ${m.winner === k ? "bg-accent text-accent-foreground" : m.winner ? "text-muted-foreground" : ""}`}>
      {p ? <PlayerPic p={p} size={26} /> : <span className="w-[26px]" />}
      <span className="flex-1 truncate">{p ? `@${p.username}` : "Exempt"}</span>
      <span>{s ?? ""}</span>
    </div>
  );
  return (
    <div className="rounded-2xl border-2 border-border bg-card overflow-hidden divide-y-2 divide-border">
      {pl(m.p1, m.s1, 1)}{pl(m.p2, m.s2, 2)}
      {(m.live || m.how === "forfeit") && <p className="px-3 py-1 text-[11px] font-black uppercase tracking-wide text-muted-foreground">{m.live ? "En direct" : "Gagné par forfait"}</p>}
    </div>
  );
}
function Bracket({ t }) {
  const rounds = t.rounds_list || [];
  const [tab, setTab] = useState(null);
  const cur = tab ?? Math.min(t.round || 1, rounds.length);
  if (!rounds.length) return null;
  const r = rounds.find((x) => x.round === cur) || rounds[rounds.length - 1];
  return (
    <div className="mt-5">
      <p className="text-[12px] font-black uppercase tracking-wide text-muted-foreground mb-2">Tableau</p>
      <div className="flex gap-1.5 mb-3">
        {Array.from({ length: t.rounds || rounds.length }, (_, k) => k + 1).map((n) => (
          <button key={n} disabled={!rounds.some((x) => x.round === n)} onClick={() => setTab(n)} className={`flex-1 h-9 rounded-xl text-[12px] font-black disabled:opacity-40 ${n === r.round ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>{roundName(n, t.rounds, true).replace("Huitièmes de finale", "8es").replace("Quarts de finale", "Quarts").replace("Demi-finales", "Demies")}</button>
        ))}
      </div>
      <div className="space-y-2.5">{r.matches.map((m) => <Match key={m.slot} m={m} />)}</div>
    </div>
  );
}

function Detail({ id }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pool = useRef(null), building = useRef(false), seenDuel = useRef(null), off = useRef(0);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const { data: t, error } = useQuery({
    queryKey: ["tn", id],
    queryFn: async () => {
      const prev = qc.getQueryData(["tn", id]);
      const send = prev?.need_pool && pool.current ? pool.current : null;
      const s = await tnState(id, send);
      off.current = Date.parse(s.now) - Date.now();
      if (s.need_pool && !pool.current && !building.current) {
        building.current = true;
        loadSettings().catch(() => ({})).then((st) => buildDuelPool(40, st.duel || {})).then((p) => { pool.current = p; }).finally(() => { building.current = false; });
      }
      return s;
    },
    refetchInterval: (q) => { const s = q.state.data; if (!s) return 3000; if (s.status === "running") return 2000; if (s.status === "open") return Date.parse(s.starts_at) - Date.parse(s.now) < 180e3 ? 2000 : 20000; return false; },
  });
  useEffect(() => { const k = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(k); }, []);
  useEffect(() => {
    const d = t?.match?.duel;
    if (d && !t.match.done && seenDuel.current !== d) { seenDuel.current = d; haptic(); navigate(`/Partie?live=${d}`); }
  }, [t?.match?.duel, t?.match?.done]);
  if (error) return <Shell title="Tournoi"><p className="text-center font-bold text-muted-foreground mt-16">{error.message?.includes("introuvable") ? "Ce tournoi n'existe pas ou t'est réservé." : "Impossible de charger le tournoi. Vérifie ta connexion."}</p></Shell>;
  if (!t) return <Shell title="Tournoi"><p className="text-center font-bold text-muted-foreground mt-16">Chargement…</p></Shell>;
  const nowS = now + off.current;
  const act = async (fn) => { haptic(); setBusy(true); setErr(""); try { await fn(); await qc.invalidateQueries({ queryKey: ["tn", id] }); qc.invalidateQueries({ queryKey: ["tn-list"] }); } catch (e) { setErr(e.message); } setBusy(false); };
  const big = (icon, title, sub) => (
    <div className="text-center mt-6">
      <span className="w-24 h-24 mx-auto rounded-3xl flex items-center justify-center bg-accent text-primary">{icon}</span>
      <p className="text-[24px] font-black mt-4">{title}</p>
      {sub && <p className="font-semibold text-muted-foreground mt-1.5">{sub}</p>}
    </div>
  );
  const rules = (
    <div className="card-flat p-4 mt-3">
      <p className="font-extrabold">Comment ça se passe</p>
      <p className="text-[14px] font-semibold text-muted-foreground mt-1 leading-relaxed">Chaque tour est un duel en direct de 7 questions, avec la correction expliquée. Le gagnant passe au tour suivant, jusqu'à la finale. Sois dans l'app à l'heure : on te prévient 10 minutes avant. Un joueur absent a {t.wait_secs} secondes pour arriver.</p>
      <p className="font-extrabold mt-3">À gagner</p>
      <p className="text-[14px] font-semibold text-muted-foreground mt-1 leading-relaxed">Vainqueur : +{t.prizes.win} pts et badge « Champion de tournoi » · Finaliste : +{t.prizes.final} pts · Demi-finale : +{t.prizes.semi} pts. Être éliminé ne retire aucun point.</p>
    </div>
  );
  const title = t.group ? `${t.title} · ${t.group.name}` : t.title;

  if (t.status === "open") {
    const ms = Date.parse(t.starts_at) - nowS, full = t.players >= t.size;
    return (
      <Shell title={title} back="/Tournoi" footer={<>
        {err && <p className="text-[13px] font-bold text-destructive text-center">{err}</p>}
        {t.joined ? <Btn kind="ghost" disabled={busy} onClick={() => act(() => tnJoin(id, false))}>Inscrit · Me désinscrire</Btn> : <Btn disabled={busy || full} onClick={() => act(() => tnJoin(id, true))}>{full ? "Complet" : "Je m'inscris"}</Btn>}
        {t.mine && <button disabled={busy} onClick={() => act(() => tnCancel(id))} className="w-full text-[13px] font-extrabold text-destructive py-1">Annuler le tournoi</button>}
      </>}>
        <div className="card-flat p-5 text-center">
          <p className="text-[13px] font-bold text-muted-foreground">Début dans</p>
          <p className="text-[32px] font-black leading-tight mt-1">{left(ms)}</p>
          <p className="text-[13px] font-bold text-muted-foreground mt-1 first-letter:uppercase">{when(t.starts_at)}</p>
        </div>
        <div className="grid grid-cols-3 gap-2.5 mt-3">
          <div className="card-flat p-3 text-center"><p className="text-[20px] font-black">{t.players}/{t.size}</p><p className="text-[12px] font-bold text-muted-foreground">inscrits</p></div>
          <div className="card-flat p-3 text-center"><p className="text-[20px] font-black">{t.size === 8 ? 3 : 4}</p><p className="text-[12px] font-bold text-muted-foreground">tours max</p></div>
          <div className="card-flat p-3 text-center"><p className="text-[20px] font-black">~{t.size === 8 ? 15 : 20} min</p><p className="text-[12px] font-bold text-muted-foreground">en tout</p></div>
        </div>
        {ms < 120e3 && t.joined && <p className="text-center font-extrabold text-primary mt-3">Reste sur cet écran : ton premier match se lance tout seul.</p>}
        {rules}
        {t.list?.length > 0 && (
          <div className="card-flat p-4 mt-3">
            <p className="font-extrabold mb-2">Inscrits</p>
            <div className="flex flex-wrap gap-2">{t.list.map((p) => <span key={p.id} className="inline-flex items-center gap-1.5 h-8 pl-1 pr-2.5 rounded-full bg-muted text-[13px] font-extrabold"><PlayerPic p={p} size={24} />@{p.username}</span>)}</div>
          </div>
        )}
        <p className="text-[12.5px] font-semibold text-muted-foreground mt-3">Moins de 4 inscrits à l'heure du départ : le tournoi est annulé. S'il manque des joueurs, certains passent directement au tour suivant.</p>
      </Shell>
    );
  }
  if (t.status === "cancelled") return <Shell title={title} back="/Tournoi">{big(<Flag weight="fill" className="w-12 h-12" />, "Tournoi annulé", t.players < 4 ? "Il n'y avait pas assez d'inscrits au moment du départ." : "L'organisateur a annulé ce tournoi.")}</Shell>;

  if (t.status === "done") {
    const me = t.me, champ = me?.place === 1;
    return (
      <Shell title={title} back="/Tournoi">
        {champ ? big(<Trophy weight="fill" className="w-12 h-12" />, "Tu remportes le tournoi", `+${me.points} pts et le badge « Champion de tournoi ».`)
          : me ? big(<Flag weight="fill" className="w-12 h-12" />, me.place === 2 ? "Finaliste, bravo" : me.place === 3 ? "Demi-finaliste" : `Fin du parcours en ${roundName(me.out_round, t.rounds).toLowerCase()}`, me.points ? `Tu gagnes +${me.points} pts.` : "Être éliminé ne retire aucun point. Rendez-vous au prochain tournoi.")
            : big(<Crown weight="fill" className="w-12 h-12" />, "Tournoi terminé", t.champion ? `Vainqueur : @${t.champion.username}` : null)}
        {!champ && t.champion && me && <p className="text-center font-bold text-muted-foreground mt-2">Vainqueur : @{t.champion.username}</p>}
        <Bracket t={t} />
      </Shell>
    );
  }
  // en cours
  const m = t.match, out = t.me?.out_round;
  let top;
  if (!t.me) top = <div className="card-flat p-4 text-center font-bold text-muted-foreground">Tournoi en cours · {roundName(t.round, t.rounds).toLowerCase()}. Suis les matchs en direct.</div>;
  else if (out) top = big(<Flag weight="fill" className="w-12 h-12" />, `Fin du parcours en ${roundName(out, t.rounds).toLowerCase()}`, "Être éliminé ne retire aucun point. Tu peux suivre la suite du tournoi ici.");
  else if (m && m.done) top = <div className="card-flat p-5 text-center"><p className="text-[20px] font-black">Qualifié</p><p className="font-semibold text-muted-foreground mt-1">Le tour suivant commence dès que tous les matchs sont finis. Reste sur cet écran.</p></div>;
  else if (m) {
    const ms = Date.parse(m.ready_at) - nowS;
    top = (
      <div className="card-flat p-5 text-center">
        <p className="text-[12px] font-black uppercase tracking-wide text-muted-foreground">{roundName(m.round, t.rounds)}</p>
        <div className="flex items-center justify-center gap-5 mt-4"><PlayerPic p={t.me_card} size={64} /><span className="text-[16px] font-black text-muted-foreground">contre</span><PlayerPic p={m.them} size={64} /></div>
        <p className="font-extrabold mt-2">@{m.them?.username}</p>
        <p className="text-[13px] font-semibold text-muted-foreground mt-3">{ms > 0 ? "Le match commence dans" : m.duel ? "Le match commence…" : `En attente de ton adversaire (${Math.max(0, t.wait_secs + Math.round(ms / 1000))} s)`}</p>
        {ms > 0 && <p className="text-[40px] font-black leading-tight">{left(ms)}</p>}
        {m.duel && <div className="mt-3"><Btn onClick={() => navigate(`/Partie?live=${m.duel}`)}>Rejoindre le match</Btn></div>}
      </div>
    );
  } else top = <div className="card-flat p-4 text-center font-bold text-muted-foreground">Préparation du tour…</div>;
  return <Shell title={title} back="/Tournoi">{top}<Bracket t={t} /></Shell>;
}

function NewTournament() {
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ["tn-list"], queryFn: tnList });
  const d0 = new Date(Date.now() + 86400e3);
  const [f, setF] = useState({ group: "", title: "Tournoi du groupe", day: d0.toISOString().slice(0, 10), time: "21:00", size: 8 });
  const [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const groups = data?.groups || [];
  const go = async () => {
    haptic(); setBusy(true); setErr("");
    try { const id = await tnCreate(f.group || groups[0]?.id, f.title, `${f.day}T${f.time}:00Z`, f.size); navigate(`/Tournoi?id=${id}`, { replace: true }); } catch (e) { setErr(e.message); setBusy(false); }
  };
  const field = "w-full h-12 rounded-2xl border-2 border-border bg-card px-3 font-bold";
  return (
    <Shell title="Nouveau tournoi" back="/Tournoi" footer={<>{err && <p className="text-[13px] font-bold text-destructive text-center">{err}</p>}<Btn disabled={busy || !groups.length} onClick={go}>Créer le tournoi</Btn></>}>
      {!groups.length ? <p className="font-bold text-muted-foreground mt-6 text-center">Seul le responsable d'un groupe peut organiser un tournoi pour ses membres.</p> : (
        <div className="space-y-3">
          <label className="block"><span className="text-[13px] font-extrabold text-muted-foreground">Groupe</span><select className={field} value={f.group || groups[0].id} onChange={(e) => setF({ ...f, group: e.target.value })}>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
          <label className="block"><span className="text-[13px] font-extrabold text-muted-foreground">Nom</span><input className={field} maxLength={60} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="text-[13px] font-extrabold text-muted-foreground">Jour</span><input type="date" className={field} value={f.day} onChange={(e) => setF({ ...f, day: e.target.value })} /></label>
            <label className="block"><span className="text-[13px] font-extrabold text-muted-foreground">Heure (Bamako, Abidjan)</span><input type="time" className={field} value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></label>
          </div>
          <div><span className="text-[13px] font-extrabold text-muted-foreground">Places</span><div className="grid grid-cols-2 gap-3 mt-1">{[8, 16].map((n) => <button key={n} onClick={() => setF({ ...f, size: n })} className={`h-12 rounded-2xl border-2 border-b-4 font-extrabold ${f.size === n ? "border-primary bg-accent text-accent-foreground" : "border-border bg-card"}`}>{n} joueurs</button>)}</div></div>
          <p className="text-[13px] font-semibold text-muted-foreground">Les membres du groupe sont prévenus. Il faut au moins 4 inscrits à l'heure du départ.</p>
        </div>
      )}
    </Shell>
  );
}

function List() {
  const navigate = useNavigate();
  const { data, error } = useQuery({ queryKey: ["tn-list"], queryFn: tnList, refetchInterval: 30000 });
  const items = data?.items || [];
  const label = (t) => t.status === "open" ? `${when(t.starts_at)} · ${t.players}/${t.size} inscrits` : t.status === "running" ? "En cours" : t.status === "done" ? (t.champion ? `Vainqueur : @${t.champion.username}` : "Terminé") : "Annulé";
  return (
    <Shell title="Tournois">
      {error && <p className="text-center font-bold text-muted-foreground mt-10">Impossible de charger les tournois.</p>}
      {data && !items.length && <p className="text-center font-bold text-muted-foreground mt-10">Aucun tournoi pour l'instant.</p>}
      <div className="space-y-2.5">
        {items.map((t) => (
          <button key={t.id} onClick={() => { haptic(); navigate(`/Tournoi?id=${t.id}`); }} className="w-full text-left card-flat p-4 press flex items-center gap-3">
            <span className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${t.status === "open" || t.status === "running" ? "bg-accent text-primary" : "bg-muted text-muted-foreground"}`}>{t.group ? <UsersThree weight="fill" className="w-6 h-6" /> : <Trophy weight="fill" className="w-6 h-6" />}</span>
            <span className="flex-1 min-w-0"><span className="block font-extrabold truncate">{t.title}{t.group ? ` · ${t.group.name}` : ""}</span><span className="block text-[13px] font-semibold text-muted-foreground truncate first-letter:uppercase">{label(t)}{t.joined && t.status === "open" ? " · inscrit" : ""}</span></span>
            <CaretRight weight="bold" className="w-5 h-5 text-muted-foreground" />
          </button>
        ))}
      </div>
      {data?.groups?.length > 0 && <button onClick={() => navigate("/Tournoi?new=1")} className="w-full mt-4 h-12 rounded-2xl border-2 border-dashed border-border font-extrabold text-primary flex items-center justify-center gap-2"><Plus weight="bold" className="w-5 h-5" />Organiser un tournoi pour mon groupe</button>}
    </Shell>
  );
}

export default function Tournoi() {
  const [params] = useSearchParams();
  const id = params.get("id");
  if (params.get("new")) return <NewTournament />;
  return id ? <Detail id={id} /> : <List />;
}
