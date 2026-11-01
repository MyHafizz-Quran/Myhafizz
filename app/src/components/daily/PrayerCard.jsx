import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Compass, CaretRight, Broadcast } from "@phosphor-icons/react";
import { useLive } from "@/lib/live";
import { getLocation, setLocation, requestLocation, prayerDay, onPrayerChange, getMethod, hhmm, countdown } from "@/lib/prayer";
import { haptic } from "@/hooks/usePlatform";
import { getReminder } from "@/lib/reminders";

/** Carte « Heures de prière » de l'accueil : prochaine prière, compte à rebours, horaires du jour. */
export default function PrayerCard({ className = "", hero = false }) {
  const navigate = useNavigate();
  const live = useLive();
  const [loc, setLoc] = useState(getLocation);
  const [method, setM] = useState(getMethod);
  const [now, setNow] = useState(() => new Date());
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => onPrayerChange(() => { setLoc(getLocation()); setM(getMethod()); }), []);
  // Rappels déjà activés sur cet appareil : on réutilise leur position
  useEffect(() => {
    if (loc) return;
    getReminder().then((r) => { if (r) setLocation({ lat: r.lat, lng: r.lng }); }).catch(() => {});
  }, [loc]);
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    const vis = () => document.visibilityState === "visible" && setNow(new Date());
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", vis); };
  }, []);

  const locate = async () => {
    haptic(); setBusy(true); setDenied(false);
    try { setLoc(await requestLocation()); } catch { setDenied(true); }
    setBusy(false);
  };

  if (!loc) {
    return (
      <div className={`card-flat p-4 flex items-center gap-3 ${className}`}>
        <span className="w-[38px] h-[38px] rounded-xl bg-accent text-primary flex items-center justify-center shrink-0"><MapPin weight="fill" className="w-[21px] h-[21px]" /></span>
        <div className="flex-1 min-w-0">
          <p className="font-black">Heures de prière</p>
          <p className="text-[12.5px] font-semibold text-muted-foreground">{denied ? "Localisation refusée. Autorise-la dans les réglages du navigateur." : "Ta position sert uniquement au calcul, elle reste sur ton téléphone."}</p>
        </div>
        <button onClick={locate} disabled={busy} className="btn-relief h-10 px-4 bg-primary text-primary-foreground text-sm shrink-0">{busy ? "…" : "Activer"}</button>
      </div>
    );
  }

  const { today, next, current } = prayerDay(loc, now, method);
  const grid = (
    <div className="grid grid-cols-5 gap-1.5 mt-3">
      {today.map((p) => {
        const isNext = !next.tomorrow && p.key === next.key;
        const past = p.time <= now && current?.key !== p.key;
        return (
          <div key={p.key} className={`h-[52px] rounded-xl border-2 flex flex-col items-center justify-center ${isNext ? "border-primary bg-accent text-accent-foreground" : "border-border"} ${past ? "text-muted-foreground" : ""}`}>
            <span className="text-[12.5px] font-extrabold">{p.label}</span>
            <span className="text-[11.5px] font-bold">{hhmm(p.time)}</span>
          </div>
        );
      })}
    </div>
  );
  if (hero) return (
    <div className={`card-flat p-5 text-center ${className}`}>
      <p className="text-[13px] font-black uppercase tracking-wide text-muted-foreground">Prochaine prière{next.tomorrow ? " · demain" : ""}</p>
      <p className="font-black text-[38px] leading-[1.1] mt-1">{next.label}</p>
      <p className="font-extrabold text-primary">dans {countdown(next.time - now)} · {hhmm(next.time)}</p>
      {grid}
      <div className={`grid ${live.on ? "grid-cols-2" : "grid-cols-1"} gap-2.5 mt-4`}>
        <button onClick={() => { haptic(); navigate("/Qibla"); }} className="btn-relief h-11 bg-card text-foreground border-2 border-border text-sm flex items-center justify-center gap-2" aria-label="Direction de la qibla">
          <Compass weight="bold" className="w-[18px] h-[18px] text-primary" />Qibla
        </button>
        {live.on && (
          <button onClick={() => { haptic(); navigate("/Live"); }} className="btn-relief h-11 bg-card text-foreground border-2 border-border text-sm flex items-center justify-center gap-2">
            <Broadcast weight="bold" className="w-[18px] h-[18px] text-destructive" />Live
          </button>
        )}
      </div>
    </div>
  );
  return (
    <div className={`card-flat p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-extrabold text-muted-foreground">Prochaine prière{next.tomorrow ? " · demain" : ""}</p>
          <p className="font-black text-[22px] leading-tight">{next.label} <span className="text-muted-foreground">· {hhmm(next.time)}</span></p>
          <p className="text-[13px] font-bold text-primary">dans {countdown(next.time - now)}</p>
        </div>
        <button onClick={() => { haptic(); navigate("/Qibla"); }} className="press h-10 pl-3 pr-2 rounded-xl border-2 border-border flex items-center gap-1.5 font-extrabold text-sm shrink-0" aria-label="Direction de la qibla">
          <Compass weight="bold" className="w-[18px] h-[18px] text-primary" />Qibla<CaretRight weight="bold" className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
      <div className="grid grid-cols-5 gap-1.5 mt-3">
        {today.map((p) => {
          const isNext = !next.tomorrow && p.key === next.key;
          const past = p.time <= now && current?.key !== p.key;
          return (
            <div key={p.key} className={`h-[52px] rounded-xl border-2 flex flex-col items-center justify-center ${isNext ? "border-primary bg-accent text-accent-foreground" : "border-border"} ${past ? "text-muted-foreground" : ""}`}>
              <span className="text-[12.5px] font-extrabold">{p.label}</span>
              <span className="text-[11.5px] font-bold">{hhmm(p.time)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
