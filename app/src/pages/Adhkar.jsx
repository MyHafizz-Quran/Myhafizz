import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/api/neonClient";
import { CheckCircle, ArrowCounterClockwise } from "@phosphor-icons/react";
import PageHeader from "@/components/PageHeader";
import { loadAdhkar, defaultPeriod, getCounts, setCounts, itemsFor } from "@/lib/adhkar";
import { vibrate, sound } from "@/lib/feedback";

const fois = (n) => (n === 1 ? "1 fois" : `${n} fois`);

/** Adhkar du matin et du soir (Hisn al-Muslim), avec compteur par dhikr. */
export default function Adhkar() {
  const [params] = useSearchParams();
  const [period, setPeriod] = useState(() => (["matin", "soir"].includes(params.get("p")) ? params.get("p") : defaultPeriod()));
  const [counts, setC] = useState(() => getCounts(period));
  useEffect(() => setC(getCounts(period)), [period]);
  const { data, isLoading, isError } = useQuery({ queryKey: ["adhkar"], queryFn: loadAdhkar, staleTime: Infinity });
  const list = useMemo(() => (data ? itemsFor(data.items, period) : []), [data, period]);
  const done = list.filter((x) => (counts[x.id] || 0) >= x.repeat).length;
  const qc = useQueryClient();
  // Adhkar terminés : la journée compte pour la série (une fois par période et par jour).
  useEffect(() => {
    if (!list.length || done < list.length) return;
    const key = `mh_adhkar_logged_${period}`;
    const today = new Date().toDateString();
    if (localStorage.getItem(key) === today) return;
    db.rpc("log_adhkar_day").then(({ error }) => {
      if (error) return;
      localStorage.setItem(key, today);
      qc.invalidateQueries({ queryKey: ["activity-days"] });
    });
  }, [done, list.length, period, qc]);

  const tap = (x) => {
    const n = counts[x.id] || 0; if (n >= x.repeat) return;
    const next = { ...counts, [x.id]: n + 1 };
    setC(next); setCounts(period, next);
    if (n + 1 >= x.repeat) { vibrate([12, 40, 12]); sound("success"); } else vibrate(8);
  };
  const reset = (x) => { const next = { ...counts }; delete next[x.id]; setC(next); setCounts(period, next); };

  return (
    <div className="min-h-[100dvh] bg-background pb-nav">
      <div className="px-4"><PageHeader title="Adhkar" back="/Dashboard" /></div>
      <div className="max-w-md lg:max-w-2xl mx-auto px-4 pt-3">
        <div className="flex p-1 rounded-xl bg-muted" role="tablist" aria-label="Moment">
          {[["matin", "Matin"], ["soir", "Soir"]].map(([v, l]) => (
            <button key={v} role="tab" aria-selected={period === v} onClick={() => setPeriod(v)}
              className={`flex-1 h-9 rounded-lg text-[14px] font-extrabold ${period === v ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}>{l}</button>
          ))}
        </div>
        <div className="flex items-center justify-between mt-4">
          <p className="font-black text-[17px]">{period === "matin" ? "Après Fajr, jusqu'au lever du soleil" : "Après Asr, jusqu'au coucher du soleil"}</p>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${list.length ? (done / list.length) * 100 : 0}%` }} /></div>
          <span className="text-[13px] font-extrabold text-muted-foreground">{done} / {list.length}</span>
        </div>
        {list.length > 0 && done === list.length && (
          <div className="card-flat p-3.5 mt-3 flex items-center gap-3">
            <CheckCircle weight="fill" className="w-7 h-7 text-primary shrink-0" />
            <p className="font-extrabold text-[14.5px]">Adhkar {period === "matin" ? "du matin" : "du soir"} terminés. Ta journée compte pour ta série.</p>
          </div>
        )}

        {isError && <p className="mt-6 text-center font-semibold text-muted-foreground">Chargement…</p>}
        {isLoading && <div className="h-64 rounded-2xl bg-muted animate-pulse mt-4" />}

        <div className="space-y-3 mt-4">
          {list.map((x) => {
            const n = counts[x.id] || 0, ok = n >= x.repeat;
            const arSoir = period === "soir" && x.ar_soir, frSoir = period === "soir" && x.fr_soir;
            return (
              <div key={x.id} className={`card-flat overflow-hidden ${ok ? "opacity-60" : ""}`}>
                <button onClick={() => tap(x)} className="w-full text-left p-4 active:bg-muted" aria-label={ok ? "Fait" : `Compter, ${n} sur ${x.repeat}`}>
                  <p dir="rtl" className="font-arabic text-[24px] leading-[2] text-right text-foreground">{x.ar}</p>
                  {arSoir && <p dir="rtl" className="font-arabic text-[19px] leading-[1.9] text-right text-muted-foreground mt-1">{x.ar_soir}</p>}
                  <p className="text-[14.5px] font-semibold text-foreground/80 leading-relaxed mt-2">{x.fr}</p>
                  {frSoir && <p className="text-[13.5px] font-bold text-primary leading-relaxed mt-1.5">{x.fr_soir}</p>}
                  {x.note && <p className="text-[12.5px] font-bold text-muted-foreground mt-1.5">{x.note}</p>}
                </button>
                <div className="border-t-2 border-border flex items-center gap-2 px-4 py-2.5">
                  {ok ? <CheckCircle weight="fill" className="w-6 h-6 text-primary" /> : <span className="text-[13px] font-extrabold text-muted-foreground">{fois(x.repeat)}</span>}
                  <div className="flex-1" />
                  {n > 0 && <button onClick={() => reset(x)} aria-label="Recommencer ce dhikr" className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground"><ArrowCounterClockwise weight="bold" className="w-4 h-4" /></button>}
                  <button onClick={() => tap(x)} disabled={ok} className={`btn-relief h-10 min-w-[84px] px-4 text-[15px] ${ok ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"}`}>
                    {ok ? "Fait" : `${n} / ${x.repeat}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {data && <p className="text-[12px] font-semibold text-muted-foreground mt-5 mb-2">Texte arabe : {data.source}. Traduction française du sens.</p>}
      </div>
    </div>
  );
}
