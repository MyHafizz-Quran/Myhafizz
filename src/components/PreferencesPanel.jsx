import React, { useState } from "react";
import { Settings2, ChevronDown, Eye, EyeOff, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { RECITERS } from "@/components/ReciterSelector";

export default function PreferencesPanel({ reciter, onReciterChange, allHidden, onToggleAllHidden, showPhonetic, onTogglePhonetic, hideVisibilityToggle = false }) {
  const [open, setOpen] = useState(false);
  const current = RECITERS.find(r => r.id === reciter) || RECITERS[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-white border border-gray-200 hover:border-emerald-300 rounded-xl px-3 py-2 text-sm transition-colors shadow-sm"
      >
        <Settings2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
        <span className="font-medium text-gray-700">Mes préférences</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-[var(--z-dropdown)]" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full mt-2 left-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl z-[calc(var(--z-dropdown)+1)] w-[300px] overflow-hidden"
            >
              <div className="p-3 space-y-4">
                {/* Section: Affichage */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">Affichage</p>
                  {!hideVisibilityToggle && (
                  <button
                    onClick={onToggleAllHidden}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                      allHidden ? "bg-amber-50 text-amber-700" : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    {allHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    <span className="text-sm font-medium">{allHidden ? "Révéler tous les versets" : "Masquer tous les versets"}</span>
                  </button>
                  )}
                  <button
                    onClick={onTogglePhonetic}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                      showPhonetic ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span className="text-sm font-medium">Lecture phonétique (translittération)</span>
                    {showPhonetic && <span className="ml-auto w-2 h-2 rounded-full bg-blue-500" />}
                  </button>
                </div>

                {/* Separator */}
                <div className="border-t border-gray-100" />

                {/* Section: Récitateur */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">Récitateur</p>
                  <div className="space-y-0.5">
                    {RECITERS.map(r => (
                      <button
                        key={r.id}
                        onClick={() => { onReciterChange(r.id); setOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                          r.id === reciter ? "bg-emerald-50 text-emerald-700" : "hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        <span className="text-xl leading-none">{r.flag}</span>
                        <div>
                          <p className="text-sm font-medium">{r.name}</p>
                          <p className="text-xs text-gray-400" style={{ fontFamily: "serif" }}>{r.nameAr}</p>
                        </div>
                        {r.id === reciter && <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}