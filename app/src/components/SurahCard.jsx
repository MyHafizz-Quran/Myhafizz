import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "@/components/icons";

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
                  : "bg-primary-fixed-dim "
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
      </Link>
    </motion.div>
  );
}
