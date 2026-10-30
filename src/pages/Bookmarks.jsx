import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MapPin, Trash2, Play, BookOpen } from "@/components/icons";
import { SURAHS } from "@/components/quranData";

const FAV_KEY = "quran_favorites";
const STOP_KEY = "quran_stop_markers";

function getFavorites() { try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); } catch { return []; } }
function getStopMarkers() { try { return JSON.parse(localStorage.getItem(STOP_KEY) || "{}"); } catch { return {}; } }

function verseNumberToInfo(absNumber) {
  let count = 0;
  for (const s of SURAHS) {
    if (absNumber >= count + 1 && absNumber <= count + s.numberOfAyahs) {
      return { surah: s, numberInSurah: absNumber - count };
    }
    count += s.numberOfAyahs;
  }
  return null;
}

const TABS = [
  { key: "favorites", label: "Favoris", icon: Heart, color: "rose" },
  { key: "markers", label: "Marqueurs", icon: MapPin, color: "amber" },
];

export default function Bookmarks() {
  const [favorites, setFavorites] = useState(getFavorites());
  const [markers, setMarkers] = useState(getStopMarkers());
  const [activeTab, setActiveTab] = useState("favorites");

  useEffect(() => {
    const onStorage = () => {
      setFavorites(getFavorites());
      setMarkers(getStopMarkers());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const removeFavorite = (verseNumber) => {
    const newFavs = favorites.filter(n => n !== verseNumber);
    localStorage.setItem(FAV_KEY, JSON.stringify(newFavs));
    setFavorites(newFavs);
  };

  const removeMarker = (verseNumber) => {
    const newMarkers = { ...markers };
    delete newMarkers[verseNumber];
    localStorage.setItem(STOP_KEY, JSON.stringify(newMarkers));
    setMarkers(newMarkers);
  };

  const favoriteItems = favorites.map(n => ({ verseNumber: n, info: verseNumberToInfo(n) })).filter(i => i.info);
  const markerItems = Object.keys(markers).map(n => ({ verseNumber: parseInt(n), info: verseNumberToInfo(parseInt(n)) })).filter(i => i.info);

  const isEmpty = activeTab === "favorites" ? favoriteItems.length === 0 : markerItems.length === 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Glass header */}
      <div className="bg-white/[0.97] dark:bg-gray-950/[0.97] backdrop-blur-xl border-b border-border/60 sticky top-0 z-[var(--z-page-header)] shadow-[0_2px_8px_rgba(0,0,0,0.05)] dark:shadow-none">
        <div className="max-w-2xl mx-auto px-4 py-3.5">
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-base font-black text-foreground">Favoris & Marqueurs</h1>
          </div>
          {/* Tabs */}
          <div className="flex gap-2">
            {TABS.map(tab => {
              const count = tab.key === "favorites" ? favoriteItems.length : markerItems.length;
              const isActive = activeTab === tab.key;
              return (
                <motion.button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  whileTap={{ scale: 0.95 }}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    isActive
                      ? tab.key === "favorites"
                        ? "bg-rose-500 text-white shadow-sm"
                        : "bg-amber-500 text-white shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-border"
                  }`}
                >
                  <tab.icon className={`w-3.5 h-3.5 ${isActive && tab.key === "favorites" ? "fill-white" : ""}`} />
                  {tab.label}
                  <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-black ${
                    isActive ? "bg-white/25 text-white" : "bg-border text-muted-foreground"
                  }`}>
                    {count}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {isEmpty ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center py-20 glass-card"
            >
              <div className="w-16 h-16 mx-auto mb-4 relative">
                {/* Open book SVG */}
                <svg viewBox="0 0 64 64" className="w-16 h-16 text-muted-foreground/40" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M32 16 C32 16 20 10 8 14 L8 50 C20 46 32 52 32 52 C32 52 44 46 56 50 L56 14 C44 10 32 16 32 16Z" />
                  <path d="M32 16 L32 52" />
                </svg>
              </div>
              <p className="text-foreground font-bold text-sm">
                {activeTab === "favorites" ? "Aucun favori enregistré" : "Aucun marqueur enregistré"}
              </p>
              <p className="text-muted-foreground text-xs mt-1 max-w-xs mx-auto">
                {activeTab === "favorites"
                  ? "Appuyez sur ❤️ sur un verset pour l'ajouter à vos favoris."
                  : "Appuyez sur 📍 sur un verset pour marquer votre position."}
              </p>
              <Link to="/SurahList" className="mt-5 inline-flex items-center gap-2 bg-primary text-primary-foreground text-xs font-bold px-5 py-2.5 rounded-xl transition-colors">
                <BookOpen className="w-4 h-4" /> Mémoriser une sourate
              </Link>
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="grid sm:grid-cols-2 gap-3"
            >
              <AnimatePresence>
                {(activeTab === "favorites" ? favoriteItems : markerItems).map(({ verseNumber, info }) => (
                  <motion.div
                    key={verseNumber}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, x: 50, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className={`glass-card p-4 border ${
                      activeTab === "favorites"
                        ? "border-rose-100/60 dark:border-rose-900/20"
                        : "border-amber-100/60 dark:border-amber-900/20"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        activeTab === "favorites"
                          ? "bg-rose-50 dark:bg-rose-900/20"
                          : "bg-amber-50 dark:bg-amber-900/20"
                      }`}>
                        {activeTab === "favorites"
                          ? <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                          : <MapPin className="w-4 h-4 text-amber-500 fill-amber-400" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-arabic font-bold text-foreground text-sm">{info.surah.name}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">{info.surah.englishName}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Verset {info.numberInSurah}
                          {activeTab === "markers" && markers[verseNumber] > 0 && (
                            <span className="ml-1 text-amber-500 font-medium">· {Math.floor(markers[verseNumber])}s</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Link to={`/Memorize?surah=${info.surah.number}`} className="flex-1">
                        <button className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary/10 dark:bg-primary/20 text-primary dark:text-emerald-400 text-xs font-bold hover:bg-primary/20 transition-colors">
                          <Play className="w-3.5 h-3.5" />
                          Ouvrir
                        </button>
                      </Link>
                      <button
                        onClick={() => activeTab === "favorites" ? removeFavorite(verseNumber) : removeMarker(verseNumber)}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
