import React, { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { MemorizationProgress } from "@/api/entities";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
<<<<<<< HEAD
import { BookOpen, Star, Target, ArrowRight, Sparkles, ChevronRight, HelpCircle, ChevronDown, Volume2, Eye, CheckCircle2, Smartphone, X } from "lucide-react";
=======
import { BookOpen, Star, Target, ArrowRight, Sparkles, TrendingUp, ChevronRight, HelpCircle, ChevronDown, Volume2, Eye, CheckCircle2, Smartphone, X } from "lucide-react";
>>>>>>> 7f0356aab4c376641d3aa5b6c0c4f22b935a7fe0
import ProgressRing from "@/components/ProgressRing";
import { SURAHS, TOTAL_VERSES } from "@/components/quranData";

function useCountUp(target, duration = 1200, delay = 0) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    let start = null;
    let rafId;
    const startAnim = (ts) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) rafId = requestAnimationFrame(startAnim);
    };
    const timer = setTimeout(() => { rafId = requestAnimationFrame(startAnim); }, delay);
    return () => { clearTimeout(timer); cancelAnimationFrame(rafId); };
  }, [target, duration, delay]);
  return count;
}

const GETTING_STARTED_STEPS = [
  {
    number: "1",
    icon: BookOpen,
    color: "emerald",
    title: "Choisir une sourate",
    desc: "Accédez à la liste des 114 sourates et sélectionnez celle que vous souhaitez mémoriser.",
  },
  {
    number: "2",
    icon: Volume2,
    color: "amber",
    title: "Écouter le réciteur",
    desc: "Appuyez sur ▶️ Play sur chaque verset pour écouter le réciteur et familiariser votre oreille.",
  },
  {
    number: "3",
    icon: Eye,
    color: "sky",
    title: "Répéter et se tester",
    desc: "Répétez le verset plusieurs fois, puis masquez le texte arabe avec 👁️ pour vous tester.",
  },
  {
    number: "4",
    icon: CheckCircle2,
    color: "teal",
    title: "Marquer comme mémorisé",
    desc: "Appuyez sur ✅ pour valider chaque verset. Votre progression se met à jour automatiquement.",
  },
];

const STEP_COLORS = {
  emerald: { bg: "bg-emerald-500", ring: "ring-emerald-200 dark:ring-emerald-800", iconBg: "bg-emerald-50 dark:bg-emerald-900/40", iconText: "text-emerald-600 dark:text-emerald-400" },
  amber: { bg: "bg-amber-500", ring: "ring-amber-200 dark:ring-amber-800", iconBg: "bg-amber-50 dark:bg-amber-900/40", iconText: "text-amber-600 dark:text-amber-400" },
  sky: { bg: "bg-sky-500", ring: "ring-sky-200 dark:ring-sky-800", iconBg: "bg-sky-50 dark:bg-sky-900/40", iconText: "text-sky-600 dark:text-sky-400" },
  teal: { bg: "bg-teal-500", ring: "ring-teal-200 dark:ring-teal-800", iconBg: "bg-teal-50 dark:bg-teal-900/40", iconText: "text-teal-600 dark:text-teal-400" },
};

function GettingStartedSection() {
  const STORAGE_KEY = "dashboard_getting_started_open";
  const [open, setOpen] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === null ? true : stored === "true";
    } catch {
      return true;
    }
  });

  const toggle = () => {
    setOpen(v => {
      const next = !v;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
      return next;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.38 }}
      className="glass-card overflow-hidden mb-6"
    >
      <button
        onClick={toggle}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
          <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground text-sm">Comment utiliser MyHafizz ?</p>
          <p className="text-xs text-muted-foreground">Les 4 étapes pour mémoriser le Coran</p>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-border/50 space-y-2.5">
              {GETTING_STARTED_STEPS.map((step) => {
                const Icon = step.icon;
                const c = STEP_COLORS[step.color];
                return (
                  <div key={step.number} className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full ${c.bg} flex items-center justify-center flex-shrink-0 text-white font-black text-[10px] ring-4 ${c.ring} mt-0.5`}>
                      {step.number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center ${c.iconBg}`}>
                          <Icon className={`w-3 h-3 ${c.iconText}`} />
                        </div>
                        <p className="text-sm font-semibold text-foreground">{step.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
              <div className="pt-1">
                <Link
                  to="/Help"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Voir le guide complet
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const INSTALL_PLATFORMS = [
  {
    key: "android",
    emoji: "📱",
    label: "Android (Chrome)",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-200 dark:border-emerald-800",
    badgeBg: "bg-emerald-500",
    badgeRing: "ring-emerald-200 dark:ring-emerald-800",
    steps: [
      <>Ouvrez <strong>myhafizz.com</strong> dans <strong>Google Chrome</strong></>,
      <>Appuyez sur le menu <strong>⋮</strong> (3 points en haut à droite)</>,
      <>Sélectionnez <strong>« Installer l'application »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong></>,
      <>Confirmez en appuyant sur <strong>« Installer »</strong></>,
      <>✅ MyHafizz apparaît maintenant sur votre écran d'accueil !</>,
    ],
  },
  {
    key: "ios",
    emoji: "🍎",
    label: "iOS (Safari)",
    bg: "bg-sky-50 dark:bg-sky-900/20",
    border: "border-sky-200 dark:border-sky-800",
    badgeBg: "bg-sky-500",
    badgeRing: "ring-sky-200 dark:ring-sky-800",
    steps: [
      <>Ouvrez <strong>myhafizz.com</strong> dans <strong>Safari</strong> (pas Chrome ni Firefox !)</>,
      <>Appuyez sur l'icône <strong>Partager</strong> (□ avec une flèche vers le haut) en bas de l'écran</>,
      <>Faites défiler et appuyez sur <strong>« Sur l'écran d'accueil »</strong></>,
      <>Modifiez le nom si vous le souhaitez, puis appuyez sur <strong>« Ajouter »</strong></>,
      <>✅ MyHafizz apparaît maintenant sur votre écran d'accueil !</>,
    ],
  },
  {
    key: "desktop",
    emoji: "💻",
    label: "Ordinateur (Chrome / Edge)",
    bg: "bg-violet-50 dark:bg-violet-900/20",
    border: "border-violet-200 dark:border-violet-800",
    badgeBg: "bg-violet-500",
    badgeRing: "ring-violet-200 dark:ring-violet-800",
    steps: [
      <>Ouvrez <strong>myhafizz.com</strong> dans <strong>Chrome</strong> ou <strong>Edge</strong></>,
      <>Cliquez sur l'icône <strong>⊕</strong> (installer) dans la barre d'adresse à droite</>,
      <>Ou bien : Menu <strong>⋮</strong> → <strong>« Installer MyHafizz »</strong></>,
      <>Confirmez en cliquant sur <strong>« Installer »</strong></>,
      <>✅ L'application s'ouvre dans sa propre fenêtre !</>,
    ],
  },
];

function InstallAppBanner() {
  const OPEN_KEY = "dashboard_install_app_open";
  const DISMISSED_KEY = "dashboard_install_app_dismissed";

  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISSED_KEY) === "true"; } catch { return false; }
  });

  const [open, setOpen] = useState(() => {
    try {
      const stored = localStorage.getItem(OPEN_KEY);
      return stored === null ? true : stored === "true";
    } catch { return true; }
  });

  const toggle = () => {
    setOpen(v => {
      const next = !v;
      try { localStorage.setItem(OPEN_KEY, String(next)); } catch {}
      return next;
    });
  };

  const dismiss = (e) => {
    e.stopPropagation();
    try { localStorage.setItem(DISMISSED_KEY, "true"); } catch {}
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.42 }}
      className="glass-card overflow-hidden mb-6"
    >
      <button
        onClick={toggle}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-900/40 flex items-center justify-center flex-shrink-0">
          <Smartphone className="w-4 h-4 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground text-sm">Installer MyHafizz sur votre appareil</p>
          <p className="text-xs text-muted-foreground">Utilisez MyHafizz comme une vraie application</p>
        </div>
        <div className="flex items-center gap-1">
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </motion.div>
          <button
            onClick={dismiss}
            className="ml-1 p-1 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Masquer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="install-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-border/50 space-y-3">
              {INSTALL_PLATFORMS.map((platform) => (
                <div
                  key={platform.key}
                  className={`rounded-xl p-3 border ${platform.bg} ${platform.border}`}
                >
                  <p className="text-xs font-bold text-foreground mb-2">
                    {platform.emoji} {platform.label}
                  </p>
                  <ol className="space-y-1.5">
                    {platform.steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className={`w-4 h-4 rounded-full ${platform.badgeBg} ring-2 ${platform.badgeRing} flex items-center justify-center flex-shrink-0 text-white font-black text-[9px] mt-0.5`}>
                          {i + 1}
                        </span>
                        <span className="text-xs text-foreground/80 leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
              <p className="text-xs text-muted-foreground pt-1">
                💡 <em>Astuce : Une fois installée, MyHafizz fonctionne même hors connexion !</em>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Dashboard() {
  const [user, setUser] = useState(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUser(data.user)).catch(() => {}); }, []);

  const { data: progressList = [] } = useQuery({
    queryKey: ["memorization-progress"],
    queryFn: () => MemorizationProgress.list(),
  });

  const totalMemorized = progressList.reduce((sum, p) => sum + (p.memorized_verses?.length || 0), 0);
  const completedSurahs = progressList.filter(p => p.status === "completed").length;
  const inProgressSurahs = progressList.filter(p => p.status === "in_progress").length;
  const overallPercent = TOTAL_VERSES > 0 ? (totalMemorized / TOTAL_VERSES) * 100 : 0;

  const animatedTotal = useCountUp(totalMemorized, 1200, 400);
  const animatedCompleted = useCountUp(completedSurahs, 1000, 550);
  const animatedInProgress = useCountUp(inProgressSurahs, 900, 650);

  const recentlyReviewed = [...progressList]
    .filter(p => p.last_reviewed && p.status !== "not_started")
<<<<<<< HEAD
    .sort((a, b) => new Date(b.last_reviewed).getTime() - new Date(a.last_reviewed).getTime())
=======
    .sort((a, b) => new Date(b.last_reviewed) - new Date(a.last_reviewed))
>>>>>>> 7f0356aab4c376641d3aa5b6c0c4f22b935a7fe0
    .slice(0, 5);

  const stats = [
    { icon: BookOpen, label: "Versets mémorisés", value: animatedTotal, color: "emerald", glow: "glow-emerald" },
    { icon: Star, label: "Sourates complètes", value: animatedCompleted, color: "amber" },
    { icon: Target, label: "En cours", value: animatedInProgress, color: "sky" },
  ];

  const milestones = [25, 50, 75];

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "cher(e) apprenant(e)";
  const encouragements = [
    `Continue comme ça ${firstName}, chaque verset te rapproche d'Allah ! 🌟`,
    `Qu'Allah te facilite ton parcours ${firstName}, tu es sur la bonne voie ! 💪`,
    `Bravo ${firstName} ! Chaque effort compte dans la mémorisation du Coran.`,
    `${firstName}, la constance est la clé du hifdh. Continue à avancer ! 📖`,
    `Qu'Allah bénisse tes efforts ${firstName} et facilite ta mémorisation ! 🤲`,
    `Chaque jour est une nouvelle chance, ${firstName}. Tu fais un travail remarquable ! ✨`,
    `${firstName}, les anges se réjouissent de ta dévotion au Coran ! 🌙`,
  ];
  const encouragement = encouragements[new Date().getDay() % encouragements.length];

  return (
<<<<<<< HEAD
    <div className="min-h-screen bg-surface text-on-surface pb-32 font-body">
      <main className="max-w-5xl mx-auto px-6 space-y-12">

        {/* ─── NEW HERO (STITCH UI) ─── */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end pt-24">
          <div className="md:col-span-8 space-y-2">
            <p className="font-label text-on-surface-variant tracking-wider uppercase text-xs">
              السلام عليكم, {firstName}
            </p>
            <h2 className="font-headline text-4xl md:text-5xl font-extrabold text-primary leading-tight">
              Votre parcours spirituel <br/>est en pleine éclosion.
            </h2>
          </div>
          <div className="md:col-span-4 bg-tertiary-fixed/30 p-6 rounded-3xl flex items-center justify-between border border-tertiary-fixed/20 shadow-sm">
            <div className="space-y-1">
              <p className="font-label text-on-tertiary-fixed-variant text-sm font-semibold">Sourates en cours</p>
              <p className="font-headline text-3xl font-black text-tertiary">{animatedInProgress}</p>
            </div>
            <div className="bg-tertiary-fixed text-on-tertiary-fixed p-3 rounded-2xl">
              <Target className="w-8 h-8 text-tertiary" />
            </div>
          </div>
        </section>

        {/* Getting Started — visible for new users only */}
        {totalMemorized === 0 && <GettingStartedSection />}
        <InstallAppBanner />

        {/* Bento Layout for Stats and Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Daily Verse Card (Large) */}
          <div className="md:col-span-2 relative group overflow-hidden rounded-3xl bg-primary-container p-8 text-on-primary-container shadow-sm border border-primary/10">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Sparkles className="w-32 h-32" />
            </div>
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-secondary-container" />
                <span className="font-label text-sm font-medium text-secondary-container tracking-widest uppercase">Réflexion</span>
              </div>
              <blockquote className="font-headline text-2xl italic leading-relaxed text-surface">
                "{encouragement}"
              </blockquote>
              <div className="flex items-center justify-between pt-4 border-t border-surface/10">
                <p className="font-label text-sm text-secondary-container">Continuez vos efforts</p>
                <Link to="/SurahList">
                  <button className="bg-surface text-primary px-5 py-2 rounded-full font-label text-sm font-bold hover:scale-105 transition-transform duration-300">
                    Découvrir plus
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* Overall Progress Card */}
          <div className="bg-surface-container-low rounded-3xl p-8 flex flex-col justify-between border border-outline-variant/10 shadow-sm">
            <div className="space-y-4">
              <p className="font-label text-sm font-semibold text-on-surface-variant tracking-wide">Progression globale</p>
              <div className="flex justify-center py-2 relative flex items-center justify-center">
                <ProgressRing progress={overallPercent} size={130} strokeWidth={10} color="#14422d" />
                <div className="absolute inset-0 flex items-center justify-center">
                   <span className="font-headline text-2xl font-black text-primary">{Math.round(overallPercent)}%</span>
                </div>
              </div>
            </div>
            <div className="space-y-1 text-center mt-2">
              <p className="font-body text-sm font-medium text-on-surface">{animatedTotal} / {TOTAL_VERSES} versets</p>
              <p className="font-label text-xs text-on-surface-variant">{animatedCompleted} sourates terminées</p>
            </div>
          </div>

          {/* Action Card: Continue Memorizing */}
          <div className="md:col-span-3 bg-white rounded-3xl p-8 border border-surface-container-highest shadow-xl shadow-on-surface/5 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-400 hover:shadow-2xl hover:shadow-primary/5">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-secondary-container flex items-center justify-center rounded-2xl text-primary">
                <BookOpen className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-headline text-xl font-bold text-primary">Reprendre l'apprentissage</h3>
                <p className="font-body text-on-surface-variant">Accédez à votre dernière sourate en cours.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/SurahList">
                <button className="flex items-center gap-2 bg-primary text-on-primary px-8 py-4 rounded-full font-label font-bold text-lg hover:shadow-lg hover:bg-primary-container transition-all duration-300">
                  <span>Continuer</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
            </div>
          </div>

        </div>

        {/* Recent Activity / Focus Area */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-headline text-2xl font-bold text-primary">Révisions récentes</h3>
            <Link to="/SurahList" className="text-secondary font-label text-sm font-semibold hover:underline flex items-center gap-1">
              Toutes les sourates <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentlyReviewed.length === 0 ? (
               <div className="col-span-full bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/10 text-center">
                 <p className="text-on-surface font-body">Aucune révision pour l'instant.</p>
               </div>
            ) : (
               recentlyReviewed.slice(0, 4).map((prog, i) => {
                 const surah = SURAHS.find(s => s.number === prog.surah_number);
                 if (!surah) return null;
                 const percent = (prog.memorized_verses?.length || 0) / surah.numberOfAyahs * 100;
                 return (
                  <Link key={prog.id} to={`/Memorize?surah=${surah.number}`} className="block">
                    <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 hover:bg-surface-container-low transition-colors duration-300 h-full">
                      <div className="text-secondary mb-3">
                        <Star className="w-6 h-6" />
                      </div>
                      <p className="font-body font-bold text-on-surface">{surah.englishName}</p>
                      <p className="font-label text-xs text-on-surface-variant mt-1">{prog.memorized_verses?.length || 0}/{surah.numberOfAyahs} versets mémorisés</p>
                    </div>
                  </Link>
                 );
               })
            )}
          </div>
        </section>

      </main>
=======
    <div className="min-h-screen bg-background">

      {/* ─── HERO ─── */}
      <div className="relative overflow-hidden hafiz-gradient-hero">
        {/* Islamic geometric pattern overlay */}
        <div className="absolute inset-0 opacity-[0.035]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff'%3E%3Cpath d='M30 0l8.66 15H21.34L30 0zm0 60l8.66-15H21.34L30 60zM0 30l15-8.66v17.32L0 30zm60 0L45 21.34v17.32L60 30zM30 22.5a7.5 7.5 0 100 15 7.5 7.5 0 000-15z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute -bottom-20 left-1/4 w-80 h-80 bg-amber-400/5 rounded-full" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-28 relative">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

            {user && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="font-arabic text-emerald-300 text-sm mb-3 font-medium"
              >
                السلام عليكم،{" "}
                <span className="text-white font-bold">{user.user_metadata?.full_name?.split(" ")[0] || user.email}</span> 👋
              </motion.p>
            )}

            <div className="inline-flex items-center gap-2 bg-white/8 backdrop-blur-sm border border-white/15 rounded-full px-4 py-1.5 mb-5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-glow-pulse" />
              <span className="text-amber-200/90 text-xs font-medium tracking-widest uppercase">حفظ القرآن الكريم</span>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
              <div className="max-w-lg">
                <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4 tracking-tight">
                  Mémorisation<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400">
                    du Saint Coran
                  </span>
                </h1>
                <p className="text-emerald-300/80 text-base leading-relaxed mb-4">
                  Progressez verset par verset, sourate par sourate, avec un suivi précis de votre hifdh.
                </p>
                {user && (
                  <p className="text-emerald-200/80 text-sm leading-relaxed italic">
                    {encouragement}
                  </p>
                )}
              </div>

              {/* Right side: ProgressRing */}
              <div className="flex-shrink-0 flex flex-col items-center gap-4">
                {/* Progress ring card */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25, duration: 0.5 }}
                  className="flex flex-col items-center gap-3 glass-card p-7 lg:p-8 glow-emerald"
                >
                  <ProgressRing progress={overallPercent} size={140} strokeWidth={10} color="#fbbf24" />
                  <div className="text-center">
                    <p className="text-white font-black text-xl">
                      {totalMemorized}
                      <span className="text-emerald-300 font-normal text-sm ml-1">/ {TOTAL_VERSES}</span>
                    </p>
                    <p className="text-emerald-400/80 text-xs mt-0.5">versets mémorisés</p>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ─── MAIN ─── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative">
        <div>

          {/* ─── Stats — overlap hero ─── */}
          <div className="-mt-12 relative z-10 mb-6">
              <div className="grid grid-cols-3 gap-3">
                {stats.map(({ icon: Icon, label, value, color }, i) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.07 }}
                    className="glass-card p-4"
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
                      color === "emerald" ? "bg-emerald-500/10 dark:bg-emerald-500/20" :
                      color === "amber" ? "bg-amber-500/10 dark:bg-amber-500/20" :
                      "bg-sky-500/10 dark:bg-sky-500/20"
                    }`}>
                      <Icon className={`w-4 h-4 ${
                        color === "emerald" ? "text-emerald-600 dark:text-emerald-400" :
                        color === "amber" ? "text-amber-600 dark:text-amber-400" :
                        "text-sky-600 dark:text-sky-400"
                      }`} />
                    </div>
                    <p className="text-3xl font-black text-foreground leading-none mb-1">{value}</p>
                    <p className="text-xs text-muted-foreground leading-tight">{label}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Getting Started — visible for new users only */}
            {totalMemorized === 0 && <GettingStartedSection />}

            {/* Install App Banner — visible for all users */}
            <InstallAppBanner />

            {/* Global progress */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="glass-card p-5 mb-6"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary dark:text-emerald-400" />
                  <span className="font-semibold text-foreground text-sm">Progression globale</span>
                </div>
                <span className="text-primary dark:text-emerald-400 font-black text-sm">{overallPercent.toFixed(2)}%</span>
              </div>
              <div className="relative w-full bg-muted rounded-full h-3 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${overallPercent}%` }}
                  transition={{ delay: 0.5, duration: 1.2, ease: "easeOut" }}
                  className="h-3 rounded-full bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600"
                />
                {milestones.map(m => (
                  <div
                    key={m}
                    className="absolute top-0 bottom-0 w-0.5 bg-white/40 dark:bg-white/20"
                    style={{ left: `${m}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>0 verset</span>
                <span>{TOTAL_VERSES} versets au total</span>
              </div>
            </motion.div>

            {/* Recently reviewed */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-black text-foreground">Révisions récentes</h2>
                <Link to="/SurahList" className="text-primary dark:text-emerald-400 text-sm font-medium flex items-center gap-1 hover:gap-1.5 transition-all">
                  Toutes les sourates <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {recentlyReviewed.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-14 glass-card"
                >
                  <div className="w-14 h-14 bg-primary/10 dark:bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-6 h-6 text-primary dark:text-emerald-400" />
                  </div>
                  <p className="text-foreground font-semibold text-sm">Aucune révision pour l'instant</p>
                  <p className="text-muted-foreground text-sm mt-1 max-w-xs mx-auto">Commencez à mémoriser une sourate pour suivre votre progression ici.</p>
                  <Link to="/SurahList">
                    <button className="mt-5 inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
                      <BookOpen className="w-4 h-4" /> Choisir une sourate
                    </button>
                  </Link>
                </motion.div>
              ) : (
                <div className="space-y-2">
                  {recentlyReviewed.map((prog, i) => {
                    const surah = SURAHS.find(s => s.number === prog.surah_number);
                    if (!surah) return null;
                    const percent = (prog.memorized_verses?.length || 0) / surah.numberOfAyahs * 100;
                    const isComplete = prog.status === "completed";
                    return (
                      <motion.div
                        key={prog.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                      >
                        <Link
                          to={`/Memorize?surah=${surah.number}`}
                          className="flex items-center gap-4 p-4 rounded-2xl glass-card hover:border-amber-200/60 dark:hover:border-amber-700/40 hover:-translate-y-0.5 hover:shadow-xl transition-all duration-200 group"
                        >
                          {/* Diamond number */}
                          <div className="flex-shrink-0 relative w-12 h-12 flex items-center justify-center">
                            <div className={`w-10 h-10 rotate-45 rounded-lg ${
                              isComplete
                                ? "bg-gradient-to-br from-emerald-500 to-emerald-700"
                                : "bg-gradient-to-br from-amber-400 to-amber-600"
                            }`} />
                            <span className="absolute font-black text-white text-xs">{surah.number}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <p className="font-arabic font-bold text-foreground text-sm">{surah.name}</p>
                              <p className="text-muted-foreground text-xs truncate">{surah.englishName}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                              <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-1.5 rounded-full transition-all ${isComplete ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : "bg-gradient-to-r from-amber-400 to-amber-500"}`}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground flex-shrink-0">{prog.memorized_verses?.length || 0}/{surah.numberOfAyahs}</span>
                            </div>
                          </div>
                          <ProgressRing
                            progress={percent}
                            size={40}
                            strokeWidth={3.5}
                            color={isComplete ? "#059669" : "#f59e0b"}
                          />
                          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

      </div>
>>>>>>> 7f0356aab4c376641d3aa5b6c0c4f22b935a7fe0
    </div>
  );
}
