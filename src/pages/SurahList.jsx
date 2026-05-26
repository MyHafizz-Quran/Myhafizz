import React, { useState } from "react";
import { MemorizationProgress } from "@/api/entities";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
<<<<<<< HEAD
import { Search, ArrowLeft } from "lucide-react";
=======
import { Search, BookMarked, ArrowLeft } from "lucide-react";
>>>>>>> 7f0356aab4c376641d3aa5b6c0c4f22b935a7fe0
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
<<<<<<< HEAD
    <div className="min-h-screen bg-surface">
      {/* ─── HEADER OPAQUE ─── */}
      <div className="bg-surface/95 backdrop-blur-xl sticky top-0 z-[var(--z-page-header)] pb-4">
        <div className="max-w-4xl mx-auto px-6 pt-12">
          {/* Top row */}
          <div className="flex items-center gap-3 mb-6">
            <Link to="/Dashboard">
              <button className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary hover:bg-surface-container-high transition-all">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div className="flex-1">
              <h1 className="font-headline text-3xl font-extrabold text-primary tracking-tight">Bibliothèque</h1>
              <p className="font-body text-on-surface-variant text-sm mt-1">Poursuivez votre voyage à travers le Saint Coran.</p>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant/50 pointer-events-none" />
=======
    <div className="min-h-screen bg-background isolate">
      {/* ─── HEADER STICKY — fond opaque pour empêcher le scroll-through ─── */}
      <div className="bg-white/[0.97] dark:bg-gray-950/[0.97] backdrop-blur-xl border-b border-border/60 sticky top-0 z-[var(--z-page-header)] shadow-[0_2px_8px_rgba(0,0,0,0.05)] dark:shadow-none">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          {/* Top row */}
          <div className="flex items-center gap-3 mb-4">
            <Link to="/Dashboard">
              <button className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted active:scale-95 transition-all">
                <ArrowLeft className="w-4.5 h-4.5" />
              </button>
            </Link>
            <div className="flex items-center gap-2.5 flex-1">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center">
                <BookMarked className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h1 className="text-lg font-black text-foreground leading-tight">Les Sourates</h1>
                <p className="text-[11px] text-muted-foreground font-medium -mt-0.5">Le Saint Coran</p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1.5 rounded-full border border-emerald-200/50 dark:border-emerald-800/50">
              {filteredSurahs.length} / 114
            </span>
          </div>

          {/* Search bar */}
          <div className="relative mb-3">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
>>>>>>> 7f0356aab4c376641d3aa5b6c0c4f22b935a7fe0
            <Input
              placeholder="Rechercher une sourate..."
              value={search}
              onChange={e => setSearch(e.target.value)}
<<<<<<< HEAD
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
=======
              className="pl-10 h-11 rounded-2xl bg-muted/60 border-border/50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 placeholder:text-muted-foreground/50 text-sm"
            />
          </div>

          {/* Filter pills with counts */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-hide -mx-1 px-1">
            {FILTERS.map(f => {
              const isActive = filter === f.key;
              return (
                <motion.button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  whileTap={{ scale: 0.93 }}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                    isActive
                      ? f.key === "completed" ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/25"
                      : f.key === "in_progress" ? "bg-amber-500 text-white shadow-md shadow-amber-500/25"
                      : f.key === "not_started" ? "bg-gray-500 text-white shadow-md shadow-gray-500/25"
                      : "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                      : "bg-muted/80 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {f.label}
                  <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-lg text-[10px] font-black ${
                    isActive ? "bg-white/25 text-white" : "bg-border/80 text-muted-foreground"
                  }`}>
                    {counts[f.key]}
                  </span>
                </motion.button>
>>>>>>> 7f0356aab4c376641d3aa5b6c0c4f22b935a7fe0
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── LISTE DES SOURATES ─── */}
<<<<<<< HEAD
      <div className="max-w-4xl mx-auto px-6 py-6 pb-32">
        {filteredSurahs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
=======
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5">
        {filteredSurahs.length > 0 ? (
          <div className="space-y-2.5">
>>>>>>> 7f0356aab4c376641d3aa5b6c0c4f22b935a7fe0
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
<<<<<<< HEAD
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
=======
            className="text-center py-24"
          >
            <div className="w-16 h-16 bg-muted/60 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-7 h-7 text-muted-foreground/60" />
            </div>
            <p className="text-foreground font-bold text-base">Aucune sourate trouvée</p>
            <p className="text-muted-foreground text-sm mt-1.5 max-w-xs mx-auto">Essayez un autre terme de recherche ou changez de filtre</p>
            <button
              onClick={() => { setSearch(""); setFilter("all"); }}
              className="mt-4 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
>>>>>>> 7f0356aab4c376641d3aa5b6c0c4f22b935a7fe0
            >
              Réinitialiser les filtres
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
