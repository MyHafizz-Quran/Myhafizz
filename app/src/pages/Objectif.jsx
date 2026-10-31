import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import { MemorizationProgress } from "@/api/entities";
import { PRESETS, getSeason, setSeason, seasonStatus } from "@/lib/season";
import { ramadanInfo } from "@/lib/hijri";
import { todayStr } from "@/lib/srs";

/** Choisir un objectif de saison et voir le rythme à tenir. */
export default function Objectif() {
  const navigate = useNavigate();
  const { data: progress = [] } = useQuery({ queryKey: ["memorization-progress"], queryFn: () => MemorizationProgress.list() });
  const current = getSeason();
  const r = ramadanInfo();
  const beforeRamadan = r.date ? (() => { const d = new Date(r.date); d.setDate(d.getDate() - 1); return todayStr(d); })() : null;
  const [preset, setPreset] = useState(current?.preset || "amma");
  const [deadline, setDeadline] = useState(current?.deadline || beforeRamadan || todayStr(new Date(Date.now() + 90 * 864e5)));
  const preview = seasonStatus({ preset, deadline }, progress);

  const save = () => { setSeason({ preset, deadline }); navigate("/Dashboard"); };

  return (
    <div className="min-h-[100dvh] bg-background pb-nav">
      <PageHeader title="Objectif de saison" back="/Dashboard" />
      <div className="max-w-md lg:max-w-2xl mx-auto px-4 pt-4">
        <p className="text-[13px] font-extrabold text-muted-foreground mb-2">Quoi</p>
        <div className="card-flat divide-y-2 divide-border">
          {PRESETS.map((p) => (
            <label key={p.id} className="flex items-center gap-3 px-4 h-[52px] cursor-pointer">
              <input type="radio" name="preset" checked={preset === p.id} onChange={() => setPreset(p.id)} className="w-5 h-5 accent-[hsl(var(--primary))]" />
              <span className="font-extrabold">{p.label}</span>
            </label>
          ))}
        </div>
        <p className="text-[13px] font-extrabold text-muted-foreground mt-5 mb-2">Pour quand</p>
        <div className="card-flat p-4">
          <input type="date" value={deadline} min={todayStr(new Date())} onChange={(e) => setDeadline(e.target.value)} className="w-full h-12 rounded-xl border-2 border-border bg-background px-3 font-extrabold" />
          {beforeRamadan && <button onClick={() => setDeadline(beforeRamadan)} className="mt-2 text-[13px] font-extrabold text-primary">Avant Ramadan</button>}
        </div>
        {preview && (
          <div className="card-flat p-4 mt-4">
            <p className="font-black">{preview.left === 0 ? "Objectif déjà atteint" : `${preview.perDay} verset${preview.perDay > 1 ? "s" : ""} par jour`}</p>
            <p className="text-[13px] font-semibold text-muted-foreground mt-0.5">{preview.done} sur {preview.total} versets déjà mémorisés · {preview.daysLeft} jours restants</p>
          </div>
        )}
        <button onClick={save} className="btn-relief w-full h-[50px] mt-5 bg-primary text-primary-foreground">Enregistrer l'objectif</button>
        {current && <button onClick={() => { setSeason(null); navigate("/Dashboard"); }} className="w-full h-11 mt-2 font-extrabold text-muted-foreground">Retirer l'objectif</button>}
      </div>
    </div>
  );
}
