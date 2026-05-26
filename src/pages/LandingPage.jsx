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
            >
              Connexion
            </Link>
            <Link
              to="/login"
              className="font-label text-sm bg-primary text-on-primary font-bold px-6 py-3 rounded-full hover:bg-primary/90 transition-all shadow-md shadow-primary/20 active:scale-95"
            >
              Commencer
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
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
                >
                  Connexion
                </Link>
                <Link
                  to="/login"
                  className="block font-label text-base bg-primary text-on-primary font-bold text-center py-4 px-4 rounded-full shadow-md shadow-primary/20 active:scale-95 transition-transform mt-2"
                >
                  Commencer gratuitement
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

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
          </div>
        </div>
      </footer>
    </div>
  );
}
