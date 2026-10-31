import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart, MapPin, Trash, Play } from "@phosphor-icons/react";
import { SURAHS } from "@/components/quranData";
import PageHeader from "@/components/PageHeader";

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
  { key: "favorites", label: "Favoris", icon: Heart },
  { key: "markers", label: "Marqueurs", icon: MapPin },
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

  const items = activeTab === "favorites" ? favoriteItems : markerItems;

  return (
    <div className="min-h-[100dvh] bg-background pb-nav">
      <div className="max-w-2xl mx-auto px-4">
        <PageHeader title="Signets" back="/SurahList" />
        <div className="grid grid-cols-2 gap-1 p-1 rounded-[14px] bg-muted mt-3">
          {TABS.map((t) => {
            const n = t.key === "favorites" ? favoriteItems.length : markerItems.length;
            return (
              <button key={t.key} onClick={() => setActiveTab(t.key)} className={`h-10 rounded-[10px] text-sm font-extrabold flex items-center justify-center gap-1.5 ${activeTab === t.key ? "bg-card text-accent-foreground shadow-[0_2px_0_hsl(var(--border))]" : "text-muted-foreground"}`}>
                <t.icon weight="fill" className="w-4 h-4" />{t.label} <span className="opacity-70">{n}</span>
              </button>
            );
          })}
        </div>

        {!items.length ? (
          <div className="card-flat p-6 mt-4 text-center">
            <span className="w-14 h-14 mx-auto rounded-2xl bg-accent text-primary flex items-center justify-center">{activeTab === "favorites" ? <Heart weight="fill" className="w-7 h-7" /> : <MapPin weight="fill" className="w-7 h-7" />}</span>
            <p className="font-black text-lg mt-3">{activeTab === "favorites" ? "Aucun verset favori" : "Aucun marqueur"}</p>
            <p className="text-sm font-semibold text-muted-foreground mt-1">{activeTab === "favorites" ? "Touche le cœur sous un verset pour le retrouver ici." : "Les endroits où tu t'es arrêté dans l'audio apparaissent ici."}</p>
            <Link to="/SurahList" className="btn-relief inline-flex h-11 px-5 mt-4 bg-primary text-primary-foreground">Ouvrir le Coran</Link>
          </div>
        ) : (
          <div className="card-flat overflow-hidden divide-y-2 divide-border mt-4">
            {items.map(({ verseNumber, info }) => (
              <div key={verseNumber} className="flex items-center gap-3 p-3.5">
                <Link to={`/Memorize?surah=${info.surah.number}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="w-10 h-10 rounded-xl bg-accent text-accent-foreground font-black text-sm flex items-center justify-center shrink-0">{info.surah.number}</span>
                  <div className="min-w-0">
                    <p className="font-extrabold truncate">{info.surah.englishName}</p>
                    <p className="text-[12.5px] font-semibold text-muted-foreground">Verset {info.numberInSurah}{activeTab === "markers" && markers[verseNumber] > 0 ? ` · arrêt à ${Math.floor(markers[verseNumber])} s` : ""}</p>
                  </div>
                </Link>
                <Link to={`/Memorize?surah=${info.surah.number}`} aria-label="Ouvrir" className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-[0_3px_0_var(--primary-lip)]"><Play weight="fill" className="w-4 h-4" /></Link>
                <button onClick={() => (activeTab === "favorites" ? removeFavorite(verseNumber) : removeMarker(verseNumber))} aria-label="Retirer" className="w-10 h-10 rounded-full border-2 border-border bg-card flex items-center justify-center shrink-0 text-muted-foreground"><Trash weight="bold" className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
