// Notifications internes : pastille de la cloche, pop-up de défi quand l'app est ouverte.
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { notifPoll, ldRespond, gradeOf } from "@/lib/games";
import { PlayerPic } from "@/pages/Partie";
import { haptic } from "@/hooks/usePlatform";

const Ctx = createContext({ unread: 0, refresh: () => {} });
export const useNotifs = () => useContext(Ctx);

export function NotifProvider({ children }) {
  const [state, setState] = useState({ unread: 0, invite: null });
  const [dismissed, setDismissed] = useState(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const off = useRef(0);
  const navigate = useNavigate();
  const loc = useLocation();
  const qc = useQueryClient();
  const refresh = async () => {
    try { const r = await notifPoll(); if (r) { off.current = Date.parse(r.now) - Date.now(); setState(r); } } catch { /* hors ligne */ }
  };
  useEffect(() => {
    let t;
    const loop = async () => { if (document.visibilityState === "visible") await refresh(); t = setTimeout(loop, 4000); };
    loop();
    const vis = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", vis);
    return () => { clearTimeout(t); document.removeEventListener("visibilitychange", vis); };
  }, []);
  const inv = state.invite;
  const left = inv ? Math.max(0, Math.ceil((Date.parse(inv.expires) - (now + off.current)) / 1000)) : 0;
  const inLive = loc.pathname === "/Partie" && loc.search.includes("live=");
  const show = inv && left > 0 && dismissed !== inv.id && !inLive;
  useEffect(() => { if (!show) return; haptic(20); const t = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(t); }, [show, inv?.id]);
  const answer = async (accept) => {
    setBusy(true); haptic();
    try {
      const r = await ldRespond(inv.id, accept);
      setDismissed(inv.id);
      if (accept && r?.status === "playing") navigate(`/Partie?live=${inv.id}`);
    } catch { setDismissed(inv.id); }
    setBusy(false); refresh(); qc.invalidateQueries({ queryKey: ["notifs"] });
  };
  return (
    <Ctx.Provider value={{ unread: state.unread || 0, refresh }}>
      {children}
      {show && (
        <div className="fixed inset-0 z-[1000] bg-black/45 flex items-end sm:items-center justify-center p-3" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}>
          <div className="bg-card rounded-3xl border-2 border-border p-5 w-full max-w-sm text-center">
            <div className="flex justify-center"><PlayerPic p={inv.from} size={72} /></div>
            <p className="text-[20px] font-black mt-3">@{inv.from?.username || "un joueur"} {inv.rematch ? "veut sa revanche" : "te défie"}</p>
            <p className="font-semibold text-muted-foreground mt-1">Duel en direct · {inv.n} questions mélangées · {gradeOf(inv.from?.points).label}</p>
            <p className="font-semibold text-muted-foreground mt-2">Réponds dans <b className="text-foreground">{left} s</b></p>
            <div className="grid grid-cols-2 gap-2.5 mt-4">
              <button disabled={busy} onClick={() => answer(false)} className="h-[52px] rounded-2xl border-2 border-b-[5px] border-border bg-card font-extrabold">Refuser</button>
              <button disabled={busy} onClick={() => answer(true)} className="btn-relief h-[52px] bg-primary text-primary-foreground">Accepter</button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
