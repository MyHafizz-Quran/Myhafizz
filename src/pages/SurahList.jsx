import React, { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { BookmarkSimple, MagnifyingGlass, CheckCircle, X } from "@phosphor-icons/react";
import { MemorizationProgress } from "@/api/entities";
import { SURAHS } from "@/components/quranData";
import { haptic } from "@/hooks/usePlatform";

const FILTERS = [
  { key: "all", label: "Toutes" },
  { key: "in_progress", label: "En cours" },
  { key: "completed", label: "Complètes" },
  { key: "not_started", label: "À commencer" },
];
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

export default function SurahList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const ref = useRef(null);
  const [params] = useSearchParams();
  useEffect(() => { if (params.get("search") === "1") setTimeout(() => ref.current?.focus(), 250); }, [params]);

  const { data: progress = [] } = useQuery({ queryKey: ["memorization-progress"], queryFn: () => MemorizationProgress.list() });
  const map = useMemo(() => Object.fromEntries(progress.map((p) => [p.surah_number, p])), [progress]);
  const statusOf = (n) => map[n]?.status || "not_started";
  const counts = {
    all: SURAHS.length,
    in_progress: SURAHS.filter((s) => statusOf(s.number) === "in_progress").length,
    completed: SURAHS.filter((s) => statusOf(s.number) === "completed").length,
    not_started: SURAHS.filter((s) => statusOf(s.number) === "not_started").length,
  };
  const q = norm(search);
  const list = SURAHS.filter((s) => (!search || s.name.includes(search) || norm(s.englishName).includes(q) || String(s.number) === search.trim())
    && (filter === "all" || statusOf(s.number) === filter));

  return (
    <div className="min-h-[100dvh] bg-background pb-nav">
      <div className="max-w-2xl mx-auto px-4 pt-[calc(env(safe-area-inset-top,0px)+16px)]">
        <div className="flex items-center justify-between">
          <h1 className="text-[28px] font-black">Coran</h1>
          <Link to="/Bookmarks" aria-label="Signets" className="w-10 h-10 rounded-full bg-card border-2 border-border flex items-center justify-center press"><BookmarkSimple weight="bold" className="w-5 h-5" /></Link>
        </div>

        <div className="relative mt-3">
          <MagnifyingGlass weight="bold" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input ref={ref} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nom ou numéro de sourate"
            className="w-full h-12 pl-11 pr-10 rounded-2xl border-2 border-border bg-card font-bold placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
          {search && <button onClick={() => setSearch("")} aria-label="Effacer" className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-muted flex items-center justify-center"><X weight="bold" className="w-3.5 h-3.5" /></button>}
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar mt-3 -mx-4 px-4 pb-1">
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => { haptic(); setFilter(f.key); }}
              className={`h-9 px-3.5 rounded-xl border-2 font-extrabold text-sm whitespace-nowrap shrink-0 ${filter === f.key ? "border-primary bg-accent text-accent-foreground" : "border-border bg-card text-muted-foreground"}`}>
              {f.label} <span className="opacity-70">{counts[f.key]}</span>
            </button>
          ))}
        </div>

        <div className="card-flat overflow-hidden divide-y-2 divide-border mt-3">
          {list.map((s) => {
            const p = map[s.number];
            const n = p?.memorized_verses?.length || 0;
            const done = p?.status === "completed";
            const pct = Math.round((n / s.numberOfAyahs) * 100);
            return (
              <button key={s.number} onClick={() => { haptic(); navigate(`/Memorize?surah=${s.number}`); }} className="w-full flex items-center gap-3 p-3.5 text-left active:bg-muted">
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${done ? "bg-primary text-primary-foreground" : n ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
                  {done ? <CheckCircle weight="fill" className="w-5 h-5" /> : s.number}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold truncate">{s.englishName}</p>
                  <p className="text-[12.5px] font-semibold text-muted-foreground">
                    {s.numberOfAyahs} versets · {s.revelationType === "Meccan" ? "mecquoise" : "médinoise"}{n > 0 && !done ? ` · ${pct} %` : ""}
                  </p>
                  {n > 0 && !done && <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1.5 max-w-[160px]"><div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} /></div>}
                </div>
                <span className="font-arabic text-[22px] text-accent-foreground shrink-0" dir="rtl">{s.name}</span>
              </button>
            );
          })}
          {!list.length && <p className="p-6 text-center font-bold text-muted-foreground">Aucune sourate ne correspond.</p>}
        </div>
      </div>
    </div>
  );
}
