import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, Lock, Star, Trophy, Lightning, SpeakerSlash, Exam, CaretRight } from "@phosphor-icons/react";
import { ReadingLessons } from "@/api/entities";
import { UNITS, ALL_LESSONS, hasArabicVoice } from "@/lib/qaida";
import { haptic } from "@/hooks/usePlatform";
import { useToast } from "@/components/ui/use-toast";

// décalage en zigzag façon chemin
const OFFSET = [0, 44, 64, 44, 0, -44, -64, -44];

export default function Lire() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: rows = [], isLoading } = useQuery({ queryKey: ["reading-lessons"], queryFn: () => ReadingLessons.list() });
  const done = new Set(rows.map((r) => r.lesson_id));
  const currentId = ALL_LESSONS.find((l) => !done.has(l.id))?.id;
  const xp = rows.reduce((t, r) => t + (r.xp || 0), 0);
  const voice = hasArabicVoice();

  const open = (l, state) => {
    haptic();
    if (state === "locked") { toast({ title: "Leçon verrouillée", description: "Termine d'abord la leçon précédente." }); return; }
    navigate(`/Lecon?id=${l.id}`);
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-nav">
      <div className="max-w-xl mx-auto px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)]">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} aria-label="Retour" className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-muted press"><ArrowLeft weight="bold" className="w-6 h-6" /></button>
          <h1 className="text-[24px] font-black flex-1">Apprendre à lire</h1>
          <span className="h-9 px-3 rounded-xl border-2 border-border bg-card flex items-center gap-1.5 font-black text-sm"><Lightning weight="fill" className="w-4 h-4 text-[#F2B530]" />{xp}</span>
        </div>
        <p className="font-semibold text-muted-foreground mt-1">De la première lettre jusqu'à la lecture du Coran, en petites leçons de 5 minutes.</p>

        {!voice && (
          <div className="card-flat p-3.5 mt-4 flex items-start gap-3">
            <SpeakerSlash weight="bold" className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-muted-foreground">Ton appareil n'a pas de voix arabe installée : les exercices d'écoute seront remplacés par des exercices de lecture.</p>
          </div>
        )}

        {done.size === 0 && !isLoading && (
          <button onClick={() => { haptic(); navigate("/Lecon?id=placement"); }} className="card-flat w-full p-4 mt-4 flex items-center gap-3 text-left press">
            <span className="w-11 h-11 rounded-xl bg-accent text-primary flex items-center justify-center shrink-0"><Exam weight="fill" className="w-6 h-6" /></span>
            <div className="flex-1 min-w-0"><p className="font-extrabold">Je connais déjà les lettres</p><p className="text-[12.5px] font-semibold text-muted-foreground">12 questions pour passer directement à l'unité 4</p></div>
            <CaretRight weight="bold" className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        )}

        {UNITS.map((u, ui) => {
          const n = u.lessons.filter((l) => done.has(l.id)).length;
          return (
            <section key={u.id} className="mt-6">
              <div className="rounded-2xl bg-primary text-primary-foreground p-4 shadow-[0_4px_0_var(--primary-lip)]">
                <p className="text-xs font-extrabold uppercase tracking-wide opacity-80">Unité {ui + 1} · {n}/{u.lessons.length}</p>
                <p className="text-[20px] font-black leading-tight mt-0.5">{u.title}</p>
                <p className="text-sm font-semibold opacity-90">{u.subtitle}</p>
              </div>
              <div className="flex flex-col items-center gap-5 py-7">
                {u.lessons.map((l, li) => {
                  const state = done.has(l.id) ? "done" : l.id === currentId ? "current" : "locked";
                  const Icon = state === "done" ? Check : state === "locked" ? Lock : l.review ? Trophy : Star;
                  return (
                    <div key={l.id} className="relative flex flex-col items-center" style={{ transform: `translateX(${OFFSET[li % OFFSET.length]}px)` }}>
                      {state === "current" && !isLoading && (
                        <div className="absolute -top-11 whitespace-nowrap rounded-xl border-2 border-border bg-card px-3 py-1.5 text-sm font-black text-primary animate-bounce [animation-duration:1.6s]">
                          {done.size ? "Continuer" : "Commencer"}
                          <span className="absolute left-1/2 -bottom-[7px] -translate-x-1/2 w-3 h-3 rotate-45 bg-card border-r-2 border-b-2 border-border" />
                        </div>
                      )}
                      <button onClick={() => open(l, state)} aria-label={`${l.title}${state === "locked" ? " (verrouillée)" : ""}`}
                        className={`btn-relief w-[72px] h-[72px] !rounded-full ${state === "locked" ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"} ${state === "current" ? "ring-4 ring-primary/25 ring-offset-4 ring-offset-background" : ""}`}
                        style={state === "locked" ? { "--relief-color": "hsl(var(--border))" } : undefined}>
                        <Icon weight={state === "done" ? "bold" : "fill"} className="w-8 h-8" />
                      </button>
                      {(() => { const arOnly = ["u1", "u2"].includes(u.id) && !l.review; return (
                        <p className={`mt-2 text-center max-w-[150px] ${arOnly ? "font-arabic text-[21px] leading-tight" : "text-sm font-extrabold"} ${state === "locked" ? "text-muted-foreground" : "text-foreground"}`} dir={arOnly ? "rtl" : "ltr"}>{l.title}</p>
                      ); })()}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        <button onClick={() => { haptic(); navigate("/SurahList"); }} className="card-flat w-full p-4 mb-6 text-center press">
          <p className="font-extrabold">Et après ?</p>
          <p className="text-sm font-semibold text-muted-foreground mt-0.5">Quand tu sais lire, passe à la mémorisation dans l'onglet Coran.</p>
        </button>
      </div>
    </div>
  );
}
