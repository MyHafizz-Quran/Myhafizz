// « Mes progrès » (maquette validée le 01/11/2026) : versets par semaine, régularité 13 semaines, solidité de la mémoire.
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpenText, Fire, ShareNetwork } from "@phosphor-icons/react";
import { db } from "@/api/neonClient";
import PageHeader from "@/components/PageHeader";
import { haptic } from "@/hooks/usePlatform";
import { report } from "@/lib/report";

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function WeekCurve({ weeks }) {
  const W = 300, H = 120, pad = 8;
  const max = Math.max(4, ...weeks.map((w) => w.n));
  const pts = weeks.map((w, i) => [pad + (i * (W - 2 * pad)) / (weeks.length - 1), H - 22 - (w.n / max) * (H - 40)]);
  // Courbe lissée (Catmull-Rom → Bézier)
  const path = pts.map((p, i) => {
    if (!i) return `M${p[0]},${p[1]}`;
    const p0 = pts[i - 2] || pts[i - 1], p1 = pts[i - 1], p3 = pts[i + 1] || p;
    return `C${p1[0] + (p[0] - p0[0]) / 6},${p1[1] + (p[1] - p0[1]) / 6} ${p[0] - (p3[0] - p1[0]) / 6},${p[1] - (p3[1] - p1[1]) / 6} ${p[0]},${p[1]}`;
  }).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Versets appris par semaine">
      <path d={`${path} L${last[0]},${H - 22} L${pts[0][0]},${H - 22} Z`} fill="hsl(var(--primary) / 0.12)" />
      <path d={path} fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" />
      {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 4.5 : 3} fill="hsl(var(--primary))" />)}
      {weeks.map((w, i) => (i % 2 === 1 || i === weeks.length - 1) && (
        <text key={w.w} x={pts[i][0]} y={H - 6} textAnchor="middle" fontSize="10" fontWeight="700" fill="hsl(var(--muted-foreground))">
          {i === weeks.length - 1 ? "Cette sem." : `${+w.w.slice(8)}/${+w.w.slice(5, 7)}`}
        </text>
      ))}
      <text x={last[0]} y={last[1] - 9} textAnchor="end" fontSize="11" fontWeight="900" fill="hsl(var(--foreground))">{weeks[weeks.length - 1].n}</text>
    </svg>
  );
}

function Regularite({ days }) {
  const set = new Set(days);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  // 13 colonnes (semaines) × 7 lignes, la dernière colonne finit aujourd'hui
  const start = new Date(today); start.setDate(today.getDate() - 90);
  const cells = [...Array(91)].map((_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return set.has(iso(d)); });
  const cols = [...Array(13)].map((_, c) => cells.slice(c * 7, c * 7 + 7));
  return (
    <div className="flex gap-[3px]">
      {cols.map((col, c) => (
        <div key={c} className="flex-1 flex flex-col gap-[3px]">
          {col.map((on, r) => <i key={r} className={`block aspect-square rounded-[4px] ${on ? "bg-primary" : "bg-muted"}`} />)}
        </div>
      ))}
    </div>
  );
}

export default function Progres() {
  const { data: p, isLoading } = useQuery({
    queryKey: ["my-progress"],
    queryFn: async () => { const { data, error } = await db.rpc("my_progress"); if (error) throw error; return data; },
  });
  const share = async () => {
    haptic();
    const text = `J'ai ${p.verses} versets en mémoire sur MyHafizz, dont ${p.verses_week} cette semaine. Série : ${p.streak} jour${p.streak > 1 ? "s" : ""}.`;
    try { if (navigator.share) await navigator.share({ title: "Mes progrès", text, url: "https://www.myhafizz.com" }); else await navigator.clipboard.writeText(`${text} https://www.myhafizz.com`); }
    catch (e) { if (e?.name !== "AbortError") report(e, "progres:share"); }
  };
  const tot = p ? p.solid + p.medium + p.weak : 0;
  const active = p ? p.days.length : 0;
  return (
    <div className="max-w-2xl mx-auto px-4 pb-6">
      <PageHeader title="Mes progrès" back="/Profile" />
      {isLoading || !p ? (
        <div className="space-y-3 animate-pulse mt-2" aria-hidden="true"><div className="grid grid-cols-2 gap-3"><div className="h-24 rounded-2xl bg-muted" /><div className="h-24 rounded-2xl bg-muted" /></div><div className="h-44 rounded-2xl bg-muted" /><div className="h-40 rounded-2xl bg-muted" /></div>
      ) : (
        <div className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="card-flat p-4">
              <p className="text-[13px] font-extrabold text-muted-foreground flex items-center gap-1.5"><BookOpenText weight="bold" className="w-4 h-4 text-primary" />Versets</p>
              <p className="text-[28px] font-black leading-tight mt-1">{p.verses}</p>
              <p className="text-[13px] font-extrabold text-primary">{p.verses_week ? `+${p.verses_week} cette semaine` : "rien encore cette semaine"}</p>
            </div>
            <div className="card-flat p-4">
              <p className="text-[13px] font-extrabold text-muted-foreground flex items-center gap-1.5"><Fire weight="fill" className="w-4 h-4 text-[#F2B530]" />Série</p>
              <p className="text-[28px] font-black leading-tight mt-1 text-[#D99A12]">{p.streak} j</p>
              <p className="text-[13px] font-extrabold text-muted-foreground">record {p.best} j</p>
            </div>
          </div>

          <div className="card-flat p-4">
            <p className="font-black">Versets appris par semaine</p>
            <p className="text-[13px] font-bold text-muted-foreground mb-2">8 dernières semaines</p>
            <WeekCurve weeks={p.weeks} />
          </div>

          <div className="card-flat p-4">
            <p className="font-black">Régularité</p>
            <p className="text-[13px] font-bold text-muted-foreground mb-3">{active ? `${active} jour${active > 1 ? "s" : ""} actif${active > 1 ? "s" : ""} sur les 13 dernières semaines` : "Chaque jour où tu travailles se colore ici."}</p>
            <Regularite days={p.days} />
          </div>

          <div className="card-flat p-4">
            <p className="font-black">Solidité de ta mémoire</p>
            {!tot ? <p className="text-[13px] font-bold text-muted-foreground mt-1">Mémorise tes premiers versets pour voir leur solidité.</p> : (
              <>
                <p className="text-[13px] font-bold text-muted-foreground mt-1">Bien ancrés {p.solid} · À consolider {p.medium} · Encore fragiles {p.weak}</p>
                <div className="flex h-3.5 rounded-full overflow-hidden bg-muted mt-3">
                  <i className="block bg-primary" style={{ width: `${(p.solid / tot) * 100}%` }} />
                  <i className="block bg-accent" style={{ width: `${(p.medium / tot) * 100}%` }} />
                  <i className="block bg-[#F2B530]" style={{ width: `${(p.weak / tot) * 100}%` }} />
                </div>
                <p className="text-[12.5px] font-bold text-muted-foreground mt-2">Un verset devient « bien ancré » quand tes révisions sont espacées de 3 semaines ou plus.</p>
              </>
            )}
          </div>

          {p.verses > 0 && (
            <button onClick={share} className="btn-relief press w-full h-12 rounded-2xl bg-primary text-primary-foreground font-black flex items-center justify-center gap-2">
              <ShareNetwork weight="bold" className="w-5 h-5" />Partager mes progrès
            </button>
          )}
        </div>
      )}
    </div>
  );
}
