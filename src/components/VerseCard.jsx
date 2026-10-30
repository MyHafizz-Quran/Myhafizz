import React, { useState, useRef, useEffect } from "react";
import { Eye, EyeOff, CheckCircle2, Circle, Play, Pause, RotateCcw, Repeat, Heart } from "@/components/icons";
import { getReciterDisplayName } from "@/lib/reciterNames";
import { useAudioManager } from "@/lib/AudioManager";
import { getArabicFontClass } from "@/lib/arabicDisplayUtils";

const REPEAT_OPTIONS = [1, 2, 3, 5, 10, Infinity];

const SPEED_OPTIONS = [
  { value: 0.5, label: '0.5x', icon: '🐢' },
  { value: 0.75, label: '0.75x', icon: '🔽' },
  { value: 1, label: '1x', icon: '⏺' },
  { value: 1.25, label: '1.25x', icon: '🔼' },
  { value: 1.5, label: '1.5x', icon: '⚡' },
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
          >
            {displayWords && displayWords.length > 0 ? (
              displayWords.map((word, i) => (
                <span
                  key={i}
                  onClick={() => seekToWord(i)}
                  className={`inline-block px-1.5 py-1 rounded-xl transition-all duration-300 cursor-pointer ${i === activeWordIndex
                      ? 'text-primary scale-110 drop-shadow-md'
                      : 'hover:text-primary/70'
                    }`}
                >
                  {word.text_uthmani}
                </span>
              ))
            ) : (
              verse.text
            )}
          </div>
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

      </div>
    </div>
  );
})