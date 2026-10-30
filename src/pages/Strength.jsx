import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { CaretLeft, CaretRight, Warning } from "@phosphor-icons/react";
import { MemorizationProgress, VerseReview } from "@/api/entities";
import { strength, key, todayStr } from "@/lib/srs";
import { SURAHS } from "@/components/quranData";
import { haptic } from "@/hooks/usePlatform";

// Niveaux : 0 non mémorisé, 1 fragile (oublié), 2 à consolider, 3 correct, 4 solide
export const level = (memorized, rv) => {
  if (!memorized) return 0;
  if (rv?.last_grade === 0) return 1;
  const s = strength(rv);
  return s < 30 ? 2 : s < 65 ? 3 : 4;
};
const CELL = ["bg-muted", "bg-destructive", "bg-primary/30", "bg-primary/60", "bg-primary"];
const LEGEND = [["Fragile", 1], ["À consolider", 2], ["Correct", 3], ["Solide", 4], ["Non mémorisé", 0]];

export default function Strength() {
  const navigate = useNavigate();
  const { data: progress = [], isLoading: a } = useQuery({ queryKey: ["memorization-progress"], queryFn: () => MemorizationProgress.list() });
  const { data: reviews = [], isLoading: b } = useQuery({ queryKey: ["verse-reviews"], queryFn: () => VerseReview.list() });

  const rows = useMemo(() => {
    const rv = new Map(reviews.map((r) => [key(r.surah_number, r.verse_number), r]));
    return progress.filter((p) => (p.memorized_verses || []).length)
      .sort((x, y) => x.surah_number - y.surah_number)
      .map((p) => {
        const s = SURAHS.find((z) => z.number === p.surah_number);
        const mem = new Set(p.memorized_verses);
        const cells = Array.from({ length: s.numberOfAyahs }, (_, i) => level(mem.has(i + 1), rv.get(key(s.number, i + 1))));
        const weak = cells.filter((c) => c === 1 || c === 2).length;
        return { s, cells, weak, mem: mem.size };
      });
  }, [progress, reviews]);
  const weakTotal = rows.reduce((n, r) => n + r.weak, 0);
  const forgotten = reviews.filter((r) => r.last_grade === 0 && r.due_date <= todayStr()).length;

  return (
    <div className="min-h-[100dvh] bg-background pb-nav">
      <div className="max-w-2xl mx-auto px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)]">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 -ml-2 flex items-center justify-center" aria-label="Retour"><CaretLeft weight="bold" className="w-6 h-6" /></button>
          <h1 className="text-2xl font-extrabold">Solidité</h1>
        </div>

        {weakTotal > 0 && (
          <button onClick={() => { haptic(); navigate("/ReviewSession?part=weak"); }} className="card-flat w-full flex items-center gap-3 p-4 mb-4 text-left press">
            <div className="w-11 h-11 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center"><Warning weight="fill" className="w-6 h-6" /></div>
            <div className="flex-1"><p className="font-extrabold">{weakTotal} verset{weakTotal > 1 ? "s" : ""} à renforcer</p><p className="text-sm font-semibold text-muted-foreground">{forgotten ? `Dont ${forgotten} oublié${forgotten > 1 ? "s" : ""} récemment · ` : ""}Réviser maintenant</p></div>
            <CaretRight weight="bold" className="w-5 h-5 text-muted-foreground" />
          </button>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4">
          {LEGEND.map(([l, c]) => <span key={l} className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground"><span className={`w-3 h-3 rounded-[4px] ${CELL[c]}`} />{l}</span>)}
        </div>

        {a || b ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}</div>
        ) : !rows.length ? (
          <div className="card-flat p-5 text-center"><p className="font-extrabold mb-1">Aucun verset mémorisé</p><p className="text-sm text-muted-foreground font-semibold">La carte se remplit au fil de tes révisions.</p></div>
        ) : (
          <div className="space-y-3">
            {rows.map(({ s, cells, weak, mem }) => (
              <button key={s.number} onClick={() => navigate(`/Memorize?surah=${s.number}`)} className="card-flat w-full p-4 text-left press">
                <div className="flex items-baseline justify-between mb-3">
                  <p className="font-extrabold">{s.englishName} <span className="font-arabic text-muted-foreground font-normal ml-1">{s.name}</span></p>
                  <p className="text-xs font-bold text-muted-foreground">{mem}/{s.numberOfAyahs}{weak ? ` · ${weak} à renforcer` : ""}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {cells.map((c, i) => <span key={i} title={`Verset ${i + 1}`} className={`w-[14px] h-[14px] rounded-[4px] ${CELL[c]}`} />)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
