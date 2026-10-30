import React, { useState } from "react";
import { supabase } from "@/api/neonClient";
import { motion } from "framer-motion";
import { Mail, Lock, Loader2, CheckCircle2, User, Eye, EyeOff, ArrowLeft } from "@/components/icons";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // "login" | "signup" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setFullName("");
    setError(null);
    setSuccess(null);
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    resetForm();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else {
      navigate("/Dashboard", { replace: true });
    }
    setLoading(false);
  };

  const handleSignup = async (e) => {
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

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    if (error) {
      setError(error.message);
    } else {
      setSuccess("Compte créé ! Vérifiez votre email pour confirmer votre inscription.");
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://myhafizz.com/reset-password",
    });
    if (error) {
      setError(error.message);
    } else {
      setSuccess("Un email de réinitialisation a été envoyé ! Vérifiez votre boîte de réception.");
    }
    setLoading(false);
  };

  const handleSubmit =
    mode === "login" ? handleLogin : mode === "signup" ? handleSignup : handleForgotPassword;

  const tabs = [
    { key: "login", label: "Connexion" },
    { key: "signup", label: "Inscription" },
  ];

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
          <p className="text-muted-foreground font-semibold text-sm">Mémorisation du Saint Coran</p>
        </div>

        {/* Card */}
        <div className="bg-card border-2 border-border rounded-3xl p-6">
          {/* Mode tabs (login / signup) */}
          {mode !== "forgot" && (
            <div className="flex gap-1 bg-muted rounded-xl p-1 mb-6">
              {tabs.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => switchMode(key)}
                  className={`flex-1 h-10 text-sm font-extrabold rounded-lg transition-all ${
                    mode === key
                      ? "bg-card text-primary border-2 border-border"
                      : "text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Forgot password header */}
          {mode === "forgot" && (
            <div className="mb-6">
              <button
                onClick={() => switchMode("login")}
                className="flex items-center gap-1.5 text-primary font-bold text-sm  transition-colors mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour à la connexion
              </button>
              <h2 className="text-xl font-black text-foreground">Mot de passe oublié</h2>
              <p className="text-muted-foreground font-semibold text-sm mt-1">
                Entrez votre adresse email pour recevoir un lien de réinitialisation.
              </p>
            </div>
          )}

          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3 py-6 text-center"
            >
              <CheckCircle2 className="w-12 h-12 text-primary" />
              <p className="text-foreground font-extrabold">{success}</p>
              <button
                onClick={() => switchMode("login")}
                className="text-primary font-bold text-sm underline"
              >
                Retour à la connexion
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name (signup only) */}
              {mode === "signup" && (
                <div>
                  <label className="block text-sm font-extrabold text-foreground mb-2">
                    Nom complet <span className="text-muted-foreground font-semibold">(optionnel)</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Votre nom"
                      className="w-full h-12 bg-card border-2 border-border rounded-xl pl-11 pr-4 text-foreground font-semibold placeholder:text-muted-foreground/70 text-[15px] focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-extrabold text-foreground mb-2">
                  Adresse email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="votre@email.com"
                    className="w-full h-12 bg-card border-2 border-border rounded-xl pl-11 pr-4 text-foreground font-semibold placeholder:text-muted-foreground/70 text-[15px] focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              {/* Password (login & signup) */}
              {mode !== "forgot" && (
                <div>
                  <label className="block text-sm font-extrabold text-foreground mb-2">
                    Mot de passe
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
              )}

              {/* Confirm Password (signup only) */}
              {mode === "signup" && (
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
              )}

              {/* Forgot password link (login only) */}
              {mode === "login" && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="text-primary font-bold text-xs  transition-colors"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              )}

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
                  <>
                    {mode === "login" && "Se connecter"}
                    {mode === "signup" && "Créer un compte"}
                    {mode === "forgot" && "Envoyer le lien"}
                  </>
                )}
              </button>

              {/* Bottom links */}
              {mode === "login" && (
                <p className="text-center text-muted-foreground text-xs mt-2">
                  Pas encore de compte ?{" "}
                  <button type="button" onClick={() => switchMode("signup")} className="text-primary font-bold hover:underline">
                    S'inscrire
                  </button>
                </p>
              )}
              {mode === "signup" && (
                <p className="text-center text-muted-foreground text-xs mt-2">
                  Déjà un compte ?{" "}
                  <button type="button" onClick={() => switchMode("login")} className="text-primary font-bold hover:underline">
                    Se connecter
                  </button>
                </p>
              )}
            </form>
          )}
        </div>

        {/* Back to landing */}
        <div className="text-center mt-6">
          <Link to="/" className="text-primary font-bold text-xs  transition-colors">
            ← Retour à l'accueil
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
