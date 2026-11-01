import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";
import { report } from "@/lib/report";

/**
 * Écran de bienvenue 9 « La voix devient écriture » (validé le 01/11/2026).
 * Affiché dans l'app installée quand on n'est pas connecté : la bismillah récitée
 * par Mishary al-Afasy s'affiche en onde sonore, qui se retire pendant que le texte s'écrit.
 * Un toucher n'importe où fait apparaître les boutons tout de suite.
 */
const AUDIO = "https://verses.quran.com/Alafasy/mp3/001001.mp3";
const N = 34;
const DURATION = 5000; // durée de l'écriture, proche de la récitation

export default function VoiceSplash() {
  const navigate = useNavigate();
  const [prog, setProg] = useState(0);
  const [tick, setTick] = useState(0);
  const [ready, setReady] = useState(false);
  // Son activé par défaut : l'icône est sur « son » dès l'ouverture, l'utilisateur peut le couper.
  const [sound, setSound] = useState(true);
  const au = useRef(null);
  const start = useRef(0);
  const blocked = useRef(false); // lecture refusée par le navigateur tant qu'on n'a pas touché l'écran
  const muted = useRef(false);
  const skipClick = useRef(false); // le toucher qui lance le son ne saute pas l'animation

  useEffect(() => {
    const a = new Audio(AUDIO);
    a.preload = "auto";
    au.current = a;
    start.current = performance.now();
    // iOS et la plupart des navigateurs bloquent le son sans geste : on garde le son activé
    // et on lance la récitation (avec l'animation reprise au début) au premier toucher.
    const unlock = () => {
      if (!blocked.current || muted.current) return;
      blocked.current = false;
      skipClick.current = true;
      a.currentTime = 0;
      a.play().then(() => { start.current = performance.now(); setReady(false); if (!raf) raf = requestAnimationFrame(loop); }).catch((err) => report(err, "VoiceSplash.unlock"));
    };
    a.play().catch(() => { blocked.current = true; });
    window.addEventListener("pointerdown", unlock, { capture: true });
    window.addEventListener("keydown", unlock, { capture: true });
    let raf;
    const loop = (t) => {
      const p = Math.min(1, (t - start.current) / DURATION);
      setProg(p);
      setTick((x) => x + 1);
      if (p < 1) raf = requestAnimationFrame(loop);
      else { raf = 0; setReady(true); }
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointerdown", unlock, { capture: true });
      window.removeEventListener("keydown", unlock, { capture: true });
      try { a.pause(); } catch { /* rien */ }
    };
  }, []);

  const toggleSound = (e) => {
    e.stopPropagation();
    const a = au.current;
    if (!a) return;
    if (sound) { muted.current = true; blocked.current = false; a.pause(); setSound(false); return; }
    muted.current = false;
    a.currentTime = Math.min(a.duration || 0, (prog * DURATION) / 1000);
    a.play().then(() => setSound(true)).catch((err) => report(err, "VoiceSplash.play"));
  };

  const go = (to) => { try { au.current?.pause(); } catch { /* rien */ } navigate(to); };

  return (
    <div className="fixed inset-0 bg-background flex flex-col" onClick={() => { if (skipClick.current) { skipClick.current = false; return; } setReady(true); }}>
      <button onClick={toggleSound} aria-label={sound ? "Couper le son" : "Écouter la récitation"}
        className="absolute right-4 top-[calc(env(safe-area-inset-top,0px)+12px)] w-11 h-11 rounded-full flex items-center justify-center text-muted-foreground">
        {sound ? <SpeakerHigh weight="bold" className="w-6 h-6" /> : <SpeakerSlash weight="bold" className="w-6 h-6" />}
      </button>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-10 text-center">
        <div className="flex gap-1 items-center justify-center h-[70px]" aria-hidden>
          {Array.from({ length: N }, (_, k) => {
            const gone = (N - 1 - k) / N < prog;
            const h = gone ? 4 : 10 + Math.abs(Math.sin(tick * 0.12 + k * 0.9)) * 50;
            return <i key={k} className="w-[5px] rounded-full bg-primary block" style={{ height: h, opacity: gone ? 0.15 : 1, transition: "height .25s, opacity .5s" }} />;
          })}
        </div>
        <p dir="rtl" lang="ar" className="font-arabic text-[34px] leading-[1.9] mt-3 text-foreground"
          style={{ clipPath: `inset(0 0 0 ${ready ? 0 : 100 - 100 * prog}%)` }}>
          بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
        </p>
        <p className={`text-[13px] font-bold text-muted-foreground mt-1 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}>
          Au nom d'Allah, le Tout Miséricordieux, le Très Miséricordieux
        </p>
        <p className={`text-xs font-bold text-muted-foreground/80 mt-1 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}>
          Mishary al-Afasy · Al-Fātiḥa 1
        </p>
      </div>

      <div className={`px-6 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] max-w-[460px] w-full mx-auto transition-all duration-500 ${ready ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"}`}>
        <p className="text-center font-black text-[21px] text-accent-foreground mb-4">MyHafizz</p>
        <button onClick={(e) => { e.stopPropagation(); go("/login?mode=signup"); }} className="btn-relief w-full h-[52px] bg-primary text-primary-foreground uppercase tracking-wide">Commencer</button>
        <button onClick={(e) => { e.stopPropagation(); go("/login"); }} className="w-full h-12 mt-1 font-extrabold text-muted-foreground">J'ai déjà un compte</button>
      </div>
    </div>
  );
}
