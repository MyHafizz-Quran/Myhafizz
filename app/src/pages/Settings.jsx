import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { getFeedback, setFeedback, vibrate } from "@/lib/feedback";
import { CaretRight, TextAa, Translate, Palette, Play, Stop, CheckCircle, DownloadSimple, Trash, HardDrives, Hash, SpinnerGap, X, Microphone, Baby, LockSimple, Bell, SpeakerHigh, Vibrate, Clock, MapPin, BookOpen, Sparkle, Quotes, Star, Confetti, CalendarCheck, BookOpenText, TextAUnderline, Moon } from "@phosphor-icons/react";
import { usePreferences } from "@/components/usePreferences";
import { RECITERS } from "@/components/ReciterSelector";
import { SURAHS } from "@/components/quranData";
import { isSurahCached, cacheSurah, clearAllOfflineData, getOfflineStorageSize } from "@/lib/offlineStorage";
import { useToast } from "@/components/ui/use-toast";
import { getArabicFontClass, getArabicSizeClass, getLineSpacingClass, getTextContrastClass } from "@/lib/arabicDisplayUtils";
import { haptic } from "@/hooks/usePlatform";
import { useKidMode, enableKidMode, disableKidMode, relockKidMode } from "@/lib/kidMode";
import { PinPad } from "@/components/KidMode";
import KidFamilyLink from "@/components/KidFamilyLink";
import { PRAYERS, pushSupport, getReminder, saveReminder, removeReminder, prayerTimes } from "@/lib/reminders";
import { METHODS, getMethod, setMethod as savePrayerMethod, methodLabel, getLocation, setLocation, requestLocation, onPrayerChange } from "@/lib/prayer";
import PageHeader from "@/components/PageHeader";
import { report, userMsg } from "@/lib/report";

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
const EXTRA_NOTIFS = [
  { key: "verset", icon: Sparkle, label: "Verset du jour", sub: "Le matin vers 8 h" },
  { key: "hadith", icon: Quotes, label: "Hadith du jour", sub: "Vers 12 h 30" },
  { key: "nom", icon: Star, label: "Nom d'Allah du jour", sub: "Vers 9 h, un des 99 noms" },
  { key: "bravo", icon: Confetti, label: "Bravo pour ta série", sub: "Quand tu atteins 7, 30, 100 jours…" },
  { key: "hebdo", icon: CalendarCheck, label: "Bilan de la semaine", sub: "Le samedi matin" },
  { key: "tafsir", icon: BookOpenText, label: "Reprendre le Tafsir", sub: "Le jeudi soir si tu l'as mis de côté" },
  { key: "arabe", icon: TextAUnderline, label: "Lire l'arabe", sub: "Un jour sur deux, si tu apprends à lire" },
  { key: "dates", icon: Moon, label: "Dates islamiques", sub: "Ramadan, 'Arafa, Aïd, Achoura…" },
];

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
  const [fb, setFb] = React.useState(getFeedback());
  const {
    reciter, showPhonetic, showTranslation, theme, setTheme, showTajweed, setShowTajweed,
    arabicTextSize, arabicFont, textContrast, lineSpacing, showVerseNumbers,
    setReciter, setShowPhonetic, setShowTranslation,
    setArabicTextSize, setArabicFont, setTextContrast, setLineSpacing, setShowVerseNumbers,
  } = usePreferences();
  const { toast } = useToast();
  const kid = useKidMode();
  const support = pushSupport();
  const [rem, setRem] = useState(null);
  const [remBusy, setRemBusy] = useState(false);
  useEffect(() => {
    getReminder().then((r) => {
      setRem(r);
      // Appareil déjà abonné : on reprend sa position et sa méthode si rien n'est enregistré localement
      if (r && !getLocation()) setLocation({ lat: r.lat, lng: r.lng });
      if (r?.method && !localStorage.getItem("mh_prayer_method")) savePrayerMethod(r.method);
    }).catch(() => {});
  }, []);
  const remError = (e) => {
    const m = e?.message === "permission" ? "Les notifications sont bloquées. Autorise-les dans les réglages du navigateur."
      : e?.message === "geo" ? "Autorise la localisation : elle sert seulement à calculer les heures de prière."
      : null;
    if (!m) { report(e, "settings:reminder"); return; }
    toast({ title: "Rappel non activé", description: m });
  };
  const updateRem = async (patch) => {
    setRemBusy(true);
    try {
      const next = { prayers: rem?.prayers || ["fajr", "maghrib", "kahf", "verset", "bravo", "hebdo", "tafsir", "arabe", "dates"], offset_min: rem?.offset_min ?? 15, ...patch };
      if (!next.prayers.length) { await removeReminder(); setRem(null); }
      else {
        const row = await saveReminder({ ...next, position: rem ? { lat: rem.lat, lng: rem.lng } : undefined });
        setRem(row);
      }
    } catch (e) { remError(e); }
    setRemBusy(false);
  };
  const toggleRem = async () => {
    if (rem) { setRemBusy(true); await removeReminder().catch(() => {}); setRem(null); setRemBusy(false); }
    else await updateRem({});
  };
  const [method, setMethodState] = useState(getMethod);
  const [loc, setLoc] = useState(getLocation);
  useEffect(() => onPrayerChange(() => { setMethodState(getMethod()); setLoc(getLocation()); }), []);
  const changeMethod = async (m) => {
    haptic(); savePrayerMethod(m); setMethodState(m);
    if (rem) await updateRem({});
  };
  const relocate = async () => {
    haptic();
    try {
      const l = await requestLocation(); setLoc(l);
      if (rem) { setRemBusy(true); try { setRem(await saveReminder({ prayers: rem.prayers, offset_min: rem.offset_min, position: l })); } catch (e) { remError(e); } setRemBusy(false); }
      toast({ title: "Position mise à jour" });
    } catch { toast({ title: "Localisation désactivée", description: "Autorise-la dans les réglages du navigateur pour des heures de prière précises." }); }
  };
  const times = rem ? prayerTimes(rem.lat, rem.lng, new Date(), method) : null;
  const hhmm = (d) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const [pinSheet, setPinSheet] = useState(false);
  const [firstPin, setFirstPin] = useState(null);
  const [pinError, setPinError] = useState(null);
  const onPin = async (pin) => {
    if (!firstPin) { setFirstPin(pin); setPinError(null); return; }
    if (pin !== firstPin) { setFirstPin(null); setPinError("Les deux codes ne sont pas pareils. Recommence."); return; }
    await enableKidMode(pin);
    setPinSheet(false); setFirstPin(null); setPinError(null);
    toast({ title: "Mode enfant activé", description: "Le profil et les réglages demandent maintenant le code parent." });
  };


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
      <div className="max-w-2xl mx-auto px-4">
        <PageHeader title="Réglages" back="/Profile" />

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
          <ToggleRow icon={SpeakerHigh} label="Sons des boutons" value={fb.sound} onChange={() => { const v = { sound: !fb.sound }; setFeedback(v); setFb({ ...fb, ...v }); }} />
          <ToggleRow icon={Vibrate} label="Vibrations" sub="Sur iPhone : iOS 18 ou plus récent" value={fb.haptics} onChange={() => { const v = { haptics: !fb.haptics }; setFeedback(v); setFb({ ...fb, ...v }); vibrate(12); }} />
          <SegRow label="Apparence" value={theme} onChange={setTheme} options={[{ label: "Comme l'appareil", value: "system" }, { label: "Clair", value: "light" }, { label: "Nuit", value: "dark" }]} />
        </Card>

        <Label>Heures de prière</Label>
        <Card>
          <label className="flex items-center gap-3 p-3.5">
            <Ico icon={Clock} />
            <div className="flex-1 min-w-0">
              <p className="font-extrabold">Méthode de calcul</p>
              <p className="text-[12.5px] font-semibold text-muted-foreground truncate">{methodLabel(method)}</p>
            </div>
            <select value={method} onChange={(e) => changeMethod(e.target.value)} disabled={remBusy} aria-label="Méthode de calcul"
              className="h-10 max-w-[44%] rounded-xl border-2 border-border bg-card px-2 text-sm font-extrabold">
              {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </label>
          <button onClick={relocate} className="w-full flex items-center gap-3 p-3.5 text-left active:bg-muted">
            <Ico icon={MapPin} />
            <div className="flex-1 min-w-0">
              <p className="font-extrabold">{loc ? "Mettre à jour ma position" : "Activer la localisation"}</p>
              <p className="text-[12.5px] font-semibold text-muted-foreground">À faire après un voyage. Elle sert uniquement au calcul des horaires et de la qibla.</p>
            </div>
          </button>
        </Card>

        <Label>Rappels</Label>
        <Card>
          {support === "ok" ? (
            <>
              <ToggleRow icon={Bell} label="Rappel après la prière" sub={rem ? "Une notification pour lancer ta séance du jour" : "Une notification après la prière de ton choix"} value={!!rem} onChange={() => !remBusy && toggleRem()} />
              {rem && (
                <>
                  <div className="p-3.5">
                    <p className="font-extrabold mb-2">Après quelles prières ?</p>
                    <div className="grid grid-cols-5 gap-1.5">
                      {PRAYERS.map((pr) => {
                        const on = rem.prayers.includes(pr.key);
                        return (
                          <button key={pr.key} disabled={remBusy} onClick={() => { haptic(); updateRem({ prayers: on ? rem.prayers.filter((x) => x !== pr.key) : [...rem.prayers, pr.key] }); }}
                            className={`h-[52px] rounded-xl border-2 flex flex-col items-center justify-center ${on ? "border-primary bg-accent text-accent-foreground" : "border-border text-muted-foreground"}`}>
                            <span className="text-[13px] font-extrabold">{pr.label}</span>
                            <span className="text-[11px] font-bold">{hhmm(times[pr.key])}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <ToggleRow icon={BookOpen} label="Sourate Al-Kahf le vendredi" sub="Un rappel le vendredi matin, environ 2 h après le lever du soleil"
                    value={rem.prayers.includes("kahf")} onChange={() => { if (remBusy) return; haptic(); updateRem({ prayers: rem.prayers.includes("kahf") ? rem.prayers.filter((x) => x !== "kahf") : [...rem.prayers, "kahf"] }); }} />
                  <p className="px-3.5 pt-3.5 font-extrabold">Autres notifications</p>
                  <p className="px-3.5 text-[12.5px] font-semibold text-muted-foreground">3 notifications par jour au maximum, jamais entre 22 h et 6 h.</p>
                  {EXTRA_NOTIFS.map((x) => (
                    <ToggleRow key={x.key} icon={x.icon} label={x.label} sub={x.sub} value={rem.prayers.includes(x.key)}
                      onChange={() => { if (remBusy) return; haptic(); updateRem({ prayers: rem.prayers.includes(x.key) ? rem.prayers.filter((k) => k !== x.key) : [...rem.prayers, x.key] }); }} />
                  ))}
                  <SegRow label="Délai après la prière" value={rem.offset_min} onChange={(v) => updateRem({ offset_min: v })} options={[{ label: "10 min", value: 10 }, { label: "15 min", value: 15 }, { label: "30 min", value: 30 }]} />
                  <p className="px-3.5 py-3 text-[12.5px] font-semibold text-muted-foreground">Horaires calculés pour ta position (méthode {methodLabel(method)}). Ta position n'est utilisée que pour ce calcul.</p>
                </>
              )}
            </>
          ) : (
            <div className="flex items-center gap-3 p-3.5">
              <Ico icon={Bell} />
              <div className="flex-1 min-w-0">
                <p className="font-extrabold">Rappel après la prière</p>
                <p className="text-[12.5px] font-semibold text-muted-foreground">{support === "install" ? "Sur iPhone, les notifications marchent une fois l'app ajoutée à l'écran d'accueil." : "Ce navigateur ne permet pas les notifications."}</p>
              </div>
              {support === "install" && <Link to="/telecharger" className="text-sm font-extrabold text-primary">Installer</Link>}
            </div>
          )}
        </Card>

        <Label>Famille</Label>
        <Card>
          <ToggleRow icon={Baby} label="Mode enfant" sub={kid.on ? "Activé sur cet appareil. Profil, réglages et classement demandent le code." : "Interface simplifiée, réglages protégés par un code parent"}
            value={kid.on} onChange={() => { if (kid.on) { disableKidMode(); toast({ title: "Mode enfant désactivé" }); } else { setFirstPin(null); setPinError(null); setPinSheet(true); } }} />
          {kid.on && (
            <button onClick={() => { relockKidMode(); window.location.assign("/Dashboard"); }} className="w-full flex items-center gap-3 p-3.5 text-left active:bg-muted">
              <Ico icon={LockSimple} />
              <div className="flex-1 min-w-0"><p className="font-extrabold">Rendre l'appareil à l'enfant</p><p className="text-[12.5px] font-semibold text-muted-foreground">Verrouille tout de suite l'espace parent</p></div>
            </button>
          )}
          {kid.on && <KidFamilyLink />}
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
        {pinSheet && (
          <motion.div className="fixed inset-0 z-[200] flex items-end lg:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-foreground/30" onClick={() => setPinSheet(false)} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative w-full max-w-md mx-auto bg-card rounded-t-3xl lg:rounded-3xl p-5 pb-[calc(env(safe-area-inset-bottom,0px)+20px)]">
              <div className="flex justify-end"><button onClick={() => setPinSheet(false)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center" aria-label="Fermer"><X weight="bold" /></button></div>
              <PinPad key={firstPin ? "confirm" : "new"} title={firstPin ? "Confirme le code" : "Choisis un code parent"} sub={firstPin ? "Tape le même code une seconde fois." : "4 chiffres, à garder pour toi. Il protège le profil, les réglages et le classement."} onComplete={onPin} error={pinError} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
