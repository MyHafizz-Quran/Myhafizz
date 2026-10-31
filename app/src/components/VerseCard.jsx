import React, { useState, useRef, useEffect } from "react";
import { maskWords } from "@/lib/srs";
import { Eye, EyeOff, CheckCircle2, Circle, Play, Pause, Repeat, Heart, Eraser } from "@/components/icons";
import { haptic } from "@/hooks/usePlatform";
import { tafsirMuyassar } from "@/lib/tafsir";
import { getReciterDisplayName } from "@/lib/reciterNames";
import { useAudioManager } from "@/lib/AudioManager";
import { getArabicFontClass } from "@/lib/arabicDisplayUtils";
import { WordSheet, SimilarVerses, tajweedHtml } from "@/components/verseExtras";

const REPEAT_OPTIONS = [1, 2, 3, 5, 10, Infinity];


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
export default React.memo(function VerseCard({ verse, reciter = "ar.alafasy", isMemorized, isHidden, onToggleMemorized, onToggleHidden, showPhonetic = false, showTranslation = false, isActive = false, surahEnglishName = "", arabicTextSize = "medium", arabicFont = "system", lineSpacing = "normal", showVerseNumbers = true, words, wordTimings, maskLevel = 0, showTajweed = false, similar = null }) {
  const [selectedWord, setSelectedWord] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [repeatCount, setRepeatCount] = useState(1);
  const [currentRepeat, setCurrentRepeat] = useState(0);
  const [repeatMenuOpen, setRepeatMenuOpen] = useState(false);
  const [hasStopMarker, setHasStopMarker] = useState(() => !!getStopMarkers()[verse.number]);
  const [isFavorite, setIsFavorite] = useState(() => getFavorites().includes(verse.number));
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  // Cache-mots progressif : nombre de mots effacés en partant de la fin du verset (null = désactivé)
  const [erased, setErased] = useState(null);
  const [peek, setPeek] = useState(-1);
  const [tafsir, setTafsir] = useState(null); // null fermé · "loading" · texte · "error"
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
  const displayWords = words ? words.filter(w => (w.char_type_name || w.char_type) !== 'end') : null;
  const SIZE = { small: "text-[26px]", medium: "text-[31px]", large: "text-[37px]", xlarge: "text-[44px]" };
  const LEAD = { compact: "leading-[1.9]", normal: "leading-[2.15]", airy: "leading-[2.5]" };
  const plainWords = displayWords && displayWords.length ? null : verse.text.split(/\s+/).filter(Boolean);
  const wordCount = displayWords && displayWords.length ? displayWords.length : plainWords.length;
  const eraseOn = erased !== null && !isHidden;
  const isErased = (i) => eraseOn && i >= wordCount - erased && i !== peek;
  const stepErase = (d) => { haptic(); setPeek(-1); setErased((e) => Math.max(0, Math.min(wordCount, (e ?? 0) + d))); };
  const peekWord = (i) => { haptic(); setPeek(i); setTimeout(() => setPeek((p) => (p === i ? -1 : p)), 1500); };
  const blank = (text, i) => (
    <span key={i} onClick={(e) => { e.stopPropagation(); peekWord(i); }} className="inline-block rounded-lg bg-muted text-transparent select-none cursor-pointer mx-[2px] leading-[1.3]" aria-label="Mot effacé, touche pour le voir">{text}</span>
  );
  const toggleTafsir = () => {
    haptic();
    if (tafsir && tafsir !== "loading") { setTafsir(null); return; }
    setTafsir("loading");
    tafsirMuyassar(verse.number).then((t) => setTafsir(t || "error"), () => setTafsir("error"));
  };
  const arNum = String(verse.numberInSurah).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
  const iconBtn = "w-9 h-9 rounded-full flex items-center justify-center transition-colors press";
  const endMark = (
    <span className="inline-flex items-center justify-center align-middle mx-1 min-w-[1.6em] h-[1.6em] px-1 rounded-full border-2 border-primary/40 text-primary text-[0.5em] font-bold leading-none" style={{ fontFamily: "inherit" }} aria-label={`Verset ${verse.numberInSurah}`}>{arNum}</span>
  );

  return (
    <div className={`relative rounded-[20px] border-2 transition-colors duration-300 ${isActive ? "border-primary bg-accent/60" : "border-border bg-card"}`}>
      {/* Barre du verset */}
      <div className="flex items-center gap-1 pl-3 pr-2 pt-2.5">
        {showVerseNumbers && (
          <span className={`h-7 min-w-[28px] px-2 rounded-lg text-[13px] font-black flex items-center justify-center ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{verse.numberInSurah}</span>
        )}
        {hasStopMarker && <span className="w-2 h-2 rounded-full bg-primary ml-1" title="Reprise ici" />}
        {isMemorized && <span className="ml-1.5 text-[12px] font-extrabold text-primary flex items-center gap-1"><CheckCircle2 weight="fill" className="w-4 h-4" />Mémorisé</span>}
        {currentRepeat > 0 && <span className="ml-1.5 text-[12px] font-extrabold text-muted-foreground">{currentRepeat + 1}/{repeatCount === Infinity ? "∞" : repeatCount}</span>}
        <div className="flex-1" />
        <button onClick={() => handlePlay()} aria-label={isPlaying ? "Pause" : "Écouter ce verset"} className={`${iconBtn} ${isPlaying ? "bg-primary text-primary-foreground" : "text-primary hover:bg-accent"}`}>
          {isPlaying ? <Pause weight="fill" className="w-4 h-4" /> : <Play weight="fill" className="w-4 h-4" />}
        </button>
        <button onClick={() => setRepeatMenuOpen(!repeatMenuOpen)} aria-label="Répéter ce verset" className={`${iconBtn} ${repeatMenuOpen || repeatCount > 1 ? "bg-accent text-primary" : "text-muted-foreground hover:bg-muted"}`}>
          <Repeat className="w-[18px] h-[18px]" />
        </button>
        <button onClick={() => { haptic(); setPeek(-1); setErased(erased === null ? 1 : null); }} aria-label={erased === null ? "Effacer mot par mot" : "Arrêter d'effacer"} aria-pressed={erased !== null} className={`${iconBtn} ${erased !== null ? "bg-accent text-primary" : "text-muted-foreground hover:bg-muted"}`}>
          <Eraser className="w-[18px] h-[18px]" />
        </button>
        <button onClick={onToggleHidden} aria-label={isHidden ? "Afficher" : "Masquer"} className={`${iconBtn} ${isHidden ? "bg-accent text-primary" : "text-muted-foreground hover:bg-muted"}`}>
          {isHidden ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
        </button>
        <button onClick={onToggleMemorized} aria-label={isMemorized ? "Retirer des versets mémorisés" : "Marquer comme mémorisé"} className={`${iconBtn} ${isMemorized ? "text-primary" : "text-muted-foreground hover:bg-muted"}`}>
          {isMemorized ? <CheckCircle2 weight="fill" className="w-[22px] h-[22px]" /> : <Circle className="w-[22px] h-[22px]" />}
        </button>
      </div>

      {repeatMenuOpen && (
        <div className="mx-3 mt-2 p-1.5 rounded-xl bg-muted flex items-center gap-1">
          <span className="text-[12px] font-extrabold text-muted-foreground px-1.5">Répéter</span>
          {REPEAT_OPTIONS.map(n => (
            <button key={n} onClick={() => cycleRepeat(n)} className={`h-8 min-w-[32px] px-2 rounded-lg text-[13px] font-black ${repeatCount === n ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}>
              {n === Infinity ? "∞" : `${n}×`}
            </button>
          ))}
          <div className="flex-1" />
          <button onClick={toggleFavorite} aria-label="Favori" className={`w-8 h-8 rounded-lg flex items-center justify-center ${isFavorite ? "text-rose-500" : "text-muted-foreground"}`}>
            <Heart weight={isFavorite ? "fill" : "bold"} className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Texte arabe */}
      <div
        dir="rtl"
        onClick={() => { if (isHidden) onToggleHidden(); }}
        className={`${getArabicFontClass(arabicFont)} ${SIZE[arabicTextSize] || SIZE.medium} ${LEAD[lineSpacing] || LEAD.normal} text-foreground text-right px-4 pt-3 pb-2 transition-[filter,opacity] duration-300 ${isHidden ? "blur-lg select-none opacity-40 cursor-pointer" : ""}`}
      >
        {displayWords && displayWords.length > 0 ? (
          <>
            {displayWords.map((word, i) => isErased(i) ? <React.Fragment key={i}>{blank(word.text_uthmani, i)}{" "}</React.Fragment> : (
              <span key={i}
                onClick={(e) => { if (isHidden) return; e.stopPropagation(); setSelectedWord(i); }}
                className={`inline rounded-lg px-[3px] transition-colors duration-200 cursor-pointer ${i === activeWordIndex ? "text-primary bg-accent" : "hover:text-primary"}`}>
                {maskLevel === 1 && !isHidden && !eraseOn ? maskWords(word.text_uthmani, 1)
                  : showTajweed && word.text_uthmani_tajweed && i !== activeWordIndex ? <span dangerouslySetInnerHTML={{ __html: tajweedHtml(word.text_uthmani_tajweed) }} />
                  : word.text_uthmani}{" "}
              </span>
            ))}
            {endMark}
          </>
        ) : (
          eraseOn
            ? <>{plainWords.map((w, i) => isErased(i) ? <React.Fragment key={i}>{blank(w, i)}{" "}</React.Fragment> : <span key={i}>{w} </span>)}{endMark}</>
            : <>{maskLevel === 1 && !isHidden ? maskWords(verse.text, 1) : verse.text} {endMark}</>
        )}
      </div>
      {isHidden && <p className="text-center text-[12px] font-bold text-muted-foreground -mt-1 pb-2">Touche pour révéler</p>}
      {eraseOn && (
        <div className="mx-3 mb-2 p-1.5 rounded-xl bg-muted flex items-center gap-1.5">
          <button onClick={() => stepErase(-1)} disabled={erased === 0} aria-label="Remettre un mot" className="h-9 w-10 rounded-lg bg-card text-foreground font-black text-lg disabled:opacity-40">−</button>
          <p className="flex-1 text-center text-[12.5px] font-extrabold text-muted-foreground">
            {erased >= wordCount ? "Tout est effacé : récite de tête" : `${erased} mot${erased > 1 ? "s" : ""} effacé${erased > 1 ? "s" : ""} sur ${wordCount}`}
          </p>
          <button onClick={() => stepErase(1)} disabled={erased >= wordCount} aria-label="Effacer un mot de plus" className="btn-relief h-9 px-3 bg-primary text-primary-foreground text-[13px] disabled:opacity-40">Effacer</button>
        </div>
      )}

      {!isHidden && maskLevel === 0 && !eraseOn && <div className="px-4"><SimilarVerses verseText={verse.text} similar={similar} /></div>}
      <WordSheet word={selectedWord != null ? displayWords?.[selectedWord] : null} onClose={() => setSelectedWord(null)}
        canPlay={!!wordTimings?.[selectedWord]} onPlayFrom={() => seekToWord(selectedWord)} />

      {(showPhonetic && verse.transliteration) || (showTranslation && verse.translation) ? (
        <div className={`px-4 pb-4 pt-1 space-y-1.5 transition-[filter,opacity] duration-300 ${isHidden ? "blur-md select-none opacity-20" : ""}`}>
          {showPhonetic && verse.transliteration && <p className="text-[14px] italic font-semibold text-muted-foreground leading-relaxed">{verse.transliteration}</p>}
          {showTranslation && verse.translation && <p className="text-[15px] font-semibold text-foreground/80 leading-relaxed">{verse.translation}</p>}
        </div>
      ) : null}
      {!isHidden && (
        <div className="px-4 pb-3">
          <button onClick={toggleTafsir} className="text-[13px] font-extrabold text-primary">{tafsir && tafsir !== "loading" ? "Masquer l'explication" : tafsir === "loading" ? "Chargement…" : "Explication (tafsir)"}</button>
          {tafsir && tafsir !== "loading" && (
            tafsir === "error"
              ? <p className="text-[13px] font-semibold text-muted-foreground mt-1">Explication indisponible pour le moment. Vérifie ta connexion.</p>
              : <div className="mt-2 rounded-xl bg-muted p-3">
                  <p dir="rtl" lang="ar" className="font-arabic text-[19px] leading-[1.95] text-right text-foreground">{tafsir}</p>
                  <p className="text-[11.5px] font-bold text-muted-foreground mt-1.5">Tafsir al-Muyassar (arabe simplifié, Complexe du roi Fahd)</p>
                </div>
          )}
        </div>
      )}
    </div>
  );
})
