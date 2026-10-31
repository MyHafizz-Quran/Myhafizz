import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Fire, CheckCircle, Circle, Handshake, CaretRight } from "@phosphor-icons/react";
import { Duo } from "@/api/entities";
import { haptic } from "@/hooks/usePlatform";

const first = (n) => (n || "").trim().split(/\s+/)[0] || "Ton binôme";

function Person({ p }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      {p.today ? <CheckCircle weight="fill" className="w-7 h-7 text-primary shrink-0" /> : <Circle weight="bold" className="w-7 h-7 text-border shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="font-extrabold truncate">{p.is_me ? "Toi" : first(p.display_name)}</p>
        <p className="text-[12.5px] font-semibold text-muted-foreground">{p.today ? "A révisé aujourd'hui" : "Pas encore aujourd'hui"} · {p.days7} jour{p.days7 > 1 ? "s" : ""} sur 7</p>
      </div>
      <span className={`h-8 px-2.5 rounded-full flex items-center gap-1 font-black text-sm ${p.streak ? "bg-gold-tint text-[#9A6A00]" : "bg-muted text-muted-foreground"}`}>
        <Fire weight="fill" className={`w-4 h-4 ${p.streak ? "text-gold" : ""}`} />{p.streak}
      </span>
    </div>
  );
}

/** Régularité des deux membres + bouton Encourager (une fois par jour). */
export default function DuoPanel({ group, compact = false, className = "" }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: people = [], isLoading } = useQuery({ queryKey: ["duo", group.id], queryFn: () => Duo.status(group.id) });
  const [sent, setSent] = useState(() => localStorage.getItem(`mh_duo_nudge_${group.id}`) === new Date().toDateString());
  const [msg, setMsg] = useState("");
  const other = people.find((p) => !p.is_me);
  const meP = people.find((p) => p.is_me);
  const nudge = async () => {
    haptic();
    try {
      const okSent = await Duo.nudge(group.id);
      localStorage.setItem(`mh_duo_nudge_${group.id}`, new Date().toDateString()); setSent(true);
      setMsg(okSent ? `Encouragement envoyé à ${first(other?.display_name)}.` : "Tu l'as déjà encouragé aujourd'hui.");
      qc.invalidateQueries({ queryKey: ["duo", group.id] });
    } catch { setMsg("Envoi impossible, réessaie."); }
  };

  if (isLoading) return <div className={`h-32 rounded-2xl bg-muted animate-pulse ${className}`} />;
  return (
    <div className={`card-flat p-4 ${className}`}>
      {compact && (
        <button onClick={() => { haptic(); navigate(`/Group?id=${group.id}`); }} className="w-full flex items-center gap-2 text-left">
          <Handshake weight="fill" className="w-5 h-5 text-primary" />
          <p className="flex-1 font-black text-[17px] truncate">Binôme · {group.name}</p>
          <CaretRight weight="bold" className="w-4 h-4 text-muted-foreground" />
        </button>
      )}
      <div className={`divide-y-2 divide-border ${compact ? "mt-1" : ""}`}>
        {meP && <Person p={meP} />}
        {other ? <Person p={other} /> : <p className="py-3 text-[13px] font-semibold text-muted-foreground">En attente de ton binôme. Partage le code d'invitation <span className="font-black tracking-widest text-accent-foreground">{group.invite_code}</span>.</p>}
      </div>
      {other && (
        <button onClick={nudge} disabled={sent} className={`btn-relief w-full h-11 mt-2 text-[15px] ${sent ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"}`}>
          {sent ? "Encouragé aujourd'hui" : `Encourager ${first(other.display_name)}`}
        </button>
      )}
      {msg && <p className="text-[12.5px] font-bold text-muted-foreground mt-2 text-center">{msg}</p>}
    </div>
  );
}

/** Encouragements reçus, affichés une fois puis marqués comme vus. */
export function DuoNudges({ groups = [], className = "" }) {
  const duos = groups.filter((g) => g.kind === "duo");
  const { data: list = [] } = useQuery({ queryKey: ["duo-nudges"], queryFn: () => Duo.received(), enabled: duos.length > 0 });
  const [shown, setShown] = useState([]);
  useEffect(() => { if (list.length) { setShown(list); Duo.markSeen(list.map((n) => n.id)).catch(() => {}); } }, [list]);
  if (!shown.length) return null;
  const names = [...new Set(shown.map((n) => duos.find((g) => g.id === n.group_id)?.name).filter(Boolean))];
  return (
    <div className={`card-flat p-4 flex items-center gap-3 ${className}`}>
      <Handshake weight="fill" className="w-7 h-7 text-primary shrink-0" />
      <p className="flex-1 font-extrabold text-[14.5px]">Ton binôme t'encourage{names.length ? ` (${names.join(", ")})` : ""}. Une petite révision aujourd'hui ?</p>
      <button onClick={() => setShown([])} className="text-[13px] font-extrabold text-muted-foreground shrink-0">OK</button>
    </div>
  );
}
