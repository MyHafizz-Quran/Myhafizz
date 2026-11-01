import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Medal, Diamond, Crown, ArrowUp, ArrowDown, Info, X, BookOpenText, GameController, Sword } from "@phosphor-icons/react";
import { lgGet, lgSeen, TIERS } from "@/lib/games";
import { PlayerPic } from "@/pages/Partie";
import { haptic } from "@/hooks/usePlatform";

const TIER_ICON = [Medal, Medal, Medal, Diamond, Diamond, Crown];
export function TierIcon({ tier, className }) { const I = TIER_ICON[(tier || 1) - 1] || Medal; return <I weight="fill" className={className} />; }

function left(ms) {
  const h = Math.max(0, Math.floor(ms / 3600e3)), d = Math.floor(h / 24);
  return d >= 1 ? `${d} j ${h % 24} h` : h >= 1 ? `${h} h` : `${Math.max(1, Math.round(ms / 60e3))} min`;
}
function Tiers({ tier }) {
  return (
    <div className="flex justify-center gap-2">
      {TIERS.map((_, k) => (
        <span key={k} className={`w-11 h-11 rounded-2xl flex items-center justify-center ${k + 1 === tier ? "bg-accent text-primary outline outline-[3px] outline-primary outline-offset-2" : k + 1 < tier ? "bg-accent text-primary" : "bg-muted text-muted-foreground/60"}`}><TierIcon tier={k + 1} className="w-6 h-6" /></span>
      ))}
    </div>
  );
}

export default function Ligue() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [rules, setRules] = useState(false);
  const { data: d, error, isLoading } = useQuery({ queryKey: ["ligue"], queryFn: lgGet, refetchInterval: 60_000 });
  const wrap = (c, footer) => (
    <div className="min-h-[100dvh] bg-background" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className={`max-w-xl mx-auto px-4 ${footer ? "pb-36" : "pb-12"}`}>{c}</div>
      {footer && <div className="fixed inset-x-0 bottom-0 bg-background border-t-2 border-border" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}><div className="max-w-xl mx-auto px-4 pt-4">{footer}</div></div>}
    </div>
  );
  const head = (title) => (
    <div className="h-14 flex items-center gap-2">
      <button onClick={() => navigate("/Jouer", { replace: true })} aria-label="Retour" className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-muted-foreground press"><ArrowLeft weight="bold" className="w-6 h-6" /></button>
      <h1 className="text-[20px] font-black flex-1">{title}</h1>
      <button onClick={() => setRules(true)} aria-label="Comment ça marche" className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground press"><Info weight="bold" className="w-6 h-6" /></button>
    </div>
  );
  if (isLoading) return wrap(<p className="text-center font-bold text-muted-foreground mt-16">Chargement de la ligue…</p>);
  if (error || !d) return wrap(<p className="text-center font-bold text-muted-foreground mt-16">Impossible de charger la ligue. Vérifie ta connexion.</p>);

  // Lundi : résultat de la semaine passée (une seule fois)
  if (d.last) {
    const L = d.last, nt = Math.min(6, Math.max(1, L.tier + (L.result === "up" ? 1 : L.result === "down" ? -1 : 0)));
    const seen = async () => { haptic(); try { await lgSeen(); } catch { /* ignoré */ } qc.invalidateQueries({ queryKey: ["ligue"] }); };
    return wrap(<>
      <div className="text-center mt-16">
        <span className={`w-24 h-24 mx-auto rounded-3xl flex items-center justify-center ${L.result === "down" ? "bg-muted text-muted-foreground" : "bg-accent text-primary"}`}><TierIcon tier={nt} className="w-12 h-12" /></span>
        <p className="text-[26px] font-black mt-5">{L.result === "up" ? `Tu montes en ligue ${TIERS[nt - 1]}` : L.result === "down" ? `Nouvelle semaine en ligue ${TIERS[nt - 1]}` : `Tu restes en ligue ${TIERS[nt - 1]}`}</p>
        <p className="font-semibold text-muted-foreground mt-2">{L.result === "up" ? `Tu as fini ${L.pos}e de la ligue ${TIERS[L.tier - 1]} avec ${L.points} points. Belle semaine.` : L.result === "down" ? "La semaine passée était plus calme. Une leçon par jour suffit pour remonter : chaque petit pas compte." : `Tu as fini ${L.pos}e sur ${L.players} avec ${L.points} points. Continue comme ça.`}</p>
      </div>
      <div className="mt-6"><Tiers tier={nt} /></div>
      <div className="grid grid-cols-3 gap-2.5 mt-6">
        <div className="card-flat p-3 text-center"><p className="text-[20px] font-black">{L.pos}e</p><p className="text-[12px] font-bold text-muted-foreground">sur {L.players}</p></div>
        <div className="card-flat p-3 text-center"><p className="text-[20px] font-black">{L.points}</p><p className="text-[12px] font-bold text-muted-foreground">points</p></div>
        <div className="card-flat p-3 text-center"><p className="text-[20px] font-black">{L.days} j</p><p className="text-[12px] font-bold text-muted-foreground">d'apprentissage</p></div>
      </div>
    </>, <button onClick={seen} className="btn-relief w-full h-[52px] bg-primary text-primary-foreground">{L.result === "down" ? "Commencer la semaine" : "Voir ma ligue"}</button>);
  }

  const ends = Date.parse(d.ends_at) - Date.parse(d.now);
  const board = d.board || [], n = board.length;
  const sheet = rules && (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center" onClick={() => setRules(false)}>
      <div className="bg-card w-full max-w-xl rounded-t-3xl p-5 pb-8" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: "max(env(safe-area-inset-bottom), 24px)" }}>
        <div className="flex items-center justify-between"><p className="text-[20px] font-black">La ligue</p><button onClick={() => setRules(false)} aria-label="Fermer"><X weight="bold" className="w-6 h-6 text-muted-foreground" /></button></div>
        <p className="font-semibold text-muted-foreground mt-2">Chaque semaine, du lundi au dimanche, tu es placé avec jusqu'à 30 joueurs de ta ligue. Les points gagnés cette semaine te font monter dans le classement.</p>
        <div className="space-y-3 mt-4">
          <p className="flex gap-3"><BookOpenText weight="fill" className="w-6 h-6 text-primary shrink-0" /><span><b>Leçon et révisions du jour</b><br /><span className="text-muted-foreground font-semibold">+{d.learn_day} pts par jour d'apprentissage</span></span></p>
          <p className="flex gap-3"><GameController weight="fill" className="w-6 h-6 text-primary shrink-0" /><span><b>Jeux solo et défi du jour</b><br /><span className="text-muted-foreground font-semibold">les points de la partie</span></span></p>
          <p className="flex gap-3"><Sword weight="fill" className="w-6 h-6 text-primary shrink-0" /><span><b>Duels et khatma d'équipe</b><br /><span className="text-muted-foreground font-semibold">les points gagnés (les défaites ne retirent rien ici)</span></span></p>
        </div>
        <p className="font-semibold text-muted-foreground mt-4"><b className="text-foreground">Dimanche à minuit :</b> les premiers montent d'une ligue, les derniers descendent (jamais sous Bronze). Les 3 premiers reçoivent le badge « Podium de ligue ». Tu n'apparais dans une ligue qu'à partir de ton premier point de la semaine.</p>
      </div>
    </div>
  );
  if (!d.enabled) return wrap(<>{head("Ligues")}<p className="text-center font-bold text-muted-foreground mt-16">Les ligues de la semaine démarrent bientôt.</p>{sheet}</>);
  if (!d.joined) return wrap(<>
    {head(`Ligue ${TIERS[d.tier - 1]}`)}<Tiers tier={d.tier} />
    <div className="card-flat p-5 mt-6 text-center">
      <p className="text-[18px] font-black">Gagne ton premier point de la semaine</p>
      <p className="font-semibold text-muted-foreground mt-1">Fais ta leçon du jour ou joue une partie pour entrer dans ta ligue et voir le classement.</p>
    </div>
    <p className="text-center text-[13px] font-bold text-muted-foreground mt-4">Fin de la semaine dans {left(ends)}</p>{sheet}
  </>, <button onClick={() => navigate("/Jouer")} className="btn-relief w-full h-[52px] bg-primary text-primary-foreground">Jouer une partie</button>);

  const row = (x) => (
    <div key={x.p?.id} className={`flex items-center gap-3 py-2.5 px-2 font-extrabold rounded-xl ${x.me ? "bg-accent text-accent-foreground" : ""}`}>
      <span className="w-6 text-center text-muted-foreground">{x.pos}</span>
      <PlayerPic p={x.p} size={32} />
      <span className="flex-1 truncate">{x.me ? "Toi" : `@${x.p?.username || "joueur"}`}</span>
      <span className="text-[14px]">{x.points} pts</span>
    </div>
  );
  return wrap(<>
    {head(`Ligue ${TIERS[d.tier - 1]}`)}
    <Tiers tier={d.tier} />
    <p className="text-center text-[14px] font-semibold text-muted-foreground mt-3">Fin de la semaine dans <b className="text-foreground">{left(ends)}</b> · {n} joueur{n > 1 ? "s" : ""}</p>
    <div className="card-flat p-1.5 mt-4">
      {board.map((x, k) => (
        <React.Fragment key={x.p?.id}>
          {row(x)}
          {d.up > 0 && k + 1 === d.up && k + 1 < n && <p className="flex items-center justify-center gap-1 text-[11px] font-black uppercase tracking-wide text-primary py-1.5 border-y-2 border-dashed border-border my-1"><ArrowUp weight="bold" className="w-3.5 h-3.5" />Zone de montée</p>}
          {d.down > 0 && k + 1 === n - d.down && <p className="flex items-center justify-center gap-1 text-[11px] font-black uppercase tracking-wide text-destructive py-1.5 border-y-2 border-dashed border-border my-1"><ArrowDown weight="bold" className="w-3.5 h-3.5" />Zone de descente</p>}
        </React.Fragment>
      ))}
    </div>
    <p className="text-[12.5px] font-semibold text-muted-foreground mt-2">{d.up > 1 ? `Les ${d.up} premiers montent` : "Le premier monte"}{d.down ? (d.down > 1 ? ` et les ${d.down} derniers descendent` : " et le dernier descend") : ""} dimanche à minuit. Les zones s'agrandissent quand le groupe se remplit.</p>
    {sheet}
  </>);
}
