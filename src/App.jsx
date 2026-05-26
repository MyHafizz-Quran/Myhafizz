import React, { useRef, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { PreferencesProvider } from '@/components/usePreferences';
import { AudioProvider, useAudioManager } from '@/lib/AudioManager';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import OfflineBanner from '@/components/OfflineBanner';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import InstallPrompt from '@/components/InstallPrompt';

import Dashboard from './pages/Dashboard.jsx';
import SurahList from './pages/SurahList.jsx';
import Memorize from './pages/Memorize.jsx';
import Quiz from './pages/Quiz.jsx';
import Bookmarks from './pages/Bookmarks.jsx';
import Challenges from './pages/Challenges.jsx';
import StudyMatch from './pages/StudyMatch.jsx';
import Profile from './pages/Profile.jsx';
import Settings from './pages/Settings.jsx';
import Login from './pages/Login.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import ConfirmEmail from './pages/ConfirmEmail.jsx';
import LandingPage from './pages/LandingPage.jsx';
import Terms from './pages/Terms.jsx';
import Privacy from './pages/Privacy.jsx';
import Help from './pages/Help.jsx';
import Leaderboard from './pages/Leaderboard.jsx';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated } = useAuth();
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
      <div className="fixed inset-0 flex items-center justify-center bg-emerald-50/50">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <OfflineBanner />
      <TopHeader />
      {/* Contenu principal avec padding bas pour ne pas être caché par la BottomNav */}
      <div className="pb-nav pt-header">
        <Routes>
          <Route path="/" element={<Navigate to="/Dashboard" replace />} />
          <Route path="/Dashboard" element={<Dashboard />} />
          <Route path="/SurahList" element={<SurahList />} />
          <Route path="/Memorize" element={<Memorize />} />
          <Route path="/Quiz" element={<Quiz />} />
          <Route path="/Bookmarks" element={<Bookmarks />} />
          <Route path="/Challenges" element={<Challenges />} />
          <Route path="/StudyMatch" element={<StudyMatch />} />
          <Route path="/Profile" element={<Profile />} />
          <Route path="/Settings" element={<Settings />} />
          <Route path="/Help" element={<Help />} />
          <Route path="/Leaderboard" element={<Leaderboard />} />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </div>
      {/* Bottom navigation bar (visible uniquement sur mobile) */}
      <BottomNav />
      <InstallPrompt />
    </>
  );
};

const LandingOrDashboard = () => {
  const { isLoadingAuth, isAuthenticated } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-emerald-50/50">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/Dashboard" replace />;
  }

  return <LandingPage />;
};

function App() {
  return (
    <AuthProvider>
      <PreferencesProvider>
        <AudioProvider>
          <QueryClientProvider client={queryClientInstance}>
            <Router>
              <Routes>
                <Route path="/" element={<LandingOrDashboard />} />
                <Route path="/login" element={<Login />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/confirm" element={<ConfirmEmail />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
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