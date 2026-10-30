import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";

const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) &&
  !window.MSStream;

const isInStandaloneMode = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;

export default function InstallPrompt() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  const storageKey = user ? `myhafizz_install_prompt_shown_${user.id}` : null;

  useEffect(() => {
    if (!storageKey) return;
    if (isInStandaloneMode()) return;
    if (localStorage.getItem(storageKey)) return;

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Small delay so the app renders fully before showing the prompt
    const timer = setTimeout(() => setVisible(true), 1500);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      clearTimeout(timer);
    };
  }, [storageKey]);

  const markSeen = () => {
    if (storageKey) localStorage.setItem(storageKey, "1");
    setVisible(false);
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        markSeen();
        return;
      }
      setDeferredPrompt(null);
    } else {
      setShowIOSInstructions(true);
      return;
    }
    markSeen();
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Overlay */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[var(--z-modal)]"
            onClick={markSeen}
          />

          {/* Bottom sheet */}
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-[var(--z-modal)] bg-white dark:bg-gray-900 rounded-t-3xl px-6 pt-4 pb-8 shadow-2xl"
            style={{ maxWidth: 480, margin: "0 auto" }}
          >
            {/* Handle */}
            <div className="mx-auto mb-5 h-[5px] w-12 rounded-full bg-gray-200 dark:bg-gray-700" />

            {/* Logo */}
            <div className="flex justify-center mb-4">
              <img
                src="/logo.svg"
                alt="MyHafizz"
                className="w-[72px] h-[72px] rounded-2xl shadow-lg"
              />
            </div>

            {/* Title */}
            <h2 className="text-center text-xl font-bold text-gray-900 dark:text-white mb-2">
              Installer MyHafizz 📲
            </h2>

            {/* Description + benefits */}
            {!showIOSInstructions ? (
              <>
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                  Accédez à MyHafizz directement depuis votre écran d'accueil pour une expérience rapide, fluide et disponible même hors ligne.
                </p>
                <ul className="mb-6 space-y-2">
                  {[
                    "⚡ Accès instantané sans navigateur",
                    "📴 Fonctionne hors connexion",
                    "🔔 Ne manquez aucun défi",
                  ].map((benefit) => (
                    <li key={benefit} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="mb-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-2xl p-4">
                {isIOS() ? (
                  <ol className="space-y-2 text-sm text-emerald-800 dark:text-emerald-300">
                    <li>1. Ouvrez cette page dans <strong>Safari</strong></li>
                    <li>2. Appuyez sur le bouton <strong>Partager</strong> (⬆️) en bas de l'écran</li>
                    <li>3. Faites défiler et choisissez <strong>Sur l'écran d'accueil</strong> (➕)</li>
                    <li>4. Appuyez sur <strong>Ajouter</strong></li>
                  </ol>
                ) : (
                  <p className="text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed">
                    Dans votre navigateur, ouvrez le menu (⋮) puis{" "}
                    <strong>Ajouter à l'écran d'accueil</strong>.
                  </p>
                )}
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleInstall}
                className="w-full py-3.5 rounded-2xl bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/30 active:opacity-90 transition-opacity"
              >
                Installer l'application
              </button>

              <button
                onClick={markSeen}
                className="w-full py-2.5 text-gray-400 dark:text-gray-500 text-sm active:opacity-70 transition-opacity"
              >
                Plus tard
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
