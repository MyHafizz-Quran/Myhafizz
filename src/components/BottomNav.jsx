import React from "react";
import { NavLink, useLocation } from "react-router-dom";
<<<<<<< HEAD
=======
import { motion } from "framer-motion";
>>>>>>> 7f0356aab4c376641d3aa5b6c0c4f22b935a7fe0
import { LayoutDashboard, BookOpen, Bookmark, Users, User } from "lucide-react";

const NAV_ITEMS = [
  { to: "/Dashboard", icon: LayoutDashboard, label: "Accueil" },
  { to: "/Bookmarks", icon: Bookmark, label: "Signets" },
  { to: "/SurahList", icon: BookOpen, label: "Coran" },
  { to: "/StudyMatch", icon: Users, label: "1to1" },
  { to: "/Profile", icon: User, label: "Profil" },
];

export default function BottomNav() {
  const location = useLocation();

  return (
<<<<<<< HEAD
    <nav className="fixed bottom-0 left-0 right-0 z-[var(--z-bottom-nav)] flex justify-around items-center px-4 pb-6 pt-3 bg-surface/80 backdrop-blur-xl shadow-[0_-4px_24px_rgba(27,28,26,0.04)] rounded-t-[2rem]" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.5rem)" }}>
      {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
        const isActive =
          location.pathname === to ||
          (to === "/Dashboard" && location.pathname === "/") ||
          (to === "/SurahList" && (location.pathname.startsWith("/Memorize") || location.pathname.startsWith("/SurahList"))) ||
          (to === "/StudyMatch" && location.pathname.startsWith("/StudyMatch"));

        if (isActive) {
          return (
            <NavLink key={to} to={to} className="flex flex-col items-center justify-center bg-primary text-on-primary rounded-full px-6 py-2 transition-transform duration-500 ease-out scale-110">
              <Icon className="w-[22px] h-[22px]" strokeWidth={2.4} />
              <span className="font-label text-[10px] tracking-wide mt-0.5">{label}</span>
            </NavLink>
          );
        }

        return (
          <NavLink key={to} to={to} className="flex flex-col items-center justify-center text-on-surface-variant/50 px-4 py-2 hover:text-primary transition-colors duration-300">
            <Icon className="w-[22px] h-[22px]" strokeWidth={1.8} />
            <span className="font-label text-[10px] tracking-wide mt-0.5">{label}</span>
          </NavLink>
        );
      })}
=======
    <nav className="fixed bottom-0 left-0 right-0 z-[var(--z-bottom-nav)]">
      {/* Fond solide avec bord supérieur subtil + blur + modern elevation */}
      <div
        className="bg-white/[0.97] dark:bg-gray-950/[0.97] backdrop-blur-xl border-t border-gray-200/80 dark:border-gray-800/80 shadow-[0_-2px_8px_rgba(0,0,0,0.05)] dark:shadow-none"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-stretch h-[68px] px-2">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
            const isActive =
              location.pathname === to ||
              (to === "/Dashboard" && location.pathname === "/") ||
              (to === "/SurahList" &&
                (location.pathname.startsWith("/Memorize") ||
                  location.pathname.startsWith("/SurahList"))) ||
              (to === "/StudyMatch" &&
                location.pathname.startsWith("/StudyMatch"));

            return (
              <NavLink
                key={to}
                to={to}
                className="flex-1 flex flex-col items-center justify-center gap-1 relative active:scale-[0.92] transition-transform duration-150"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                {/* Indicateur actif - fond pill visible */}
                {isActive && (
                  <motion.div
                    layoutId="bottomnav-pill"
                    className="absolute top-1.5 bottom-1.5 left-2 right-2 bg-emerald-50 dark:bg-emerald-950/60 rounded-2xl"
                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                  />
                )}

                <div className="relative z-10 flex flex-col items-center gap-0.5">
                  <Icon
                    className={`w-[22px] h-[22px] transition-colors duration-200 ${
                      isActive
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-gray-400 dark:text-gray-500"
                    }`}
                    strokeWidth={isActive ? 2.4 : 1.8}
                  />
                  <span
                    className={`text-[10px] font-semibold leading-none transition-colors duration-200 ${
                      isActive
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              </NavLink>
            );
          })}
        </div>
      </div>
>>>>>>> 7f0356aab4c376641d3aa5b6c0c4f22b935a7fe0
    </nav>
  );
}
