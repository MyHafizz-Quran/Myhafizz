import React, { useEffect, useState } from "react";
import { ArrowCounterClockwise } from "@phosphor-icons/react";
import PageHeader from "@/components/PageHeader";
import { vibrate, sound } from "@/lib/feedback";

const DHIKRS = [
  { ar: "سُبْحَانَ اللَّهِ", fr: "Subhan Allah" },
  { ar: "الْحَمْدُ لِلَّهِ", fr: "Al-hamdu lillah" },
  { ar: "اللَّهُ أَكْبَرُ", fr: "Allahu akbar" },
  { ar: "لَا إِلَهَ إِلَّا اللَّهُ", fr: "La ilaha illa Allah" },
  { ar: "أَسْتَغْفِرُ اللَّهَ", fr: "Astaghfirullah" },
  { ar: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ", fr: "Subhan Allahi wa bihamdih" },
  { ar: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ", fr: "Salat sur le Prophète ﷺ" },
];
const TARGETS = [33, 99, 100, 0];
const KEY = "mh_tasbih";
const load = () => { try { return { i: 0, target: 33, count: 0, total: 0, ...JSON.parse(localStorage.getItem(KEY)) }; } catch { return { i: 0, target: 33, count: 0, total: 0 }; } };

/** Chapelet : un appui = un grain, vibration à chaque grain et plus forte à l'objectif. */
export default function Tasbih() {
  const [s, setS] = useState(load);
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(s)); }, [s]);
  const d = DHIKRS[s.i] || DHIKRS[0];
  const reached = s.target > 0 && s.count >= s.target;

  const tick = () => {
    setS((p) => {
      const count = p.count + 1;
      if (p.target > 0 && count % p.target === 0) { vibrate([30, 60, 30]); sound("success"); } else vibrate(10);
      return { ...p, count, total: p.total + 1 };
    });
  };
  const reset = () => { vibrate(15); setS((p) => ({ ...p, count: 0 })); };

  return (
    <div className="min-h-[100dvh] bg-background pb-nav flex flex-col">
      <div className="px-4"><PageHeader title="Tasbih" back="/Dashboard" /></div>
      <div className="max-w-md w-full mx-auto px-4 pt-3 flex-1 flex flex-col">
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
          {DHIKRS.map((x, i) => (
            <button key={i} onClick={() => setS((p) => ({ ...p, i, count: 0 }))}
              className={`h-10 px-3.5 rounded-xl border-2 text-[13px] font-extrabold whitespace-nowrap shrink-0 ${s.i === i ? "border-primary bg-accent text-primary" : "border-border bg-card text-foreground"}`}>{x.fr}</button>
          ))}
        </div>
        <div className="flex p-1 rounded-xl bg-muted mt-3" role="tablist" aria-label="Objectif">
          {TARGETS.map((t) => (
            <button key={t} role="tab" aria-selected={s.target === t} onClick={() => setS((p) => ({ ...p, target: t }))}
              className={`flex-1 h-8 rounded-lg text-[13px] font-extrabold ${s.target === t ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}>{t ? t : "Libre"}</button>
          ))}
        </div>

        <button onClick={tick} aria-label="Compter un grain"
          className="mt-6 mx-auto w-[260px] h-[260px] max-w-[75vw] max-h-[75vw] rounded-full bg-card border-2 border-border shadow-[0_6px_0_hsl(var(--border))] active:translate-y-[4px] active:shadow-[0_2px_0_hsl(var(--border))] transition-transform flex flex-col items-center justify-center select-none touch-manipulation">
          <span dir="rtl" className="font-arabic text-[26px] text-primary leading-tight px-6 text-center">{d.ar}</span>
          <span className="text-[64px] leading-none font-black mt-2 tabular-nums">{s.count}</span>
          <span className="text-[13px] font-extrabold text-muted-foreground mt-1">{s.target ? (reached ? `Objectif atteint (${Math.floor(s.count / s.target)}×)` : `sur ${s.target}`) : "Mode libre"}</span>
        </button>

        <div className="flex items-center justify-between mt-8">
          <p className="text-[13px] font-extrabold text-muted-foreground">Total : {s.total}</p>
          <button onClick={reset} className="h-10 px-4 rounded-xl border-2 border-border bg-card font-extrabold text-[14px] flex items-center gap-2">
            <ArrowCounterClockwise weight="bold" className="w-4 h-4" />Remettre à zéro
          </button>
        </div>
        <p className="text-[12.5px] font-semibold text-muted-foreground mt-4">Après chaque prière : 33 Subhan Allah, 33 Al-hamdu lillah, 33 Allahu akbar, puis La ilaha illa Allah (Muslim).</p>
      </div>
    </div>
  );
}
