import React, { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { BookmarkSimple, MagnifyingGlass, CheckCircle, X, Play, ArrowRight, Moon, Sun, Star, BookOpen } from "@phosphor-icons/react";
import { MemorizationProgress } from "@/api/entities";
import { SURAHS } from "@/components/quranData";
import { SURAH_FR } from "@/components/surahNamesFr";
import { JUZ_START } from "@/components/community/Sheet";
import { getReadingSession } from "@/lib/AudioManager";
import { haptic } from "@/hooks/usePlatform";

const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/['’`-]/g, "").replace(/[^a-z0-9 ]/g, "").trim();
const normLoose = (s) => norm(s).replace(/^(al|an|ar|as|at|ad|az|ash|adh|aal e|al )\s?/, "").replace(/\s/g, "");
const normAr = (s) => s.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/\s/g, "");
const isArabic = (s) => /[\u0600-\u06FF]/.test(s);

// Juz d'un verset (sourate, verset)
const juzOf = (s, v) => {
  let j = 1;
  for (let i = 0; i < 30; i++) { const [js, jv] = JUZ_START[i]; if (s > js || (s === js && v >= jv)) j = i + 1; else break; }
  return j;
};
// Nombre de versets par juz
const JUZ_SIZE = (() => {
  const out = Array(30).fill(0);
  SURAHS.forEach((su) => { for (let v = 1; v <= su.numberOfAyahs; v++) out[juzOf(su.number, v) - 1]++; });
  return out;
})();

const TABS = [["surahs", "Sourates"], ["juz", "Juz"], ["mine", "Mes sourates"]];

function Ring({ pct }) {
  const r = 15, c = 2 * Math.PI * r;
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" className="shrink-0 -rotate-90" aria-hidden>
      <circle cx="18" cy="18" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
      <circle cx="18" cy="18" r={r} fill="none" stroke="hsl(var(--primary))" strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
    </svg>
  );
}

export default function SurahList() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const ref = useRef(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState(() => sessionStorage.getItem("mh_coran_tab") || "surahs");
  const [stuck, setStuck] = useState(false);
  useEffect(() => { sessionStorage.setItem("mh_coran_tab", tab); }, [tab]);
  useEffect(() => { if (params.get("search") === "1") setTimeout(() => ref.current?.focus(), 250); }, [params]);
  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 60);
    const onKey = (e) => { if (e.key === "/" && document.activeElement?.tagName !== "INPUT") { e.preventDefault(); ref.current?.focus(); } };
    window.addEventListener("scroll", onScroll, { passive: true }); window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("keydown", onKey); };
  }, []);

  const { data: progress = [] } = useQuery({ queryKey: ["memorization-progress"], queryFn: () => MemorizationProgress.list() });
  const map = useMemo(() => Object.fromEntries(progress.map((p) => [p.surah_number, p])), [progress]);
  const memCount = (n) => map[n]?.memorized_verses?.length || 0;

  const open = (s, v) => { haptic(); navigate(`/Memorize?surah=${s}${v && v > 1 ? `&verse=${v}` : ""}`); };

  // Reprise de lecture
  const resume = useMemo(() => {
    const ses = getReadingSession();
    if (ses?.surahNumber) return { n: ses.surahNumber, v: (ses.loopIndex || 0) + 1 };
    try { const l = JSON.parse(localStorage.getItem("mh_last_surah") || "null"); if (l?.number) return { n: l.number, v: 1 }; } catch { /* ignore */ }
    return null;
  }, []);

  // Moments (sunna de lecture selon le jour et l'heure)
  const moments = useMemo(() => {
    const d = new Date(); const h = d.getHours(); const out = [];
    if (d.getDay() === 5 || (d.getDay() === 4 && h >= 18)) out.push({ s: 18, v: 1, label: "C'est vendredi", title: "Al-Kahf", Icon: Star });
    if (h >= 18 || h < 4) out.push({ s: 67, v: 1, label: "Avant de dormir", title: "Al-Mulk", Icon: Moon });
    if (h >= 4 && h < 12) out.push({ s: 36, v: 1, label: "Le matin", title: "Ya-Sin", Icon: Sun });
    out.push({ s: 2, v: 255, label: "Verset du Trône", title: "Ayat al-Kursi", Icon: BookOpen });
    out.push({ s: 2, v: 285, label: "Chaque soir", title: "Fin d'Al-Baqara", Icon: BookOpen });
    return out.slice(0, 4);
  }, []);

  // Recherche intelligente : nom, sens, arabe, numéro, « 2:255 », « juz 30 »
  const q = search.trim();
  const ref255 = q.match(/^(\d{1,3})\s*[:.,\s]\s*(\d{1,3})$/);
  const juzQ = q.match(/^(juz|jouz|j)\s*(\d{1,2})$/i);
  const verseHit = ref255 && SURAHS[+ref255[1] - 1] && +ref255[2] >= 1 && +ref255[2] <= SURAHS[+ref255[1] - 1].numberOfAyahs ? { s: +ref255[1], v: +ref255[2] } : null;
  const juzHit = juzQ && +juzQ[2] >= 1 && +juzQ[2] <= 30 ? +juzQ[2] : null;
  const results = useMemo(() => {
    if (!q) return SURAHS;
    if (/^\d+$/.test(q)) return SURAHS.filter((s) => String(s.number).startsWith(q));
    if (isArabic(q)) { const a = normAr(q); return SURAHS.filter((s) => normAr(s.name).includes(a)); }
    const n = norm(q), l = normLoose(q);
    return SURAHS.filter((s) => {
      const en = norm(s.englishName), fr = norm(SURAH_FR[s.number - 1]);
      return en.includes(n) || normLoose(s.englishName).includes(l) || fr.includes(n);
    });
  }, [q]);

  const onEnter = (e) => {
    if (e.key !== "Enter") return;
    if (verseHit) open(verseHit.s, verseHit.v);
    else if (juzHit) { const [s, v] = JUZ_START[juzHit - 1]; open(s, v); }
    else if (results.length) open(results[0].number);
  };

  // Mes sourates
  const mine = useMemo(() => SURAHS.filter((s) => memCount(s.number) > 0)
    .sort((a, b) => (map[a.number]?.status === "completed") - (map[b.number]?.status === "completed") || new Date(map[b.number]?.updated_date || 0) - new Date(map[a.number]?.updated_date || 0)), [map]);
  const totalMem = progress.reduce((t, p) => t + (p.memorized_verses?.length || 0), 0);

  // Juz : versets mémorisés par juz
  const juzMem = useMemo(() => {
    const out = Array(30).fill(0);
    progress.forEach((p) => (p.memorized_verses || []).forEach((v) => { out[juzOf(p.surah_number, v) - 1]++; }));
    return out;
  }, [progress]);

  const Row = ({ s }) => {
    const n = memCount(s.number);
    const done = map[s.number]?.status === "completed" || n >= s.numberOfAyahs;
    const pct = Math.round((n / s.numberOfAyahs) * 100);
    return (
      <button onClick={() => open(s.number)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/60 active:bg-muted transition-colors [content-visibility:auto] [contain-intrinsic-size:68px]">
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          {done ? <CheckCircle weight="fill" className="w-5 h-5" /> : s.number}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-extrabold truncate">{s.englishName}</p>
          <p className="text-[12.5px] font-semibold text-muted-foreground truncate">{SURAH_FR[s.number - 1]} · {s.numberOfAyahs} versets</p>
        </div>
        {n > 0 && !done && <div className="relative shrink-0"><Ring pct={pct} /><span className="absolute inset-0 flex items-center justify-center text-[9.5px] font-black">{pct}</span></div>}
        <span className="font-arabic text-[22px] leading-none text-accent-foreground shrink-0 w-[92px] text-right" dir="rtl">{s.name}</span>
      </button>
    );
  };

  const resumeSurah = resume && SURAHS[resume.n - 1];

  return (
    <div className="min-h-[100dvh] bg-background pb-nav">
      <div className="max-w-3xl mx-auto px-4 pt-[calc(env(safe-area-inset-top,0px)+16px)]">
        <div className="flex items-center justify-between">
          <h1 className="text-[28px] font-black">Coran</h1>
          <Link to="/Bookmarks" aria-label="Signets" className="w-10 h-10 rounded-full bg-card border-2 border-border flex items-center justify-center press"><BookmarkSimple weight="bold" className="w-5 h-5" /></Link>
        </div>
      </div>

      {/* Recherche collante */}
      <div className={`sticky top-0 z-30 transition-colors ${stuck ? "bg-background/90 backdrop-blur-md border-b-2 border-border" : ""}`}>
        <div className="max-w-3xl mx-auto px-4 pb-2.5" style={{ paddingTop: stuck ? "calc(env(safe-area-inset-top, 0px) + 10px)" : "10px" }}>
          <div className="relative">
            <MagnifyingGlass weight="bold" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input ref={ref} value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={onEnter} enterKeyHint="go"
              placeholder="Sourate, sens, 2:255 ou juz 30" aria-label="Rechercher dans le Coran"
              className="w-full h-12 pl-11 pr-10 rounded-2xl border-2 border-border bg-card font-bold placeholder:text-muted-foreground placeholder:font-semibold focus:outline-none focus:border-primary" />
            {search && <button onClick={() => { setSearch(""); ref.current?.focus(); }} aria-label="Effacer" className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-muted flex items-center justify-center"><X weight="bold" className="w-3.5 h-3.5" /></button>}
          </div>
          {!q && (
            <div className="grid grid-cols-3 gap-1 p-1 mt-2.5 rounded-2xl bg-muted" role="tablist">
              {TABS.map(([k, l]) => (
                <button key={k} role="tab" aria-selected={tab === k} onClick={() => { haptic(); setTab(k); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className={`h-9 rounded-xl text-sm font-extrabold transition-colors ${tab === k ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}>{l}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4">
        {q ? (
          <div className="mt-2 space-y-3">
            {verseHit && (
              <button onClick={() => open(verseHit.s, verseHit.v)} className="w-full card-flat p-4 flex items-center gap-3 text-left press">
                <span className="w-10 h-10 rounded-xl bg-accent text-primary flex items-center justify-center shrink-0"><BookOpen weight="fill" className="w-5 h-5" /></span>
                <div className="flex-1 min-w-0"><p className="font-extrabold">{SURAHS[verseHit.s - 1].englishName}, verset {verseHit.v}</p><p className="text-[12.5px] font-semibold text-muted-foreground">Ouvrir directement le verset</p></div>
                <ArrowRight weight="bold" className="text-primary" />
              </button>
            )}
            {juzHit && (
              <button onClick={() => { const [s, v] = JUZ_START[juzHit - 1]; open(s, v); }} className="w-full card-flat p-4 flex items-center gap-3 text-left press">
                <span className="w-10 h-10 rounded-xl bg-accent text-primary flex items-center justify-center font-black shrink-0">{juzHit}</span>
                <div className="flex-1 min-w-0"><p className="font-extrabold">Juz {juzHit}</p><p className="text-[12.5px] font-semibold text-muted-foreground">Commence à {SURAHS[JUZ_START[juzHit - 1][0] - 1].englishName}, verset {JUZ_START[juzHit - 1][1]}</p></div>
                <ArrowRight weight="bold" className="text-primary" />
              </button>
            )}
            {!verseHit && !juzHit && (results.length
              ? <div className="card-flat overflow-hidden divide-y-2 divide-border">{results.map((s) => <Row key={s.number} s={s} />)}</div>
              : <div className="card-flat p-6 text-center"><p className="font-extrabold">Aucune sourate ne correspond.</p><p className="text-sm font-semibold text-muted-foreground mt-1">Essaie un nom (Kahf, La Caverne), un numéro ou une référence comme 18:10.</p></div>)}
          </div>
        ) : tab === "surahs" ? (
          <>
            {resumeSurah && (
              <button onClick={() => open(resume.n, resume.v)} className="w-full mt-2 card-flat p-4 flex items-center gap-3.5 text-left press">
                <span className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-[0_4px_0_var(--primary-lip)]"><Play weight="fill" className="w-5 h-5" /></span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">Reprendre la lecture</p>
                  <p className="font-extrabold truncate">{resumeSurah.englishName} · verset {Math.min(resume.v, resumeSurah.numberOfAyahs)}</p>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1.5"><div className="h-full bg-primary rounded-full" style={{ width: `${Math.round((Math.min(resume.v, resumeSurah.numberOfAyahs) / resumeSurah.numberOfAyahs) * 100)}%` }} /></div>
                </div>
                <span className="font-arabic text-[24px] leading-none text-accent-foreground shrink-0" dir="rtl">{resumeSurah.name}</span>
              </button>
            )}

            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 scroll-px-4 mt-3 pb-1 snap-x snap-mandatory">
              {moments.map((m) => (
                <button key={m.title} onClick={() => open(m.s, m.v)} className="snap-start shrink-0 h-[60px] pl-2.5 pr-4 rounded-2xl border-2 border-border bg-card flex items-center gap-2.5 text-left press">
                  <span className="w-9 h-9 rounded-xl bg-accent text-primary flex items-center justify-center shrink-0"><m.Icon weight="fill" className="w-[18px] h-[18px]" /></span>
                  <span className="min-w-0">
                    <span className="block font-extrabold text-[14.5px] leading-tight whitespace-nowrap">{m.title}</span>
                    <span className="block text-[12px] font-semibold text-muted-foreground whitespace-nowrap">{m.label}</span>
                  </span>
                </button>
              ))}
            </div>

            <button onClick={() => { haptic(); navigate("/Lire"); }} className="w-full mt-3 card-flat p-3.5 flex items-center gap-3 text-left press">
              <span className="w-10 h-10 rounded-xl bg-accent text-primary flex items-center justify-center shrink-0 font-arabic text-[22px] leading-none">أ ب</span>
              <div className="flex-1 min-w-0"><p className="font-extrabold">Apprendre à lire l'arabe</p><p className="text-[12.5px] font-semibold text-muted-foreground">Pas encore à l'aise avec les lettres ? Commence ici.</p></div>
              <ArrowRight weight="bold" className="text-primary shrink-0" />
            </button>

            <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mt-5 mb-2 px-1">114 sourates</p>
            <div className="card-flat overflow-hidden divide-y-2 divide-border">{SURAHS.map((s) => <Row key={s.number} s={s} />)}</div>
          </>
        ) : tab === "juz" ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 mt-2">
            {JUZ_START.map(([s, v], i) => {
              const pct = Math.round((juzMem[i] / JUZ_SIZE[i]) * 100);
              return (
                <button key={i} onClick={() => open(s, v)} className="card-flat p-3.5 text-left press">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-lg">Juz {i + 1}</span>
                    {pct >= 100 ? <CheckCircle weight="fill" className="w-5 h-5 text-primary" /> : pct > 0 ? <span className="text-xs font-black text-primary">{pct} %</span> : null}
                  </div>
                  <p className="text-[12.5px] font-semibold text-muted-foreground truncate mt-0.5">{SURAHS[s - 1].englishName}{v > 1 ? `, v. ${v}` : ""}</p>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-2.5"><div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, pct)}%` }} /></div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-2">
            {mine.length ? (
              <>
                <div className="grid grid-cols-3 gap-2.5">
                  {[[totalMem, "versets"], [mine.filter((s) => map[s.number]?.status !== "completed" && memCount(s.number) < s.numberOfAyahs).length, "en cours"], [mine.filter((s) => map[s.number]?.status === "completed" || memCount(s.number) >= s.numberOfAyahs).length, "terminées"]].map(([v, l]) => (
                    <div key={l} className="card-flat p-3 text-center"><p className="text-xl font-black">{v}</p><p className="text-[12px] font-bold text-muted-foreground">{l}</p></div>
                  ))}
                </div>
                <div className="card-flat overflow-hidden divide-y-2 divide-border mt-3">{mine.map((s) => <Row key={s.number} s={s} />)}</div>
              </>
            ) : (
              <div className="card-flat p-5">
                <p className="font-extrabold">Tu n'as encore commencé aucune sourate.</p>
                <p className="text-sm font-semibold text-muted-foreground mt-1">Les plus courtes sont un bon point de départ.</p>
                <div className="divide-y-2 divide-border -mx-5 mt-3 border-t-2 border-border">{[1, 114, 113, 112, 108, 103].map((n) => <Row key={n} s={SURAHS[n - 1]} />)}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
