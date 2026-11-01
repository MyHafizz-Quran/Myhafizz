import React, { useEffect, useState } from "react";
import { SpinnerGap, BookOpenText, SunHorizon, Flame } from "@phosphor-icons/react";

/**
 * Écran d'activation des notifications, modèle 1 « L'écran verrouillé » (validé le 01/11/2026).
 * Trois vraies notifications MyHafizz tombent une à une sur un écran de téléphone,
 * puis la demande d'activation monte du bas.
 */
export default function NotifPreview({ prayerLabel, pace, onEnable, onLater, busy, error, enableLabel = "Activer les notifications" }) {
  const [now, setNow] = useState(new Date());
  const [shown, setShown] = useState(0);
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 15000);
    const t = [1, 2, 3].map((n) => setTimeout(() => setShown(n), 400 + (n - 1) * 900));
    t.push(setTimeout(() => setSheet(true), 3300));
    return () => { clearInterval(iv); t.forEach(clearTimeout); };
  }, []);

  const notifs = [
    { icon: BookOpenText, title: `Après ${prayerLabel}`, when: "maintenant", body: `Ta séance du jour : ${pace} verset${pace > 1 ? "s" : ""}, 5 minutes suffisent.` },
    { icon: SunHorizon, title: "Verset du jour", when: "08:02", body: "« Craignez Allah autant que vous le pouvez. » 64:16" },
    { icon: Flame, title: "Ta série", when: "hier", body: "7 jours de suite. Continue comme ça." },
  ];
  const time = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="fixed inset-0 z-50 flex flex-col text-white overflow-y-auto" style={{ background: "#00666A" }} onClick={() => setSheet(true)}>
      <div className="max-w-[460px] w-full mx-auto px-5 pt-[calc(env(safe-area-inset-top,0px)+40px)] [@media(max-height:700px)]:pt-[calc(env(safe-area-inset-top,0px)+16px)]">
        <p className="text-center font-bold text-[15px] opacity-85 first-letter:uppercase">{date}</p>
        <p className="text-center font-extrabold text-[64px] [@media(max-height:700px)]:text-[48px] leading-none tracking-tight mt-1">{time}</p>
        <div className="mt-8 [@media(max-height:700px)]:mt-4 space-y-2.5">
          {notifs.map((n, i) => (
            <div key={i} className="bg-card text-card-foreground rounded-[18px] px-3 py-2.5 flex gap-2.5"
              style={{ opacity: shown > i ? 1 : 0, transform: shown > i ? "none" : "translateY(-24px) scale(.96)", transition: "all .55s cubic-bezier(.2,.9,.3,1.2)" }}>
              <span className="w-9 h-9 rounded-[10px] bg-primary text-primary-foreground flex items-center justify-center shrink-0"><n.icon weight="fill" className="w-5 h-5" /></span>
              <span className="flex-1 min-w-0">
                <span className="flex justify-between gap-2 text-[13.5px] font-extrabold"><span className="truncate">{n.title}</span><span className="font-bold text-muted-foreground text-[11px] shrink-0">{n.when}</span></span>
                <span className="block text-[13px] font-semibold text-muted-foreground leading-snug">{n.body}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto shrink-0 bg-background text-foreground rounded-t-[26px] transition-transform duration-500"
        style={{ transform: sheet ? "none" : "translateY(100%)", transitionTimingFunction: "cubic-bezier(.2,.9,.3,1)" }} onClick={(e) => e.stopPropagation()}>
        <div className="max-w-[460px] mx-auto px-5 pt-6 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
          <h1 className="text-[22px] font-black leading-tight">Voilà à quoi ça ressemble.</h1>
          <p className="font-semibold text-muted-foreground mt-1.5">Un mot après la prière, jamais plus de 3 par jour, rien de 22 h à 6 h. Tu choisis lesquels dans ton profil.</p>
          {error && <p className="mt-3 text-sm font-bold text-destructive">{error}</p>}
          <button disabled={busy} onClick={onEnable} className="btn-relief w-full h-[52px] mt-5 bg-primary text-primary-foreground uppercase tracking-wide disabled:opacity-60">
            {busy ? <SpinnerGap weight="bold" className="w-5 h-5 animate-spin" /> : enableLabel}
          </button>
          <button disabled={busy} onClick={onLater} className="w-full h-12 font-extrabold text-muted-foreground">Plus tard</button>
        </div>
      </div>
    </div>
  );
}
