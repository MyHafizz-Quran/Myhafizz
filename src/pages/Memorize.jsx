import React, { useState, useEffect, useCallback, useRef } from "react";
import { MemorizationProgress, VerseReview } from "@/api/entities";
import { todayStr } from "@/lib/srs";
import { loadSimilar } from "@/lib/similar";
import { TajweedLegend } from "@/components/verseExtras";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Loader2, Eye, EyeOff, Play, Pause, Repeat, Palette, Mic } from "@/components/icons";
import { useToast } from "@/components/ui/use-toast";
import VerseCard from "@/components/VerseCard";
import { usePreferences } from "@/components/usePreferences";
import { SURAHS } from "@/components/quranData";
import {
  getCachedSurah,
  cacheSurah,
  updateCachedProgress,
  addPendingSyncAction,
} from "@/lib/offlineStorage";
import { useAudioManager, getReadingSession, saveReadingSession, clearReadingSession } from "@/lib/AudioManager";

// Resolves whichever settles first: the promise or a rejection after `ms` ms.
// Used to prevent IndexedDB from hanging forever on mobile WebKit.
const withTimeout = (promise, ms) => Promise.race([
  promise,
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error("IndexedDB timeout")), ms)
  ),
]);

export default function Memorize() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const surahParam = urlParams.get("surah");
  const surahNumber = surahParam ? parseInt(surahParam) : null;
  const surah = surahNumber ? SURAHS.find(s => s.number === surahNumber) : null;

  // Restore reading session when no surah is specified in the URL
  const didRestoreRef = useRef(false);
  useEffect(() => {
    if (surahParam || didRestoreRef.current) return;
    didRestoreRef.current = true;
    const session = getReadingSession();
    const target = session?.surahNumber || 1;
    navigate(`/Memorize?surah=${target}`, { replace: true });
  }, [surahParam, navigate]);

  // Save surah to session whenever it is loaded
  useEffect(() => {
    if (surahNumber) saveReadingSession({ surahNumber });
  }, [surahNumber]);

  // Save session on visibility change and page unload
  useEffect(() => {
    const persist = () => {
      if (surahNumber) saveReadingSession({ surahNumber });
    };
    document.addEventListener('visibilitychange', persist);
    window.addEventListener('beforeunload', persist);
    return () => {
      document.removeEventListener('visibilitychange', persist);
      window.removeEventListener('beforeunload', persist);
    };
  }, [surahNumber]);

  const INITIAL_BATCH = 20;
  const BATCH_SIZE = 15;

  const [verses, setVerses] = useState([]);
  const [loadingVerses, setLoadingVerses] = useState(true);
  const [hiddenVerses, setHiddenVerses] = useState(new Set());
  const [wordsMap, setWordsMap] = useState({});
  useEffect(() => { if (surahNumber) loadSimilar(surahNumber).then(setSimilarMap); }, [surahNumber]);
  const [timingsMap, setTimingsMap] = useState({});
  const [allHidden, setAllHidden] = useState(false);
  const [maskLevel, setMaskLevel] = useState(0); // 0 texte, 1 initiales, 2 masqué
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH);
  const sentinelRef = useRef(null);
  const { reciter, showPhonetic, showTranslation, arabicTextSize, arabicFont, textContrast, lineSpacing, showVerseNumbers, showTajweed, setShowTajweed } = usePreferences();
  const [similarMap, setSimilarMap] = useState({});

  // Global audio manager — loop state lives here so it survives navigation
  const {
    loopPlaying,
    loopIndex,
    loopMode,
    setLoopMode,
    activeSurahNumber,
    audioError,
    clearAudioError,
    startLoop,
    stopLoop,
    playLoopFrom,
    updateReciter,
    updateSurah,
  } = useAudioManager();

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Show a toast whenever the audio manager reports a load error
  useEffect(() => {
    if (!audioError) return;
    toast({ title: "Erreur audio", description: audioError, variant: "destructive" });
    clearAudioError();
  }, [audioError, clearAudioError, toast]);

  // Keep the global reciter and surah in sync so playLoopFrom always reads the latest
  useEffect(() => {
    updateReciter(reciter);
  }, [reciter, updateReciter]);

  useEffect(() => {
    if (surah) updateSurah(surah);
  }, [surah, updateSurah]);

  // Track activeSurahNumber in a ref so the navigation guard below doesn't need
  // it as a reactive dependency (which would incorrectly fire when loop starts).
  const activeSurahRef = useRef(activeSurahNumber);
  useEffect(() => {
    activeSurahRef.current = activeSurahNumber;
  }, [activeSurahNumber]);

  // When the user opens a different surah while the loop is playing another one,
  // stop the loop so the player starts fresh for the new surah.
  useEffect(() => {
    if (activeSurahRef.current !== null && activeSurahRef.current !== surahNumber) {
      stopLoop();
      setLoopMode("off");
    }
  }, [surahNumber, stopLoop, setLoopMode]);

  const { data: progressList = [] } = useQuery({
    queryKey: ["memorization-progress"],
    queryFn: () => MemorizationProgress.list(),
    retry: 2,
  });

  const currentProgress = progressList.find(p => p.surah_number === surahNumber);
  const memorizedVerses = new Set(currentProgress?.memorized_verses || []);

  const fetchAndCacheVerses = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const fetchJson = (url) =>
        fetch(url, { signal: controller.signal }).then(r => r.json());

      const [arabicResult, translitResult, frenchResult] = await Promise.allSettled([
        fetchJson(`https://api.alquran.cloud/v1/surah/${surahNumber}/ar.alafasy`),
        fetchJson(`https://api.alquran.cloud/v1/surah/${surahNumber}/en.transliteration`),
        fetchJson(`https://api.alquran.cloud/v1/surah/${surahNumber}/fr.hamidullah`),
      ]);
      clearTimeout(timeoutId);

      // Arabic text is required — fail hard if it could not be fetched.
      if (arabicResult.status === "rejected") {
        throw arabicResult.reason;
      }
      if (arabicResult.value?.code !== 200) {
        throw new Error("Impossible de charger les versets arabes");
      }
      const arabic = arabicResult.value;

      // Transliteration and translation are optional — degrade gracefully.
      const translitMap = {};
      if (translitResult.status === "fulfilled" && translitResult.value?.code === 200) {
        translitResult.value.data.ayahs.forEach(a => { translitMap[a.numberInSurah] = a.text; });
      }
      const translationMap = {};
      if (frenchResult.status === "fulfilled" && frenchResult.value?.code === 200) {
        frenchResult.value.data.ayahs.forEach(a => { translationMap[a.numberInSurah] = a.text; });
      }

      const ayahs = arabic.data.ayahs.map(a => ({
        ...a,
        transliteration: translitMap[a.numberInSurah] || null,
        translation: translationMap[a.numberInSurah] || null,
      }));
      setVerses(ayahs);
      // Cache for offline use
      cacheSurah(surahNumber, { ayahs, transliteration: translitMap });
    } catch (err) {
      const isNetworkError =
        (err instanceof TypeError && err.message.includes("fetch")) ||
        err.name === "AbortError";
      toast({
        title: "Erreur de chargement",
        description: isNetworkError
          ? "Vérifiez votre connexion internet."
          : "Impossible de charger les versets. Réessayez.",
        variant: "destructive",
      });
    } finally {
      setLoadingVerses(false);
    }
  }, [surahNumber]);

  useEffect(() => {
    setLoadingVerses(true);
    setVerses([]);
    setVisibleCount(INITIAL_BATCH);

    // Try offline cache first; timeout guards against IndexedDB hanging on mobile
    withTimeout(getCachedSurah(surahNumber), 3000)
      .then(cached => {
        if (cached) {
          setVerses(cached.ayahs);
          setLoadingVerses(false);
          // Only background refresh if cache is stale (> 1 hour) or missing timestamp
          const isStale = !cached.cachedAt || (Date.now() - cached.cachedAt > 3600000);
          if (navigator.onLine && isStale) {
            fetchAndCacheVerses();
          }
          return;
        }
        // Not in cache — need network
        if (!navigator.onLine) {
          setLoadingVerses(false);
          toast({
            title: "Sourate non disponible hors ligne",
            description: "Téléchargez-la d'abord dans les réglages.",
          });
          return;
        }
        fetchAndCacheVerses();
      })
      .catch(() => {
        // IndexedDB timed out or errored — fall back to network fetch
        if (navigator.onLine) {
          fetchAndCacheVerses();
        } else {
          setLoadingVerses(false);
        }
      });
  }, [surahNumber, fetchAndCacheVerses]);

  // Optional fetch for word-by-word text and audio timings from quran.com
  // Falls back gracefully — if this fails, verses display as plain text blocks
  useEffect(() => {
    if (!surahNumber) return;
    setWordsMap({});
    setTimingsMap({});
    const controller = new AbortController();
    Promise.allSettled([
      fetch(
        `https://api.quran.com/api/v4/verses/by_chapter/${surahNumber}?words=true&word_fields=text_uthmani,text_uthmani_tajweed&word_translation_language=en&per_page=300`,
        { signal: controller.signal }
      ).then(r => r.json()),
      fetch(
        `https://api.quran.com/api/v4/recitations/7/by_chapter/${surahNumber}?per_page=300`,
        { signal: controller.signal }
      ).then(r => r.json()),
    ]).then(([wordsResult, timingsResult]) => {
      const newWordsMap = {};
      if (wordsResult.status === 'fulfilled' && wordsResult.value?.verses) {
        wordsResult.value.verses.forEach(v => {
          const parts = v.verse_key?.split(':');
          const verseNum = parts?.length === 2 ? parseInt(parts[1]) : NaN;
          if (!isNaN(verseNum)) newWordsMap[verseNum] = v.words;
        });
      }
      const newTimingsMap = {};
      if (timingsResult.status === 'fulfilled' && timingsResult.value?.audio_files) {
        timingsResult.value.audio_files.forEach(af => {
          const parts = af.verse_key?.split(':');
          const verseNum = parts?.length === 2 ? parseInt(parts[1]) : NaN;
          if (isNaN(verseNum)) return;
          newTimingsMap[verseNum] = af.segments || [];
        });
      }
      if (Object.keys(newWordsMap).length > 0) setWordsMap(newWordsMap);
      if (Object.keys(newTimingsMap).length > 0) setTimingsMap(newTimingsMap);
    }).catch(() => {
      // Graceful degradation — words/timings unavailable
    });
    return () => controller.abort();
  }, [surahNumber]);

  // After verses load, restore scroll position and auto-resume playback from session
  const hasRestoredRef = useRef(null); // stores the surahNumber we already restored
  useEffect(() => {
    if (verses.length === 0) return;
    if (hasRestoredRef.current === surahNumber) return; // already restored for this surah
    const verseParam = parseInt(new URLSearchParams(window.location.search).get("verse"), 10);
    if (verseParam > 1 && verseParam <= verses.length) {
      hasRestoredRef.current = surahNumber;
      const idx = verseParam - 1;
      setVisibleCount(prev => Math.max(prev, idx + 5));
      setTimeout(() => {
        const el = document.getElementById(`verse-${idx}`);
        if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.classList.add("verse-flash"); setTimeout(() => el.classList.remove("verse-flash"), 1800); }
      }, 250);
      return;
    }
    const session = getReadingSession();
    if (!session || session.surahNumber !== surahNumber) return;
    hasRestoredRef.current = surahNumber;

    const savedIdx = session.loopIndex || 0;
    if (savedIdx > 0) {
      // Extend the visible batch so the target verse is rendered
      setVisibleCount(prev => Math.max(prev, savedIdx + 5));
      setTimeout(() => {
        const el = document.getElementById(`verse-${savedIdx}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 200);
    }

    // Auto-resume loop if it was playing when the user left
    if (session.wasPlaying && session.loopMode && session.loopMode !== "off" && !loopPlaying) {
      setLoopMode(session.loopMode);
      startLoop(session.loopMode, verses, reciter, surah, savedIdx);
    }
  }, [verses, surahNumber, loopPlaying, setLoopMode, startLoop, reciter, surah]);

  // Progressive rendering: load more verses as user scrolls near the bottom
  useEffect(() => {
    if (!sentinelRef.current || visibleCount >= verses.length) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount(prev => Math.min(prev + BATCH_SIZE, verses.length));
        }
      },
      { rootMargin: "400px" }
    );
    observer.observe(sentinelRef.current);
    const sentinel = sentinelRef.current;
    return () => { observer.unobserve(sentinel); observer.disconnect(); };
  }, [visibleCount, verses.length]);

  const saveMutation = useMutation({
    mutationFn: async (newMemorizedSet) => {
      const memorizedArr = Array.from(newMemorizedSet);
      const totalVerses = surah.numberOfAyahs;
      const status = memorizedArr.length === 0 ? "not_started" :
        memorizedArr.length >= totalVerses ? "completed" : "in_progress";
      const data = { surah_number: surahNumber, memorized_verses: memorizedArr, total_verses: totalVerses, status, last_reviewed: new Date().toISOString() };

      // Always update local cache immediately
      await updateCachedProgress(surahNumber, data);

      // Révision espacée : un verset nouvellement mémorisé revient demain (sabqi)
      if (navigator.onLine) {
        const added = memorizedArr.filter(v => !memorizedVerses.has(v));
        const removed = [...memorizedVerses].filter(v => !newMemorizedSet.has(v));
        const d = new Date(); d.setDate(d.getDate() + 1);
        VerseReview.upsert(added.map(v => ({ surah_number: surahNumber, verse_number: v, interval_days: 1, reps: 0, due_date: todayStr(d) })))
          .then(() => queryClient.invalidateQueries({ queryKey: ["verse-reviews"] })).catch(() => {});
        VerseReview.remove(surahNumber, removed).catch(() => {});
      }

      if (navigator.onLine) {
        if (currentProgress) {
          return MemorizationProgress.update(currentProgress.id, data);
        } else {
          return MemorizationProgress.create(data);
        }
      } else {
        // Queue for later sync
        await addPendingSyncAction({
          type: "upsert-progress",
          payload: { currentProgressId: currentProgress?.id ?? null, data },
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["memorization-progress"] }),
  });

  const toggleMemorized = useCallback((verseNum) => {
    const newSet = new Set(memorizedVerses);
    if (newSet.has(verseNum)) newSet.delete(verseNum); else newSet.add(verseNum);
    saveMutation.mutate(newSet);
  }, [memorizedVerses, saveMutation]);

  const toggleHidden = useCallback((verseNum) => {
    setHiddenVerses(prev => {
      const next = new Set(prev);
      if (next.has(verseNum)) next.delete(verseNum); else next.add(verseNum);
      return next;
    });
  }, []);

  // Masquage progressif : Texte → Initiales → Masqué → Texte
  const toggleAllHidden = () => {
    const next = (maskLevel + 1) % 3;
    setMaskLevel(next);
    if (next === 2) setHiddenVerses(new Set(verses.map(v => v.numberInSurah)));
    else setHiddenVerses(new Set());
    setAllHidden(next === 2);
  };

  const cycleLoopMode = () => {
    if (loopPlaying) {
      stopLoop();
      setLoopMode("off");
      saveReadingSession({ loopMode: "off", wasPlaying: false });
      return;
    }
    const next = loopMode === "off" ? "once" : loopMode === "once" ? "infinite" : "off";
    setLoopMode(next);
    saveReadingSession({ loopMode: next, wasPlaying: next !== "off" });
    if (next !== "off") startLoop(next, verses, reciter, surah);
  };

  // Explicit back: clear session so user starts fresh when they return via SurahList
  const handleBack = () => {
    clearReadingSession();
    stopLoop();
    navigate('/SurahList');
  };

  // ─── Raccourcis clavier (ordinateur) ───
  const [focusIdx, setFocusIdx] = useState(0);
  const [showKeys, setShowKeys] = useState(false);
  const kb = useRef({});
  kb.current = { verses, loopPlaying, loopIndex, loopMode, focusIdx, visibleCount, reciter, surah, toggleMemorized, toggleAllHidden, handleBack, stopLoop, startLoop, playLoopFrom, setLoopMode };
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (e.metaKey || e.ctrlKey || e.altKey || (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable))) return;
      const k = kb.current; const n = k.verses?.length || 0; if (!n) return;
      const focus = (i) => {
        const j = Math.max(0, Math.min(n - 1, i));
        if (j >= k.visibleCount) setVisibleCount(j + 5);
        setFocusIdx(j);
        setTimeout(() => document.getElementById(`verse-${j}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 30);
        return j;
      };
      switch (e.key) {
        case " ":
          e.preventDefault();
          if (k.loopPlaying) k.stopLoop();
          else { const m = k.loopMode !== "off" ? k.loopMode : "once"; k.setLoopMode(m); saveReadingSession({ loopMode: m, wasPlaying: true }); k.startLoop(m, k.verses, k.reciter, k.surah, k.focusIdx); }
          break;
        case "ArrowDown": case "j": e.preventDefault(); focus(k.focusIdx + 1); break;
        case "ArrowUp": case "k": e.preventDefault(); focus(k.focusIdx - 1); break;
        case "ArrowRight": case "ArrowLeft": {
          e.preventDefault();
          const base = k.loopPlaying ? k.loopIndex : k.focusIdx;
          const j = focus(base + (e.key === "ArrowRight" ? 1 : -1));
          if (k.loopPlaying) k.playLoopFrom(j, k.verses, k.loopMode);
          break;
        }
        case "m": case "M": e.preventDefault(); { const v = k.verses[k.focusIdx]; if (v) k.toggleMemorized(v.numberInSurah); } break;
        case "h": case "H": e.preventDefault(); k.toggleAllHidden(); break;
        case "?": e.preventDefault(); setShowKeys((x) => !x); break;
        case "Escape": if (showKeysRef.current) setShowKeys(false); else k.handleBack(); break;
        default:
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const showKeysRef = useRef(false); showKeysRef.current = showKeys;
  useEffect(() => { if (loopPlaying) setFocusIdx(loopIndex); }, [loopPlaying, loopIndex]);

  const percent = surah ? (memorizedVerses.size / surah.numberOfAyahs) * 100 : 0;
  const isComplete = percent === 100;

  if (!surah) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-950">
        {!surahParam ? (
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        ) : (
          <p className="text-gray-500">Sourate non trouvée</p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* ─── HEADER ─── */}
      <div className="bg-surface/95 backdrop-blur-xl border-b border-outline-variant/10 sticky top-0 z-[var(--z-page-header)] shadow-none">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">

          {/* Line 1: Back button + Surah name */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-2 rounded-full hover:bg-surface-container transition-colors duration-300 active:scale-95 text-primary"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="flex flex-col">
                <h1 className="font-headline text-primary text-xl font-bold tracking-tight">
                  {surah.englishName}
                  <span className="font-arabic ml-2 opacity-50">{surah.name}</span>
                </h1>
                <span className="font-label text-xs text-on-surface-variant uppercase tracking-widest mt-0.5">
                  Mémorisés: {memorizedVerses.size} / {surah.numberOfAyahs}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex items-center justify-center w-10 h-10">
                <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                  <circle cx="20" cy="20" r="18" fill="none" strokeWidth="3" className="stroke-surface-container" />
                  <circle cx="20" cy="20" r="18" fill="none" strokeWidth="3" strokeDasharray={`${percent * 1.13} 113`} className="stroke-primary" strokeLinecap="round" />
                </svg>
                <span className="text-[10px] font-bold text-primary">{Math.round(percent)}%</span>
              </div>
            </div>
          </div>

          {/* Line 2: Action buttons */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto no-scrollbar -mx-4 px-4">
            {/* Loop player */}
            {verses.length > 0 && (
              <button
                onClick={cycleLoopMode}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-all ${loopPlaying
                    ? "bg-primary text-on-primary shadow-sm"
                    : loopMode !== "off"
                      ? "bg-primary-container text-on-primary-container"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                  }`}
              >
                {loopPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>
                  {loopPlaying
                    ? `Lecture en cours : ${loopIndex + 1}/${verses.length}`
                    : loopMode === "infinite" ? "Boucle infinie" : "Lecture séquentielle"}
                </span>
              </button>
            )}

            {/* Répétition avancée */}
            {verses.length > 0 && (
              <button onClick={() => navigate(`/Repeat?surah=${surahNumber}`)}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap shrink-0 bg-surface-container-low text-on-surface-variant hover:bg-surface-container">
                <Repeat className="w-4 h-4" /><span>Répéter</span>
              </button>
            )}

            {/* Réciter */}
            {verses.length > 0 && (
              <button onClick={() => navigate(`/Recite?surah=${surahNumber}`)}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap shrink-0 bg-surface-container-low text-on-surface-variant">
                <Mic className="w-4 h-4" /><span>Réciter</span>
              </button>
            )}

            {/* Tajwîd */}
            {verses.length > 0 && (
              <button onClick={() => setShowTajweed(!showTajweed)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap shrink-0 ${showTajweed ? "bg-accent text-primary" : "bg-surface-container-low text-on-surface-variant"}`}>
                <Palette className="w-4 h-4" /><span>Tajwîd</span>
              </button>
            )}

            {/* Bulk hide toggle */}
            {verses.length > 0 && (
              <button
                onClick={toggleAllHidden}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-all ${maskLevel > 0
                    ? "bg-surface-container-highest text-on-surface"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                  }`}
              >
                {maskLevel === 2 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>{maskLevel === 0 ? "Texte" : maskLevel === 1 ? "Initiales" : "Masqué"}</span>
              </button>
            )}
          </div>

        </div>
      </div>

      {showTajweed && verses.length > 0 && <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-3"><TajweedLegend /></div>}

      {/* ─── VERSES ─── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-nav">
        {loadingVerses ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-9 h-9 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground text-sm font-semibold">Chargement des versets...</p>
          </div>
        ) : (
          <>
            {isComplete && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="mb-6 flex items-center gap-4 bg-accent border-2 border-primary/20 rounded-2xl p-5"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-primary flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-foreground text-base sm:text-lg">Macha'Allah ! Sourate complète</p>
                  <p className="text-muted-foreground text-sm mt-0.5">
                    Vous avez mémorisé les {surah.numberOfAyahs} versets de <span className="font-arabic">{surah.name}</span>.
                  </p>
                </div>
              </motion.div>
            )}
            <div className="space-y-4">
              {verses.slice(0, visibleCount).map((verse, i) => (
                <div key={verse.number} id={`verse-${i}`} className={`rounded-[22px] ${focusIdx === i ? "lg:ring-2 lg:ring-primary/50 lg:ring-offset-4 lg:ring-offset-background" : ""}`}>
                  <VerseCard
                    key={verse.number}
                    verse={verse}
                    reciter={reciter}
                    isMemorized={memorizedVerses.has(verse.numberInSurah)}
                    isHidden={hiddenVerses.has(verse.numberInSurah)}
                    onToggleMemorized={() => toggleMemorized(verse.numberInSurah)}
                    onToggleHidden={() => toggleHidden(verse.numberInSurah)}
                    showPhonetic={showPhonetic}
                    showTranslation={showTranslation}
                    arabicTextSize={arabicTextSize}
                    arabicFont={arabicFont}
                    textContrast={textContrast}
                    lineSpacing={lineSpacing}
                    showVerseNumbers={showVerseNumbers}
                    index={i}
                    isActive={loopPlaying && loopIndex === i}
                    surahEnglishName={surah?.englishName || ""}
                    words={wordsMap[verse.numberInSurah]}
                    wordTimings={timingsMap[verse.numberInSurah]}
                    maskLevel={maskLevel}
                    showTajweed={showTajweed}
                    similar={similarMap[verse.numberInSurah]}
                  />
                </div>
              ))}
              {visibleCount < verses.length && (
                <div ref={sentinelRef} className="h-4" />
              )}
            </div>
          </>
        )}
      </div>
      <button onClick={() => setShowKeys(true)} className="hidden lg:flex fixed bottom-6 right-6 z-[var(--z-page-header)] h-10 px-3.5 rounded-xl border-2 border-border bg-card font-extrabold text-sm items-center gap-2 text-muted-foreground hover:text-foreground">
        <kbd className="px-1.5 rounded-md bg-muted text-xs">?</kbd>Raccourcis clavier
      </button>
      {showKeys && (
        <div className="fixed inset-0 z-[200] hidden lg:flex items-center justify-center" onClick={() => setShowKeys(false)}>
          <div className="absolute inset-0 bg-foreground/30" />
          <div className="relative card-flat p-6 w-[420px]" onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-black mb-3">Raccourcis clavier</p>
            {[["Espace", "Lecture / pause"], ["↓  ↑", "Verset suivant / précédent"], ["→  ←", "Écouter le verset suivant / précédent"], ["M", "Marquer le verset comme mémorisé"], ["H", "Masquer le texte (texte, initiales, caché)"], ["Échap", "Retour à la liste"], ["?", "Afficher cette aide"]].map(([key, label]) => (
              <div key={key} className="flex items-center justify-between py-2 border-b-2 border-border last:border-0">
                <span className="font-bold text-muted-foreground">{label}</span>
                <kbd className="min-w-[44px] text-center px-2 py-1 rounded-lg border-2 border-border border-b-4 font-black text-sm bg-card">{key}</kbd>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}