import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CaretLeft, CaretRight, Moon, TextAa, Translate, Palette, Play, Stop, CheckCircle, DownloadSimple, Trash, HardDrives, Hash, SpinnerGap, X, Microphone } from "@phosphor-icons/react";
import { usePreferences } from "@/components/usePreferences";
import { RECITERS } from "@/components/ReciterSelector";
import { SURAHS } from "@/components/quranData";
import { isSurahCached, cacheSurah, clearAllOfflineData, getOfflineStorageSize } from "@/lib/offlineStorage";
import { useToast } from "@/components/ui/use-toast";
import { getArabicFontClass, getArabicSizeClass, getLineSpacingClass, getTextContrastClass } from "@/lib/arabicDisplayUtils";
import { haptic } from "@/hooks/usePlatform";

function Seg({ options, value, onChange }) {
  return (
    <div className="grid gap-1 p-1 rounded-[14px] bg-muted" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` }}>
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => { haptic(); onChange(o.value); }}
          className={`h-9 rounded-[10px] text-[13px] font-extrabold truncate px-1 ${value === o.value ? "bg-card text-accent-foreground shadow-[0_2px_0_hsl(var(--border))]" : "text-muted-foreground"}`}>{o.label}</button>
      ))}
    </div>
  );
}
function Switch({ on, onClick, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => { haptic(); onClick(); }}
      className={`relative w-[52px] h-[30px] rounded-full shrink-0 transition-colors ${on ? "bg-primary" : "bg-border"}`}>
      <span className={`absolute top-[3px] left-[3px] w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${on ? "translate-x-[22px]" : ""}`} />
    </button>
  );
}
const Ico = ({ icon: I }) => <span className="w-[38px] h-[38px] rounded-xl bg-accent text-primary flex items-center justify-center shrink-0"><I weight="fill" className="w-[21px] h-[21px]" /></span>;
function ToggleRow({ icon, label, sub, value, onChange }) {
  return (
    <div className="flex items-center gap-3 p-3.5">
      <Ico icon={icon} />
      <div className="flex-1 min-w-0"><p className="font-extrabold">{label}</p>{sub && <p className="text-[12.5px] font-semibold text-muted-foreground">{sub}</p>}</div>
      <Switch on={value} onClick={onChange} label={label} />
    </div>
  );
}
function SegRow({ label, options, value, onChange }) {
  return <div className="p-3.5"><p className="font-extrabold mb-2">{label}</p><Seg options={options} value={value} onChange={onChange} /></div>;
}
const Label = ({ children }) => <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mt-5 mb-2 ml-1">{children}</p>;
const Card = ({ children, className = "" }) => <div className={`card-flat overflow-hidden divide-y-2 divide-border ${className}`}>{children}</div>;
const initials = (n) => n.split(/[\s-]+/).filter((w) => /^[A-Z]/.test(w)).slice(-2).map((w) => w[0]).join("");

export default function Settings() {
  const {
    reciter, showPhonetic, showTranslation, darkMode, showTajweed, setShowTajweed,
    arabicTextSize, arabicFont, textContrast, lineSpacing, showVerseNumbers,
    setReciter, setShowPhonetic, setShowTranslation, setDarkMode,
    setArabicTextSize, setArabicFont, setTextContrast, setLineSpacing, setShowVerseNumbers,
  } = usePreferences();
  const { toast } = useToast();


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

  const [reciterSheet, setReciterSheet] = useState(false);
  const current = RECITERS.find((r) => r.id === reciter) || RECITERS[0];
  const allCached = cachedSurahs.size >= SURAHS.length;

  return (
    <div className="min-h-[100dvh] bg-background pb-nav">
      <div className="max-w-2xl mx-auto px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)]">
        <div className="flex items-center gap-2">
          <Link to="/Profile" aria-label="Retour" className="w-10 h-10 -ml-1 rounded-full flex items-center justify-center active:bg-muted"><CaretLeft weight="bold" className="w-6 h-6" /></Link>
          <h1 className="text-[26px] font-black">Réglages</h1>
        </div>

        <Label>Lecture</Label>
        <Card>
          <button onClick={() => setReciterSheet(true)} className="w-full flex items-center gap-3 p-3.5 text-left active:bg-muted">
            <Ico icon={Microphone} />
            <div className="flex-1 min-w-0"><p className="font-extrabold">Récitateur</p><p className="text-[12.5px] font-semibold text-muted-foreground truncate">{current.name}</p></div>
            <CaretRight weight="bold" className="w-4 h-4 text-muted-foreground" />
          </button>
          <ToggleRow icon={Translate} label="Traduction française" sub="Hamidullah, sous chaque verset" value={showTranslation} onChange={() => setShowTranslation(!showTranslation)} />
          <ToggleRow icon={TextAa} label="Translittération" sub="Le texte en lettres latines" value={showPhonetic} onChange={() => setShowPhonetic(!showPhonetic)} />
          <ToggleRow icon={Palette} label="Couleurs du tajwîd" sub="Règles de récitation en couleur" value={showTajweed} onChange={() => setShowTajweed(!showTajweed)} />
        </Card>

        <Label>Affichage</Label>
        <div className="card-flat px-4 py-5 text-center">
          <p dir="rtl" className={`${getArabicFontClass(arabicFont)} ${getArabicSizeClass(arabicTextSize)} ${getLineSpacingClass(lineSpacing)} ${getTextContrastClass(textContrast)}`}>
            بِسْمِ اللَّهِ الرَّحْمَـٰنِ الرَّحِيمِ{showVerseNumbers && <span className="text-primary"> ﴿١﴾</span>}
          </p>
          <p className="text-xs font-bold text-muted-foreground mt-2">Aperçu</p>
        </div>
        <Card className="mt-3">
          <SegRow label="Taille du texte arabe" value={arabicTextSize} onChange={setArabicTextSize} options={[{ label: "Petit", value: "small" }, { label: "Moyen", value: "medium" }, { label: "Grand", value: "large" }, { label: "Très grand", value: "xlarge" }]} />
          <SegRow label="Police arabe" value={arabicFont} onChange={setArabicFont} options={[{ label: "Système", value: "system" }, { label: "Amiri", value: "amiri" }, { label: "Scheherazade", value: "scheherazade" }, { label: "Naskh", value: "noto" }]} />
          <SegRow label="Espacement des lignes" value={lineSpacing} onChange={setLineSpacing} options={[{ label: "Serré", value: "compact" }, { label: "Normal", value: "normal" }, { label: "Aéré", value: "airy" }]} />
          <SegRow label="Contraste" value={textContrast} onChange={setTextContrast} options={[{ label: "Normal", value: "normal" }, { label: "Élevé", value: "high" }]} />
          <ToggleRow icon={Hash} label="Numéros de verset" value={showVerseNumbers} onChange={() => setShowVerseNumbers(!showVerseNumbers)} />
          <ToggleRow icon={Moon} label="Mode sombre" value={darkMode} onChange={() => setDarkMode(!darkMode)} />
        </Card>

        <Label>Hors ligne</Label>
        <Card>
          <div className="flex items-center gap-3 p-3.5">
            <Ico icon={HardDrives} />
            <div className="flex-1 min-w-0"><p className="font-extrabold">{cachedSurahs.size} sourate{cachedSurahs.size > 1 ? "s" : ""} sur {SURAHS.length}</p><p className="text-[12.5px] font-semibold text-muted-foreground">{formatBytes(storageSize)} utilisés sur cet appareil</p></div>
          </div>
          <div className="p-3.5">
            <div className="h-2.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${downloadingAll ? downloadProgress : (cachedSurahs.size / SURAHS.length) * 100}%` }} /></div>
            <button disabled={downloadingAll || allCached} onClick={handleDownloadAll} className="btn-relief w-full h-[50px] mt-3 bg-primary text-primary-foreground disabled:opacity-60">
              {downloadingAll ? <><SpinnerGap weight="bold" className="w-5 h-5 animate-spin" />Téléchargement {Math.round(downloadProgress)} %</> : allCached ? <><CheckCircle weight="fill" className="w-5 h-5" />Tout le Coran est disponible</> : <><DownloadSimple weight="bold" className="w-5 h-5" />Télécharger tout le Coran</>}
            </button>
            <p className="text-[12.5px] font-semibold text-muted-foreground mt-2 text-center">Texte, translittération et traduction. L'audio se garde au fil de l'écoute.</p>
          </div>
          <button disabled={clearingData || !storageSize} onClick={handleClearData} className="w-full flex items-center justify-center gap-2 p-3.5 font-extrabold text-destructive disabled:opacity-50 active:bg-muted">
            <Trash weight="bold" className="w-5 h-5" />{clearingData ? "Suppression…" : "Effacer les données hors ligne"}
          </button>
        </Card>
      </div>

      <AnimatePresence>
        {reciterSheet && (
          <motion.div className="fixed inset-0 z-[200] flex items-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-foreground/30" onClick={() => { stopCurrentPreview(); setPreviewingId(null); setReciterSheet(false); }} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative w-full max-w-2xl mx-auto bg-card rounded-t-3xl p-5 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] max-h-[85dvh] overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-black">Récitateur</h2>
                <button onClick={() => { stopCurrentPreview(); setPreviewingId(null); setReciterSheet(false); }} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center" aria-label="Fermer"><X weight="bold" /></button>
              </div>
              <div className="space-y-2">
                {RECITERS.map((r) => {
                  const on = r.id === reciter, playing = previewingId === r.id;
                  return (
                    <div key={r.id} className={`flex items-center gap-3 p-3 rounded-2xl border-2 ${on ? "border-primary bg-accent" : "border-border"}`}>
                      <button onClick={() => { haptic(); setReciter(r.id); }} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                        <span className={`w-11 h-11 rounded-full font-black flex items-center justify-center shrink-0 ${on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{initials(r.name)}</span>
                        <div className="min-w-0"><p className={`font-extrabold truncate ${on ? "text-accent-foreground" : ""}`}>{r.name}</p><p className="font-arabic text-sm text-muted-foreground" dir="rtl">{r.nameAr}</p></div>
                      </button>
                      <button onClick={() => handlePreview(r.id)} aria-label={playing ? "Arrêter" : "Écouter"} className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${playing ? "bg-primary text-primary-foreground" : "bg-card border-2 border-border"}`}>
                        {playing ? <Stop weight="fill" /> : <Play weight="fill" />}
                      </button>
                      {on && <CheckCircle weight="fill" className="w-6 h-6 text-primary shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
