import React, { useState, useEffect } from "react";
import { supabase } from "@/api/neonClient";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, ArrowRight } from "@/components/icons";
import { useNavigate, Link } from "react-router-dom";

export default function ConfirmEmail() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); // "loading" | "success" | "error"
  const [errorMessage, setErrorMessage] = useState("");
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Supabase gère automatiquement le token dans le hash fragment
    // On écoute le changement d'état d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        setStatus("success");
      }
    });

    // Vérifier si on a déjà une session (le token a été traité)
    const checkSession = async () => {
      // Petit délai pour laisser Supabase traiter le hash
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        setStatus("error");
        setErrorMessage(error.message);
        return;
      }
      
      if (session) {
        setStatus("success");
      } else {
        // Vérifier si c'est une erreur dans les params
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const errorDesc = hashParams.get("error_description");
        if (errorDesc) {
          setStatus("error");
          setErrorMessage(errorDesc);
        } else {
          // Attendre encore un peu
          await new Promise(resolve => setTimeout(resolve, 2000));
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession) {
            setStatus("success");
          } else {
            setStatus("error");
            setErrorMessage("Le lien de confirmation a expiré ou est invalide.");
          }
        }
      }
    };

    checkSession();

    return () => subscription.unsubscribe();
  }, []);

  // Countdown et redirection auto après succès
  useEffect(() => {
    if (status !== "success") return;
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/Dashboard", { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, navigate]);

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center px-5 pt-safe pb-safe">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md my-auto py-8"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-4">
              <img src="/logo.svg" alt="MyHafizz" className="w-20 h-20" />
            </div>
          </Link>
          <h1 className="text-[26px] font-black text-foreground mb-1">MyHafizz</h1>
          <p className="text-muted-foreground font-semibold text-sm">Confirmation de votre compte</p>
        </div>

        {/* Card */}
        <div className="bg-card border-2 border-border rounded-3xl p-6">
          
          {/* État : Loading */}
          {status === "loading" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4 py-8 text-center"
            >
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <div>
                <p className="text-foreground font-extrabold text-lg">Confirmation en cours...</p>
                <p className="text-muted-foreground font-semibold text-sm mt-1">Veuillez patienter quelques instants</p>
              </div>
            </motion.div>
          )}

          {/* État : Succès */}
          {status === "success" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="flex flex-col items-center gap-4 py-6 text-center"
            >
              {/* Cercle de succès animé */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
                className="w-20 h-20 bg-accent rounded-full flex items-center justify-center relative"
              >
                <CheckCircle2 className="w-10 h-10 text-primary" />
                {/* Confettis emoji */}
                <motion.span
                  initial={{ opacity: 0, y: 0 }}
                  animate={{ opacity: [0, 1, 1, 0], y: -30, x: -20 }}
                  transition={{ delay: 0.5, duration: 1.5 }}
                  className="absolute text-2xl"
                  style={{ top: "-10px", left: "-10px" }}
                >🌟</motion.span>
                <motion.span
                  initial={{ opacity: 0, y: 0 }}
                  animate={{ opacity: [0, 1, 1, 0], y: -25, x: 20 }}
                  transition={{ delay: 0.7, duration: 1.5 }}
                  className="absolute text-2xl"
                  style={{ top: "-10px", right: "-10px" }}
                >🎉</motion.span>
                <motion.span
                  initial={{ opacity: 0, y: 0 }}
                  animate={{ opacity: [0, 1, 1, 0], y: -20 }}
                  transition={{ delay: 0.9, duration: 1.5 }}
                  className="absolute text-xl"
                  style={{ top: "-15px" }}
                >📖</motion.span>
              </motion.div>

              <div>
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-foreground font-black text-xl"
                >
                  Compte confirmé !
                </motion.p>
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-muted-foreground font-semibold text-sm mt-2 leading-relaxed"
                >
                  Bienvenue dans votre parcours de mémorisation du Saint Coran. 
                  Qu'Allah vous facilite !
                </motion.p>
              </div>

              {/* Barre de progression redirection */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="w-full mt-2"
              >
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <motion.div
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: 5, ease: "linear" }}
                    className="h-full bg-primary rounded-full"
                  />
                </div>
                <p className="text-muted-foreground font-semibold text-xs mt-2">
                  Redirection dans {countdown}s...
                </p>
              </motion.div>

              {/* Bouton accès direct */}
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                onClick={() => navigate("/Dashboard", { replace: true })}
                className="mt-2 inline-flex items-center gap-2 h-12 px-8 text-[15px] bg-primary text-primary-foreground font-extrabold rounded-2xl [--relief-color:var(--primary-lip)] shadow-relief active:translate-y-[4px] active:shadow-none transition-[transform,box-shadow] duration-75"
              >
                Accéder au tableau de bord
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </motion.div>
          )}

          {/* État : Erreur */}
          {status === "error" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4 py-6 text-center"
            >
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
                <XCircle className="w-8 h-8 text-destructive" />
              </div>
              <div>
                <p className="text-foreground font-extrabold text-lg">Erreur de confirmation</p>
                <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                  {errorMessage || "Le lien de confirmation est invalide ou a expiré."}
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full mt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 h-12 px-6 text-[15px] bg-primary text-primary-foreground font-extrabold rounded-2xl [--relief-color:var(--primary-lip)] shadow-relief active:translate-y-[4px] active:shadow-none transition-[transform,box-shadow] duration-75"
                >
                  Se connecter
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/"
                  className="text-primary font-bold text-sm  transition-colors"
                >
                  Retour à l'accueil
                </Link>
              </div>
            </motion.div>
          )}

        </div>

        {/* Footer */}
        <p className="text-center text-muted-foreground font-semibold text-xs mt-6">
          بسم الله الرحمن الرحيم
        </p>
      </motion.div>
    </div>
  );
}
