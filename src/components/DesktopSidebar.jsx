import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { House, BookOpen, Brain, UsersThree, Trophy, Ranking, BookmarkSimple, GearSix, Question, Pause, Play } from "@phosphor-icons/react";
import { MhWordmark } from "@/components/MhLogo";
import { useAuth } from "@/lib/AuthContext";
import { useAudioManager, getReadingSession } from "@/lib/AudioManager";
import { SURAHS } from "@/components/quranData";
import { useNavigate } from "react-router-dom";

const MAIN = [
  { to: "/Dashboard", icon: House, label: "Accueil", match: (p) => p === "/" || p.startsWith("/Dashboard") },
  { to: "/SurahList", icon: BookOpen, label: "Coran", match: (p) => p.startsWith("/SurahList") || p.startsWith("/Memorize") },
  { to: "/Revision", icon: Brain, label: "Réviser", match: (p) => ["/Revision", "/ReviewSession", "/Repeat", "/Exercises", "/Strength", "/Recite", "/Quiz"].some((x) => p.startsWith(x)) },
  { to: "/Groups", icon: UsersThree, label: "Groupes", match: (p) => p.startsWith("/Group") },
];
const MORE = [
  { to: "/Challenges", icon: Trophy, label: "Défis" },
  { to: "/Leaderboard", icon: Ranking, label: "Classement" },
  { to: "/Bookmarks", icon: BookmarkSimple, label: "Signets" },
];

function Item({ to, icon: Icon, label, on }) {
  return (
    <NavLink to={to} className={`h-12 rounded-xl px-3 flex items-center gap-3 font-extrabold border-2 transition-colors ${on ? "bg-accent text-accent-foreground border-primary/40" : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
      <Icon size={24} weight={on ? "fill" : "bold"} className={on ? "text-primary" : ""} />{label}
    </NavLink>
  );
}

/** Barre latérale pour écran large (≥ 1024 px). Cachée sur mobile, où la barre d'onglets prend le relais. */
export default function DesktopSidebar() {
  const { pathname: p } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { loopPlaying, activeSurahNumber, stopLoop, loopIndex } = useAudioManager();
  const session = getReadingSession();
  const sn = activeSurahNumber || session?.surahNumber;
  const surah = sn ? SURAHS.find((s) => s.number === Number(sn)) : null;
  const name = user?.user_metadata?.full_name || user?.email || "";
  const avatar = user?.user_metadata?.avatar_url;

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[248px] z-[var(--z-bottom-nav)] flex-col border-r-2 border-border bg-card px-4 py-6">
      <NavLink to="/Dashboard" className="px-2 mb-6"><MhWordmark size={32} /></NavLink>
      <nav className="flex flex-col gap-1">
        {MAIN.map((t) => <Item key={t.to} {...t} on={t.match(p)} />)}
        <div className="h-0.5 bg-border my-3 mx-2" />
        {MORE.map((t) => <Item key={t.to} {...t} on={p.startsWith(t.to)} />)}
      </nav>

      {surah && (
        <div className="mt-6 rounded-2xl border-2 border-border p-3 flex items-center gap-2.5">
          <button onClick={() => navigate(`/Memorize?surah=${surah.number}`)} className="flex-1 min-w-0 text-left">
            <p className="text-[13px] font-extrabold truncate">{surah.englishName}</p>
            <p className="text-xs font-bold text-muted-foreground">{loopPlaying ? `En lecture · v. ${(loopIndex || 0) + 1}` : "Reprendre la lecture"}</p>
          </button>
          <button onClick={() => (loopPlaying ? stopLoop() : navigate(`/Memorize?surah=${surah.number}`))} aria-label={loopPlaying ? "Pause" : "Reprendre"}
            className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-[0_3px_0_var(--primary-lip)]">
            {loopPlaying ? <Pause weight="fill" /> : <Play weight="fill" />}
          </button>
        </div>
      )}

      <div className="mt-auto flex flex-col gap-1">
        <Item to="/Help" icon={Question} label="Aide" on={p.startsWith("/Help")} />
        <Item to="/Settings" icon={GearSix} label="Réglages" on={p.startsWith("/Settings")} />
        <NavLink to="/Profile" className={`mt-2 h-14 rounded-xl px-2 flex items-center gap-3 border-2 ${p.startsWith("/Profile") ? "border-primary/40 bg-accent" : "border-border hover:bg-muted"}`}>
          {avatar ? <img src={avatar} alt="" className="w-9 h-9 rounded-full object-cover" /> : <span className="w-9 h-9 rounded-full bg-accent text-accent-foreground font-black flex items-center justify-center">{(name[0] || "?").toUpperCase()}</span>}
          <span className="min-w-0"><span className="block font-extrabold truncate">{name.split(/[\s@]/)[0] || "Profil"}</span><span className="block text-xs font-bold text-muted-foreground">Mon profil</span></span>
        </NavLink>
      </div>
    </aside>
  );
}
