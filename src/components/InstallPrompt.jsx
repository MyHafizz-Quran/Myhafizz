import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { Lightning, WifiSlash, Bell } from "@phosphor-icons/react";

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
            className="fixed bottom-0 left-0 right-0 z-[var(--z-modal)] bg-card rounded-t-3xl px-6 pt-4 pb-[calc(env(safe-area-inset-bottom,0px)+24px)]"
            style={{ maxWidth: 480, margin: "0 auto" }}
          >
            {/* Handle */}
            <div className="mx-auto mb-5 h-[5px] w-12 rounded-full bg-border" />

            {/* Logo */}
            <div className="flex justify-center mb-4">
              <img
                src="/logo.svg"
                alt="MyHafizz"
                className="w-[72px] h-[72px] rounded-2xl shadow-lg"
              />
            </div>

            {/* Title */}
            <h2 className="text-center text-xl font-bold text-foreground font-extrabold mb-2">
              Installer MyHafizz
            </h2>

            {/* Description + benefits */}
            {!showIOSInstructions ? (
              <>
                <p className="text-center text-sm text-muted-foreground mb-4 leading-relaxed">
                  Accédez à MyHafizz directement depuis votre écran d'accueil pour une expérience rapide, fluide et disponible même hors ligne.
                </p>
                <ul className="mb-6 space-y-2">
                  {[
                    [Lightning, "Accès instantané sans navigateur"],
                    [WifiSlash, "Fonctionne hors connexion"],
                    [Bell, "Rappels pour tes révisions"],
                  ].map(([Icon, benefit]) => (
                    <li key={benefit} className="flex items-center gap-2.5 text-sm font-semibold text-muted-foreground">
                      <Icon weight="fill" className="w-5 h-5 text-primary shrink-0" /><span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="mb-6 bg-accent border-2 border-primary/20 rounded-2xl p-4">
                {isIOS() ? (
                  <ol className="space-y-2 text-sm text-foreground">
                    <li>1. Ouvrez cette page dans <strong>Safari</strong></li>
                    <li>2. Appuyez sur le bouton <strong>Partager</strong> (⬆️) en bas de l'écran</li>
                    <li>3. Faites défiler et choisissez <strong>Sur l'écran d'accueil</strong> (➕)</li>
                    <li>4. Appuyez sur <strong>Ajouter</strong></li>
                  </ol>
                ) : (
                  <p className="text-sm text-foreground leading-relaxed">
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
                className="btn-relief w-full h-[52px] bg-primary text-primary-foreground"
              >
                Installer l'application
              </button>

              <button
                onClick={markSeen}
                className="w-full py-3 mt-1 text-primary font-extrabold uppercase tracking-wide text-sm"
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
