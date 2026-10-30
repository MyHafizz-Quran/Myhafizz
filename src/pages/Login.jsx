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
    <div className="min-h-screen bg-emerald-950 to-[#071f18] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-4">
              <img src="/logo.svg" alt="MyHafizz" className="w-20 h-20" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-white mb-1">MyHafizz</h1>
          <p className="text-emerald-300/70 text-sm">Mémorisation du Saint Coran</p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-3xl p-8">
          {/* Mode tabs (login / signup) */}
          {mode !== "forgot" && (
            <div className="flex gap-1 bg-white/10 rounded-xl p-1 mb-6">
              {tabs.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => switchMode(key)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                    mode === key
                      ? "bg-white text-emerald-900 shadow-sm"
                      : "text-white/70 hover:text-white"
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
                className="flex items-center gap-1.5 text-emerald-300 text-sm hover:text-emerald-200 transition-colors mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour à la connexion
              </button>
              <h2 className="text-lg font-bold text-white">Mot de passe oublié</h2>
              <p className="text-emerald-300/70 text-sm mt-1">
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
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              <p className="text-white font-semibold">{success}</p>
              <button
                onClick={() => switchMode("login")}
                className="text-emerald-300 text-sm underline"
              >
                Retour à la connexion
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name (signup only) */}
              {mode === "signup" && (
                <div>
                  <label className="block text-xs font-semibold text-emerald-200 mb-1.5">
                    Nom complet <span className="text-white/30 font-normal">(optionnel)</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Votre nom"
                      className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-emerald-400 focus:bg-white/15 transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-emerald-200 mb-1.5">
                  Adresse email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="votre@email.com"
                    className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-emerald-400 focus:bg-white/15 transition-all"
                  />
                </div>
              </div>

              {/* Password (login & signup) */}
              {mode !== "forgot" && (
                <div>
                  <label className="block text-xs font-semibold text-emerald-200 mb-1.5">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      minLength={6}
                      className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-10 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-emerald-400 focus:bg-white/15 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Confirm Password (signup only) */}
              {mode === "signup" && (
                <div>
                  <label className="block text-xs font-semibold text-emerald-200 mb-1.5">
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      minLength={6}
                      className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-emerald-400 focus:bg-white/15 transition-all"
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
                    className="text-emerald-300/70 text-xs hover:text-emerald-300 transition-colors"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              )}

              {error && (
                <p className="text-red-300 text-xs bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-2.5">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-400 text-emerald-950 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
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
                <p className="text-center text-white/50 text-xs mt-2">
                  Pas encore de compte ?{" "}
                  <button type="button" onClick={() => switchMode("signup")} className="text-emerald-300 hover:underline">
                    S'inscrire
                  </button>
                </p>
              )}
              {mode === "signup" && (
                <p className="text-center text-white/50 text-xs mt-2">
                  Déjà un compte ?{" "}
                  <button type="button" onClick={() => switchMode("login")} className="text-emerald-300 hover:underline">
                    Se connecter
                  </button>
                </p>
              )}
            </form>
          )}
        </div>

        {/* Back to landing */}
        <div className="text-center mt-6">
          <Link to="/" className="text-emerald-300/50 text-xs hover:text-emerald-300 transition-colors">
            ← Retour à l'accueil
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
