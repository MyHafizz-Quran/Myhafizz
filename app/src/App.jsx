import { db } from '@/api/neonClient';
import { syncFcm } from '@/lib/reminders';
import VoiceSplash from './components/VoiceSplash.jsx';
import { isStandalone } from '@/hooks/usePlatform';
import React, { useRef, useEffect, Suspense } from "react";
import { lazyPage, prefetchPages, PageFallback } from "@/lib/lazyPage.jsx";
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import MhLogo from '@/components/MhLogo';
import usePlatform from '@/hooks/usePlatform';
import { Toaster } from "@/components/ui/sonner"
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { queryClientInstance, persistOptions } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes as RouterRoutes, Navigate } from 'react-router-dom';
import * as Sentry from '@sentry/react';

// Routes instrumentées par Sentry (noms de transactions = chemins des routes)
const Routes = Sentry.withSentryReactRouterV6Routing(RouterRoutes);
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { PreferencesProvider } from '@/components/usePreferences';
import { AudioProvider, useAudioManager } from '@/lib/AudioManager';
import BottomNav from '@/components/BottomNav';
import DesktopSidebar from '@/components/DesktopSidebar';
import TopHeader from '@/components/TopHeader';
import OfflineBanner from '@/components/OfflineBanner';
import { useOfflineSync } from '@/hooks/useOfflineSync';

import Dashboard from './pages/Dashboard.jsx';
const SurahList = lazyPage(() => import('./pages/SurahList.jsx'));
const Memorize = lazyPage(() => import('./pages/Memorize.jsx'));
const Quiz = lazyPage(() => import('./pages/Quiz.jsx'));
const Bookmarks = lazyPage(() => import('./pages/Bookmarks.jsx'));
const Challenges = lazyPage(() => import('./pages/Challenges.jsx'));
const Profile = lazyPage(() => import('./pages/Profile.jsx'));
const Settings = lazyPage(() => import('./pages/Settings.jsx'));
import Login from './pages/Login.jsx';
const Revision = lazyPage(() => import('./pages/Revision.jsx'));
const ReviewSession = lazyPage(() => import('./pages/ReviewSession.jsx'));
const Repeat = lazyPage(() => import('./pages/Repeat.jsx'));
const Exercises = lazyPage(() => import('./pages/Exercises.jsx'));
const Strength = lazyPage(() => import('./pages/Strength.jsx'));
const Qibla = lazyPage(() => import('./pages/Qibla.jsx'));
const Live = lazyPage(() => import('./pages/Live.jsx'));
const Noms = lazyPage(() => import('./pages/Noms.jsx'));
const Bilan = lazyPage(() => import('./pages/Bilan.jsx'));
const Progres = lazyPage(() => import('./pages/Progres.jsx'));
const Adhkar = lazyPage(() => import('./pages/Adhkar.jsx'));
const Tasbih = lazyPage(() => import('./pages/Tasbih.jsx'));
const Calendrier = lazyPage(() => import('./pages/Calendrier.jsx'));
const Qiyam = lazyPage(() => import('./pages/Qiyam.jsx'));
const Objectif = lazyPage(() => import('./pages/Objectif.jsx'));
const Recite = lazyPage(() => import('./pages/Recite.jsx'));
const Groups = lazyPage(() => import('./pages/Groups.jsx'));
const Group = lazyPage(() => import('./pages/Group.jsx'));
const ResetPassword = lazyPage(() => import('./pages/ResetPassword.jsx'));
const ConfirmEmail = lazyPage(() => import('./pages/ConfirmEmail.jsx'));
import LandingPage from './pages/LandingPage.jsx';
const Terms = lazyPage(() => import('./pages/Terms.jsx'));
const Privacy = lazyPage(() => import('./pages/Privacy.jsx'));
const Download = lazyPage(() => import('./pages/Download.jsx'));
const Help = lazyPage(() => import('./pages/Help.jsx'));
const Leaderboard = lazyPage(() => import('./pages/Leaderboard.jsx'));
import Welcome from './pages/Welcome.jsx';
const Join = lazyPage(() => import('@/pages/Join'));
import DesktopRail from '@/components/DesktopRail';
const Lire = lazyPage(() => import('./pages/Lire.jsx'));
const LireArabe = lazyPage(() => import('./pages/Lire.jsx').then((m) => ({ default: m.LireArabe })));
const Lecon = lazyPage(() => import('./pages/Lecon.jsx'));
const Tafsir = lazyPage(() => import('./pages/Tafsir'));
const Tajwid = lazyPage(() => import('./pages/Tajwid'));
const Jouer = lazyPage(() => import('./pages/Jouer.jsx'));
const Partie = lazyPage(() => import('./pages/Partie.jsx'));
const Duel = lazyPage(() => import('./pages/Duel.jsx'));
const Equipe = lazyPage(() => import('./pages/Equipe.jsx'));
const Joueur = lazyPage(() => import('./pages/Joueur.jsx'));
const Defi = lazyPage(() => import('./pages/Defi.jsx'));
const Ligue = lazyPage(() => import('./pages/Ligue.jsx'));
const Tournoi = lazyPage(() => import('./pages/Tournoi.jsx'));
const Notifications = lazyPage(() => import('./pages/Notifications.jsx'));
import { NotifProvider } from './lib/notifs.jsx';
const TafsirRoute = () => { const loc = useLocation(); return <Tafsir key={loc.search} />; };
const TajwidRoute = () => { const loc = useLocation(); return <Tajwid key={loc.search} />; };
const PartieRoute = () => { const loc = useLocation(); return <Partie key={loc.search} />; };
import { KidLock } from './components/KidMode.jsx';
import { useKidMode, KID_LOCKED } from './lib/kidMode';
import { initAnalytics, trackPage, identify, track } from './lib/analytics';

// Écrans plein écran (sans barre d'onglets) et écrans avec l'en-tête d'accueil
const IMMERSIVE = ["/Qiyam", "/Bienvenue", "/Lecon", "/Partie", "/Duel", "/Equipe", "/Joueur", "/Notifications", "/Defi", "/Ligue", "/Tournoi", "/Memorize", "/Quiz", "/ReviewSession", "/Repeat", "/Exercises", "/Recite"];
const WITH_HOME_HEADER = [];

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated, user } = useAuth();
  const location = useLocation();
  useEffect(() => { initAnalytics(); prefetchPages(); }, []);
  useEffect(() => { trackPage(location.pathname, location.search); }, [location.pathname, location.search]);
  useEffect(() => { if (user?.id) identify(user); }, [user?.id]);
  useEffect(() => { if (user?.id) { const t = setTimeout(syncFcm, 4000); return () => clearTimeout(t); } }, [user?.id]);
  // Ouverture depuis une notification : compter l'ouverture puis retirer le paramètre de l'adresse
  useEffect(() => {
    if (!user?.id) return;
    const q = new URLSearchParams(location.search); const k = q.get("mh_n");
    if (!k) return;
    q.delete("mh_n");
    window.history.replaceState(null, "", location.pathname + (q.toString() ? `?${q}` : ""));
    track("notif_open", { kind: k });
    db.rpc("notif_opened", { p_kind: k }).then(() => {}, () => {});
  }, [user?.id, location.search]);
  const platform = usePlatform();
  const path = location.pathname;
  const immersive = IMMERSIVE.some((p) => path.startsWith(p)) || (path === "/Tafsir" && /[?&]s=/.test(location.search)) || (path === "/Noms" && /[?&]quiz=/.test(location.search)) || (path === "/Tajwid" && /[?&]u=/.test(location.search));
  const homeHeader = WITH_HOME_HEADER.some((p) => path.startsWith(p));
  const kid = useKidMode();
  const kidLocked = kid.on && !kid.unlocked && KID_LOCKED.some((p) => path.startsWith(p));
  const rail = !immersive && !kidLocked && !["/", "/Dashboard"].includes(path);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle("no-global-header", !homeHeader);
    html.classList.toggle("no-tabbar", immersive);
    return () => { html.classList.remove("no-global-header", "no-tabbar"); };
  }, [homeHeader, immersive]);

  // Chaque changement d'écran repart en haut, comme une app native
  useEffect(() => { window.scrollTo(0, 0); }, [path]);
  const { cleanup } = useAudioManager();
  // Auto-sync pending offline actions when back online
  useOfflineSync();

  // Stop audio only when the user explicitly logs out (auth transitions true → false)
  const prevIsAuthenticated = useRef(isAuthenticated);
  useEffect(() => {
    if (!isAuthenticated && prevIsAuthenticated.current) {
      cleanup();
    }
    prevIsAuthenticated.current = isAuthenticated;
  }, [isAuthenticated, cleanup]);

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-5 bg-background">
        <MhLogo size={84} />
        <div className="w-24 h-2.5 rounded-full bg-accent overflow-hidden"><div className="h-full w-1/2 rounded-full bg-primary" style={{ animation: 'mh-load 1.1s ease-in-out infinite' }} /></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const pendingJoin = new URLSearchParams(window.location.search).get("join");
    if (pendingJoin) return <Navigate to={`/rejoindre/${encodeURIComponent(pendingJoin)}`} replace />;
    return <Navigate to="/login" replace />;
  }

  localStorage.removeItem("mh_pending_duel");

  const pendingJoin = localStorage.getItem("mh_pending_join");
  if (pendingJoin) {
    localStorage.removeItem("mh_pending_join");
    return <Navigate to={`/rejoindre/${encodeURIComponent(pendingJoin)}`} replace />;
  }

  return (
    <NotifProvider>
      <OfflineBanner />
      {/* iOS 26 floute le contenu qui défile sous la barre d'état : une bande pleine, fixe, l'en empêche sur tous les écrans */}
      {platform !== "android" && <div className="ios-scroll-edge" aria-hidden="true" />}
      {homeHeader && <TopHeader />}
      {/* Contenu principal : transition d'écran native (glissement iOS, fondu Android) */}
      <motion.div
        key={path}
        className={`pb-nav pt-header min-h-full ${immersive ? "" : "lg:pl-[248px]"} ${rail ? "xl:pr-[320px]" : ""}`}
        initial={platform === "android" ? { opacity: 0, y: 12 } : { opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
      >
        {kidLocked ? <KidLock /> : (
        <Suspense fallback={<PageFallback />}>
        <Routes location={location}>
          <Route path="/" element={<Navigate to="/Dashboard" replace />} />
          <Route path="/Dashboard" element={<Dashboard />} />
          <Route path="/SurahList" element={<SurahList />} />
          <Route path="/Memorize" element={<Memorize />} />
          <Route path="/Qibla" element={<Qibla />} />
          <Route path="/Bilan" element={<Bilan />} />
          <Route path="/Progres" element={<Progres />} />
          <Route path="/Adhkar" element={<Adhkar />} />
          <Route path="/Tasbih" element={<Tasbih />} />
          <Route path="/Calendrier" element={<Calendrier />} />
          <Route path="/Qiyam" element={<Qiyam />} />
          <Route path="/Objectif" element={<Objectif />} />
          <Route path="/Quiz" element={<Quiz />} />
          <Route path="/Bookmarks" element={<Bookmarks />} />
          <Route path="/Challenges" element={<Challenges />} />
          <Route path="/Revision" element={<Revision />} />
          <Route path="/ReviewSession" element={<ReviewSession />} />
          <Route path="/Repeat" element={<Repeat />} />
          <Route path="/Exercises" element={<Exercises />} />
          <Route path="/Strength" element={<Strength />} />
          <Route path="/Recite" element={<Recite />} />
          <Route path="/Groups" element={<Groups />} />
          <Route path="/Group" element={<Group />} />
          <Route path="/StudyMatch" element={<Navigate to="/Revision" replace />} />
          <Route path="/Profile" element={<Profile />} />
          <Route path="/Settings" element={<Settings />} />
          <Route path="/Help" element={<Help />} />
          <Route path="/Leaderboard" element={<Leaderboard />} />
          <Route path="/Bienvenue" element={<Welcome />} />
          <Route path="/Lire" element={<Lire />} />
          <Route path="/LireArabe" element={<LireArabe />} />
          <Route path="/Lecon" element={<Lecon />} />
          <Route path="/Jouer" element={<Jouer />} />
          <Route path="/Tafsir" element={<TafsirRoute />} />
          <Route path="/Tajwid" element={<TajwidRoute />} />
          <Route path="/Live" element={<Live />} />
          <Route path="/Noms" element={<Noms />} />
          <Route path="/Partie" element={<PartieRoute />} />
          <Route path="/Equipe" element={<Equipe />} />
          <Route path="/Joueur" element={<Joueur />} />
          <Route path="/Defi" element={<Defi />} />
          <Route path="/Ligue" element={<Ligue />} />
          <Route path="/Tournoi" element={<Tournoi />} />
          <Route path="/Notifications" element={<Notifications />} />
          <Route path="/Duel" element={<Duel />} />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
        </Suspense>
        )}
      </motion.div>
      {!immersive && <DesktopSidebar />}
      {rail && <DesktopRail />}
      {!immersive && <div className="lg:hidden"><BottomNav /></div>}
    </NotifProvider>
  );
};

const LandingOrDashboard = () => {
  const { isLoadingAuth, isAuthenticated } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-5 bg-background">
        <MhLogo size={84} />
        <div className="w-24 h-2.5 rounded-full bg-accent overflow-hidden"><div className="h-full w-1/2 rounded-full bg-primary" style={{ animation: 'mh-load 1.1s ease-in-out infinite' }} /></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/Dashboard" replace />;
  }

  // App installée : écran de bienvenue « La voix devient écriture » au lieu de la page de présentation.
  if (isStandalone()) return <VoiceSplash />;

  return <FullBleed><LandingPage /></FullBleed>;
};

/** Pages publiques : pleine largeur et défilement de la page (voir html.full-bleed dans index.css) */
function FullBleed({ children }) {
  useEffect(() => {
    document.documentElement.classList.add("full-bleed");
    return () => document.documentElement.classList.remove("full-bleed");
  }, []);
  return children;
}

function App() {
  return (
    <AuthProvider>
      <PreferencesProvider>
        <AudioProvider>
          <PersistQueryClientProvider client={queryClientInstance} persistOptions={persistOptions}>
            <Router>
              <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<LandingOrDashboard />} />
                <Route path="/login" element={<FullBleed><Login /></FullBleed>} />
                <Route path="/reset-password" element={<FullBleed><ResetPassword /></FullBleed>} />
                <Route path="/confirm" element={<FullBleed><ConfirmEmail /></FullBleed>} />
                <Route path="/terms" element={<FullBleed><Terms /></FullBleed>} />
                <Route path="/privacy" element={<FullBleed><Privacy /></FullBleed>} />
                <Route path="/rejoindre/:code" element={<Join />} />
                <Route path="/join/:code" element={<Join />} />
                <Route path="/telecharger" element={<FullBleed><Download /></FullBleed>} />
                <Route path="/download" element={<FullBleed><Download /></FullBleed>} />
                <Route path="/*" element={<AuthenticatedApp />} />
              </Routes>
              </Suspense>
            </Router>
            <Toaster />
          </PersistQueryClientProvider>
        </AudioProvider>
      </PreferencesProvider>
    </AuthProvider>
  )
}

export default App