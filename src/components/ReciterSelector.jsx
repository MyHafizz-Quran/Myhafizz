import React, { useState } from "react";
import { ChevronDown, Mic } from "@/components/icons";
import { motion, AnimatePresence } from "framer-motion";

export const RECITERS = [
  { id: "ar.alafasy", name: "Mishary Al-Afasy", nameAr: "مشاري العفاسي", flag: "🇰🇼" },
  { id: "ar.husary", name: "Mahmoud Khalil Al-Husary", nameAr: "محمود خليل الحصري", flag: "🇪🇬" },
  { id: "ar.minshawi", name: "Mohamed Siddiq Al-Minshawi", nameAr: "محمد صديق المنشاوي", flag: "🇪🇬" },
  { id: "ar.mahermuaiqly", name: "Maher Al-Muaiqly", nameAr: "ماهر المعيقلي", flag: "🇸🇦" },
  { id: "ar.shaatree", name: "Abu Bakr Ash-Shaatree", nameAr: "أبو بكر الشاطري", flag: "🇩🇿" },
  { id: "ar.hudhaify", name: "Ali Al-Hudhaifi", nameAr: "علي الحذيفي", flag: "🇸🇦" },
  { id: "ar.abdulbasitmurattal", name: "Abdul Baset Abd us-Samad", nameAr: "عبد الباسط عبد الصمد", flag: "🇪🇬" },
  { id: "ar.shuraym", name: "Saoud Ash-Shuraim", nameAr: "سعود الشريم", flag: "🇸🇦" },
  { id: "ar.ahmedajamy", name: "Ahmed Al-Ajamy", nameAr: "أحمد العجمي", flag: "🇸🇦" },
  { id: "ar.muhammadayyoub", name: "Muhammad Ayyoub", nameAr: "محمد أيوب", flag: "🇸🇦" },
  { id: "ar.muhammadjibreel", name: "Muhammad Jibreel", nameAr: "محمد جبريل", flag: "🇪🇬" },
];

export default function ReciterSelector({ selected, onChange }) {
  const [open, setOpen] = useState(false);
  const current = RECITERS.find(r => r.id === selected) || RECITERS[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-white border border-gray-200 hover:border-emerald-300 rounded-xl px-3 py-2 text-sm transition-colors shadow-sm"
      >
        <Mic className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
        <span className="font-medium text-gray-700 truncate max-w-[160px]">{current.flag} {current.name}</span>
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
              className="absolute top-full mt-2 left-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl z-[calc(var(--z-dropdown)+1)] min-w-[260px] overflow-hidden"
            >
              <div className="p-1.5 max-h-[360px] overflow-y-auto">
                {RECITERS.map(r => (
                  <button
                    key={r.id}
                    onClick={() => { onChange(r.id); setOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                      r.id === selected ? "bg-emerald-50 text-emerald-700" : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <span className="text-xl leading-none">{r.flag}</span>
                    <div>
                      <p className="text-sm font-medium">{r.name}</p>
                      <p className="text-xs text-gray-400" style={{ fontFamily: "serif" }}>{r.nameAr}</p>
                    </div>
                    {r.id === selected && (
                      <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}