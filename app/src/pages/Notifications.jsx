import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Medal, UsersThree, BellSlash } from "@phosphor-icons/react";
import { notifList, notifReadAll, ldRespond, ldInvite, badgeName, TK_SCOPES, TIERS } from "@/lib/games";
import { PlayerPic } from "@/pages/Partie";
import { useNotifs } from "@/lib/notifs";
import { haptic } from "@/hooks/usePlatform";

const ago = (iso) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 1) return "à l'instant"; if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60); if (h < 24) return `il y a ${h} h`;
  return new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" });
};
const Ico = ({ I }) => <span className="w-10 h-10 rounded-full bg-accent text-primary flex items-center justify-center shrink-0"><I weight="fill" className="w-5 h-5" /></span>;

export default function Notifications() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { refresh } = useNotifs();
  const { data: list = [], isLoading, error } = useQuery({ queryKey: ["notifs"], queryFn: notifList, refetchInterval: 5000 });
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { const t = setTimeout(() => notifReadAll().then(refresh).catch(() => {}), 1500); return () => clearTimeout(t); }, [list.length]);
  const respond = async (n, accept) => {
    haptic(); setBusy(n.id); setErr("");
    try { const r = await ldRespond(n.ref, accept); if (accept && r?.status === "playing") return navigate(`/Partie?live=${n.ref}`); }
    catch (e) { setErr(e.message); }
    setBusy(null); qc.invalidateQueries({ queryKey: ["notifs"] }); refresh();
  };
  const defyBack = async (n) => {
    haptic(); setBusy(n.id); setErr("");
    try { const id = await ldInvite(n.actor?.username); navigate(`/Duel?wait=${id}`); } catch (e) { setErr(e.message); setBusy(null); }
  };
  const row = (n) => {
    const who = `@${n.actor?.username || "un joueur"}`;
    const live = n.duel?.status === "invited" && Date.parse(n.duel.expires) > Date.now();
    let pic = <PlayerPic p={n.actor} size={40} />, title = "", sub = ago(n.at), actions = null, go = null;
    switch (n.kind) {
      case "duel_invite": case "duel_rematch":
        title = n.kind === "duel_rematch" ? `${who} veut sa revanche` : `${who} te défie`;
        if (live) actions = <div className="flex gap-2 mt-2"><button disabled={busy === n.id} onClick={() => respond(n, false)} className="h-9 px-3.5 rounded-xl border-2 border-b-4 border-border bg-card font-extrabold text-[13px]">Refuser</button><button disabled={busy === n.id} onClick={() => respond(n, true)} className="btn-relief h-9 px-3.5 bg-primary text-primary-foreground text-[13px]">Accepter</button></div>;
        else { sub += n.duel?.status === "playing" || n.duel?.status === "done" ? " · accepté" : n.duel?.status === "declined" ? " · refusé" : " · expiré"; go = n.duel?.status === "done" ? `/Duel?id=${n.ref}` : null; }
        break;
      case "duel_missed":
        title = `Défi manqué de ${who}`;
        actions = <button disabled={busy === n.id} onClick={() => defyBack(n)} className="mt-1 font-extrabold text-primary text-[13px]">Le défier à mon tour</button>;
        break;
      case "duel_declined": title = `${who} a refusé ton duel`; break;
      case "badge": pic = <Ico I={Medal} />; title = `Nouveau badge : ${badgeName(n.data?.badge)}`; go = "/Joueur"; break;
      case "khatma_start": pic = <Ico I={UsersThree} />; title = `${who} lance une khatma : ${TK_SCOPES[n.data?.scope]?.title || ""}`; sub += ` · ${n.data?.kind === "duo" ? "ton binôme" : n.data?.group || ""}`; go = `/Equipe?id=${n.ref}`; break;
      case "khatma_done": pic = <Ico I={UsersThree} />; title = `${n.data?.kind === "duo" ? "Ton binôme" : n.data?.group || "Ton groupe"} a terminé ${TK_SCOPES[n.data?.scope]?.title || "la khatma"}`; sub += ` · +${n.data?.bonus ?? 50} pts`; go = `/Equipe?id=${n.ref}`; break;
      case "league_nudge": pic = <Ico I={Medal} />; title = `Plus que ${n.data?.gap} pts pour monter en ligue ${TIERS[(n.data?.tier || 2) - 1]}`; go = "/Ligue"; break;
      case "league_result": pic = <Ico I={Medal} />; title = n.data?.result === "up" ? `Tu montes en ligue ${TIERS[n.data.new_tier - 1]}` : n.data?.result === "down" ? `Nouvelle semaine en ligue ${TIERS[n.data.new_tier - 1]}` : `Tu restes en ligue ${TIERS[n.data.new_tier - 1]}`; sub += ` · ${n.data?.pos}e sur ${n.data?.players}`; go = "/Ligue"; break;
      default: title = "Notification";
    }
    return (
      <div key={n.id} onClick={() => go && navigate(go)} className={`flex gap-3 py-3 border-b-2 border-border/60 last:border-0 ${go ? "cursor-pointer" : ""}`}>
        <span className={`w-2 h-2 rounded-full mt-4 shrink-0 ${n.read ? "bg-transparent" : "bg-primary"}`} />
        {pic}
        <div className="flex-1 min-w-0"><p className="font-extrabold leading-snug">{title}</p><p className="text-[12.5px] font-semibold text-muted-foreground">{sub}</p>{actions}</div>
      </div>
    );
  };
  return (
    <div className="min-h-[100dvh] bg-background" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="max-w-xl mx-auto px-4 pb-12">
        <div className="h-14 flex items-center gap-2">
          <button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/Dashboard"))} aria-label="Retour" className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-muted-foreground press"><ArrowLeft weight="bold" className="w-6 h-6" /></button>
          <h1 className="text-[20px] font-black">Notifications</h1>
        </div>
        {err && <p className="text-[13px] font-bold text-destructive mb-2">{err}</p>}
        {isLoading && <p className="text-center font-bold text-muted-foreground mt-16">Chargement…</p>}
        {error && <p className="text-center font-bold text-muted-foreground mt-16">Impossible de charger tes notifications.</p>}
        {!isLoading && !error && !list.length && <div className="text-center mt-16"><BellSlash weight="bold" className="w-10 h-10 mx-auto text-muted-foreground" /><p className="font-bold text-muted-foreground mt-2">Aucune notification pour l'instant.</p></div>}
        {list.length > 0 && <div className="card-flat px-3.5">{list.map(row)}</div>}
      </div>
    </div>
  );
}
