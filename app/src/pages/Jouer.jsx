import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Lightning, Fire, Lock, CaretRight, TextAa, BookOpenText, Headphones, ListNumbers, Lightbulb, Robot, ArrowLeft, Check, Info, SealCheck, CalendarCheck, Trophy } from "@phosphor-icons/react";
import { Profile } from "@/api/entities";
import { GAMES, GAME_ORDER, ROBOT, ILM_CATEGORIES, unlockedLevel, loadSettings, loadProgress, loadStats, dcGet, hadithCount, lgGet, TIERS, tnList } from "@/lib/games";
import { TierIcon } from "@/pages/Ligue";
import { haptic } from "@/hooks/usePlatform";
import { DuelsTab } from "@/pages/Duel";
import { EquipeTab } from "@/pages/Equipe";

const ICONS = { lettres: TextAa, suite: BookOpenText, sourate: Headphones, ordre: ListNumbers, ilm: Lightbulb, hadith: SealCheck };

export { unlockedLevel };

export default function Jouer() {
  const navigate = useNavigate();
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => Profile.get() });
  const { data: settings } = useQuery({ queryKey: ["game-settings"], queryFn: loadSettings, staleTime: 60_000 });
  const { data: progress = {} } = useQuery({ queryKey: ["game-progress"], queryFn: loadProgress });
  const { data: stats = { xp: 0, streak: 0 } } = useQuery({ queryKey: ["game-stats"], queryFn: loadStats });
  const [open, setOpen] = useState(null);
  const [level, setLevel] = useState(1);
  const [robot, setRobot] = useState(2);
  const [cat, setCat] = useState("mix");
  const [tab, setTabState] = useState(() => { const t = new URLSearchParams(window.location.search).get("tab"); return ["duels", "equipe"].includes(t) ? t : "solo"; });
  const setTab = (t) => { haptic(); setTabState(t); window.history.replaceState(null, "", t === "solo" ? "/Jouer" : `/Jouer?tab=${t}`); };
  const duelsOn = settings?.duel?.enabled !== false;
  const teamOn = settings?.khatma?.enabled !== false;
  const tabs = [["solo", "Solo"], duelsOn && ["duels", "Duels"], teamOn && ["equipe", "Équipe"]].filter(Boolean);

  const { data: nbHadith = 0 } = useQuery({ queryKey: ["hadith-count"], queryFn: hadithCount, staleTime: 300_000 });
  const enabled = GAME_ORDER.filter((g) => settings?.games?.[g] !== false && (g !== "hadith" || nbHadith >= 10));
  const beginner = profile?.arabic_level === "none";

  const openGame = (g) => { haptic(); setOpen(g); setLevel(unlockedLevel(g, progress, profile)); };

  // ── Réglage de la partie ──
  if (open) {
    const G = GAMES[open], max = unlockedLevel(open, progress, profile);
    const best = progress?.[open]?.best || {};
    const go = () => { haptic(); navigate(`/Partie?g=${open}&l=${level}&r=${robot}${open === "ilm" ? `&c=${cat}` : ""}`); };
    return (
      <div className="min-h-[100dvh] bg-background" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="max-w-xl mx-auto px-4 pb-40">
          <div className="h-14 flex items-center gap-2">
            <button onClick={() => setOpen(null)} aria-label="Retour" className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-muted-foreground press"><ArrowLeft weight="bold" className="w-6 h-6" /></button>
            <h1 className="text-[20px] font-black">{G.title}</h1>
          </div>

          <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mt-2 mb-2">Niveau</p>
          <div className="space-y-2.5">
            {G.levels.map((l) => {
              const locked = l.n > max, on = level === l.n;
              return (
                <button key={l.n} disabled={locked} onClick={() => { haptic(); setLevel(l.n); }}
                  className={`w-full text-left rounded-2xl border-2 border-b-[5px] px-4 py-3 flex items-center gap-3 transition-colors ${locked ? "border-border bg-muted text-muted-foreground" : on ? "border-primary bg-accent" : "border-border bg-card"}`}>
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black shrink-0 ${locked ? "bg-background" : on ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{locked ? <Lock weight="fill" className="w-5 h-5" /> : l.n}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-extrabold">{l.name}</span>
                    <span className="block text-[13px] font-semibold text-muted-foreground">{locked ? `Réussis le niveau ${l.n - 1} à ${settings?.rules?.unlock_pct ?? 80} % pour l'ouvrir.` : l.desc}</span>
                  </span>
                  {best[l.n] != null && !locked && <span className="text-xs font-extrabold text-muted-foreground">{best[l.n]} %</span>}
                </button>
              );
            })}
          </div>

          {open === "ilm" && (<>
            <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mt-6 mb-2">Domaine</p>
            <div className="grid grid-cols-2 gap-2.5">
              {ILM_CATEGORIES.map(([k, label]) => (
                <button key={k} onClick={() => { haptic(); setCat(k); }} className={`h-12 rounded-xl border-2 border-b-4 font-extrabold ${cat === k ? "border-primary bg-accent text-accent-foreground" : "border-border bg-card"}`}>{label}</button>
              ))}
            </div>
          </>)}

          <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mt-6 mb-2 flex items-center gap-1.5"><Robot weight="fill" className="w-4 h-4" />Contre l'ordinateur</p>
          <div className="grid grid-cols-3 gap-2.5">
            {ROBOT.map((r) => (
              <button key={r.n} onClick={() => { haptic(); setRobot(r.n); }} className={`rounded-xl border-2 border-b-4 px-2 py-2.5 ${robot === r.n ? "border-primary bg-accent" : "border-border bg-card"}`}>
                <span className="block font-extrabold text-[14px]">{r.name}</span>
                <span className="block text-[11.5px] font-semibold text-muted-foreground leading-tight mt-0.5">{r.desc}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="fixed inset-x-0 bottom-0 bg-background border-t-2 border-border" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}>
          <div className="max-w-xl mx-auto px-4 pt-4"><button onClick={go} className="btn-relief w-full h-[52px] bg-primary text-primary-foreground">Lancer la partie</button></div>
        </div>
      </div>
    );
  }

  // ── Hub ──
  return (
    <div className="max-w-xl mx-auto px-4 pt-4 pb-32">
      <div className="flex items-center justify-between">
        <h1 className="text-[26px] font-black">Jouer</h1>
        <div className="flex items-center gap-2">
          <span className="h-9 px-3 rounded-xl bg-card border-2 border-border flex items-center gap-1.5 font-extrabold"><Fire weight="fill" className="w-5 h-5 text-gold" />{stats.streak} j</span>
          <span className="h-9 px-3 rounded-xl bg-card border-2 border-border flex items-center gap-1.5 font-extrabold"><Lightning weight="fill" className="w-5 h-5 text-gold" />{stats.xp}</span>
        </div>
      </div>
      <p className="font-semibold text-muted-foreground mt-1">{tab === "duels" ? "Défie d'autres joueurs. Chaque erreur est expliquée." : tab === "equipe" ? "Révisez ensemble, en groupe ou en binôme." : "Joue à ton rythme contre l'ordinateur. Chaque erreur est expliquée."}</p>
      {settings?.defi?.enabled !== false && <DefiCard />}
      <LigueCard />
      <TournoiCard />
      {tabs.length > 1 && (
        <div className="mt-4 flex bg-muted rounded-2xl p-1 gap-1" role="tablist">
          {tabs.map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`flex-1 h-10 rounded-xl font-extrabold text-[14px] ${tab === k ? "bg-card text-accent-foreground shadow-[0_2px_0_var(--border)]" : "text-muted-foreground"}`}>{l}</button>
          ))}
        </div>
      )}
      {duelsOn && tab === "duels" ? <DuelsTab /> : teamOn && tab === "equipe" ? <EquipeTab /> : (<>

      {beginner && (
        <div className="card-flat p-3.5 mt-4 flex items-start gap-3">
          <span className="w-9 h-9 rounded-xl bg-accent text-primary flex items-center justify-center shrink-0"><Info weight="fill" className="w-5 h-5" /></span>
          <p className="text-[14px] font-semibold"><span className="font-extrabold">Tu ne lis pas encore l'arabe ?</span> Pas de souci : les premiers niveaux se jouent en phonétique et à l'écoute. Commence par Lettres éclair et Al-Ilm.</p>
        </div>
      )}

      <div className="space-y-3 mt-5">
        {enabled.map((g) => {
          const G = GAMES[g], Icon = ICONS[g], lv = unlockedLevel(g, progress, profile);
          const cur = G.levels.find((l) => l.n === lv);
          return (
            <button key={g} onClick={() => openGame(g)} className="w-full text-left card-flat p-4 flex items-center gap-3.5 press">
              <span className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-[0_4px_0_var(--primary-lip)]"><Icon weight="fill" className="w-6 h-6" /></span>
              <span className="flex-1 min-w-0">
                <span className="block font-extrabold text-[17px]">{G.title}</span>
                <span className="block text-[13px] font-semibold text-muted-foreground">{G.hint}</span>
                <span className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-extrabold text-accent-foreground bg-accent rounded-lg px-2 py-0.5">
                  {lv >= G.levels.length && progress?.[g]?.best?.[lv] >= 80 ? <Check weight="bold" className="w-3.5 h-3.5" /> : null}Niveau {lv} · {cur?.name}
                </span>
              </span>
              <CaretRight weight="bold" className="w-5 h-5 text-muted-foreground" />
            </button>
          );
        })}
      </div>
      
      </>)}
    </div>
  );
}

/** Carte du défi du jour, en haut de l'écran Jouer. */
function DefiCard() {
  const navigate = useNavigate();
  const { data: d } = useQuery({ queryKey: ["defi"], queryFn: () => dcGet(), staleTime: 30_000 });
  const hours = d ? Math.max(1, Math.round((Date.parse(d.next_at) - Date.parse(d.now)) / 3600e3)) : null;
  const r = d?.result;
  return (
    <button onClick={() => { haptic(); navigate("/Defi"); }} className="w-full text-left card-flat p-4 mt-4 border-primary press">
      <span className="flex items-center gap-3">
        <span className="w-12 h-12 rounded-2xl bg-accent text-primary flex items-center justify-center shrink-0"><CalendarCheck weight="fill" className="w-6 h-6" /></span>
        <span className="flex-1 min-w-0"><span className="block font-extrabold text-[17px]">Défi du jour</span>
          <span className="block text-[13px] font-semibold text-muted-foreground">{r ? `Relevé : ${r.score} / ${r.total} · ${r.rank}e sur ${d.players}` : `${d?.total || 5} questions · les mêmes pour tout le monde`}</span></span>
        <CaretRight weight="bold" className="w-5 h-5 text-muted-foreground" />
      </span>
      <span className="flex gap-2 mt-3">
        {d?.streak > 0 && <span className="h-7 px-2.5 rounded-lg bg-accent text-accent-foreground text-[12.5px] font-extrabold flex items-center gap-1"><Fire weight="fill" className="w-4 h-4 text-gold" />Série : {d.streak} j</span>}
        {hours && <span className="h-7 px-2.5 rounded-lg bg-muted text-muted-foreground text-[12.5px] font-extrabold flex items-center">{r ? "Nouveau défi" : "Change"} dans {hours} h</span>}
      </span>
    </button>
  );
}

/** Carte de la ligue de la semaine (masquée tant que les ligues ne sont pas ouvertes). */
function LigueCard() {
  const navigate = useNavigate();
  const { data: d } = useQuery({ queryKey: ["ligue"], queryFn: lgGet, staleTime: 60_000 });
  if (!d?.enabled) return null;
  const me = d.board?.find((x) => x.me);
  const target = !d.last && d.joined && me && d.up && me.pos > d.up ? d.board[d.up - 1] : null;
  return (
    <button onClick={() => { haptic(); navigate("/Ligue"); }} className="w-full text-left card-flat p-4 mt-3 press">
      <span className="flex items-center gap-3">
        <span className="w-12 h-12 rounded-2xl bg-accent text-primary flex items-center justify-center shrink-0"><TierIcon tier={d.tier} className="w-6 h-6" /></span>
        <span className="flex-1 min-w-0"><span className="block font-extrabold text-[17px]">Ligue {TIERS[d.tier - 1]}</span>
          <span className="block text-[13px] font-semibold text-muted-foreground">{d.last ? "Le résultat de la semaine est arrivé" : me ? `Tu es ${me.pos}e · ${me.points} pts cette semaine` : "Gagne ton premier point pour entrer"}</span></span>
        <CaretRight weight="bold" className="w-5 h-5 text-muted-foreground" />
      </span>
      {target && <span className="inline-flex mt-3 h-7 px-2.5 rounded-lg bg-accent text-accent-foreground text-[12.5px] font-extrabold items-center">Encore {target.points - me.points + 1} pts pour la zone de montée</span>}
    </button>
  );
}

/** Carte du prochain tournoi (officiel ou de mes groupes). */
function TournoiCard() {
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ["tn-list"], queryFn: tnList, staleTime: 30_000 });
  if (!data?.enabled) return null;
  const t = data.items.find((x) => x.status === "running" && x.joined) || data.items.find((x) => x.status === "open") || data.items.find((x) => x.status === "running");
  const sub = !t ? "Aucun tournoi prévu pour l'instant" : t.status === "running" ? "En cours · touche pour suivre" : `${new Date(t.starts_at).toLocaleString("fr-FR", { weekday: "long", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).replace(":", " h ")} · ${t.players} inscrits sur ${t.size}`;
  return (
    <button onClick={() => { haptic(); navigate(t ? `/Tournoi?id=${t.id}` : "/Tournoi"); }} className="w-full text-left card-flat p-4 mt-3 press">
      <span className="flex items-center gap-3">
        <span className="w-12 h-12 rounded-2xl bg-accent text-primary flex items-center justify-center shrink-0"><Trophy weight="fill" className="w-6 h-6" /></span>
        <span className="flex-1 min-w-0"><span className="block font-extrabold text-[17px] truncate">{t ? t.title : "Tournois"}</span><span className="block text-[13px] font-semibold text-muted-foreground first-letter:uppercase truncate">{sub}{t?.joined && t.status === "open" ? " · inscrit" : ""}</span></span>
        <CaretRight weight="bold" className="w-5 h-5 text-muted-foreground" />
      </span>
    </button>
  );
}
