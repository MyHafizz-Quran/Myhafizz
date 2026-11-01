import { saveReadPos } from "@/lib/words";
import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { getReciterDisplayName } from '@/lib/reciterNames';

const AudioManagerContext = createContext(null);

const STOP_KEY = "quran_stop_markers";
const SESSION_KEY = "myhafizz_reading_session";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getStopMarkers() {
  try { return JSON.parse(localStorage.getItem(STOP_KEY) || "{}"); } catch { return {}; }
}

function clearGlobalStopMarker(verseNumber) {
  const markers = getStopMarkers();
  delete markers[verseNumber];
  localStorage.setItem(STOP_KEY, JSON.stringify(markers));
}

export function getReadingSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (Date.now() - (session.timestamp || 0) > SESSION_MAX_AGE_MS) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch { return null; }
}

export function saveReadingSession(data) {
  try {
    const existing = getReadingSession() || {};
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      ...existing,
      ...data,
      timestamp: Date.now(),
    }));
  } catch { /* ignore storage errors */ }
}

export function clearReadingSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

/**
 * AudioProvider — wraps the entire app and keeps a singleton Audio element
 * alive across route changes. The loop state (playing, index, mode) persists
 * even when the Memorize page is unmounted, so audio continues during
 * BottomNav navigation and survives phone lock screens via the Media Session API.
 */
export const AudioProvider = ({ children }) => {
  const loopRef = useRef({
    audio: null,
    index: 0,
    mode: "off",
    verses: [],
    reciter: "ar.alafasy",
    surah: null,
    wasPlaying: false,
  });

  // Persistent singleton audio element — avoids GC on mobile browsers
  const audioElementRef = useRef(null);
  // Wake Lock reference to prevent device suspension
  const wakeLockRef = useRef(null);
  // Monotonic ID to cancel stale async callbacks
  const playIdRef = useRef(0);

  const [loopPlaying, setLoopPlaying] = useState(false);
  const [loopIndex, setLoopIndex] = useState(0);
  const [loopMode, setLoopMode] = useState("off");
  const [activeSurahNumber, setActiveSurahNumber] = useState(null);
  const [audioError, setAudioError] = useState(null);

  // Create the singleton <audio> element once on mount and attach it to the DOM.
  // Being in the DOM prevents mobile browsers from garbage-collecting the element
  // and is required for reliable background audio on Android and iOS PWAs.
  useEffect(() => {
    const el = document.createElement('audio');
    el.preload = 'auto';
    // Required by iOS Safari for inline/background playback
    el.setAttribute('playsinline', '');
    el.setAttribute('webkit-playsinline', '');
    // Invisible but present in the DOM
    el.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden;';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
    audioElementRef.current = el;
    return () => {
      el.pause();
      el.removeAttribute('src');
      if (el.parentNode) el.remove();
    };
  }, []);

  // Request Wake Lock to prevent the device from suspending during playback
  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator && !wakeLockRef.current) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        wakeLockRef.current.addEventListener('release', () => {
          wakeLockRef.current = null;
        });
      } catch { /* Wake Lock not available or not permitted */ }
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  }, []);

  // visibilitychange: resume audio if it was suspended when the app went to background
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && loopRef.current.wasPlaying) {
        // App returned to foreground — re-acquire wake lock and resume if paused
        requestWakeLock();
        const audio = loopRef.current.audio;
        if (audio && audio.paused && !audio.ended) {
          audio.play().catch(() => {});
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [requestWakeLock]);

  const stopLoop = useCallback(() => {
    const audio = loopRef.current.audio;
    if (audio) {
      audio.pause();
      audio.onended = null;
    }
    loopRef.current.audio = null;
    loopRef.current.wasPlaying = false;
    setLoopPlaying(false);
    setLoopIndex(0);
    loopRef.current.index = 0;
    releaseWakeLock();
    saveReadingSession({ wasPlaying: false });
  }, [releaseWakeLock]);

  // playLoopFrom is stable (no deps) because it reads all state through refs
  const playLoopFrom = useCallback((idx, versesArr, mode) => {
    // Invalidate any pending async callbacks from the previous play call
    const myPlayId = ++playIdRef.current;

    // Pause the singleton audio element and clear previous handlers
    const audio = audioElementRef.current;
    if (audio) {
      audio.pause();
      audio.onended = null;
    }
    if (loopRef.current.audio && loopRef.current.audio !== audio) {
      // Fallback: also stop any non-singleton element still referenced
      loopRef.current.audio.pause();
      loopRef.current.audio.onended = null;
    }
    loopRef.current.audio = null;

    if (idx >= versesArr.length) {
      if (mode === "infinite") {
        idx = 0;
      } else {
        setLoopPlaying(false);
        setLoopIndex(0);
        loopRef.current.index = 0;
        loopRef.current.wasPlaying = false;
        releaseWakeLock();
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'none';
        saveReadingSession({ wasPlaying: false, loopIndex: 0 });
        return;
      }
    }

    const verse = versesArr[idx];
    const currentReciter = loopRef.current.reciter;
    const surah = loopRef.current.surah;
    const url = `https://cdn.islamic.network/quran/audio/128/${currentReciter}/${verse.number}.mp3`;
    const markers = getStopMarkers();
    const savedTime = markers[verse.number] || 0;

    // Reuse the singleton audio element — just change the src
    if (audio) {
      audio.src = url;
      audio.preload = 'auto';
      loopRef.current.audio = audio;
    } else {
      // Fallback if singleton not yet ready (shouldn't normally happen)
      const fallback = new Audio(url);
      fallback.preload = 'auto';
      loopRef.current.audio = fallback;
    }

    loopRef.current.index = idx;
    loopRef.current.wasPlaying = true;
    setLoopIndex(idx);
    saveReadingSession({ loopIndex: idx, loopMode: mode, wasPlaying: true });
    if (surah?.number && verse.numberInSurah) saveReadPos(surah.number, verse.numberInSurah);

    // Media Session API — keeps lock-screen controls working
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: surah
          ? `${surah.englishName} — Verset ${verse.numberInSurah}`
          : `Verset ${verse.numberInSurah}`,
        artist: getReciterDisplayName(currentReciter),
        album: 'MyHafizz — القرآن الكريم',
        artwork: [
          { src: '/media-artwork.svg', sizes: '512x512', type: 'image/svg+xml' },
          { src: '/logo-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/logo-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/logo.svg', sizes: '96x96', type: 'image/svg+xml' },
        ],
      });
      navigator.mediaSession.setActionHandler('play', () => {
        loopRef.current.audio?.play().then(() => requestWakeLock()).catch(() => {});
        setLoopPlaying(true);
        loopRef.current.wasPlaying = true;
        navigator.mediaSession.playbackState = 'playing';
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        loopRef.current.audio?.pause();
        setLoopPlaying(false);
        loopRef.current.wasPlaying = false;
        navigator.mediaSession.playbackState = 'paused';
        saveReadingSession({ wasPlaying: false });
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        playLoopFrom(
          loopRef.current.index + 1,
          loopRef.current.verses,
          loopRef.current.mode,
        );
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        playLoopFrom(
          Math.max(0, loopRef.current.index - 1),
          loopRef.current.verses,
          loopRef.current.mode,
        );
      });
      navigator.mediaSession.playbackState = 'playing';
    }

    // Auto-scroll to the active verse when the Memorize page is visible
    setTimeout(() => {
      const el = document.getElementById(`verse-${idx}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);

    const activeAudio = loopRef.current.audio;

    activeAudio.onended = () => {
      if (playIdRef.current !== myPlayId) return; // Stale callback — ignore
      clearGlobalStopMarker(verse.number);
      playLoopFrom(
        loopRef.current.index + 1,
        loopRef.current.verses,
        loopRef.current.mode,
      );
    };

    activeAudio.onerror = () => {
      if (playIdRef.current !== myPlayId) return; // Stale callback — ignore
      const errorMsg = `Impossible de charger l'audio pour le réciteur "${getReciterDisplayName(currentReciter)}"`;
      console.error('[AudioManager] Audio load error:', url, activeAudio.error);
      setLoopPlaying(false);
      loopRef.current.wasPlaying = false;
      setAudioError(errorMsg);
      releaseWakeLock();
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'none';
    };

    const doPlay = () => {
      if (playIdRef.current !== myPlayId) return; // Stale callback — ignore
      if (savedTime > 0) {
        try { activeAudio.currentTime = savedTime; } catch { /* ignore */ }
      }
      activeAudio.play().then(() => {
        requestWakeLock();
      }).catch(() => {
        // Retry once after a short delay (mobile background policy)
        setTimeout(() => {
          if (playIdRef.current !== myPlayId) return;
          activeAudio.play().then(() => {
            requestWakeLock();
          }).catch(() => {
            setLoopPlaying(false);
            loopRef.current.wasPlaying = false;
            if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
          });
        }, 800);
      });
    };

    if (activeAudio.readyState >= 3) {
      doPlay();
    } else {
      activeAudio.addEventListener("canplay", doPlay, { once: true });
      activeAudio.load();
    }
  }, [requestWakeLock, releaseWakeLock]); // requestWakeLock and releaseWakeLock are stable; all other mutable state is read through stable refs

  const startLoop = useCallback((mode, verses, reciter, surah, startIndex = 0) => {
    loopRef.current.verses = verses;
    loopRef.current.mode = mode;
    loopRef.current.reciter = reciter;
    loopRef.current.surah = surah;
    setActiveSurahNumber(surah?.number ?? null);
    setLoopPlaying(true);
    setLoopIndex(startIndex);
    playLoopFrom(startIndex, verses, mode);
  }, [playLoopFrom]);

  // Keep the reciter in sync without restarting the loop
  const updateReciter = useCallback((reciter) => {
    loopRef.current.reciter = reciter;
  }, []);

  // Keep the surah reference in sync (called by Memorize on mount / surah change)
  const updateSurah = useCallback((surah) => {
    loopRef.current.surah = surah;
    const n = typeof surah === "object" ? surah?.number : surah;
    if (n) {
      try {
        const raw = JSON.parse(localStorage.getItem("mh_last_surah") || "null");
        if (!raw || raw.number !== n) localStorage.setItem("mh_last_surah", JSON.stringify({ number: n, at: Date.now() }));
      } catch { /* ignore */ }
    }
  }, []);

  // Stop everything — called when the user logs out
  const cleanup = useCallback(() => {
    stopLoop();
    setLoopMode("off");
    setActiveSurahNumber(null);
    setAudioError(null);
    loopRef.current = {
      audio: null,
      index: 0,
      mode: "off",
      verses: [],
      reciter: "ar.alafasy",
      surah: null,
      wasPlaying: false,
    };
    if ('mediaSession' in navigator) {
      try { navigator.mediaSession.metadata = null; } catch { /* ignore */ }
      navigator.mediaSession.playbackState = 'none';
    }
  }, [stopLoop]);

  return (
    <AudioManagerContext.Provider value={{
      loopRef,
      loopPlaying,
      loopIndex,
      loopMode,
      setLoopMode,
      activeSurahNumber,
      audioError,
      clearAudioError: () => setAudioError(null),
      startLoop,
      stopLoop,
      playLoopFrom,
      updateReciter,
      updateSurah,
      cleanup,
    }}>
      {children}
    </AudioManagerContext.Provider>
  );
};

export const useAudioManager = () => {
  const context = useContext(AudioManagerContext);
  if (!context) throw new Error('useAudioManager must be used within an AudioProvider');
  return context;
};
