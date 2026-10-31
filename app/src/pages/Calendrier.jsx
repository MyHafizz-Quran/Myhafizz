import React, { useMemo } from "react";
import PageHeader from "@/components/PageHeader";
import { hijri, hijriLabel, upcoming, ramadanInfo, inDaysLabel, MONTHS } from "@/lib/hijri";

const fmt = (d) => d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

/** Date hégirienne du jour et jours importants à venir. */
export default function Calendrier() {
  const h = hijri();
  const events = useMemo(() => {
    const all = upcoming(400);
    // un seul groupe « jours blancs » par mois, pour une liste lisible
    const out = []; const seen = new Set();
    for (const e of all) {
      if (e.white) { const k = `${e.h.y}-${e.h.m}`; if (seen.has(k)) continue; seen.add(k); out.push({ ...e, name: `Jours blancs de ${MONTHS[e.h.m - 1]}`, note: "13, 14 et 15 du mois : jeûne recommandé" }); }
      else out.push(e);
    }
    return out.slice(0, 14);
  }, []);
  const r = ramadanInfo();

  return (
    <div className="min-h-[100dvh] bg-background pb-nav">
      <div className="px-4"><PageHeader title="Calendrier" back="/Dashboard" /></div>
      <div className="max-w-md lg:max-w-2xl mx-auto px-4 pt-4">
        <div className="card-flat p-5">
          <p className="text-[13px] font-extrabold text-muted-foreground first-letter:uppercase">{fmt(new Date())}</p>
          <p className="font-black text-[26px] leading-tight mt-1">{hijriLabel()}</p>
          <p className="text-[13px] font-semibold text-muted-foreground mt-1">
            {r.during ? `Ramadan, jour ${r.day}` : r.inDays != null ? `Ramadan dans ${r.inDays} jours (vers le ${r.date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })})` : ""}
          </p>
        </div>

        <p className="text-[13px] font-extrabold text-muted-foreground mt-6 mb-2">À venir</p>
        <div className="card-flat divide-y-2 divide-border">
          {events.map((e, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="w-12 shrink-0 text-center">
                <p className="text-[20px] font-black leading-none">{e.date.getDate()}</p>
                <p className="text-[11px] font-extrabold text-muted-foreground uppercase">{e.date.toLocaleDateString("fr-FR", { month: "short" })}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-extrabold leading-snug">{e.name}</p>
                <p className="text-[12.5px] font-semibold text-muted-foreground">{e.note || `${e.h.d} ${MONTHS[e.h.m - 1]} ${e.h.y}`}</p>
              </div>
              <span className={`text-[12px] font-extrabold shrink-0 ${e.inDays <= 1 ? "text-primary" : "text-muted-foreground"}`}>{inDaysLabel(e.inDays)}</span>
            </div>
          ))}
        </div>
        <p className="text-[12px] font-semibold text-muted-foreground mt-4">Calendrier Umm al-Qura. Le début des mois peut varier d'un jour selon l'observation du croissant dans ton pays.</p>
        <p className="sr-only">Mois en cours : {MONTHS[h.m - 1]}</p>
      </div>
    </div>
  );
}
