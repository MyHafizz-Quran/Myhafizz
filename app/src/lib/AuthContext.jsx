import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { clearQueryCache } from '@/lib/query-client';
import { db } from '@/api/neonClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const isManualLogout = useRef(false);
  const isRefreshing = useRef(false);

  useEffect(() => {
    // Build d'aperçu UI uniquement (VITE_UI_PREVIEW=1) : faux utilisateur, jamais en production
    if (import.meta.env.VITE_UI_PREVIEW === '1') {
      setUser({ id: 'preview', email: 'amina@exemple.fr', user_metadata: { full_name: 'Amina Diallo' } });
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      return;
    }
    db.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsAuthenticated(!!session?.user);
      setIsLoadingAuth(false);
    }).catch(() => {
      setUser(null);
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
    });

    const { data: { subscription } } = db.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' && !isManualLogout.current) {
        if (isRefreshing.current) return;
        isRefreshing.current = true;
        db.auth.refreshSession().then(({ data: { session: refreshed } }) => {
          if (refreshed) {
            setUser(refreshed.user);
            setIsAuthenticated(true);
          } else {
            setUser(null);
            setIsAuthenticated(false);
          }
          setIsLoadingAuth(false);
        }).catch(() => {
          setUser(null);
          setIsAuthenticated(false);
          setIsLoadingAuth(false);
        }).finally(() => {
          isRefreshing.current = false;
        });
        return;
      }
      setUser(session?.user ?? null);
      setIsAuthenticated(!!session?.user);
      setIsLoadingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    isManualLogout.current = true;
    await db.auth.signOut();
    await clearQueryCache();
    isManualLogout.current = false;
    setUser(null);
    setIsAuthenticated(false);
  };

  // Synchronise l'état après une connexion réussie, avant de quitter /login
  const syncSession = async () => {
    for (let i = 0; i < 5; i++) {
      const { data: { session } } = await db.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
        setIsLoadingAuth(false);
        return true;
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    return false;
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoadingAuth, logout, navigateToLogin, syncSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

