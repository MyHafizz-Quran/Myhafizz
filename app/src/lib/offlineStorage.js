// ─── IndexedDB Offline Storage for MyHafizz ─────────────────────────────────
// Manages quran text cache, audio cache, local progress, and pending sync queue

const DB_NAME = "hafiz-offline";
const DB_VERSION = 1;
const DB_OPEN_TIMEOUT = 5000;

const STORES = {
  QURAN_TEXT: "quran-text",
  QURAN_AUDIO: "quran-audio",
  PROGRESS_CACHE: "progress-cache",
  PENDING_SYNC: "pending-sync",
};

function openDB() {
  return new Promise((resolve, reject) => {
    // Timeout guard: on mobile WebKit, indexedDB.open() can hang silently
    const timer = setTimeout(() => reject(new Error("IndexedDB open timeout")), DB_OPEN_TIMEOUT);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORES.QURAN_TEXT)) {
        db.createObjectStore(STORES.QURAN_TEXT, { keyPath: "surahNumber" });
      }
      if (!db.objectStoreNames.contains(STORES.QURAN_AUDIO)) {
        db.createObjectStore(STORES.QURAN_AUDIO, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(STORES.PROGRESS_CACHE)) {
        db.createObjectStore(STORES.PROGRESS_CACHE, { keyPath: "surah_number" });
      }
      if (!db.objectStoreNames.contains(STORES.PENDING_SYNC)) {
        db.createObjectStore(STORES.PENDING_SYNC, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };

    request.onsuccess = () => { clearTimeout(timer); resolve(request.result); };
    request.onerror = () => { clearTimeout(timer); reject(request.error); };
  });
}

function txGet(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

function txPut(db, storeName, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const req = tx.objectStore(storeName).put(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txGetAll(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

function txClear(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const req = tx.objectStore(storeName).clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ─── Quran Text ──────────────────────────────────────────────────────────────

export async function getCachedSurah(surahNumber) {
  try {
    const db = await openDB();
    const record = await txGet(db, STORES.QURAN_TEXT, surahNumber);
    if (!record) return null;
    return { ayahs: record.ayahs, transliteration: record.transliteration, cachedAt: record.cachedAt };
  } catch {
    return null;
  }
}

export async function cacheSurah(surahNumber, data) {
  try {
    const db = await openDB();
    await txPut(db, STORES.QURAN_TEXT, {
      surahNumber,
      ayahs: data.ayahs,
      transliteration: data.transliteration,
      cachedAt: Date.now(),
    });
  } catch {
    // fail silently — offline caching is best-effort
  }
}

export async function isSurahCached(surahNumber) {
  try {
    const db = await openDB();
    const record = await txGet(db, STORES.QURAN_TEXT, surahNumber);
    return record !== null;
  } catch {
    return false;
  }
}

// ─── Progress Cache ──────────────────────────────────────────────────────────

export async function getCachedProgress() {
  try {
    const db = await openDB();
    return await txGetAll(db, STORES.PROGRESS_CACHE);
  } catch {
    return [];
  }
}

export async function updateCachedProgress(surahNumber, data) {
  try {
    const db = await openDB();
    await txPut(db, STORES.PROGRESS_CACHE, { ...data, surah_number: surahNumber });
  } catch {
    // fail silently
  }
}

// ─── Pending Sync Queue ──────────────────────────────────────────────────────

export async function getPendingSyncActions() {
  try {
    const db = await openDB();
    return await txGetAll(db, STORES.PENDING_SYNC);
  } catch {
    return [];
  }
}

export async function addPendingSyncAction(action) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.PENDING_SYNC, "readwrite");
    return new Promise((resolve, reject) => {
      const req = tx.objectStore(STORES.PENDING_SYNC).add({
        ...action,
        queuedAt: Date.now(),
      });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch {
    // fail silently
  }
}

export async function clearPendingSyncActions() {
  try {
    const db = await openDB();
    await txClear(db, STORES.PENDING_SYNC);
  } catch {
    // fail silently
  }
}

// ─── Audio Cache ─────────────────────────────────────────────────────────────

export async function cacheAudioBlob(verseNumber, reciter, blob, surahNumber) {
  try {
    const db = await openDB();
    const key = `${reciter}:${verseNumber}`;
    await txPut(db, STORES.QURAN_AUDIO, {
      key,
      verseNumber,
      reciter,
      surahNumber: surahNumber ?? null,
      blob,
      cachedAt: Date.now(),
    });
  } catch {
    // fail silently
  }
}

export async function getCachedAudio(verseNumber, reciter) {
  try {
    const db = await openDB();
    const key = `${reciter}:${verseNumber}`;
    const record = await txGet(db, STORES.QURAN_AUDIO, key);
    if (!record || !record.blob) return null;
    return URL.createObjectURL(record.blob);
  } catch {
    return null;
  }
}

export async function getSurahDownloadStatus(surahNumber, reciter, totalAyahs) {
  try {
    const db = await openDB();
    const all = await txGetAll(db, STORES.QURAN_AUDIO);
    // Filter by both reciter and surahNumber by checking verseNumber range
    // Verse numbers within a surah share the same reciter key pattern
    const downloaded = all.filter(
      r => r.reciter === reciter && r.surahNumber === surahNumber
    ).length;
    return { downloaded, total: totalAyahs };
  } catch {
    return { downloaded: 0, total: totalAyahs };
  }
}

// ─── General ─────────────────────────────────────────────────────────────────

export async function getOfflineStorageSize() {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const { usage } = await navigator.storage.estimate();
      return usage || 0;
    }
    return 0;
  } catch {
    return 0;
  }
}

export async function clearAllOfflineData() {
  try {
    const db = await openDB();
    await Promise.all([
      txClear(db, STORES.QURAN_TEXT),
      txClear(db, STORES.QURAN_AUDIO),
      txClear(db, STORES.PROGRESS_CACHE),
      txClear(db, STORES.PENDING_SYNC),
    ]);
  } catch {
    // fail silently
  }
}
