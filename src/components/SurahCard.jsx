import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
<<<<<<< HEAD
import { CheckCircle2 } from "lucide-react";
=======
import { ChevronRight, CheckCircle2 } from "lucide-react";
import ProgressRing from "./ProgressRing";
>>>>>>> 7f0356aab4c376641d3aa5b6c0c4f22b935a7fe0

const STATUS_STYLES = {
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/50",
  not_started: "bg-gray-100 text-gray-500 dark:bg-gray-800/60 dark:text-gray-500 border border-gray-200/50 dark:border-gray-700/50",
};

const STATUS_LABELS = {
  completed: "Complète",
  in_progress: "En cours",
  not_started: "Non commencée",
};

export default function SurahCard({ surah, progress, index }) {
  const memorizedCount = progress?.memorized_verses?.length || 0;
  const totalVerses = surah.numberOfAyahs;
  const percent = totalVerses > 0 ? (memorizedCount / totalVerses) * 100 : 0;
  const status = progress?.status || "not_started";
  const revelationLabel = surah.revelationType === "Meccan" ? "Mecquoise" : "Médinoise";
  const isComplete = status === "completed";
  const isInProgress = status === "in_progress";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.012, 0.35), duration: 0.3 }}
    >
      <Link
        to={`/Memorize?surah=${surah.number}`}
<<<<<<< HEAD
        className={`block group relative rounded-[2rem] p-6 transition-all duration-400 border hover:shadow-2xl hover:shadow-primary/5 ${
          isComplete 
            ? "bg-primary-container/10 border-primary/20 hover:border-primary/40" 
            : isInProgress
            ? "bg-surface-container-low border-transparent hover:border-outline-variant/30"
            : "bg-surface-container-lowest border-transparent hover:border-outline-variant/20"
        }`}
      >
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-label font-bold transition-colors duration-400 ${
              isComplete
                ? "bg-primary text-on-primary"
                : "bg-surface-container text-primary group-hover:bg-primary group-hover:text-on-primary"
            }`}>
              {surah.number.toString().padStart(2, '0')}
            </div>
            <div>
              <h3 className="font-headline text-xl font-bold text-primary">{surah.englishName}</h3>
              <p className="font-label text-xs text-on-surface-variant tracking-widest uppercase">{totalVerses} VERSets • {revelationLabel}</p>
            </div>
          </div>
          <span className="text-3xl font-arabic text-primary opacity-20 group-hover:opacity-100 transition-opacity duration-500">{surah.name}</span>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <span className="font-label text-xs font-semibold text-primary">Mémorisé</span>
            <span className="font-label text-xs font-bold text-primary">{Math.round(percent)}%</span>
          </div>
          <div className="h-3 w-full bg-surface-container rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ delay: Math.min(index * 0.015, 0.4) + 0.2, duration: 0.8, ease: "easeOut" }}
              className={`h-full rounded-full transition-all duration-700 ${
                isComplete
                  ? "bg-primary"
                  : "bg-gradient-to-r from-primary-fixed-dim to-primary"
              }`}
            />
          </div>
        </div>

        {/* Status Label (optional but nice for French explicit state) */}
        {isComplete && (
          <div className="absolute top-6 right-6 flex flex-col items-end">
            <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
               <CheckCircle2 className="w-3.5 h-3.5 text-white" strokeWidth={3} />
            </div>
          </div>
        )}
=======
        className={`group relative flex items-center gap-3.5 sm:gap-4 p-3.5 sm:p-4 rounded-2xl border bg-white dark:bg-gray-900/80 transition-all duration-200 active:scale-[0.98] ${
          isComplete
            ? "border-emerald-200/60 dark:border-emerald-800/40 hover:border-emerald-300 dark:hover:border-emerald-700/60 hover:shadow-lg hover:shadow-emerald-100/60 dark:hover:shadow-none"
            : isInProgress
            ? "border-amber-200/40 dark:border-amber-800/30 hover:border-amber-300 dark:hover:border-amber-700/50 hover:shadow-lg hover:shadow-amber-100/50 dark:hover:shadow-none"
            : "border-border/60 hover:border-border hover:shadow-md hover:shadow-black/[0.03] dark:hover:shadow-none"
        } hover:-translate-y-0.5`}
      >
        {/* ─── Diamond number ─── */}
        <div className="flex-shrink-0 relative w-12 h-12 flex items-center justify-center">
          <div
            className={`w-10 h-10 rotate-45 rounded-[10px] ${
              isComplete
                ? "bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-md shadow-emerald-500/30 dark:shadow-emerald-500/10"
                : isInProgress
                ? "bg-gradient-to-br from-amber-400 to-amber-600 shadow-md shadow-amber-400/30 dark:shadow-amber-400/10"
                : "bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800"
            }`}
          />
          <span className={`absolute font-black text-xs ${
            isComplete || isInProgress ? "text-white" : "text-gray-500 dark:text-gray-400"
          }`}>
            {surah.number}
          </span>
          {/* Checkmark for completed */}
          {isComplete && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 shadow-sm">
              <CheckCircle2 className="w-3 h-3 text-white" strokeWidth={3} />
            </div>
          )}
        </div>

        {/* ─── Info ─── */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <h3 className="font-arabic font-bold text-foreground text-[15px] leading-tight">
              {surah.name}
            </h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full leading-none ${STATUS_STYLES[status]}`}>
              {isComplete && "✓ "}{STATUS_LABELS[status]}
            </span>
          </div>
          <p className="text-[13px] text-muted-foreground mt-0.5 leading-snug">
            {surah.englishName}
            <span className="text-border mx-1.5">·</span>
            {totalVerses} versets
            <span className="text-border mx-1.5">·</span>
            <span className="text-xs">{revelationLabel}</span>
          </p>

          {/* Progress bar — always visible but different for each status */}
          <div className="flex items-center gap-2.5 mt-2">
            <div className="flex-1 max-w-[120px] bg-muted/80 rounded-full h-[5px] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ delay: Math.min(index * 0.015, 0.4) + 0.2, duration: 0.8, ease: "easeOut" }}
                className={`h-full rounded-full ${
                  isComplete
                    ? "bg-gradient-to-r from-emerald-400 to-emerald-600"
                    : isInProgress
                    ? "bg-gradient-to-r from-amber-400 to-amber-500"
                    : "bg-gray-200 dark:bg-gray-700"
                }`}
              />
            </div>
            <span className={`text-[11px] font-semibold flex-shrink-0 ${
              isComplete ? "text-emerald-600 dark:text-emerald-400"
              : isInProgress ? "text-amber-600 dark:text-amber-400"
              : "text-muted-foreground"
            }`}>
              {memorizedCount}/{totalVerses}
            </span>
          </div>
        </div>

        {/* ─── Progress ring (desktop) ─── */}
        <div className="flex-shrink-0 hidden sm:block">
          <ProgressRing
            progress={percent}
            size={44}
            strokeWidth={4}
            color={isComplete ? "#059669" : isInProgress ? "#f59e0b" : "#d1d5db"}
          />
        </div>

        <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-all duration-200 ${
          isComplete ? "text-emerald-400 group-hover:text-emerald-500"
          : isInProgress ? "text-amber-400 group-hover:text-amber-500"
          : "text-muted-foreground/50 group-hover:text-muted-foreground"
        } group-hover:translate-x-0.5`} />
>>>>>>> 7f0356aab4c376641d3aa5b6c0c4f22b935a7fe0
      </Link>
    </motion.div>
  );
}
