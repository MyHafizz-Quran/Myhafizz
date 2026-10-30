import React, { useState, useEffect, createContext, useContext, useCallback } from "react";

const STORAGE_KEY = "quran_preferences";

// Default preferences
const DEFAULT_PREFS = {
  reciter: "ar.alafasy",
  showPhonetic: false,
  showTranslation: false,
  darkMode: false,
  arabicTextSize: "medium",
  arabicFont: "system",
  textContrast: "normal",
  lineSpacing: "normal",
  showVerseNumbers: true,
  showTajweed: false,
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function save(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

// Create a context for global preferences
const PreferencesContext = createContext(null);

/**
 * PreferencesProvider - Wrap your app with this to enable global preferences
 * This ensures all components share the same preferences state
 */
export function PreferencesProvider({ children }) {
  const [prefs, setPrefs] = useState(() => ({
    ...DEFAULT_PREFS,
    ...load(),
  }));

  // Apply dark mode class on mount and when darkMode changes
  useEffect(() => {
    if (prefs.darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [prefs.darkMode]);

  // Listen for storage events from other tabs/windows
  // Note: Storage events only fire in OTHER tabs/windows, not the one that made the change
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const newPrefs = JSON.parse(e.newValue);
          setPrefs(prev => ({ ...prev, ...newPrefs }));
        } catch {
          // Ignore parse errors
        }
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const update = useCallback((key, value) => {
    setPrefs(prev => {
      const next = { ...prev, [key]: value };
      save(next);
      return next;
    });
  }, []);

  const contextValue = {
    reciter: prefs.reciter,
    showPhonetic: prefs.showPhonetic,
    showTranslation: prefs.showTranslation,
    darkMode: prefs.darkMode,
    arabicTextSize: prefs.arabicTextSize,
    arabicFont: prefs.arabicFont,
    textContrast: prefs.textContrast,
    lineSpacing: prefs.lineSpacing,
    showVerseNumbers: prefs.showVerseNumbers,
    showTajweed: prefs.showTajweed,
    setShowTajweed: useCallback((v) => update("showTajweed", v), [update]),
    setReciter: useCallback((v) => update("reciter", v), [update]),
    setShowPhonetic: useCallback((v) => update("showPhonetic", v), [update]),
    setShowTranslation: useCallback((v) => update("showTranslation", v), [update]),
    setDarkMode: useCallback((v) => update("darkMode", v), [update]),
    setArabicTextSize: useCallback((v) => update("arabicTextSize", v), [update]),
    setArabicFont: useCallback((v) => update("arabicFont", v), [update]),
    setTextContrast: useCallback((v) => update("textContrast", v), [update]),
    setLineSpacing: useCallback((v) => update("lineSpacing", v), [update]),
    setShowVerseNumbers: useCallback((v) => update("showVerseNumbers", v), [update]),
  };

  return (
    <PreferencesContext.Provider value={contextValue}>
      {children}
    </PreferencesContext.Provider>
  );
}

/**
 * usePreferences - Hook to access global preferences
 * Must be used within a PreferencesProvider
 */
export function usePreferences() {
  const context = useContext(PreferencesContext);
  
  // Fallback for components outside the provider (backward compatibility)
  // This uses local state, so it won't sync with other components
  const [fallbackPrefs, setFallbackPrefs] = useState(() => ({
    ...DEFAULT_PREFS,
    ...load(),
  }));

  // Apply dark mode for fallback
  useEffect(() => {
    if (!context && fallbackPrefs.darkMode) {
      document.documentElement.classList.add("dark");
    } else if (!context) {
      document.documentElement.classList.remove("dark");
    }
  }, [context, fallbackPrefs.darkMode]);

  const fallbackUpdate = useCallback((key, value) => {
    setFallbackPrefs(prev => {
      const next = { ...prev, [key]: value };
      save(next);
      return next;
    });
  }, []);

  // If we have context, use it; otherwise use fallback
  if (context) {
    return context;
  }

  // Fallback return for backward compatibility
  return {
    reciter: fallbackPrefs.reciter,
    showPhonetic: fallbackPrefs.showPhonetic,
    showTranslation: fallbackPrefs.showTranslation,
    darkMode: fallbackPrefs.darkMode,
    arabicTextSize: fallbackPrefs.arabicTextSize,
    arabicFont: fallbackPrefs.arabicFont,
    textContrast: fallbackPrefs.textContrast,
    lineSpacing: fallbackPrefs.lineSpacing,
    showVerseNumbers: fallbackPrefs.showVerseNumbers,
    showTajweed: fallbackPrefs.showTajweed,
    setShowTajweed: (v) => fallbackUpdate("showTajweed", v),
    setReciter: (v) => fallbackUpdate("reciter", v),
    setShowPhonetic: (v) => fallbackUpdate("showPhonetic", v),
    setShowTranslation: (v) => fallbackUpdate("showTranslation", v),
    setDarkMode: (v) => fallbackUpdate("darkMode", v),
    setArabicTextSize: (v) => fallbackUpdate("arabicTextSize", v),
    setArabicFont: (v) => fallbackUpdate("arabicFont", v),
    setTextContrast: (v) => fallbackUpdate("textContrast", v),
    setLineSpacing: (v) => fallbackUpdate("lineSpacing", v),
    setShowVerseNumbers: (v) => fallbackUpdate("showVerseNumbers", v),
  };
}