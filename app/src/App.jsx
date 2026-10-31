import React, { useRef, useEffect } from "react";
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import MhLogo from '@/components/MhLogo';
import usePlatform from '@/hooks/usePlatform';
import { Toaster } from "@/components/ui/sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
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
import SurahList from './pages/SurahList.jsx';
import Memorize from './pages/Memorize.jsx';
import Quiz from './pages/Quiz.jsx';
import Bookmarks from './pages/Bookmarks.jsx';
import Challenges from './pages/Challenges.jsx';
import Profile from './pages/Profile.jsx';
import Settings from './pages/Settings.jsx';
import Login from './pages/Login.jsx';
import Revision from './pages/Revision.jsx';
import ReviewSession from './pages/ReviewSession.jsx';
import Repeat from './pages/Repeat.jsx';
import Exercises from './pages/Exercises.jsx';
import Strength from './pages/Strength.jsx';
import Recite from './pages/Recite.jsx';
import Groups from './pages/Groups.jsx';
import Group from './pages/Group.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import ConfirmEmail from './pages/ConfirmEmail.jsx';
import LandingPage from './pages/LandingPage.jsx';
import Terms from './pages/Terms.jsx';
import Privacy from './pages/Privacy.jsx';
import Download from './pages/Download.jsx';
import Help from './pages/Help.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import Welcome from './pages/Welcome.jsx';
import Join from '@/pages/Join';
import DesktopRail from '@/components/DesktopRail';
import Lire from './pages/Lire.jsx';
import Lecon from './pages/Lecon.jsx';
import { KidLock } from './components/KidMode.jsx';
import { useKidMode, KID_LOCKED } from './lib/kidMode';

// Écrans plein écran (sans barre d'onglets) et écrans avec l'en-tête d'accueil
const IMMERSIVE = ["/Bienvenue", "/Lecon", "/Memorize", "/Quiz", "/ReviewSession", "/Repeat", "/Exercises", "/Recite"];
const WITH_HOME_HEADER = [];

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated } = useAuth();
  const location = useLocation();
  const platform = usePlatform();
  const path = location.pathname;
  const immersive = IMMERSIVE.some((p) => path.startsWith(p));
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

  const pendingJoin = localStorage.getItem("mh_pending_join");
  if (pendingJoin) {
    localStorage.removeItem("mh_pending_join");
    return <Navigate to={`/rejoindre/${encodeURIComponent(pendingJoin)}`} replace />;
  }

  return (
    <>
      <OfflineBanner />
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
        <Routes location={location}>
          <Route path="/" element={<Navigate to="/Dashboard" replace />} />
          <Route path="/Dashboard" element={<Dashboard />} />
          <Route path="/SurahList" element={<SurahList />} />
          <Route path="/Memorize" element={<Memorize />} />
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
          <Route path="/Lecon" element={<Lecon />} />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
        )}
      </motion.div>
      {!immersive && <DesktopSidebar />}
      {rail && <DesktopRail />}
      {!immersive && <div className="lg:hidden"><BottomNav /></div>}
    </>
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
          <QueryClientProvider client={queryClientInstance}>
            <Router>
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
            </Router>
            <Toaster />
          </QueryClientProvider>
        </AudioProvider>
      </PreferencesProvider>
    </AuthProvider>
  )
}

export default App