import React from "react";
import { NavLink, useLocation } from "react-router-dom";
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
    </nav>
  );
}
