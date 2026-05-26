import React, { useState, useRef, useEffect } from "react";
<<<<<<< HEAD
import { Eye, EyeOff, CheckCircle2, Circle, Play, Pause, RotateCcw, Repeat, Heart } from "lucide-react";
import { getReciterDisplayName } from "@/lib/reciterNames";
import { useAudioManager } from "@/lib/AudioManager";
import { getArabicFontClass } from "@/lib/arabicDisplayUtils";
=======
import { Eye, EyeOff, CheckCircle2, Circle, Play, Pause, RotateCcw, Repeat, Heart, MapPin } from "lucide-react";
import { getReciterDisplayName } from "@/lib/reciterNames";
import { useAudioManager } from "@/lib/AudioManager";
import { getArabicFontClass, getArabicSizeClass, getLineSpacingClass, getTextContrastClass } from "@/lib/arabicDisplayUtils";
>>>>>>> 7f0356aab4c376641d3aa5b6c0c4f22b935a7fe0

const REPEAT_OPTIONS = [1, 2, 3, 5, 10, Infinity];

const SPEED_OPTIONS = [
<<<<<<< HEAD
  { value: 0.5, label: '0.5x', icon: '🐢' },
  { value: 0.75, label: '0.75x', icon: '🔽' },
  { value: 1, label: '1x', icon: '⏺' },
  { value: 1.25, label: '1.25x', icon: '🔼' },
  { value: 1.5, label: '1.5x', icon: '⚡' },
=======
  { value: 0.5,  label: '0.5x', icon: '🐢' },
  { value: 0.75, label: '0.75x', icon: '🔽' },
  { value: 1,    label: '1x',   icon: '⏺' },
  { value: 1.25, label: '1.25x', icon: '🔼' },
  { value: 1.5,  label: '1.5x', icon: '⚡' },
>>>>>>> 7f0356aab4c376641d3aa5b6c0c4f22b935a7fe0
];

const STOP_KEY = "quran_stop_markers";
const FAV_KEY = "quran_favorites";

function getStopMarkers() { try { return JSON.parse(localStorage.getItem(STOP_KEY) || "{}"); } catch { return {}; } }
function getFavorites() { try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); } catch { return []; } }

/**
 * VerseCard - Redesigned component for displaying Quranic verses
 * Features:
 * - Circular verse number badge (green)
 * - Large, clear Arabic text (right-to-left) with optional word-by-word cursor
 * - Audio controls: play/pause, restart, repeat, speed
 * - Bottom action row: favorite, stop marker, hide, memorized (with text labels)
 */
export default React.memo(function VerseCard({ verse, reciter = "ar.alafasy", isMemorized, isHidden, onToggleMemorized, onToggleHidden, showPhonetic = false, showTranslation = false, index, isActive = false, surahEnglishName = "", arabicTextSize = "medium", arabicFont = "system", textContrast = "normal", lineSpacing = "normal", showVerseNumbers = true, words, wordTimings }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [repeatCount, setRepeatCount] = useState(1);
  const [currentRepeat, setCurrentRepeat] = useState(0);
  const [repeatMenuOpen, setRepeatMenuOpen] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [hasStopMarker, setHasStopMarker] = useState(() => !!getStopMarkers()[verse.number]);
  const [isFavorite, setIsFavorite] = useState(() => getFavorites().includes(verse.number));
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef(null);
  const repeatRef = useRef({ count: 1, current: 0 });
  const savedTimeRef = useRef(getStopMarkers()[verse.number] || 0);
  const playbackRateRef = useRef(1);
  const wordsRef = useRef(words);
  const wordTimingsRef = useRef(wordTimings);

  const { loopPlaying, stopLoop } = useAudioManager();

  const audioUrl = `https://cdn.islamic.network/quran/audio/128/${reciter}/${verse.number}.mp3`;

  useEffect(() => {
    repeatRef.current = { count: repeatCount, current: currentRepeat };
  }, [repeatCount, currentRepeat]);

  useEffect(() => {
    wordsRef.current = words;
    wordTimingsRef.current = wordTimings;
  }, [words, wordTimings]);

  // When the global loop starts, pause this individual verse audio so only one source plays at a time
  useEffect(() => {
    if (loopPlaying && isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setActiveWordIndex(-1);
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    }
  }, [loopPlaying, isPlaying]);

  const saveStopMarker = (time) => {
    const markers = getStopMarkers();
    markers[verse.number] = time;
    localStorage.setItem(STOP_KEY, JSON.stringify(markers));
    savedTimeRef.current = time;
    setHasStopMarker(true);
  };

  const clearStopMarker = () => {
    const markers = getStopMarkers();
    delete markers[verse.number];
    localStorage.setItem(STOP_KEY, JSON.stringify(markers));
    savedTimeRef.current = 0;
    setHasStopMarker(false);
  };

  const toggleFavorite = () => {
    const favs = getFavorites();
    let newFavs;
    if (favs.includes(verse.number)) {
      newFavs = favs.filter(n => n !== verse.number);
      setIsFavorite(false);
    } else {
      newFavs = [...favs, verse.number];
      setIsFavorite(true);
    }
    localStorage.setItem(FAV_KEY, JSON.stringify(newFavs));
  };

  const setMediaSession = () => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: surahEnglishName ? `${surahEnglishName} — Verset ${verse.numberInSurah}` : `Verset ${verse.numberInSurah}`,
      artist: getReciterDisplayName(reciter),
      album: 'MyHafizz — القرآن الكريم',
      artwork: [
        { src: '/media-artwork.svg', sizes: '512x512', type: 'image/svg+xml' },
        { src: '/logo-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/logo-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/logo.svg', sizes: '96x96', type: 'image/svg+xml' },
      ],
    });
    navigator.mediaSession.setActionHandler('play', () => {
      audioRef.current?.play();
      setIsPlaying(true);
      navigator.mediaSession.playbackState = 'playing';
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      if (audioRef.current) saveStopMarker(audioRef.current.currentTime);
      audioRef.current?.pause();
      setIsPlaying(false);
      navigator.mediaSession.playbackState = 'paused';
    });
  };

  const changeSpeed = (speed) => {
    setPlaybackRate(speed);
    playbackRateRef.current = speed;
    if (audioRef.current) audioRef.current.playbackRate = speed;
  };

  const handlePlay = (overrideStartTime = null) => {
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.playbackRate = playbackRateRef.current;
      audioRef.current.ontimeupdate = () => {
        const w = wordsRef.current;
        const wt = wordTimingsRef.current;
        if (!w || !wt || !audioRef.current) return;
        const timeMs = audioRef.current.currentTime * 1000;
        const idx = wt.findIndex(([, start, end]) => timeMs >= start && timeMs < end);
        if (idx !== -1) setActiveWordIndex(idx);
      };
      audioRef.current.onended = () => {
        setActiveWordIndex(-1);
        clearStopMarker();
        const { count, current } = repeatRef.current;
        const next = current + 1;
        if (count === Infinity || next < count) {
          repeatRef.current.current = next;
          setCurrentRepeat(next);
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => setIsPlaying(false));
        } else {
          setIsPlaying(false);
          setCurrentRepeat(0);
          repeatRef.current.current = 0;
          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'none';
        }
      };
    }
    if (isPlaying) {
      saveStopMarker(audioRef.current.currentTime);
      audioRef.current.pause();
      setIsPlaying(false);
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    } else {
      // Stop the global loop before starting individual verse playback
      stopLoop();
      setCurrentRepeat(0);
      repeatRef.current.current = 0;
      audioRef.current.currentTime = overrideStartTime !== null ? overrideStartTime : (savedTimeRef.current || 0);
      audioRef.current.playbackRate = playbackRateRef.current;
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        setMediaSession();
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
      }).catch(() => setIsPlaying(false));
    }
  };

  const handleRestart = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    clearStopMarker();
    setIsPlaying(false);
    setCurrentRepeat(0);
    setActiveWordIndex(-1);
    repeatRef.current.current = 0;
  };

  const seekToWord = (idx) => {
    if (!wordTimingsRef.current || !wordTimingsRef.current[idx]) return;
    const seekTimeSec = wordTimingsRef.current[idx][1] / 1000;
    if (audioRef.current && isPlaying) {
      audioRef.current.currentTime = seekTimeSec;
    } else {
      handlePlay(seekTimeSec);
    }
  };

  const cycleRepeat = (val) => {
    setRepeatCount(val);
    repeatRef.current.count = val;
    setRepeatMenuOpen(false);
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.ontimeupdate = null;
      audioRef.current = null;
      setIsPlaying(false);
      setCurrentRepeat(0);
      setActiveWordIndex(-1);
      savedTimeRef.current = 0;
    }
  }, [audioUrl]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.onended = null;
        audioRef.current.ontimeupdate = null;
        audioRef.current = null;
      }
    };
  }, []);

  // Filter displayable words (exclude end markers)
  const displayWords = words ? words.filter(w => w.char_type !== 'end') : null;

  return (
    <div
<<<<<<< HEAD
      className={`group relative py-12 border-b transition-all duration-500 flex flex-col items-center justify-center min-h-[50vh] ${isActive
          ? "border-primary/20 bg-surface-container-low dark:bg-surface-container-low shadow-[inset_0_4px_24px_rgba(0,0,0,0.02)]"
          : "border-outline-variant/10 bg-transparent hover:bg-surface-container-lowest"
        }`}
    >
      {/* Absolute floating decorations to emulate Stitch deep focus */}
      {isActive && (
        <>
          <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none -z-10"></div>
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-tertiary-fixed/5 rounded-full blur-3xl pointer-events-none -z-10"></div>
        </>
      )}

      <div className="w-full max-w-2xl mx-auto px-4 z-10 flex flex-col items-center space-y-10">

        {/* Arabic Verse */}
        <div className="relative group/text w-full">
          {showVerseNumbers && (
            <div className="absolute -left-4 md:-left-12 top-2 opacity-50 text-xs font-label font-bold text-on-surface-variant flex flex-col items-center gap-1">
              <span className="w-8 h-8 rounded-full border border-outline-variant/30 flex items-center justify-center">{verse.numberInSurah}</span>
              {hasStopMarker && <div className="w-2 h-2 rounded-full bg-primary" />}
            </div>
          )}
          <div
            dir="rtl"
            className={`${getArabicFontClass(arabicFont)} text-4xl md:text-5xl lg:text-6xl text-on-surface leading-loose text-center px-4 transition-all duration-500 ${isHidden ? "blur-xl select-none opacity-40" : ""
              } ${displayWords ? "flex flex-wrap justify-center gap-x-3 gap-y-4" : ""}`}
=======
      className={`group relative rounded-3xl border-2 transition-all duration-300 ${
        isActive
          ? "border-amber-300 dark:border-amber-500 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/50 dark:from-amber-900/20 dark:via-gray-900 dark:to-amber-900/10 shadow-lg shadow-amber-100/60 dark:shadow-amber-900/20"
          : isMemorized
            ? "border-emerald-300 dark:border-emerald-700 bg-gradient-to-br from-emerald-50/60 via-white to-emerald-50/40 dark:from-emerald-950/40 dark:via-gray-900 dark:to-emerald-950/20 shadow-md shadow-emerald-100/50 dark:shadow-none"
            : "border-[#E8D5B7] dark:border-gray-700 bg-gradient-to-b from-[#FEF9F0] to-[#FDF5E6] dark:from-gray-900 dark:to-gray-950 hover:border-[#D4B896] dark:hover:border-emerald-700 hover:shadow-lg hover:shadow-amber-50/50 dark:hover:shadow-none"
      }`}
    >
      <div className="flex items-start p-4 sm:p-5 gap-4">
        {/* Left: Circular verse number badge */}
        <div className="flex-shrink-0 flex flex-col items-center gap-1">
          {showVerseNumbers && (
          <div
            className={`relative flex-shrink-0 rounded-full flex items-center justify-center font-bold text-base transition-all duration-300 ${
              isActive
                ? "bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-md shadow-amber-300/50"
                : isMemorized
                  ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-300/40 dark:shadow-emerald-900/40"
                  : "bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-sm shadow-emerald-200/60 dark:shadow-emerald-900/30"
            }`}
            style={{ width: "44px", height: "44px", minWidth: "44px", minHeight: "44px" }}
          >
            <span className="text-sm font-extrabold">{verse.numberInSurah}</span>
            {hasStopMarker && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-400 border-2 border-white dark:border-gray-900 rounded-full shadow-sm" title="Marqueur d'arrêt" />
            )}
          </div>
          )}
        </div>

        {/* Center: Content area */}
        <div className="flex-1 min-w-0">
          {/* Arabic text — word-by-word if words available, otherwise plain text */}
          <div
            dir="rtl"
            className={`${getArabicFontClass(arabicFont)} ${getArabicSizeClass(arabicTextSize)} ${getLineSpacingClass(lineSpacing)} ${getTextContrastClass(textContrast)} transition-all duration-500 ${
              isHidden ? "blur-xl select-none" : ""
            } ${displayWords ? "flex flex-wrap justify-end gap-x-2 gap-y-1" : "text-right"}`}
>>>>>>> 7f0356aab4c376641d3aa5b6c0c4f22b935a7fe0
          >
            {displayWords && displayWords.length > 0 ? (
              displayWords.map((word, i) => (
                <span
                  key={i}
                  onClick={() => seekToWord(i)}
<<<<<<< HEAD
                  className={`inline-block px-1.5 py-1 rounded-xl transition-all duration-300 cursor-pointer ${i === activeWordIndex
                      ? 'text-primary scale-110 drop-shadow-md'
                      : 'hover:text-primary/70'
                    }`}
=======
                  className={`inline-block px-1.5 py-1 rounded-lg transition-all duration-150 cursor-pointer ${
                    i === activeWordIndex
                      ? 'bg-emerald-200/70 dark:bg-emerald-800/50 scale-105'
                      : 'hover:bg-amber-100/60 dark:hover:bg-gray-800/50'
                  }`}
>>>>>>> 7f0356aab4c376641d3aa5b6c0c4f22b935a7fe0
                >
                  {word.text_uthmani}
                </span>
              ))
            ) : (
              verse.text
            )}
          </div>
<<<<<<< HEAD
        </div>

        {/* Translations */}
        <div className="text-center max-w-xl space-y-4">
          {showPhonetic && verse.transliteration && (
            <p className={`font-body text-base text-on-surface-variant italic transition-all duration-500 ${isHidden ? "blur-md select-none opacity-20" : ""}`}>
              {verse.transliteration}
            </p>
          )}
          {showTranslation && verse.translation && (
            <p className={`font-headline text-lg md:text-xl text-on-surface-variant font-medium transition-all duration-500 ${isHidden ? "blur-md select-none opacity-20" : ""}`}>
              "{verse.translation}"
            </p>
          )}
        </div>

        {/* Audio Controls & Actions (Glass Panel) */}
        <div className="w-full max-w-sm bg-surface/80 backdrop-blur-xl rounded-[2.5rem] p-3 flex flex-col gap-3 shadow-[0_-4px_24px_rgba(27,28,26,0.04)] border border-outline-variant/10">

          <div className="flex items-center justify-between px-2">
            <button onClick={() => setRepeatMenuOpen(!repeatMenuOpen)} className={`p-3 rounded-full transition-colors ${repeatCount > 1 ? "text-primary bg-primary-container" : "text-on-surface-variant hover:bg-surface-container"}`}>
              <Repeat className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <button onClick={handleRestart} className="p-3 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors">
                <RotateCcw className="w-5 h-5" />
              </button>

              <button onClick={() => handlePlay()} className="w-14 h-14 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg shadow-primary/20 active:scale-95 transition-transform">
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
              </button>

              <button onClick={onToggleHidden} className={`p-3 rounded-full transition-colors ${isHidden ? "text-primary bg-primary-container" : "text-on-surface-variant hover:bg-surface-container"}`}>
                {isHidden ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <button onClick={onToggleMemorized} className={`p-3 rounded-full transition-colors ${isMemorized ? "text-tertiary bg-tertiary-container/30" : "text-on-surface-variant hover:bg-surface-container"}`}>
              {isMemorized ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
            </button>
          </div>

          {repeatMenuOpen && (
            <div className="flex justify-center gap-2 pt-2 border-t border-outline-variant/10">
              {REPEAT_OPTIONS.map(n => (
                <button key={n} onClick={() => cycleRepeat(n)} className={`w-8 h-8 rounded-full text-xs font-bold transition-colors ${repeatCount === n ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container"}`}>
                  {n === Infinity ? "∞" : n}
                </button>
              ))}
              <button onClick={toggleFavorite} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${isFavorite ? "text-rose-500 bg-rose-50" : "text-on-surface-variant hover:bg-surface-container"}`}>
                <Heart className={`w-4 h-4 ${isFavorite ? "fill-rose-500" : ""}`} />
              </button>
            </div>
          )}

        </div>

=======

          {/* Transliteration if enabled */}
          {showPhonetic && verse.transliteration && (
            <p className={`text-sm text-muted-foreground italic mt-2 leading-relaxed transition-all duration-500 ${isHidden ? "blur-lg select-none" : ""}`}>
              {verse.transliteration}
            </p>
          )}

          {/* French translation if enabled */}
          {showTranslation && verse.translation && (
            <p className={`text-sm text-blue-600 dark:text-blue-400 mt-2 leading-relaxed transition-all duration-500 ${isHidden ? "blur-lg select-none" : ""}`}>
              {verse.translation}
            </p>
          )}

          {/* Audio controls - Clean, minimal style */}
          <div className="flex items-center gap-2 mt-4">
            {/* Play/Pause button */}
            <button
              onClick={() => handlePlay()}
              className={`flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 ${
                isPlaying
                  ? "bg-emerald-500 text-white shadow-sm shadow-emerald-300/50 dark:shadow-emerald-900/30"
                  : "text-gray-500 dark:text-gray-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400"
              }`}
              title={isPlaying ? "Pause" : "Lecture"}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            {/* Restart button */}
            <button
              onClick={handleRestart}
              className="flex items-center justify-center w-9 h-9 rounded-full text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-all duration-200"
              title="Recommencer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Repeat selector */}
            <div className="relative">
              <button
                onClick={() => setRepeatMenuOpen(!repeatMenuOpen)}
                className={`flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold transition-all duration-200 ${
                  repeatCount > 1
                    ? "bg-amber-100/80 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 shadow-sm"
                    : "text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300"
                }`}
                title="Répétition"
              >
                <Repeat className="w-3.5 h-3.5" />
                <span>{repeatCount === Infinity ? "∞" : `×${repeatCount}`}</span>
              </button>
              {repeatMenuOpen && (
                <>
                  <div className="fixed inset-0 z-[var(--z-dropdown)]" aria-hidden="true" onClick={() => setRepeatMenuOpen(false)} />
                  <div className="absolute top-full mt-2 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-3 z-[calc(var(--z-dropdown)+1)]" style={{minWidth: "180px"}}>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 px-1">Nombre de répétitions</p>
                    <div className="flex gap-1.5 flex-wrap mb-3">
                      {REPEAT_OPTIONS.map(n => (
                        <button
                          key={n}
                          onClick={() => { cycleRepeat(n); setCustomInput(""); }}
                          className={`w-9 h-9 rounded-xl text-xs font-bold transition-all duration-200 ${
                            repeatCount === n
                              ? "bg-emerald-500 text-white shadow-sm"
                              : "bg-gray-100 dark:bg-gray-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {n === Infinity ? "∞" : n}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        max="99"
                        placeholder="Autre..."
                        value={customInput}
                        onChange={e => setCustomInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            const v = parseInt(customInput);
                            if (v >= 1) { cycleRepeat(v); setCustomInput(""); }
                          }
                        }}
                        className="flex-1 min-w-0 h-9 px-3 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                      />
                      <button
                        onClick={() => {
                          const v = parseInt(customInput);
                          if (v >= 1) { cycleRepeat(v); setCustomInput(""); }
                        }}
                        className="h-9 px-4 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-colors shadow-sm"
                      >OK</button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Current repeat indicator */}
            {isPlaying && repeatCount > 1 && (
              <span className="text-xs text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-full">
                {repeatCount === Infinity ? `×${currentRepeat + 1}` : `${currentRepeat + 1}/${repeatCount}`}
              </span>
            )}
          </div>

          {/* Speed controls */}
          <div className="flex items-center gap-1.5 mt-3 flex-wrap">
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium mr-1">Vitesse</span>
            {SPEED_OPTIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => changeSpeed(s.value)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  playbackRate === s.value
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>

          {/* Action buttons — horizontal row with text labels */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {/* Favorite */}
            <button
              onClick={toggleFavorite}
              title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                isFavorite
                  ? "text-rose-500 bg-rose-50 dark:bg-rose-900/20"
                  : "text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-400"
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isFavorite ? "fill-rose-500" : ""}`} />
              <span>{isFavorite ? 'Favori' : 'Favori'}</span>
            </button>

            {/* Stop marker */}
            <button
              onClick={hasStopMarker ? clearStopMarker : () => saveStopMarker(audioRef.current?.currentTime || 0)}
              title={hasStopMarker ? "Effacer le marqueur d'arrêt" : "Marquer l'arrêt ici"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                hasStopMarker
                  ? "text-amber-500 bg-amber-50 dark:bg-amber-900/20"
                  : "text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-400"
              }`}
            >
              <MapPin className={`w-3.5 h-3.5 ${hasStopMarker ? "fill-amber-400" : ""}`} />
              <span>Marqueur</span>
            </button>

            {/* Hide/Show */}
            <button
              onClick={onToggleHidden}
              title={isHidden ? "Afficher le verset" : "Masquer le verset"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                isHidden
                  ? "text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-gray-700"
                  : "text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-600"
              }`}
            >
              {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{isHidden ? 'Afficher' : 'Masquer'}</span>
            </button>

            {/* Memorized checkbox */}
            <button
              onClick={onToggleMemorized}
              title={isMemorized ? "Marquer comme non mémorisé" : "Marquer comme mémorisé"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                isMemorized
                  ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                  : "text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-400"
              }`}
            >
              {isMemorized ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
              <span>{isMemorized ? 'Mémorisé' : 'Mémoriser'}</span>
            </button>
          </div>
        </div>
>>>>>>> 7f0356aab4c376641d3aa5b6c0c4f22b935a7fe0
      </div>
    </div>
  );
})