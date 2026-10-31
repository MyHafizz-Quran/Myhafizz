import React, { useState } from "react";
import { db } from "@/api/neonClient";
import { motion } from "framer-motion";
import { Lock, Loader2, CheckCircle2, Eye, EyeOff } from "@/components/icons";
import { useNavigate, Link } from "react-router-dom";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      setLoading(false);
      return;
    }

    const { error } = await db.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

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
          <p className="text-muted-foreground font-semibold text-sm">Réinitialisation du mot de passe</p>
        </div>

        {/* Card */}
        <div className="bg-card border-2 border-border rounded-3xl p-6">
          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3 py-6 text-center"
            >
              <CheckCircle2 className="w-12 h-12 text-primary" />
              <p className="text-foreground font-extrabold">
                Mot de passe mis à jour avec succès !
              </p>
              <button
                onClick={() => navigate("/Dashboard", { replace: true })}
                className="mt-2 h-12 px-6 text-[15px] bg-primary text-primary-foreground font-extrabold rounded-2xl [--relief-color:var(--primary-lip)] shadow-relief active:translate-y-[4px] active:shadow-none transition-[transform,box-shadow] duration-75"
              >
                Accéder au tableau de bord
              </button>
            </motion.div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-black text-foreground">Nouveau mot de passe</h2>
                <p className="text-muted-foreground font-semibold text-sm mt-1">
                  Choisissez un nouveau mot de passe sécurisé pour votre compte.
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                {/* New Password */}
                <div>
                  <label className="block text-sm font-extrabold text-foreground mb-2">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      minLength={6}
                      className="w-full h-12 bg-card border-2 border-border rounded-xl pl-11 pr-11 text-foreground font-semibold placeholder:text-muted-foreground/70 text-[15px] focus:outline-none focus:border-primary transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-muted-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-extrabold text-foreground mb-2">
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      minLength={6}
                      className="w-full h-12 bg-card border-2 border-border rounded-xl pl-11 pr-4 text-foreground font-semibold placeholder:text-muted-foreground/70 text-[15px] focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-destructive text-sm font-semibold bg-destructive/10 border-2 border-destructive/20 rounded-xl px-4 py-3">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-[52px] flex items-center justify-center gap-2 text-base disabled:opacity-60 disabled:cursor-not-allowed bg-primary text-primary-foreground font-extrabold rounded-2xl [--relief-color:var(--primary-lip)] shadow-relief active:translate-y-[4px] active:shadow-none transition-[transform,box-shadow] duration-75"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Mettre à jour le mot de passe"
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Back to login */}
        <div className="text-center mt-6">
          <Link to="/login" className="text-primary font-bold text-xs  transition-colors">
            ← Retour à la connexion
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
