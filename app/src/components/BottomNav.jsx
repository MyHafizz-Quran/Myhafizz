import React, { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { House, BookOpen, GraduationCap, Brain, MagnifyingGlass, Play, Pause } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import usePlatform, { haptic } from "@/hooks/usePlatform";
import { useAudioManager, getReadingSession } from "@/lib/AudioManager";
import { SURAHS } from "@/components/quranData";

export const TABS = [
  { to: "/Dashboard", icon: House, label: "Accueil" },
  { to: "/SurahList", icon: BookOpen, label: "Coran" },
  { to: "/Lire", icon: GraduationCap, label: "Apprendre", match: ["/Lire", "/Lecon"] },
  { to: "/Revision", icon: Brain, label: "Réviser" },
];

function isActive(to, path) {
  if (to === "/Dashboard") return path === "/" || path.startsWith("/Dashboard");
  if (to === "/SurahList") return path.startsWith("/SurahList") || path.startsWith("/Memorize") || path.startsWith("/Bookmarks");
  if (to === "/Lire") return path.startsWith("/Lire") || path.startsWith("/Lecon");
  return path.startsWith(to);
}

function useResume() {
  const navigate = useNavigate();
  const { loopPlaying, activeSurahNumber, stopLoop, loopIndex } = useAudioManager();
  const session = getReadingSession();
  let last = null;
  try { last = JSON.parse(localStorage.getItem("mh_last_surah") || "null")?.number; } catch { /* ignore */ }
  const surahNumber = activeSurahNumber || session?.surahNumber || last || null;
  const surah = surahNumber ? SURAHS.find((s) => s.number === Number(surahNumber)) : null;
  const open = () => { haptic(); navigate(surah ? `/Memorize?surah=${surah.number}` : "/SurahList"); };
  return { loopPlaying, surah, verse: (loopIndex || 0) + 1, open, stopLoop };
}

/* ───────── iOS 26 · Liquid Glass ───────── */
function IOSTabBar({ path }) {
  const navigate = useNavigate();
  const { loopPlaying, surah, verse, open, stopLoop } = useResume();
  return (
    <div className="fixed left-0 right-0 bottom-0 z-[var(--z-bottom-nav)] pointer-events-none"
         style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 12px)" }}>
      {/* Fondu du contenu sous les barres */}
      <div className="absolute inset-x-0 bottom-0 h-[72px] pointer-events-none" style={{ background: "linear-gradient(to top, hsl(var(--background)) 0%, hsl(var(--background) / .85) 35%, hsl(var(--background) / 0) 100%)" }} />
      <div className="relative px-3.5 flex flex-col gap-2">
        <AnimatePresence>
          {loopPlaying && surah && (
            <motion.div initial={{ opacity: 0, y: 12, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: .96 }}
              className="liquid-glass pointer-events-auto h-[52px] rounded-[26px] flex items-center gap-2.5 pl-2.5 pr-1.5" onClick={open} role="button">
              <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-arabic text-[13px]">{surah.name}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[14.5px] font-extrabold truncate">{surah.englishName} · verset {verse}</div>
                <div className="text-xs font-bold text-muted-foreground">En lecture</div>
              </div>
              <button aria-label="Pause" className="w-10 h-10 rounded-full flex items-center justify-center press"
                onClick={(e) => { e.stopPropagation(); haptic(); stopLoop(); }}>
                <Pause size={24} weight="fill" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex items-center gap-3">
          <nav className="liquid-glass pointer-events-auto flex-1 h-[62px] rounded-[31px] flex items-center px-1">
            {TABS.map(({ to, icon: Icon, label }) => {
              const on = isActive(to, path);
              return (
                <NavLink key={to} to={to} onClick={() => haptic()}
                  className={`relative flex-1 h-[54px] rounded-[27px] flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors ${on ? "text-primary" : "text-foreground"}`}>
                  {on && <motion.span layoutId="ios-tab-pill" className="absolute inset-0 rounded-[27px] bg-black/[0.07] dark:bg-white/10" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
                  <Icon size={24} weight={on ? "fill" : "bold"} className="relative" />
                  <span className="relative">{label}</span>
                </NavLink>
              );
            })}
          </nav>
          <button aria-label="Rechercher" onClick={() => { haptic(); navigate("/SurahList?search=1"); }}
            className="liquid-glass pointer-events-auto w-[62px] h-[62px] rounded-full flex items-center justify-center press">
            <MagnifyingGlass size={24} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────── Android · Material 3 Expressive (barre flottante) ───────── */
function AndroidTabBar({ path }) {
  const { loopPlaying, open, stopLoop } = useResume();
  const [hidden, setHidden] = useState(false);
  const last = useRef(0);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setHidden(y > last.current && y > 60);
      last.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => setHidden(false), [path]);
  return (
    <div className="fixed left-0 right-0 bottom-0 z-[var(--z-bottom-nav)] pointer-events-none transition-transform duration-300"
         style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 16px)", transform: hidden ? "translateY(120%)" : "none" }}>
      <div className="px-4 flex items-center justify-between gap-3">
        <nav className="pointer-events-auto h-16 rounded-[32px] bg-[#E6F1F1] dark:bg-[#1E2C31] shadow-[0_3px_10px_rgba(0,0,0,.14)] flex items-center gap-0.5 px-2">
          {TABS.map(({ to, icon: Icon, label }) => {
            const on = isActive(to, path);
            return (
              <NavLink key={to} to={to} onClick={() => haptic()} aria-label={label}
                className={`h-12 min-w-12 rounded-3xl flex items-center justify-center gap-2 font-extrabold text-sm transition-all duration-300 ${on ? "bg-primary text-white px-4" : "text-[#40484A] dark:text-white/80 px-3"}`}>
                <Icon size={22} weight={on ? "fill" : "bold"} />
                {on && <span>{label}</span>}
              </NavLink>
            );
          })}
        </nav>
        <button aria-label={loopPlaying ? "Pause" : "Reprendre"} onClick={() => { haptic(); loopPlaying ? stopLoop() : open(); }}
          className="pointer-events-auto w-16 h-16 rounded-[20px] bg-accent text-accent-foreground shadow-[0_3px_10px_rgba(0,0,0,.18)] flex items-center justify-center press">
          {loopPlaying ? <Pause size={26} weight="fill" /> : <Play size={26} weight="fill" />}
        </button>
      </div>
    </div>
  );
}

export default function BottomNav() {
  const { pathname } = useLocation();
  const platform = usePlatform();
  return platform === "android" ? <AndroidTabBar path={pathname} /> : <IOSTabBar path={pathname} />;
}
