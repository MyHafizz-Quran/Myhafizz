import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, X, CaretDown, Copy } from "@phosphor-icons/react";
import { loadSurah } from "@/lib/learningData";
import { diffWords } from "@/lib/similar";
import { SURAHS } from "@/components/quranData";

/** HTML tajwîd de quran.com → spans à classes connues uniquement */
export function tajweedHtml(raw) {
  if (!raw) return "";
  return raw
    .replace(/<(rule|tajweed)\s+class=["']?([\w-]+)["']?\s*>/g, (_, __, c) => `<span class="tj-${c.replace(/[^\w-]/g, "")}">`)
    .replace(/<\/(rule|tajweed)>/g, "</span>")
    .replace(/<span class=["']?end["']?>[^<]*<\/span>/g, "")
    .replace(/<(?!\/?span\b)[^>]*>/g, "");
}

export const TAJWEED_LEGEND = [
  ["tj-ghunnah", "Ghunna"],
  ["tj-ikhafa", "Ikhfâ'"],
  ["tj-idgham_ghunnah", "Idghâm"],
  ["tj-iqlab", "Iqlâb"],
  ["tj-qalaqah", "Qalqala"],
  ["tj-madda_normal", "Madd"],
  ["tj-ham_wasl", "Non prononcé"],
];

export function TajweedLegend() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5">
      {TAJWEED_LEGEND.map(([c, l]) => (
        <span key={c} className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
          <span className={`${c} tj-dot`} />{l}
        </span>
      ))}
    </div>
  );
}

/** Fiche d'un mot : sens, translittération, écoute depuis ce mot */
export function WordSheet({ word, onClose, onPlayFrom, canPlay }) {
  return (
    <AnimatePresence>
      {word && (
        <motion.div className="fixed inset-0 z-[200] flex items-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-foreground/25" onClick={onClose} />
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className="relative w-full bg-card rounded-t-3xl p-5 pb-[calc(env(safe-area-inset-bottom,0px)+20px)]">
            <button onClick={onClose} className="absolute right-4 top-4 w-9 h-9 rounded-full bg-muted flex items-center justify-center" aria-label="Fermer"><X weight="bold" /></button>
            <p dir="rtl" className="font-arabic text-5xl leading-[1.8] text-center mt-2">{word.text_uthmani}</p>
            {word.transliteration?.text && <p className="text-center text-muted-foreground font-semibold italic">{word.transliteration.text}</p>}
            <div className="card-flat p-4 mt-4 text-center">
              <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mb-1">Sens du mot</p>
              <p className="text-lg font-extrabold">{word.translation?.text || "—"}</p>
              <p className="text-[11px] font-semibold text-muted-foreground mt-1">Traduction mot à mot en anglais (Quran.com)</p>
            </div>
            {canPlay && (
              <button onClick={() => { onPlayFrom(); onClose(); }} className="btn-relief w-full h-[50px] bg-primary text-primary-foreground mt-4"><Play weight="fill" /> Écouter depuis ce mot</button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Alerte « verset semblable » + différences surlignées */
export function SimilarVerses({ verseText, similar }) {
  const [open, setOpen] = useState(false);
  const [texts, setTexts] = useState({});
  useEffect(() => {
    if (!open) return;
    similar.forEach(([s, v]) => {
      loadSurah(s).then((a) => setTexts((m) => ({ ...m, [`${s}:${v}`]: a[v - 1]?.text }))).catch(() => {});
    });
  }, [open, similar]);
  if (!similar?.length) return null;
  return (
    <div className="w-full max-w-xl">
      <button onClick={() => setOpen((o) => !o)} className="mx-auto flex items-center gap-2 px-3 py-1.5 rounded-full border-2 border-border bg-card text-xs font-extrabold text-muted-foreground press">
        <Copy weight="bold" className="w-4 h-4 text-primary" />
        {similar.length} verset{similar.length > 1 ? "s" : ""} semblable{similar.length > 1 ? "s" : ""}
        <CaretDown weight="bold" className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground text-center">Les mots qui changent sont surlignés : c'est là que l'on se trompe le plus souvent.</p>
          {similar.map(([s, v]) => {
            const t = texts[`${s}:${v}`];
            return (
              <div key={`${s}:${v}`} className="card-flat p-3">
                <p className="text-xs font-extrabold text-primary mb-1">{SURAHS[s - 1]?.englishName} · {s}:{v}</p>
                {t ? (
                  <p dir="rtl" className="font-arabic text-2xl leading-[2.1] text-right">
                    {diffWords(verseText, t).map((x, i) => (
                      <React.Fragment key={i}>
                        <span className={x.diff ? "bg-accent text-primary rounded-md px-0.5 font-bold" : ""}>{x.w}</span>{" "}
                      </React.Fragment>
                    ))}
                  </p>
                ) : <div className="h-10 rounded-xl bg-muted animate-pulse" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
