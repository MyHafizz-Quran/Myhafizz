import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { CheckCircle, Circle, Fire, Play, CaretRight, GraduationCap, Books, UsersThree, Target, House, GameController, Lightning, BookOpenText } from "@phosphor-icons/react";
import { db } from "@/api/neonClient";
import { MemorizationProgress, VerseReview, HifzPlan, ActivityDays, Groups, Assignments, KIND_LABEL, Profile } from "@/api/entities";
import { buildSession, key, todayStr, currentStreak } from "@/lib/srs";
import { ReadingSessions } from "@/api/entities/learning";
import { getGoal, todayCount, weekStart } from "@/lib/readingGame";
import { level } from "@/pages/Strength";
import { SURAHS } from "@/components/quranData";
import { haptic } from "@/hooks/usePlatform";
import PrayerCard from "@/components/daily/PrayerCard";
import VerseOfDay from "@/components/daily/VerseOfDay";
import HadithOfDay from "@/components/daily/HadithOfDay";
import FridayCard from "@/components/daily/FridayCard";
import { DailyTools, RamadanCard, SeasonCard } from "@/components/daily/DailyExtras";
import DuoPanel, { DuoNudges } from "@/components/community/DuoPanel";
import { hijriLabel } from "@/lib/hijri";
import { weekStats } from "@/lib/weekly";
import PlayerPic from "@/components/PlayerPic";

const PARTS = [
  { part: "sabaq", title: "Sabaq · nouveau" },
  { part: "sabqi", title: "Sabqi · révision récente" },
  { part: "manzil", title: "Manzil · ancien acquis" },
];
const surahOf = (n) => SURAHS.find((s) => s.number === n);
const plural = (n, w) => `${n} ${w}${n > 1 ? "s" : ""}`;
const minutes = (n) => Math.max(1, Math.round(n * 0.6));

function describe(part, items) {
  if (part === "sabaq") {
    const s = surahOf(items[0].surah_number)?.englishName, a = items[0].verse_number, b = items[items.length - 1].verse_number;
    return `${s}, ${a === b ? `verset ${a}` : `versets ${a} à ${b}`}`;
  }
  const names = [...new Set(items.map((i) => surahOf(i.surah_number)?.englishName))];
  return `${plural(items.length, "verset")} · ${names.slice(0, 2).join(", ")}${names.length > 2 ? "…" : ""}`;
}

function Card({ className = "", children, ...p }) {
  return <div className={`card-flat ${className}`} {...p}>{children}</div>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  useEffect(() => { db.auth.getUser().then(({ data }) => setUser(data.user)).catch(() => {}); }, []);

  const { data: progress = [], isFetched: progressFetched } = useQuery({ queryKey: ["memorization-progress"], queryFn: () => MemorizationProgress.list() });
  const { data: reviews = [] } = useQuery({ queryKey: ["verse-reviews"], queryFn: () => VerseReview.list() });
  const { data: plan, isLoading: planLoading } = useQuery({ queryKey: ["hifz-plan"], queryFn: () => HifzPlan.get() });
  const { data: profile, isFetched: profileFetched } = useQuery({ queryKey: ["profile"], queryFn: () => Profile.get() });
  // Nouveau compte (y compris Google) sans programme : onboarding « Questions rapides ».
  useEffect(() => {
    if (planLoading || !progressFetched || !profileFetched) return;
    if (!plan && !progress.length && profile && !profile.onboarded_at && !localStorage.getItem("mh_onboarded")) navigate("/Bienvenue", { replace: true });
  }, [planLoading, progressFetched, profileFetched, plan, progress.length, profile, navigate]);
  const { data: days = [] } = useQuery({ queryKey: ["activity-days"], queryFn: () => ActivityDays.list() });
  const { data: groups = [] } = useQuery({ queryKey: ["groups"], queryFn: () => Groups.mine() });
  const { data: readSessions = [] } = useQuery({ queryKey: ["reading-sessions"], queryFn: () => ReadingSessions.since(weekStart().toISOString()) });
  const readGoal = getGoal(), readToday = todayCount(readSessions);
  const top = groups.slice(0, 2);
  const { data: lessons = {} } = useQuery({
    queryKey: ["dash-lessons", top.map((g) => g.id).join(",")],
    enabled: top.length > 0,
    queryFn: async () => {
      const out = {};
      await Promise.all(top.map(async (g) => { out[g.id] = (await Assignments.list(g.id))[0] || null; }));
      return out;
    },
  });

  const session = useMemo(() => buildSession({ plan, progress, reviews }), [plan, progress, reviews]);
  const firstName = (user?.user_metadata?.full_name || "").split(" ")[0];
  const streak = currentStreak(days);

  // Semaine en cours (lundi → dimanche)
  const week = useMemo(() => {
    const set = new Set(days);
    const now = new Date();
    const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    return ["L", "M", "M", "J", "V", "S", "D"].map((l, i) => {
      const d = new Date(monday); d.setDate(monday.getDate() + i);
      const s = todayStr(d);
      return { l, done: set.has(s), today: s === todayStr(now), future: d > now };
    });
  }, [days]);
  const weekDone = week.filter((d) => d.done).length;
  const last7 = useMemo(() => weekStats({ reviews, days }), [reviews, days]);

  const blocks = PARTS.map((b) => ({ ...b, items: session[b.part] }));
  const doneCount = plan ? blocks.filter((b) => !b.items.length).length : 0;
  const next = blocks.find((b) => b.items.length);

  // Reprendre : dernière sourate en cours
  const resume = useMemo(() => {
    const p = [...progress].filter((x) => x.status === "in_progress" && x.last_reviewed)
      .sort((a, b) => new Date(b.last_reviewed) - new Date(a.last_reviewed))[0]
      || progress.find((x) => x.status === "in_progress");
    if (!p) return null;
    const s = surahOf(p.surah_number);
    const mem = new Set(p.memorized_verses || []);
    let v = 1; while (mem.has(v) && v < s.numberOfAyahs) v++;
    return { s, v, pct: Math.round((mem.size / s.numberOfAyahs) * 100) };
  }, [progress]);

  const memorizedSet = useMemo(() => {
    const set = new Set();
    progress.forEach((p) => (p.memorized_verses || []).forEach((v) => set.add(key(p.surah_number, v))));
    return set;
  }, [progress]);
  const fragile = useMemo(() => reviews.filter((r) => { const l = level(memorizedSet.has(key(r.surah_number, r.verse_number)), r); return l === 1 || l === 2; }).length, [reviews, memorizedSet]);
  const completed = progress.filter((p) => p.status === "completed").length;
  const dateLabel = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="min-h-[100dvh] bg-background pb-nav">
      <div className="max-w-2xl lg:max-w-5xl mx-auto px-4 lg:px-8 pt-[calc(env(safe-area-inset-top,0px)+16px)] lg:pt-8">
        {/* En-tête */}
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-muted-foreground first-letter:uppercase truncate">{dateLabel} · <Link to="/Calendrier" className="hover:text-primary">{hijriLabel()}</Link></p>
            <h1 className="text-[28px] leading-tight font-black truncate">{firstName ? `Salam, ${firstName}` : "Salam"}</h1>
          </div>
          <span className={`h-9 px-3 rounded-full flex items-center gap-1 font-black ${streak ? "bg-gold-tint text-[#9A6A00]" : "bg-muted text-muted-foreground"}`} aria-label={`Série de ${streak} jours`}>
            <Fire weight="fill" className={`w-5 h-5 ${streak ? "text-gold" : ""}`} />{streak}
          </span>
          <Link to="/Profile" className="rounded-full press" aria-label="Profil"><PlayerPic p={{ id: user?.id, name: firstName || user?.email, image: user?.user_metadata?.avatar_url }} size={40} /></Link>
        </div>

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6 lg:items-start">
        <div className="min-w-0">
        {/* Ramadan */}
        <RamadanCard className="mt-3" />

        {/* Veille et jour de Jumu'a */}
        <FridayCard className="mt-3" learned={last7.learned} active={last7.active} />

        {/* Heures de prière */}
        <PrayerCard hero className="mt-4" />

        {/* Séance du jour */}
        {planLoading ? (
          <div className="h-64 rounded-2xl bg-muted animate-pulse mt-3" />
        ) : !plan ? (
          <Card className="p-5 mt-3">
            <Target weight="fill" className="w-8 h-8 text-primary mb-2" />
            <p className="font-black text-lg">Crée ton programme</p>
            <p className="text-sm text-muted-foreground font-semibold mb-4">Choisis un objectif et un rythme. Chaque jour, MyHafizz prépare ta leçon et tes révisions.</p>
            <button onClick={() => { haptic(); navigate("/Revision"); }} className="btn-relief w-full h-[50px] bg-primary text-primary-foreground">Choisir mon objectif</button>
          </Card>
        ) : (
          <Card className="p-4 mt-4">
            <div className="flex items-center justify-between">
              <p className="font-black text-[17px]">Ta séance du jour</p>
              <span className="text-sm font-extrabold text-muted-foreground">{doneCount} sur 3</span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden mt-2.5 mb-1"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(doneCount / 3) * 100}%` }} /></div>
            {blocks.map((b, i) => {
              const done = !b.items.length;
              return (
                <button key={b.part} disabled={done} onClick={() => { haptic(); navigate(`/ReviewSession?part=${b.part}`); }}
                  className={`w-full flex items-center gap-3 py-2.5 text-left ${i < 2 ? "border-b-2 border-border" : ""}`}>
                  {done ? <CheckCircle weight="fill" className="w-[26px] h-[26px] text-primary shrink-0" /> : <Circle weight="bold" className="w-[26px] h-[26px] text-border shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className={`font-extrabold ${done ? "text-muted-foreground line-through" : ""}`}>{b.title}</p>
                    <p className="text-[12.5px] font-semibold text-muted-foreground truncate">{done ? (b.part === "sabaq" ? "Leçon du jour faite" : "Rien à revoir aujourd'hui") : describe(b.part, b.items)}</p>
                  </div>
                  {!done && <span className="px-2.5 py-0.5 rounded-full bg-accent text-accent-foreground text-xs font-black shrink-0">{minutes(b.items.length)} min</span>}
                </button>
              );
            })}
            {next ? (
              <button onClick={() => { haptic(); navigate(`/ReviewSession?part=${next.part}`); }} className="btn-relief w-full h-[50px] mt-3 bg-primary text-primary-foreground">
                {doneCount ? "Continuer la séance" : "Commencer la séance"}
              </button>
            ) : (
              <button onClick={() => { haptic(); navigate("/Exercises"); }} className="btn-relief w-full h-[50px] mt-3 bg-card text-foreground border-2 border-border [--relief-color:hsl(var(--border))]">
                Séance faite · s'entraîner
              </button>
            )}
          </Card>
        )}

        {/* Verset et hadith du jour */}
        <VerseOfDay className="mt-3" />
        <HadithOfDay className="mt-3" />

        {/* Défi du jour */}
        <button onClick={() => { haptic(); navigate("/Defi"); }} className="card-flat w-full p-4 mt-3 flex items-center gap-3.5 text-left press">
          <span className="w-[46px] h-[46px] rounded-2xl bg-gold-tint text-[#9A6A00] flex items-center justify-center shrink-0"><Lightning weight="fill" className="w-6 h-6" /></span>
          <div className="flex-1 min-w-0"><p className="font-black text-[17px]">Défi du jour</p><p className="text-[13px] font-semibold text-muted-foreground">5 questions, les mêmes pour tout le monde</p></div>
          <CaretRight weight="bold" className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>

        {/* Encouragements du binôme */}
        <DuoNudges groups={groups} className="mt-3" />

        {/* Binôme */}
        {groups.filter((g) => g.kind === "duo").slice(0, 1).map((g) => <DuoPanel key={g.id} group={g} compact className="mt-3" />)}

        {/* Tafsir */}
        <button onClick={() => { haptic(); navigate("/Tafsir"); }} className="card-flat w-full p-4 mt-3 flex items-center gap-3.5 text-left press">
          <span className="w-[46px] h-[46px] rounded-2xl bg-accent text-primary flex items-center justify-center shrink-0"><BookOpenText weight="fill" className="w-6 h-6" /></span>
          <div className="flex-1 min-w-0"><p className="font-black text-[17px]">Tafsir</p><p className="text-[13px] font-semibold text-muted-foreground">Comprendre ce que tu récites, verset par verset</p></div>
          <CaretRight weight="bold" className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>

        {/* Reprendre */}
        {resume && (
          <button onClick={() => { haptic(); navigate(`/Memorize?surah=${resume.s.number}`); }} className="card-flat w-full p-4 mt-3 flex items-center gap-3.5 text-left press">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-extrabold text-muted-foreground">Reprendre la lecture</p>
              <p className="font-black text-[19px] truncate">{resume.s.englishName}</p>
              <p className="text-sm font-semibold text-muted-foreground">Verset {resume.v} sur {resume.s.numberOfAyahs}</p>
              <div className="h-2 rounded-full bg-muted overflow-hidden mt-2"><div className="h-full rounded-full bg-primary" style={{ width: `${resume.pct}%` }} /></div>
            </div>
            <span className="font-arabic text-[32px] text-accent-foreground shrink-0" dir="rtl">{resume.s.name}</span>
            <span className="w-[46px] h-[46px] rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-[0_3px_0_var(--primary-lip)]"><Play weight="fill" className="w-5 h-5" /></span>
          </button>
        )}

        {/* Apprendre à lire */}
        <button onClick={() => { haptic(); navigate("/Lire"); }} className="card-flat w-full p-4 mt-3 flex items-center gap-3.5 text-left press">
          <span className="w-[46px] h-[46px] rounded-2xl bg-accent text-primary flex items-center justify-center shrink-0 font-arabic text-[26px] leading-none">أ ب</span>
          <div className="flex-1 min-w-0">
            <p className="font-black text-[17px]">Apprendre à lire l'arabe</p>
            {readSessions.length ? (<>
              <p className="text-[13px] font-semibold text-muted-foreground">{readToday >= readGoal ? "Objectif du jour atteint" : `Objectif du jour : ${readToday} / ${readGoal} leçon${readGoal > 1 ? "s" : ""}`}</p>
              <div className="h-2 rounded-full bg-muted overflow-hidden mt-2"><div className={`h-full rounded-full ${readToday >= readGoal ? "bg-gold" : "bg-primary"}`} style={{ width: `${Math.max(4, Math.min(100, (readToday / readGoal) * 100))}%` }} /></div>
            </>) : <p className="text-[13px] font-semibold text-muted-foreground">Lettres, voyelles, puis les mots du Coran</p>}
          </div>
          <CaretRight weight="bold" className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>

        {/* Jouer */}
        <button onClick={() => { haptic(); navigate("/Jouer"); }} className="card-flat w-full p-4 mt-3 flex items-center gap-3.5 text-left press">
          <span className="w-[46px] h-[46px] rounded-2xl bg-accent text-primary flex items-center justify-center shrink-0"><GameController weight="fill" className="w-6 h-6" /></span>
          <div className="flex-1 min-w-0">
            <p className="font-black text-[17px]">Jouer</p>
            <p className="text-[13px] font-semibold text-muted-foreground">Duels, ligue, tournois, Khatma d'équipe et jeux solo</p>
          </div>
          <CaretRight weight="bold" className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>

        {/* Adhkar, tasbih, calendrier, Qiyam */}
        <DailyTools className="mt-3" />

        {/* Objectif de saison */}
        <SeasonCard className="mt-3" progress={progress} />

        </div>
        <div className="min-w-0">
        {/* Chiffres */}
        <Card className="flex mt-3">
          <div className="flex-1 p-3 text-center"><p className="text-[22px] font-black">{session.totalMemorized}</p><p className="text-[11.5px] font-bold text-muted-foreground leading-tight">versets<br />mémorisés</p></div>
          <div className="flex-1 p-3 text-center border-l-2 border-border"><p className="text-[22px] font-black">{completed}</p><p className="text-[11.5px] font-bold text-muted-foreground leading-tight">sourates<br />complètes</p></div>
          <button disabled={!fragile} onClick={() => { haptic(); navigate("/ReviewSession?part=weak"); }} className="flex-1 p-3 text-center border-l-2 border-border">
            <p className={`text-[22px] font-black ${fragile ? "text-gold-lip" : ""}`}>{fragile}</p><p className="text-[11.5px] font-bold text-muted-foreground leading-tight">versets<br />fragiles</p>
          </button>
        </Card>

        {/* Semaine */}
        <Card className="px-4 py-3.5 mt-3 cursor-pointer active:bg-muted" role="link" tabIndex={0} aria-label="Voir le bilan de la semaine"
          onClick={() => { haptic(); navigate("/Bilan"); }} onKeyDown={(e) => { if (e.key === "Enter") navigate("/Bilan"); }}>
          <div className="flex justify-between items-center font-black"><span>Cette semaine</span><span className="text-sm font-extrabold text-muted-foreground flex items-center gap-1">{weekDone} jour{weekDone > 1 ? "s" : ""} sur 7<CaretRight weight="bold" className="w-4 h-4" /></span></div>
          <div className="flex justify-between mt-2.5">
            {week.map((d, i) => (
              <div key={i} className="text-center text-xs font-extrabold text-muted-foreground">
                <div className={`w-[34px] h-[34px] rounded-full mb-1 flex items-center justify-center ${d.done ? "bg-gold text-white" : d.today ? "border-2 border-gold text-gold-lip" : "bg-muted"}`}>
                  {(d.done || d.today) && <Fire weight="fill" className="w-4 h-4" />}
                </div>
                {d.l}
              </div>
            ))}
          </div>
        </Card>

        {/* Groupes */}
        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mt-5 mb-2 ml-1">Mes groupes</p>
        <Card className="overflow-hidden divide-y-2 divide-border">
          {top.length ? top.map((g) => {
            const Icon = g.kind === "class" ? GraduationCap : g.kind === "family" ? House : UsersThree;
            const a = lessons[g.id];
            const sub = a ? `Leçon : ${a.title || `${surahOf(a.surah_number)?.englishName} ${a.from_verse} à ${a.to_verse}`}${a.due_date ? ` · pour le ${new Date(a.due_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}` : ""}`
              : `${KIND_LABEL[g.kind] || "Groupe"} · ${plural(g.members || 1, "membre")}`;
            return (
              <button key={g.id} onClick={() => { haptic(); navigate(`/Group?id=${g.id}`); }} className="w-full flex items-center gap-3 p-3.5 text-left active:bg-muted">
                <span className="w-[38px] h-[38px] rounded-xl bg-accent text-primary flex items-center justify-center shrink-0"><Icon weight="fill" className="w-[21px] h-[21px]" /></span>
                <div className="flex-1 min-w-0"><p className="font-extrabold truncate">{g.name}</p><p className="text-[12.5px] font-semibold text-muted-foreground truncate">{sub}</p></div>
                <CaretRight weight="bold" className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            );
          }) : (
            <button onClick={() => { haptic(); navigate("/Groups"); }} className="w-full flex items-center gap-3 p-3.5 text-left active:bg-muted">
              <span className="w-[38px] h-[38px] rounded-xl bg-accent text-primary flex items-center justify-center shrink-0"><Books weight="fill" className="w-[21px] h-[21px]" /></span>
              <div className="flex-1 min-w-0"><p className="font-extrabold">Rejoindre ou créer un groupe</p><p className="text-[12.5px] font-semibold text-muted-foreground">Madrasa, famille ou cercle, avec khatma</p></div>
              <CaretRight weight="bold" className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          )}
        </Card>
        </div>
        </div>
      </div>
    </div>
  );
}
