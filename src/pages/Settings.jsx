import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Moon, Sun, Type, Languages, CheckCircle2, Download, Trash2, HardDrive, Loader2, AlignJustify, Contrast, ToggleLeft, ToggleRight, AlignVerticalSpaceAround, Play, Square } from "lucide-react";
import { usePreferences } from "@/components/usePreferences";
import { RECITERS } from "@/components/ReciterSelector";
import { SURAHS } from "@/components/quranData";
import {
  isSurahCached,
  cacheSurah,
  clearAllOfflineData,
  getOfflineStorageSize,
} from "@/lib/offlineStorage";
import { useToast } from "@/components/ui/use-toast";
import { getArabicFontClass, getArabicSizeClass, getLineSpacingClass, getTextContrastClass } from "@/lib/arabicDisplayUtils";

// ─── SegmentedControl ─────────────────────────────────────────────────────────
function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-0.5 gap-0.5">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
            value === opt.value
              ? "bg-white dark:bg-gray-700 text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── SegmentRow ───────────────────────────────────────────────────────────────
function SegmentRow({ icon, iconBg, label, sublabel, options, value, onChange }) {
  return (
    <div className="py-3">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-8 h-8 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground leading-tight">{label}</p>
          {sublabel && <p className="text-xs text-muted-foreground leading-tight mt-0.5">{sublabel}</p>}
        </div>
      </div>
      <SegmentedControl options={options} value={value} onChange={onChange} />
    </div>
  );
}

// ─── ToggleRow ────────────────────────────────────────────────────────────────
function ToggleRow({ icon, iconBg, label, sublabel, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground leading-tight">{label}</p>
          <p className="text-xs text-muted-foreground leading-tight mt-0.5">{sublabel}</p>
        </div>
      </div>
      <button
        onClick={onChange}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0 ${
          value ? "bg-emerald-500" : "bg-gray-200 dark:bg-gray-700"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
            value ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

// ─── PrefsCard (grouped rows) ─────────────────────────────────────────────────
function PrefsCard({ children }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-border rounded-2xl px-4 shadow-sm divide-y divide-border">
      {children}
    </div>
  );
}

// ─── SectionLabel ─────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2.5 px-1">
      {children}
    </p>
  );
}

// ─── ReciterCard ──────────────────────────────────────────────────────────────
function ReciterCard({ reciter, selected, onSelect, previewingId, onPreview }) {
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(reciter.name)}&background=059669&color=fff&size=80&bold=true`;
  const isSelected = selected === reciter.id;
  const isPreviewing = previewingId === reciter.id;

  return (
    <div className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all ${
      isSelected
        ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-600"
        : "bg-white dark:bg-gray-900 border-border"
    }`}>
      {/* Preview button */}
      <button
        onClick={(e) => { e.stopPropagation(); onPreview(reciter.id); }}
        title={isPreviewing ? "Arrêter" : "Écouter 10s"}
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
          isPreviewing
            ? "bg-emerald-500 hover:bg-emerald-600 text-white"
            : "bg-gray-100 dark:bg-gray-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400"
        }`}
      >
        {isPreviewing
          ? <Square className="w-3.5 h-3.5 fill-current" />
          : <Play className="w-3.5 h-3.5 fill-current" />
        }
      </button>

      {/* Main select button */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => onSelect(reciter.id)}
        className="flex items-center gap-3 flex-1 min-w-0 text-left"
      >
        <img
          src={avatarUrl}
          alt={reciter.name}
          className={`w-12 h-12 rounded-full flex-shrink-0 object-cover border-2 ${
            isSelected ? "border-emerald-400" : "border-transparent"
          }`}
        />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold truncate leading-tight ${
            isSelected ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"
          }`}>
            {reciter.name}
          </p>
          <p className="text-xs text-muted-foreground font-arabic mt-0.5">{reciter.nameAr}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xl leading-none">{reciter.flag}</span>
          {isSelected && <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />}
        </div>
      </motion.button>
    </div>
  );
}

// ─── Settings page ────────────────────────────────────────────────────────────
export default function Settings() {
  const {
    reciter, showPhonetic, showTranslation, darkMode,
    arabicTextSize, arabicFont, textContrast, lineSpacing, showVerseNumbers,
    setReciter, setShowPhonetic, setShowTranslation, setDarkMode,
    setArabicTextSize, setArabicFont, setTextContrast, setLineSpacing, setShowVerseNumbers,
  } = usePreferences();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("settings");

  // ── Audio preview state ──────────────────────────────────────────────────
  const [previewingId, setPreviewingId] = useState(null);
  const audioRef = useRef(null);
  const previewTimerRef = useRef(null);
  const audioEndedListenerRef = useRef(null);

  const stopCurrentPreview = () => {
    if (audioRef.current) {
      if (audioEndedListenerRef.current) {
        audioRef.current.removeEventListener("ended", audioEndedListenerRef.current);
        audioEndedListenerRef.current = null;
      }
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
  };

  const handlePreview = (reciterId) => {
    const wasPreviewing = previewingId === reciterId;
    stopCurrentPreview();

    // If clicking the same reciter, just stop
    if (wasPreviewing) {
      setPreviewingId(null);
      return;
    }

    // Start new preview
    const url = `https://cdn.islamic.network/quran/audio/128/${reciterId}/1.mp3`;
    const audio = new Audio(url);
    audioRef.current = audio;
    setPreviewingId(reciterId);
    audio.play().catch(() => {
      setPreviewingId(null);
      audioRef.current = null;
    });
    // Auto-stop after 10s
    previewTimerRef.current = setTimeout(() => {
      stopCurrentPreview();
      setPreviewingId(null);
    }, 10000);
    // Also stop when audio ends naturally
    const onEnded = () => {
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current);
        previewTimerRef.current = null;
      }
      audioRef.current = null;
      audioEndedListenerRef.current = null;
      setPreviewingId(null);
    };
    audioEndedListenerRef.current = onEnded;
    audio.addEventListener("ended", onEnded);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopCurrentPreview(); };
<<<<<<< HEAD
   
=======
  // eslint-disable-next-line react-hooks/exhaustive-deps
>>>>>>> 7f0356aab4c376641d3aa5b6c0c4f22b935a7fe0
  }, []);

  // ── Offline storage state ────────────────────────────────────────────────
  const [cachedSurahs, setCachedSurahs] = useState(new Set());
  const [storageSize, setStorageSize] = useState(0);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [clearingData, setClearingData] = useState(false);

  const refreshCacheStatus = async () => {
    const results = await Promise.all(SURAHS.map(s => isSurahCached(s.number)));
    const cached = new Set(SURAHS.filter((_, i) => results[i]).map(s => s.number));
    setCachedSurahs(cached);
    const size = await getOfflineStorageSize();
    setStorageSize(size);
  };

  useEffect(() => { refreshCacheStatus(); }, []);

  const downloadSurah = async (surahNumber) => {
    try {
      const [arabic, translit, french] = await Promise.all([
        fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/ar.alafasy`).then(r => r.json()),
        fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/en.transliteration`).then(r => r.json()),
        fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/fr.hamidullah`).then(r => r.json()),
      ]);
      if (arabic.code === 200) {
        const translitMap = {};
        if (translit.code === 200) translit.data.ayahs.forEach(a => { translitMap[a.numberInSurah] = a.text; });
        const translationMap = {};
        if (french.code === 200) french.data.ayahs.forEach(a => { translationMap[a.numberInSurah] = a.text; });
        const ayahs = arabic.data.ayahs.map(a => ({
          ...a,
          transliteration: translitMap[a.numberInSurah] || null,
          translation: translationMap[a.numberInSurah] || null,
        }));
        await cacheSurah(surahNumber, { ayahs, transliteration: translitMap });
        return true;
      }
    } catch {
      toast({
        title: "Erreur de téléchargement",
        description: `Impossible de télécharger la sourate ${surahNumber}`,
        variant: "destructive",
      });
    }
    return false;
  };

  const handleDownloadAll = async () => {
    if (!navigator.onLine) {
      toast({ title: "Hors ligne", description: "Connexion requise pour télécharger.", variant: "destructive" });
      return;
    }
    setDownloadingAll(true);
    setDownloadProgress(0);
    let done = 0;
    for (const surah of SURAHS) {
      if (!cachedSurahs.has(surah.number)) {
        await downloadSurah(surah.number);
      }
      done++;
      setDownloadProgress(Math.round((done / SURAHS.length) * 100));
    }
    await refreshCacheStatus();
    setDownloadingAll(false);
    toast({ title: "Téléchargement terminé", description: "Toutes les sourates sont disponibles hors ligne." });
  };

  const handleClearData = async () => {
    setClearingData(true);
    await clearAllOfflineData();
    await refreshCacheStatus();
    setClearingData(false);
    toast({ title: "Données supprimées", description: "Les données hors ligne ont été effacées." });
  };

  const formatBytes = (bytes) => {
    if (!bytes) return "0 Ko";
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  return (
    <div className="min-h-screen bg-background">

      {/* ─── HEADER STICKY ─── */}
      <div className="sticky top-0 z-[var(--z-page-header)] bg-white/[0.97] dark:bg-gray-950/[0.97] backdrop-blur-xl border-b border-border shadow-[0_2px_8px_rgba(0,0,0,0.05)] dark:shadow-none">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link
            to="/Profile"
            className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </Link>
          <h1 className="font-bold text-base text-foreground">Réglages</h1>
        </div>

        {/* ─── TABS ─── */}
        <div className="max-w-2xl mx-auto px-4 sm:px-6 flex border-t border-border/60">
          {[
            { id: "settings", label: "Réglages" },
            { id: "affichage", label: "Affichage" },
            { id: "offline", label: "Stockage hors ligne" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative py-2.5 mr-6 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ─── CONTENT ─── */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 pb-nav space-y-6">

        {activeTab === "settings" && (
          <>
            {/* ─── VOLET 1 : Préférences générales ─── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <SectionLabel>Préférences</SectionLabel>
              <PrefsCard>
                <ToggleRow
                  icon={darkMode
                    ? <Moon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                    : <Sun className="w-4 h-4 text-amber-500" />}
                  iconBg={darkMode ? "bg-indigo-50 dark:bg-indigo-900/40" : "bg-amber-50 dark:bg-amber-900/40"}
                  label="Mode sombre"
                  sublabel={darkMode ? "Thème sombre activé" : "Thème clair activé"}
                  value={darkMode}
                  onChange={() => setDarkMode(!darkMode)}
                />
                <ToggleRow
                  icon={<Type className="w-4 h-4 text-violet-500 dark:text-violet-400" />}
                  iconBg="bg-violet-50 dark:bg-violet-900/40"
                  label="Phonétique"
                  sublabel="Afficher la translittération"
                  value={showPhonetic}
                  onChange={() => setShowPhonetic(!showPhonetic)}
                />
                <ToggleRow
                  icon={<Languages className="w-4 h-4 text-blue-500 dark:text-blue-400" />}
                  iconBg="bg-blue-50 dark:bg-blue-900/40"
                  label="Version française"
                  sublabel="Afficher la traduction"
                  value={showTranslation}
                  onChange={() => setShowTranslation(!showTranslation)}
                />
              </PrefsCard>
            </motion.div>

            {/* ─── VOLET 2 : Récitateurs ─── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
              <SectionLabel>Récitateur</SectionLabel>
              <div className="space-y-2">
                {RECITERS.map((r, i) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12 + i * 0.04 }}
                  >
                    <ReciterCard reciter={r} selected={reciter} onSelect={setReciter} previewingId={previewingId} onPreview={handlePreview} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </>
        )}

        {activeTab === "affichage" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-6">

            {/* ─── APERÇU EN DIRECT ─── */}
            <div>
              <SectionLabel>Aperçu en direct</SectionLabel>
              <div className="bg-white dark:bg-gray-900 border border-border rounded-2xl px-4 py-5 shadow-sm text-center">
                <p className={`${getArabicFontClass(arabicFont)} ${getArabicSizeClass(arabicTextSize)} ${getLineSpacingClass(lineSpacing)} ${getTextContrastClass(textContrast)} transition-all duration-200`} dir="rtl">
                  بِسْمِ اللَّهِ الرَّحْمَـٰنِ الرَّحِيمِ
                </p>
                {showVerseNumbers && (
                  <div className="mt-3 inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white text-xs font-bold shadow-sm">
                    1
                  </div>
                )}
              </div>
            </div>

            {/* ─── OPTIONS D'AFFICHAGE ─── */}
            <div>
              <SectionLabel>Options d'affichage</SectionLabel>
              <PrefsCard>
                <SegmentRow
                  icon={<Type className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                  iconBg="bg-emerald-50 dark:bg-emerald-900/40"
                  label="Taille du texte arabe"
                  options={[
                    { label: "Petit", value: "small" },
                    { label: "Moyen", value: "medium" },
                    { label: "Grand", value: "large" },
                    { label: "Très grand", value: "xlarge" },
                  ]}
                  value={arabicTextSize}
                  onChange={setArabicTextSize}
                />
                <SegmentRow
                  icon={<AlignJustify className="w-4 h-4 text-violet-500 dark:text-violet-400" />}
                  iconBg="bg-violet-50 dark:bg-violet-900/40"
                  label="Police arabe"
                  options={[
                    { label: "Système", value: "system" },
                    { label: "Amiri", value: "amiri" },
                    { label: "Scheherazade", value: "scheherazade" },
                    { label: "Noto Naskh", value: "noto" },
                  ]}
                  value={arabicFont}
                  onChange={setArabicFont}
                />
                <SegmentRow
                  icon={<Contrast className="w-4 h-4 text-amber-500 dark:text-amber-400" />}
                  iconBg="bg-amber-50 dark:bg-amber-900/40"
                  label="Contraste du texte"
                  options={[
                    { label: "Normal", value: "normal" },
                    { label: "Élevé", value: "high" },
                  ]}
                  value={textContrast}
                  onChange={setTextContrast}
                />
                <SegmentRow
                  icon={<AlignVerticalSpaceAround className="w-4 h-4 text-blue-500 dark:text-blue-400" />}
                  iconBg="bg-blue-50 dark:bg-blue-900/40"
                  label="Espacement des lignes"
                  options={[
                    { label: "Compact", value: "compact" },
                    { label: "Normal", value: "normal" },
                    { label: "Aéré", value: "airy" },
                  ]}
                  value={lineSpacing}
                  onChange={setLineSpacing}
                />
                <ToggleRow
                  icon={showVerseNumbers
                    ? <ToggleRight className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                    : <ToggleLeft className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
                  iconBg={showVerseNumbers ? "bg-emerald-50 dark:bg-emerald-900/40" : "bg-gray-100 dark:bg-gray-800"}
                  label="Afficher les numéros"
                  sublabel="Numéros de verset visibles"
                  value={showVerseNumbers}
                  onChange={() => setShowVerseNumbers(!showVerseNumbers)}
                />
              </PrefsCard>
            </div>

          </motion.div>
        )}

        {activeTab === "offline" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <SectionLabel>Stockage hors ligne</SectionLabel>
            <div className="bg-white dark:bg-gray-900 border border-border rounded-2xl overflow-hidden shadow-sm">

              {/* Storage info row */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                  <HardDrive className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight">Espace utilisé</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatBytes(storageSize)} · {cachedSurahs.size}/{SURAHS.length} sourates</p>
                </div>
                {cachedSurahs.size > 0 && (
                  <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {cachedSurahs.size} hors ligne
                  </div>
                )}
              </div>

              {/* Download all button */}
              <button
                onClick={handleDownloadAll}
                disabled={downloadingAll || !navigator.onLine}
                className="w-full flex items-center gap-3 px-4 py-3 border-b border-border/60 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors disabled:opacity-60"
              >
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  {downloadingAll
                    ? <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    : <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  }
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight">
                    {downloadingAll ? `Téléchargement... ${downloadProgress}%` : "Télécharger toutes les sourates"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Texte arabe + translittération (~10 Mo)</p>
                </div>
              </button>

              {/* Surah list */}
              <div className="max-h-64 overflow-y-auto divide-y divide-border/40">
                {SURAHS.slice(0, 20).map(surah => (
                  <div key={surah.number} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="w-6 text-center text-xs font-bold text-muted-foreground flex-shrink-0">{surah.number}</span>
                    <span className="font-arabic text-base text-foreground flex-shrink-0">{surah.name}</span>
                    <span className="text-xs text-muted-foreground truncate flex-1">{surah.englishName}</span>
                    {cachedSurahs.has(surah.number)
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      : (
                        <button
                          onClick={() => downloadSurah(surah.number).then(() => refreshCacheStatus())}
                          disabled={!navigator.onLine}
                          className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-50"
                          title="Télécharger"
                        >
                          <Download className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                        </button>
                      )
                    }
                  </div>
                ))}
                {SURAHS.length > 20 && (
                  <div className="px-4 py-2 text-center text-xs text-muted-foreground">
                    + {SURAHS.length - 20} autres sourates disponibles via "Télécharger tout"
                  </div>
                )}
              </div>

              {/* Clear data button */}
              <button
                onClick={handleClearData}
                disabled={clearingData || cachedSurahs.size === 0}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors disabled:opacity-40 border-t border-border/60"
              >
                <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                  {clearingData
                    ? <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                    : <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400" />
                  }
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400 leading-tight">Supprimer les données hors ligne</p>
                  <p className="text-xs text-red-400/80 dark:text-red-500 mt-0.5">Libérer l'espace local</p>
                </div>
              </button>

            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
