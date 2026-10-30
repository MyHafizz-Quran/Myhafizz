import React, { useState, useRef, useEffect as useEffectSL } from "react";
import { MemorizationProgress } from "@/api/entities";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import { BookmarkSimple } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { Search } from "@/components/icons";
import { Input } from "@/components/ui/input";
import SurahCard from "@/components/SurahCard";
import { SURAHS } from "@/components/quranData";

const FILTERS = [
  { key: "all", label: "Toutes", color: "primary" },
  { key: "completed", label: "Complètes ✓", color: "emerald" },
  { key: "in_progress", label: "En cours", color: "amber" },
  { key: "not_started", label: "Non commencées", color: "muted" },
];

export default function SurahList() {
  const [search, setSearch] = useState("");
  const searchRef = useRef(null);
  const [params] = useSearchParams();
  useEffectSL(() => {
    if (params.get("search") === "1") setTimeout(() => searchRef.current?.focus(), 250);
  }, [params]);
  const [filter, setFilter] = useState("all");

  const { data: progressList = [] } = useQuery({
    queryKey: ["memorization-progress"],
    queryFn: () => MemorizationProgress.list(),
  });

  const progressMap = {};
  progressList.forEach(p => { progressMap[p.surah_number] = p; });

  const counts = {
    all: SURAHS.length,
    completed: progressList.filter(p => p.status === "completed").length,
    in_progress: progressList.filter(p => p.status === "in_progress").length,
    not_started: SURAHS.length - progressList.filter(p => p.status !== "not_started").length,
  };

  const filteredSurahs = SURAHS.filter(surah => {
    const matchesSearch =
      surah.name.includes(search) ||
      surah.englishName.toLowerCase().includes(search.toLowerCase()) ||
      surah.number.toString().includes(search);
    const status = progressMap[surah.number]?.status || "not_started";
    if (filter === "all") return matchesSearch;
    return matchesSearch && status === filter;
  });

  return (
    <div className="min-h-screen bg-surface">
      {/* ─── HEADER OPAQUE ─── */}
      <div className="bg-surface/95 backdrop-blur-xl sticky top-0 z-[var(--z-page-header)] pb-4">
        <div className="max-w-4xl mx-auto px-5 pt-6">
          {/* Top row */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1">
              <h1 className="font-headline text-3xl font-extrabold text-primary tracking-tight">Bibliothèque</h1>
              <p className="font-body text-on-surface-variant text-sm mt-1">Poursuivez votre voyage à travers le Saint Coran.</p>
            </div>
            <Link to="/Bookmarks" aria-label="Signets" className="w-11 h-11 rounded-full border-2 border-border bg-card flex items-center justify-center text-primary shrink-0 press"><BookmarkSimple weight="fill" className="w-5 h-5" /></Link>
          </div>

          {/* Search bar */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant/50 pointer-events-none" />
            <Input
              ref={searchRef}
              type="search"
              enterKeyHint="search"
              placeholder="Rechercher une sourate..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-12 h-14 rounded-2xl bg-surface-container-low border-transparent focus:border-primary-fixed focus:bg-surface-container focus:ring-1 focus:ring-primary-fixed placeholder:text-on-surface-variant/40 font-body text-base"
            />
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
            {FILTERS.map(f => {
              const isActive = filter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full font-label text-xs font-bold transition-all duration-300 ${
                    isActive
                      ? "bg-primary text-on-primary shadow-sm"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                  }`}
                >
                  {f.label}
                  <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black ${
                    isActive ? "bg-on-primary/20 text-on-primary" : "bg-surface-container-highest text-on-surface-variant"
                  }`}>
                    {counts[f.key]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── LISTE DES SOURATES ─── */}
      <div className="max-w-4xl mx-auto px-6 py-6 pb-32">
        {filteredSurahs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredSurahs.map((surah, i) => (
              <SurahCard
                key={surah.number}
                surah={surah}
                progress={progressMap[surah.number]}
                index={i}
              />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-24 bg-surface-container-lowest rounded-[2rem] border border-outline-variant/10"
          >
            <div className="w-16 h-16 bg-surface-container rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-7 h-7 text-primary/40" />
            </div>
            <p className="font-headline font-bold text-xl text-primary">Aucune sourate trouvée</p>
            <p className="font-body text-on-surface-variant text-sm mt-2 max-w-xs mx-auto">Essayez un autre terme de recherche ou changez de filtre.</p>
            <button
              onClick={() => { setSearch(""); setFilter("all"); }}
              className="mt-6 text-sm font-label font-bold text-primary bg-primary/10 px-6 py-2 rounded-full hover:bg-primary/20 transition-colors"
            >
              Réinitialiser les filtres
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
