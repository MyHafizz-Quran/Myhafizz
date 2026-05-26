import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Brain,
  Headphones,
  Trophy,
  Users,
  ArrowRight,
  Sparkles,
  Heart,
  Target,
  ChevronRight,
  WifiOff,
  Settings,
  Play,
  Eye,
  CheckCircle,
  Menu,
  X,
} from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Mémorisation verset par verset",
    description:
      "Apprenez le Coran sourate par sourate avec un suivi précis de votre progression. Masquez le texte pour vous tester.",
    color: "emerald",
  },
  {
    icon: Headphones,
    title: "Audio multi-récitateurs",
    description:
      "Écoutez chaque verset avec 5+ récitateurs reconnus : Al-Afasy, Abdul Basit, Minshawi, Husary, et plus.",
    color: "amber",
  },
  {
    icon: Brain,
    title: "Quiz Hifdh intelligents",
    description:
      "Testez vos connaissances avec des quiz adaptatifs. Correction automatique en arabe avec score détaillé.",
    color: "sky",
  },
  {
    icon: Trophy,
    title: "Défis communautaires",
    description:
      "Rejoignez des défis de mémorisation avec classement en temps réel. Badges Bronze, Argent, Or et Hafidh.",
    color: "purple",
  },
  {
    icon: Users,
    title: "Partenaires d'étude",
    description:
      "Trouvez un partenaire compatible selon votre niveau et disponibilité pour vous motiver mutuellement.",
    color: "rose",
  },
  {
    icon: Heart,
    title: "Favoris & Marqueurs",
    description:
      "Enregistrez vos versets préférés et marquez votre position pour reprendre exactement où vous étiez.",
    color: "orange",
  },
  {
    icon: WifiOff,
    title: "Mode hors-ligne",
    description:
      "Téléchargez vos sourates pour les écouter sans connexion internet. Parfait pour apprendre partout.",
    color: "teal",
  },
  {
    icon: Settings,
    title: "Personnalisation avancée",
    description:
      "Ajustez la police arabe, la taille du texte, l'espacement et le thème sombre selon vos préférences.",
    color: "indigo",
  },
];

const stats = [
  { value: "114", label: "Sourates" },
  { value: "6236", label: "Versets" },
  { value: "30", label: "Juz" },
  { value: "♾️", label: "Récompenses" },
];

const steps = [
  {
    number: "01",
    icon: BookOpen,
    title: "Choisissez une sourate",
    description: "Parcourez les 114 sourates et sélectionnez celle que vous souhaitez mémoriser.",
  },
  {
    number: "02",
    icon: Play,
    title: "Écoutez le réciteur",
    description: "Appuyez sur Play pour écouter chaque verset et familiariser votre oreille.",
  },
  {
    number: "03",
    icon: Eye,
    title: "Testez-vous",
    description: "Masquez le texte arabe et répétez de mémoire pour valider votre apprentissage.",
  },
  {
    number: "04",
    icon: CheckCircle,
    title: "Marquez comme mémorisé",
    description: "Validez chaque verset et suivez votre progression automatiquement.",
  },
];

const colorMap = {
<<<<<<< HEAD
  emerald: "bg-primary/10 text-primary",
  amber: "bg-tertiary-fixed text-on-tertiary-fixed",
  sky: "bg-secondary-container text-on-secondary-container",
  purple: "bg-primary-container text-on-primary-container",
  rose: "bg-error-container text-on-error-container",
  orange: "bg-tertiary-fixed-dim text-on-tertiary-fixed-variant",
  teal: "bg-primary-fixed text-on-primary-fixed",
  indigo: "bg-[#e2e2fb] text-[#1d1d6b]",
};

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // We no longer force a dark background. The Sanctuary is a light, serene theme.
  useEffect(() => {
    // Clean up any residual forced body styles if they exist from previous navigations
    document.documentElement.style.backgroundColor = "";
    document.body.style.backgroundColor = "";
    document.documentElement.classList.remove('dark');
  }, []);

  return (
    <div className="min-h-[100dvh] flex flex-col flex-1 bg-surface font-body text-on-surface">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-[var(--z-page-header)] bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10 shadow-sm"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2 flex-shrink-0 group">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 transition-transform duration-300">
              <img src="/logo.svg" alt="MyHafizz" className="w-6 h-6 invert" />
            </div>
            <span className="font-headline font-bold text-lg sm:text-xl text-primary tracking-tight">MyHafizz</span>
          </Link>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center gap-6 flex-shrink-0">
            <a href="#features" className="font-label text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors">
              Fonctionnalités
            </a>
            <a href="#how-it-works" className="font-label text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors">
              Méthodologie
            </a>
            <Link
              to="/login"
              className="font-label text-sm font-bold text-primary hover:text-primary/70 transition-colors px-2"
=======
  emerald: "bg-emerald-500/10 text-emerald-400",
  amber: "bg-amber-500/10 text-amber-400",
  sky: "bg-sky-500/10 text-sky-400",
  purple: "bg-purple-500/10 text-purple-400",
  rose: "bg-rose-500/10 text-rose-400",
  orange: "bg-orange-500/10 text-orange-400",
  teal: "bg-teal-500/10 text-teal-400",
  indigo: "bg-indigo-500/10 text-indigo-400",
};

const LANDING_BG_COLOR = '#071f18';

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const originalHtmlBg = document.documentElement.style.backgroundColor;
    const originalBodyBg = document.body.style.backgroundColor;

    document.documentElement.style.backgroundColor = LANDING_BG_COLOR;
    document.body.style.backgroundColor = LANDING_BG_COLOR;

    return () => {
      document.documentElement.style.backgroundColor = originalHtmlBg;
      document.body.style.backgroundColor = originalBodyBg;
    };
  }, []);

  return (
    <div className="dark min-h-[100dvh] flex flex-col flex-1 bg-emerald-950 bg-gradient-to-b from-emerald-950 via-[#071f18] to-emerald-950 text-white" style={{ colorScheme: "dark", backgroundColor: LANDING_BG_COLOR }}>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-[var(--z-page-header)] bg-emerald-950/80 backdrop-blur-xl border-b border-white/5 shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
           style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <img src="/logo.svg" alt="MyHafizz" className="w-5 h-5" />
            </div>
            <span className="font-bold text-base sm:text-lg">MyHafizz</span>
          </Link>
          
          {/* Desktop navigation */}
          <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
            <a href="#features" className="text-sm text-white/70 hover:text-white transition-colors px-3 py-2">
              Fonctionnalités
            </a>
            <a href="#how-it-works" className="text-sm text-white/70 hover:text-white transition-colors px-3 py-2">
              Comment ça marche
            </a>
            <Link
              to="/login"
              className="text-sm text-white/70 hover:text-white transition-colors px-4 py-2"
>>>>>>> 7f0356aab4c376641d3aa5b6c0c4f22b935a7fe0
            >
              Connexion
            </Link>
            <Link
              to="/login"
<<<<<<< HEAD
              className="font-label text-sm bg-primary text-on-primary font-bold px-6 py-3 rounded-full hover:bg-primary/90 transition-all shadow-md shadow-primary/20 active:scale-95"
=======
              className="text-sm bg-gradient-to-r from-amber-400 to-amber-300 text-emerald-950 font-semibold px-5 py-2 rounded-xl hover:from-amber-300 hover:to-amber-200 transition-all shadow-lg shadow-amber-400/10"
>>>>>>> 7f0356aab4c376641d3aa5b6c0c4f22b935a7fe0
            >
              Commencer
            </Link>
          </div>

          {/* Mobile menu button */}
<<<<<<< HEAD
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
=======
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden w-10 h-10 rounded-xl flex items-center justify-center text-white/80 hover:bg-white/5 transition-colors focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none"
            aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
>>>>>>> 7f0356aab4c376641d3aa5b6c0c4f22b935a7fe0
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
<<<<<<< HEAD
            <motion.div
=======
            <motion.div 
>>>>>>> 7f0356aab4c376641d3aa5b6c0c4f22b935a7fe0
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
<<<<<<< HEAD
              className="md:hidden border-t border-outline-variant/10 bg-surface overflow-hidden shadow-lg"
            >
              <div className="px-4 py-6 space-y-4">
                <a
                  href="#features"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block font-label text-base font-bold text-on-surface hover:text-primary py-2 px-4 rounded-2xl hover:bg-surface-container transition-colors"
                >
                  Fonctionnalités
                </a>
                <a
                  href="#how-it-works"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block font-label text-base font-bold text-on-surface hover:text-primary py-2 px-4 rounded-2xl hover:bg-surface-container transition-colors"
                >
                  Comment ça marche
                </a>
                <hr className="border-outline-variant/10 my-4" />
                <Link
                  to="/login"
                  className="block font-label text-base font-bold text-on-surface hover:text-primary py-2 px-4 rounded-2xl hover:bg-surface-container transition-colors"
=======
              className="sm:hidden border-t border-white/5 overflow-hidden"
            >
              <div className="px-4 py-4 space-y-2">
                <a 
                  href="#features" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-sm text-white/80 hover:text-white py-2.5 px-3 rounded-xl hover:bg-white/5 transition-colors"
                >
                  Fonctionnalités
                </a>
                <a 
                  href="#how-it-works" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-sm text-white/80 hover:text-white py-2.5 px-3 rounded-xl hover:bg-white/5 transition-colors"
                >
                  Comment ça marche
                </a>
                <Link
                  to="/login"
                  className="block text-sm text-white/80 hover:text-white py-2.5 px-3 rounded-xl hover:bg-white/5 transition-colors"
>>>>>>> 7f0356aab4c376641d3aa5b6c0c4f22b935a7fe0
                >
                  Connexion
                </Link>
                <Link
                  to="/login"
<<<<<<< HEAD
                  className="block font-label text-base bg-primary text-on-primary font-bold text-center py-4 px-4 rounded-full shadow-md shadow-primary/20 active:scale-95 transition-transform mt-2"
=======
                  className="block text-sm bg-gradient-to-r from-amber-400 to-amber-300 text-emerald-950 font-semibold text-center py-3 px-4 rounded-xl shadow-lg shadow-amber-400/10"
>>>>>>> 7f0356aab4c376641d3aa5b6c0c4f22b935a7fe0
                >
                  Commencer gratuitement
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

<<<<<<< HEAD
      <main className="flex-grow pt-20">
        {/* Hero Section */}
        <section className="relative pt-16 sm:pt-32 pb-20 sm:pb-32 px-4 sm:px-6 overflow-hidden">
          {/* Decorative The Sanctuary Blurs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px]" />
            <div className="absolute top-40 left-0 w-80 h-80 bg-tertiary/5 rounded-full blur-[80px]" />
          </div>

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="inline-flex items-center gap-2 bg-surface-container border border-outline-variant/20 rounded-full px-4 py-2 mb-8 sm:mb-10 shadow-sm">
                <Sparkles className="w-4 h-4 text-tertiary" />
                <span className="font-label text-xs sm:text-sm font-bold text-on-surface-variant tracking-wide uppercase">
                  Votre sanctuaire de mémorisation
                </span>
              </div>

              <h1 className="font-headline text-5xl sm:text-6xl md:text-7xl font-extrabold text-primary leading-[1.1] tracking-tight mb-6 sm:mb-8">
                Hifz le Saint Coran, <br className="hidden sm:block" />
                <span className="relative">
                  en toute sérénité
                  <svg className="absolute w-full h-3 -bottom-1 left-0 text-tertiary-fixed opacity-70" viewBox="0 0 100 10" preserveAspectRatio="none">
                    <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="4" fill="transparent" strokeLinecap="round" />
                  </svg>
                </span>
              </h1>

              <p className="font-body text-lg sm:text-xl text-on-surface-variant max-w-2xl mx-auto mb-10 sm:mb-12 leading-relaxed px-4">
                Une interface apaisante conçue pour éliminer les distractions. Écoutez, répétez, et suivez votre apprentissage verset par verset.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary text-on-primary font-bold px-8 py-4 rounded-full shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all text-base active:scale-95"
                >
                  Entrer dans le Sanctuaire
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Stats Bento */}
        <section className="py-12 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-[2.5rem] p-8 sm:p-12 grid grid-cols-2 md:grid-cols-4 gap-8 shadow-sm">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="text-center flex flex-col items-center justify-center"
                >
                  <div className="font-headline text-4xl sm:text-5xl font-extrabold text-primary mb-2">
                    {stat.value}
                  </div>
                  <div className="font-label text-sm font-semibold text-on-surface-variant uppercase tracking-wider">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-20 px-4 sm:px-6 bg-surface-container-low/50">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-16"
            >
              <h2 className="font-headline text-3xl sm:text-4xl lg:text-5xl font-extrabold text-primary mb-4">
                Conçu pour la concentration
              </h2>
              <p className="font-body text-lg text-on-surface-variant max-w-2xl mx-auto">
                Chaque outil a été pensé pour vous offrir une expérience d'apprentissage fluide, respectant le minimalisme ("No-Line rule").
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.6, ease: "easeOut" }}
                  className="bg-surface-container-lowest rounded-[2rem] p-8 hover:bg-surface-container-low transition-colors group shadow-sm hover:shadow-md border border-outline-variant/5"
                >
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 duration-500 ${colorMap[feature.color] || colorMap.emerald
                      }`}
                  >
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-headline font-bold text-xl text-primary mb-3">
                    {feature.title}
                  </h3>
                  <p className="font-body text-sm text-on-surface-variant leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="py-24 px-4 sm:px-6 relative">
          <div className="absolute right-0 top-1/2 w-96 h-96 bg-secondary-container/30 rounded-full blur-[100px] pointer-events-none -z-10" />

          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-headline text-3xl sm:text-4xl lg:text-5xl font-extrabold text-primary mb-4">
                La méthode d'apprentissage
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
              {steps.map((step, i) => (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15, duration: 0.5 }}
                  className="flex gap-6 items-start bg-transparent p-4"
                >
                  <div className="flex-shrink-0 w-16 h-16 bg-primary-fixed rounded-[1.5rem] flex items-center justify-center rotate-3 group-hover:rotate-0 transition-transform">
                    <step.icon className="w-8 h-8 text-on-primary-fixed" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-label text-sm font-black text-tertiary">{step.number}</span>
                      <h3 className="font-headline font-bold text-xl text-primary">{step.title}</h3>
                    </div>
                    <p className="font-body text-base text-on-surface-variant leading-relaxed">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-4 sm:px-6 mb-10">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="bg-primary rounded-[3rem] p-10 sm:p-20 text-center relative overflow-hidden shadow-xl shadow-primary/10"
            >
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom_right,rgba(255,255,255,0.1),transparent)] pointer-events-none" />

              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-container rounded-2xl mb-8 shadow-inner shadow-primary-container">
                  <BookOpen className="w-8 h-8 text-primary-fixed" />
                </div>
                <h2 className="font-headline text-3xl sm:text-5xl font-extrabold text-on-primary mb-6">
                  Prêt à mémoriser ?
                </h2>
                <p className="font-body text-lg text-on-primary/80 mb-10 max-w-xl mx-auto">
                  Rejoignez-nous et découvrez une nouvelle façon, plus paisible et concentrée, d'apprendre le Coran.
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-3 bg-tertiary-fixed text-on-tertiary-fixed font-bold px-10 py-5 rounded-full shadow-lg shadow-tertiary-fixed/20 hover:bg-[#ffe6a0] transition-all text-lg active:scale-95"
                >
                  Commencer l'aventure
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-outline-variant/10 py-10 px-4 sm:px-6 bg-surface-container-lowest" style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 2.5rem)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-surface-container rounded-xl flex items-center justify-center">
                <img src="/logo.svg" alt="MyHafizz" className="w-5 h-5 opacity-70" />
              </div>
              <span className="font-headline font-bold text-lg text-primary">MyHafizz</span>
            </div>

            <div className="flex gap-8">
              <Link to="/login" className="font-label text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors">
                Connexion
              </Link>
              <Link to="/login" className="font-label text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors">
                Inscription
              </Link>
              <Link to="/terms" className="font-label text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors">
                Conditions
              </Link>
              <Link to="/privacy" className="font-label text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors">
                Confidentialité
              </Link>
            </div>
          </div>

          <div className="text-center pt-8 border-t border-outline-variant/10">
            <p className="font-body text-sm text-on-surface-variant/60 mb-2">
              © {new Date().getFullYear()} MyHafizz. Mémorisation du Saint Coran.
            </p>
            <p className="font-label text-xs text-on-surface-variant/40">Made with ❤️ from Samatiguila</p>
=======
      {/* Main content wrapper - grows to push footer down */}
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-emerald-500/5 rounded-full blur-3xl" />
          <div className="absolute top-40 right-1/4 w-48 sm:w-80 h-48 sm:h-80 bg-amber-500/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 sm:px-4 py-1.5 mb-6 sm:mb-8">
              <Sparkles className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-amber-300" />
              <span className="text-xs sm:text-sm text-emerald-200">
                Votre compagnon de mémorisation du Coran
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold leading-tight mb-4 sm:mb-6">
              Mémorisez le{" "}
              <span className="bg-gradient-to-r from-amber-300 to-amber-400 bg-clip-text text-transparent">
                Saint Coran
              </span>
              <br className="hidden sm:block" />
              <span className="sm:hidden"> </span>
              avec confiance
            </h1>

            <p className="text-base sm:text-xl text-emerald-200/90 max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed px-2">
              Une plateforme interactive et complète pour vous accompagner dans
              votre parcours de Hifz, verset par verset, avec audio, quiz et
              communauté.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Link
                to="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-amber-300 text-emerald-950 font-bold px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl shadow-xl shadow-amber-400/20 hover:from-amber-300 hover:to-amber-200 transition-all text-sm sm:text-base active:scale-[0.98]"
              >
                Commencer gratuitement
                <ArrowRight className="w-4 sm:w-5 h-4 sm:h-5" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 text-emerald-200/90 hover:text-white font-medium px-4 sm:px-6 py-3 sm:py-4 transition-colors text-sm sm:text-base"
              >
                Découvrir les fonctionnalités
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-8 sm:py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/10 border border-white/20 rounded-2xl sm:rounded-3xl p-6 sm:p-8 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="text-center"
              >
                <div className="text-2xl sm:text-4xl font-bold bg-gradient-to-br from-amber-300 to-amber-400 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm text-emerald-200/80 mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10 sm:mb-16"
          >
            <h2 className="text-2xl sm:text-4xl font-bold mb-3 sm:mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-emerald-200/80 text-base sm:text-lg max-w-2xl mx-auto px-2">
              Des outils puissants et intuitifs pour faciliter votre parcours de
              mémorisation du Coran.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.5 }}
                className="bg-white/10 border border-white/20 rounded-2xl p-5 sm:p-6 hover:bg-white/[0.15] transition-colors group active:scale-[0.98] touch-manipulation focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none"
                tabIndex={0}
              >
                <div
                  className={`w-10 sm:w-12 h-10 sm:h-12 rounded-xl flex items-center justify-center mb-3 sm:mb-4 ${
                    colorMap[feature.color]
                  }`}
                >
                  <feature.icon className="w-5 sm:w-6 h-5 sm:h-6" />
                </div>
                <h3 className="font-bold text-base sm:text-lg mb-1.5 sm:mb-2 group-hover:text-amber-300 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-emerald-200/80 text-xs sm:text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10 sm:mb-16"
          >
            <h2 className="text-2xl sm:text-4xl font-bold mb-3 sm:mb-4">
              Comment ça marche ?
            </h2>
            <p className="text-emerald-200/80 text-base sm:text-lg max-w-xl mx-auto">
              Quatre étapes simples pour commencer votre parcours de Hifz.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className="flex gap-3 sm:gap-4 bg-white/10 border border-white/20 rounded-2xl p-4 sm:p-6"
              >
                <div className="flex-shrink-0 w-10 sm:w-12 h-10 sm:h-12 bg-gradient-to-br from-amber-400 to-amber-300 rounded-xl flex items-center justify-center">
                  <step.icon className="w-5 sm:w-6 h-5 sm:h-6 text-emerald-950" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 sm:mb-1">
                    <span className="text-xs text-amber-400 font-bold">{step.number}</span>
                    <h3 className="font-bold text-sm sm:text-base">{step.title}</h3>
                  </div>
                  <p className="text-emerald-200/80 text-xs sm:text-sm leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-br from-emerald-800/70 to-emerald-900/70 border border-white/20 rounded-2xl sm:rounded-3xl p-8 sm:p-14 text-center"
          >
            <div className="inline-flex items-center justify-center w-12 sm:w-16 h-12 sm:h-16 bg-amber-400/10 rounded-xl sm:rounded-2xl mb-4 sm:mb-6">
              <Target className="w-6 sm:w-8 h-6 sm:h-8 text-amber-300" />
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold mb-3 sm:mb-4">
              Prêt à commencer votre Hifz ?
            </h2>
            <p className="text-emerald-200/80 text-sm sm:text-lg mb-6 sm:mb-8 max-w-lg mx-auto">
              Rejoignez des milliers de musulmans qui utilisent MyHafizz pour
              mémoriser le Saint Coran.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-300 text-emerald-950 font-bold px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl shadow-xl shadow-amber-400/20 hover:from-amber-300 hover:to-amber-200 transition-all text-sm sm:text-base active:scale-[0.98]"
            >
              Créer un compte gratuit
              <ArrowRight className="w-4 sm:w-5 h-4 sm:h-5" />
            </Link>
          </motion.div>
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/5 py-6 sm:py-8 px-4 sm:px-6" style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 1.5rem)" }}>
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-4 sm:gap-5">
          <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                <img src="/logo.svg" alt="MyHafizz" className="w-4 h-4" />
              </div>
              <span className="font-semibold text-sm">MyHafizz</span>
            </div>
            <p className="text-emerald-200/60 text-xs text-center">
              © {new Date().getFullYear()} MyHafizz. Mémorisation du Saint Coran.
            </p>
            <div className="flex items-center gap-4 sm:gap-6">
              <Link to="/login" className="text-emerald-200/50 text-xs hover:text-white transition-colors">
                Connexion
              </Link>
              <Link to="/login" className="text-emerald-200/50 text-xs hover:text-white transition-colors">
                Inscription
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center">
            <Link to="/terms" className="text-emerald-200/60 text-xs hover:text-emerald-200/80 transition-colors">
              Conditions d'utilisation
            </Link>
            <span className="w-1 h-1 rounded-full bg-white/10" />
            <Link to="/privacy" className="text-emerald-200/60 text-xs hover:text-emerald-200/80 transition-colors">
              Politique des données
            </Link>
          </div>
          <div className="text-center space-y-0.5">
            <p className="text-emerald-200/50 text-[10px] sm:text-[11px]">MyHafizz v0.1 Beta</p>
            <p className="text-emerald-200/50 text-[10px] sm:text-[11px]">Made with ❤️ from Samatiguila</p>
>>>>>>> 7f0356aab4c376641d3aa5b6c0c4f22b935a7fe0
          </div>
        </div>
      </footer>
    </div>
  );
}
