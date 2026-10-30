import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Play, Heart, MapPin, Eye, CheckCircle2,
  Volume2, EyeOff, Brain, Settings, Smartphone, TrendingUp,
  Lightbulb, ChevronDown, ArrowLeft, HelpCircle,
  Mic, PenLine, ListChecks, Sun, Moon, Type, Languages,
  AlignJustify, Wifi, HardDrive, Sliders, Download, BarChart2,
  Bookmark, Clock, Repeat, Award,
} from "@/components/icons";

// ─── Accordion section wrapper ───────────────────────────────────────────────
function Section({ icon: Icon, title, color = "emerald", children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  const colorMap = {
    emerald: "bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400",
    sky: "bg-sky-50 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400",
    violet: "bg-violet-50 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400",
    rose: "bg-rose-50 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400",
    teal: "bg-teal-50 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400",
    indigo: "bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400",
    orange: "bg-orange-50 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400",
  };

  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 p-4 sm:p-5 text-left"
      >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${colorMap[color]}`}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
        <span className="flex-1 font-bold text-foreground text-sm sm:text-base">{title}</span>
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
            <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-border/50">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Small pill badge ─────────────────────────────────────────────────────────
function Badge({ children, color = "emerald" }) {
  const map = {
    emerald: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300",
    amber: "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300",
    sky: "bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300",
    violet: "bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300",
    rose: "bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${map[color]}`}>
      {children}
    </span>
  );
}

// ─── Feature row (icon + text) ────────────────────────────────────────────────
function FeatureRow({ icon: Icon, iconColor, label, description }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/40 last:border-0">
      <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColor}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>}
      </div>
    </div>
  );
}

// ─── Step card ────────────────────────────────────────────────────────────────
function StepCard({ number, icon: Icon, title, description, color = "emerald" }) {
  const colorMap = {
    emerald: { bg: "bg-emerald-500", ring: "ring-emerald-200 dark:ring-emerald-800", iconBg: "bg-emerald-50 dark:bg-emerald-900/40", iconText: "text-emerald-600 dark:text-emerald-400" },
    amber: { bg: "bg-amber-500", ring: "ring-amber-200 dark:ring-amber-800", iconBg: "bg-amber-50 dark:bg-amber-900/40", iconText: "text-amber-600 dark:text-amber-400" },
    sky: { bg: "bg-sky-500", ring: "ring-sky-200 dark:ring-sky-800", iconBg: "bg-sky-50 dark:bg-sky-900/40", iconText: "text-sky-600 dark:text-sky-400" },
    teal: { bg: "bg-teal-500", ring: "ring-teal-200 dark:ring-teal-800", iconBg: "bg-teal-50 dark:bg-teal-900/40", iconText: "text-teal-600 dark:text-teal-400" },
  };
  const c = colorMap[color];
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/40 last:border-0">
      <div className={`w-7 h-7 rounded-full ${c.bg} flex items-center justify-center flex-shrink-0 text-white font-black text-xs ring-4 ${c.ring} mt-0.5`}>
        {number}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${c.iconBg}`}>
            <Icon className={`w-3 h-3 ${c.iconText}`} />
          </div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// ─── Main Help page ───────────────────────────────────────────────────────────
export default function Help() {
  return (
    <div className="min-h-screen bg-background">

      {/* ─── STICKY HEADER ─── */}
      <div className="sticky top-0 z-[var(--z-page-header)] bg-white/[0.97] dark:bg-gray-950/[0.97] backdrop-blur-xl border-b border-border/60 px-4 sm:px-6 py-3 flex items-center gap-3">
        <Link
          to="/Profile"
          className="w-8 h-8 rounded-xl flex items-center justify-center bg-muted hover:bg-muted/80 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="font-bold text-foreground text-base">Aide & Guide</h1>
        </div>
      </div>

      {/* ─── HERO ─── */}
      <div className="hafiz-gradient-hero relative overflow-hidden pt-safe">
        <div className="absolute inset-0 opacity-[0.035]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff'%3E%3Cpath d='M30 0l8.66 15H21.34L30 0zm0 60l8.66-15H21.34L30 60zM0 30l15-8.66v17.32L0 30zm60 0L45 21.34v17.32L60 30zM30 22.5a7.5 7.5 0 100 15 7.5 7.5 0 000-15z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-8 pb-10 relative text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="w-16 h-16 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-900/20">
              <HelpCircle className="w-8 h-8 text-amber-300" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Guide complet MyHafizz</h2>
            <p className="text-emerald-300/80 text-sm leading-relaxed max-w-sm mx-auto">
              Découvrez toutes les fonctionnalités de l'application pour mémoriser le Coran efficacement.
            </p>
          </motion.div>
        </div>
      </div>

      {/* ─── SECTIONS ─── */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-3 pb-nav">

        {/* ── 1. Comment mémoriser le Coran ── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Section id="memorize" icon={BookOpen} title="📖 Comment mémoriser le Coran" color="emerald" defaultOpen>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              MyHafizz vous guide pas à pas dans votre hifdh grâce à un flow simple en 4 étapes.
            </p>

            <StepCard
              number="1" icon={ListChecks} color="emerald"
              title="Choisir une sourate"
              description="Depuis le Dashboard, appuyez sur « Choisir une sourate » ou accédez à la page SurahList. Filtrez par révélation ou recherchez par nom."
            />
            <StepCard
              number="2" icon={Volume2} color="amber"
              title="Écouter le réciteur"
              description="Sur chaque verset, appuyez sur ▶️ Play pour écouter le réciteur sélectionné dans vos Réglages. Écoutez plusieurs fois pour familiariser votre oreille."
            />
            <StepCard
              number="3" icon={Repeat} color="sky"
              title="Répéter et masquer"
              description="Utilisez le bouton 🔄 Répétition pour répéter automatiquement (1, 2, 3, 5, 10 ou ∞ fois). Masquez le texte arabe avec 👁️ pour vous tester."
            />
            <StepCard
              number="4" icon={CheckCircle2} color="teal"
              title="Marquer comme mémorisé"
              description="Appuyez sur ✅ pour marquer chaque verset comme mémorisé. La barre de progression de la sourate se met à jour automatiquement."
            />

            <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40">
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                💡 La barre de progression globale dans le Dashboard reflète le pourcentage de tout le Coran mémorisé, avec des jalons à 25%, 50% et 75%.
              </p>
            </div>
          </Section>
        </motion.div>

        {/* ── 2. Boutons des versets ── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <Section id="verse-buttons" icon={Sliders} title="🎛️ Les boutons des versets" color="amber">
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              Chaque verset (VerseCard) dispose d'une barre d'actions verticale sur la droite.
            </p>

            <FeatureRow
              icon={Play}
              iconColor="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400"
              label="▶️ Play / Pause"
              description="Écoute le verset avec le réciteur sélectionné dans vos Réglages. Appuyez à nouveau pour mettre en pause."
            />
            <FeatureRow
              icon={Repeat}
              iconColor="bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400"
              label="🔄 Répétition"
              description="Configure le nombre de répétitions : 1, 2, 3, 5, 10 ou ∞. Appuyez longuement pour saisir un nombre personnalisé."
            />
            <FeatureRow
              icon={Heart}
              iconColor="bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400"
              label="❤️ Favoris"
              description="Ajoute ou retire le verset de vos favoris. Retrouvez tous vos favoris dans l'onglet Signets de la navigation."
            />
            <FeatureRow
              icon={MapPin}
              iconColor="bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400"
              label="📍 Marqueur d'arrêt"
              description="Sauvegarde votre position d'écoute. Lors de votre prochaine session, la page reprendra exactement là où vous vous êtes arrêté(e)."
            />
            <FeatureRow
              icon={Eye}
              iconColor="bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400"
              label="👁️ Masquer / Révéler"
              description="Cache le texte arabe du verset pour vous tester. Appuyez à nouveau pour révéler. Idéal pour l'auto-évaluation."
            />
            <FeatureRow
              icon={CheckCircle2}
              iconColor="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400"
              label="✅ Mémorisé"
              description="Marque le verset comme appris. Le cercle devient un ✅ vert et le verset est comptabilisé dans votre progression."
            />

            <div className="mt-4 p-3 bg-muted/60 rounded-xl border border-border/60">
              <p className="text-xs font-semibold text-foreground mb-2">Boutons du header de la page Mémorisation :</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Lecture en boucle</span> — Lit tous les versets en séquence (mode une fois ou infini)</p>
                </div>
                <div className="flex items-center gap-2">
                  <EyeOff className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Masquer tout</span> — Masque ou révèle le texte arabe de tous les versets en une fois</p>
                </div>
              </div>
            </div>
          </Section>
        </motion.div>

        {/* ── 3. Quiz ── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }}>
          <Section id="quiz" icon={Brain} title="🧠 Quiz de mémorisation" color="violet">
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              Testez votre mémorisation avec 3 modes différents. Accessible depuis le menu de navigation ou depuis votre Profil.
            </p>

            <div className="space-y-3 mb-4">
              <div className="p-3 bg-muted/50 rounded-xl border border-border/50">
                <div className="flex items-center gap-2 mb-1">
                  <ListChecks className="w-4 h-4 text-emerald-500" />
                  <p className="text-sm font-semibold text-foreground">Mode QCM</p>
                  <Badge color="emerald">Débutant</Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Choisissez le bon verset parmi 4 options proposées. Idéal pour commencer à vous tester sans pression.
                </p>
              </div>

              <div className="p-3 bg-muted/50 rounded-xl border border-border/50">
                <div className="flex items-center gap-2 mb-1">
                  <PenLine className="w-4 h-4 text-amber-500" />
                  <p className="text-sm font-semibold text-foreground">Mode Écriture</p>
                  <Badge color="amber">Intermédiaire</Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tapez le verset en arabe. L'application calcule un score de correspondance entre votre réponse et le texte correct.
                </p>
              </div>

              <div className="p-3 bg-muted/50 rounded-xl border border-border/50">
                <div className="flex items-center gap-2 mb-1">
                  <Mic className="w-4 h-4 text-sky-500" />
                  <p className="text-sm font-semibold text-foreground">Mode Vocal</p>
                  <Badge color="sky">Avancé</Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Récitez le verset à voix haute. Utilise la reconnaissance vocale du navigateur (disponible sur Chrome/Edge). Accordez l'accès au micro quand demandé.
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200/60 dark:border-amber-800/40 mb-3">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1.5">Système de score :</p>
              <div className="space-y-1">
                {[
                  { label: "Parfait", emoji: "🌟", range: "100%" },
                  { label: "Excellent", emoji: "✅", range: "85–99%" },
                  { label: "Bien", emoji: "👍", range: "70–84%" },
                  { label: "Passable", emoji: "😐", range: "50–69%" },
                  { label: "À retravailler", emoji: "📖", range: "< 50%" },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-xs text-foreground">{s.emoji} {s.label}</span>
                    <span className="text-[11px] text-muted-foreground">{s.range}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              💡 Utilisez l'<span className="font-medium text-foreground">indice (hint)</span> pour afficher les premiers mots du verset si vous êtes bloqué(e).
            </p>
          </Section>
        </motion.div>

        {/* ── 4. Réglages ── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
          <Section id="settings" icon={Settings} title="⚙️ Réglages" color="indigo">
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              Personnalisez l'expérience depuis l'icône ⚙️ en haut de votre Profil. Les réglages sont organisés en 3 onglets.
            </p>

            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Onglet Réglages</p>
            <FeatureRow
              icon={Moon}
              iconColor="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400"
              label="Thème"
              description="Clair, Sombre ou Auto (suit le mode système de votre appareil)"
            />
            <FeatureRow
              icon={Volume2}
              iconColor="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400"
              label="Réciteur"
              description="Choisissez parmi 9 récitateurs : Mishary Al-Afasy, As-Sudais, Al-Husary, Abu Bakr Al-Shatri, Maher Al-Muaiqly, Hani Ar-Rifai, Al-Minshawi, Khalid Al-Qahtani, Ahmad Al-Ajmy"
            />
            <FeatureRow
              icon={Languages}
              iconColor="bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400"
              label="Phonétique"
              description="Affiche ou masque la translittération (prononciation en lettres latines) sous chaque verset"
            />
            <FeatureRow
              icon={BookOpen}
              iconColor="bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400"
              label="Traduction française"
              description="Affiche ou masque la traduction française sous chaque verset"
            />
            <FeatureRow
              icon={ListChecks}
              iconColor="bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400"
              label="Numéros de versets"
              description="Affiche ou masque le numéro de chaque verset dans la sourate"
            />

            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2 mt-4">Onglet Affichage</p>
            <FeatureRow
              icon={Type}
              iconColor="bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400"
              label="Police arabe"
              description="Système (par défaut), Amiri (classique), Scheherazade (élégante)"
            />
            <FeatureRow
              icon={Type}
              iconColor="bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400"
              label="Taille du texte arabe"
              description="Petit / Moyen / Grand — ajuste la taille de la police du texte coranique"
            />
            <FeatureRow
              icon={Sun}
              iconColor="bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400"
              label="Contraste du texte"
              description="Normal ou Élevé — augmente la visibilité du texte arabe pour une lecture plus confortable"
            />
            <FeatureRow
              icon={AlignJustify}
              iconColor="bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400"
              label="Espacement des lignes"
              description="Compact / Normal / Aéré — ajuste l'espacement entre les lignes pour plus de confort"
            />

            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2 mt-4">Onglet Stockage hors-ligne</p>
            <FeatureRow
              icon={Download}
              iconColor="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400"
              label="Télécharger des sourates"
              description="Sélectionnez les sourates à télécharger pour les utiliser sans connexion Internet. Un indicateur de progression s'affiche pendant le téléchargement."
            />
            <FeatureRow
              icon={HardDrive}
              iconColor="bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400"
              label="Gestion du stockage"
              description="Consultez l'espace utilisé sur votre appareil et supprimez les sourates téléchargées si nécessaire."
            />
          </Section>
        </motion.div>


        {/* ── 6. Installation & Hors-ligne ── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.20 }}>
          <Section id="pwa" icon={Smartphone} title="📱 Installation et mode hors-ligne" color="sky">
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              MyHafizz est une PWA (Progressive Web App) : installez-la sur votre écran d'accueil pour une expérience native.
            </p>

            <div className="space-y-3 mb-4">
              <div className="p-3 bg-muted/50 rounded-xl border border-border/50">
                <p className="text-xs font-semibold text-foreground mb-1.5">📱 Android (Chrome)</p>
                <ol className="space-y-1">
                  {[
                    "Ouvrez MyHafizz dans Chrome",
                    "Appuyez sur ⋮ (menu en haut à droite)",
                    "Sélectionnez « Ajouter à l'écran d'accueil »",
                    "Confirmez en appuyant sur « Ajouter »",
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                      <span className="text-xs text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="p-3 bg-muted/50 rounded-xl border border-border/50">
                <p className="text-xs font-semibold text-foreground mb-1.5">🍎 iOS (Safari)</p>
                <ol className="space-y-1">
                  {[
                    "Ouvrez MyHafizz dans Safari",
                    "Appuyez sur l'icône Partager (□ avec flèche)",
                    "Faites défiler et appuyez sur « Sur l'écran d'accueil »",
                    "Confirmez en appuyant sur « Ajouter »",
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                      <span className="text-xs text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Mode hors-ligne :</p>
            <FeatureRow
              icon={Wifi}
              iconColor="bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400"
              label="Sourates téléchargées"
              description="Les sourates que vous avez téléchargées dans les Réglages sont disponibles sans connexion Internet."
            />
            <FeatureRow
              icon={Clock}
              iconColor="bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400"
              label="Synchronisation automatique"
              description="Vos modifications (versets mémorisés, favoris) sont mises en file d'attente hors-ligne et synchronisées automatiquement dès que la connexion revient."
            />
            <FeatureRow
              icon={Wifi}
              iconColor="bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400"
              label="Bannière hors-ligne"
              description="Une bannière s'affiche en haut de l'écran pour vous indiquer que vous êtes hors-ligne."
            />
          </Section>
        </motion.div>

        {/* ── 7. Suivi de progression ── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.23 }}>
          <Section id="progress" icon={TrendingUp} title="📊 Suivi de progression" color="emerald">
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              Suivez votre avancement en temps réel depuis plusieurs endroits dans l'application.
            </p>

            <FeatureRow
              icon={BarChart2}
              iconColor="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400"
              label="Dashboard"
              description="Affiche vos stats principales : versets mémorisés, sourates complètes, sourates en cours, et la barre de progression globale avec jalons à 25%, 50% et 75%."
            />
            <FeatureRow
              icon={Clock}
              iconColor="bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400"
              label="Révisions récentes"
              description="Le Dashboard liste vos 5 dernières sourates révisées avec leur progression, pour reprendre rapidement là où vous en étiez."
            />
            <FeatureRow
              icon={Award}
              iconColor="bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400"
              label="Page Profil"
              description="Vue d'ensemble complète : bague de progression, stats, et un feed de vos accomplissements (sourates complètes en vert, sourates en cours en orange)."
            />
            <FeatureRow
              icon={Bookmark}
              iconColor="bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400"
              label="Signets / Favoris"
              description="Retrouvez tous vos versets favoris dans l'onglet Signets de la navigation. Organisés par sourate pour un accès rapide."
            />
          </Section>
        </motion.div>

        {/* ── 8. Astuces ── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}>
          <Section id="tips" icon={Lightbulb} title="💡 Astuces de mémorisation" color="amber">
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              Conseils pratiques pour optimiser votre hifdh et progresser plus efficacement.
            </p>

            <div className="space-y-2.5">
              {[
                { emoji: "🔁", title: "Répétition minimale ×5", desc: "Répétez chaque verset au moins 5 fois avant de passer au suivant. Utilisez le bouton Répétition pour automatiser cela." },
                { emoji: "👁️", title: "Testez-vous en masquant", desc: "Après avoir écouté et répété, masquez le texte arabe et récitez de mémoire. C'est la méthode la plus efficace." },
                { emoji: "👂", title: "Écouter avant de lire", desc: "Écoutez toujours le verset avec le réciteur avant de le lire vous-même. Cela fixe la mélodie et la prononciation correcte." },
                { emoji: "📍", title: "Utilisez les marqueurs", desc: "Placez un marqueur d'arrêt à chaque fin de session pour reprendre exactement là où vous vous êtes arrêté(e)." },
                { emoji: "🎙️", title: "Variez les récitateurs", desc: "Changez de récitateur dans les Réglages de temps en temps pour vous habituer à différentes prononciations et mélodies." },
                { emoji: "🧠", title: "Quiz réguliers", desc: "Testez-vous avec les Quiz toutes les semaines pour consolider ce que vous avez mémorisé et identifier les versets à retravailler." },
                { emoji: "⏰", title: "Mémorisez à heure fixe", desc: "Créez une routine quotidienne : mémoriser à la même heure chaque jour (ex : après Fajr) améliore la rétention à long terme." },
              ].map((tip, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.02 * i }}
                  className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl border border-border/40"
                >
                  <span className="text-lg flex-shrink-0 mt-0.5">{tip.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{tip.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{tip.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </Section>
        </motion.div>

        {/* Footer note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center py-4"
        >
          <p className="text-xs text-muted-foreground">
            Qu'Allah facilite votre hifdh et bénisse vos efforts. 🤲
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">MyHafizz · Guide v1.0</p>
        </motion.div>

      </div>
    </div>
  );
}
