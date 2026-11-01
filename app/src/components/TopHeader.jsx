import React from "react";
import { Link } from "react-router-dom";
import { Trophy, MagnifyingGlass } from "@phosphor-icons/react";
import usePlatform, { haptic } from "@/hooks/usePlatform";
import { useAuth } from "@/lib/AuthContext";
import { MhWordmark } from "@/components/MhLogo";
import { useKidMode } from "@/lib/kidMode";

function Avatar({ user, size = 40 }) {
  const name = user?.user_metadata?.full_name || user?.name || user?.email || "";
  const url = user?.user_metadata?.avatar_url || user?.image;
  const initial = (name.trim()[0] || "M").toUpperCase();
  return url ? (
    <img src={url} alt="Profil" className="rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="rounded-full bg-gold-tint text-gold-lip font-black flex items-center justify-center" style={{ width: size, height: size, fontSize: size * 0.42 }}>{initial}</span>
  );
}

/** En-tête de l'écran d'accueil. iOS : boutons ronds en verre. Android : barre d'app Material 3. */
export default function TopHeader() {
  const platform = usePlatform();
  const { user } = useAuth();
  const kid = useKidMode();

  if (platform === "android") {
    return (
      <header className="fixed top-0 left-0 right-0 z-[var(--z-top-header)] bg-background flex items-center gap-1 pl-4 pr-2"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)", height: "calc(var(--header-height) + env(safe-area-inset-top, 0px))" }}>
        <MhWordmark size={28} className="flex-1" />
        <Link to="/SurahList?search=1" aria-label="Rechercher" className="w-12 h-12 rounded-full flex items-center justify-center active:bg-black/5" onClick={() => haptic()}>
          <MagnifyingGlass size={24} weight="bold" />
        </Link>
        <Link to="/Profile" aria-label="Profil" className="w-12 h-12 rounded-full flex items-center justify-center" onClick={() => haptic()}>
          <Avatar user={user} size={34} />
        </Link>
      </header>
    );
  }

  return (
    <>
      <div className="ios-scroll-edge" />
      <header className="fixed top-0 left-0 right-0 z-[var(--z-top-header)] bg-background flex items-center justify-between px-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 4px)", height: "calc(var(--header-height) + env(safe-area-inset-top, 0px))" }}>
        <span className="rounded-full h-11 pl-2 pr-3.5 flex items-center"><MhWordmark size={26} /></span>
        <div className="flex gap-2.5">
          {!kid.on && <Link to="/Leaderboard" aria-label="Classement" onClick={() => haptic()} className="bg-card border-2 border-border w-11 h-11 rounded-full flex items-center justify-center press">
            <Trophy size={21} weight="bold" />
          </Link>}
          <Link to="/Profile" aria-label="Profil" onClick={() => haptic()} className="bg-card border-2 border-border w-11 h-11 rounded-full flex items-center justify-center press">
            <Avatar user={user} size={34} />
          </Link>
        </div>
      </header>
    </>
  );
}
