import React, { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Eye, EyeSlash, SpinnerGap, CheckCircle, CaretLeft, Check } from "@phosphor-icons/react";
import { supabase, frAuthError } from "@/api/neonClient";
import { useAuth } from "@/lib/AuthContext";
import MhLogo, { MhWordmark } from "@/components/MhLogo";

/** Google n'apparaît que lorsque l'identifiant OAuth est configuré côté Neon Auth. */
const GOOGLE = import.meta.env.VITE_GOOGLE_AUTH === "1";

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}

const Field = ({ label, children }) => (
  <label className="block">
    <span className="block text-sm font-extrabold mb-1.5">{label}</span>
    {children}
  </label>
);
const inputCls = "w-full h-[52px] px-4 rounded-2xl border-2 border-border bg-card font-bold placeholder:text-muted-foreground focus:outline-none focus:border-primary";

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { syncSession } = useAuth();
  const [mode, setMode] = useState(params.get("mode") === "signup" ? "signup" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const switchMode = (m) => { setMode(m); setError(null); setSuccess(null); setPassword(""); };

  const google = async () => {
    setError(null);
    const redirectTo = `${window.location.origin}/Dashboard`;
    const { error: e } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (e) setError(frAuthError(e));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    if (mode === "signup" && password.length < 8) { setError("Le mot de passe doit contenir au moins 8 caractères."); return; }
    setLoading(true);
    try {
      if (mode === "login") {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) { setError(frAuthError(err)); return; }
        const ok = await syncSession();
        if (ok) navigate("/Dashboard", { replace: true }); else window.location.replace("/Dashboard");
      } else if (mode === "signup") {
        const { error: err } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: name.trim() } } });
        if (err) { setError(frAuthError(err)); return; }
        const ok = await syncSession();
        if (ok) navigate("/Bienvenue", { replace: true });
        else setSuccess("Compte créé. Ouvre le lien reçu par email pour confirmer ton inscription.");
      } else {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
        if (err) { setError(frAuthError(err)); return; }
        setSuccess("Si un compte existe avec cet email, tu vas recevoir un lien pour choisir un nouveau mot de passe.");
      }
    } catch (err) {
      setError(frAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const strong = password.length >= 8;
  const title = mode === "login" ? "Bon retour" : mode === "signup" ? "Crée ton compte" : "Mot de passe oublié";
  const sub = mode === "login" ? "Ta séance du jour t'attend." : mode === "signup" ? "Ta progression sera sauvegardée sur tous tes appareils." : "Indique ton email, on t'envoie un lien.";

  return (
    <div className="min-h-[100dvh] bg-background lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col px-5 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-[calc(env(safe-area-inset-bottom,0px)+20px)] lg:px-16 lg:py-10">
        <div className="flex items-center justify-between">
          {mode === "forgot"
            ? <button onClick={() => switchMode("login")} className="h-10 -ml-1 flex items-center gap-1 font-extrabold text-muted-foreground"><CaretLeft weight="bold" className="w-5 h-5" />Connexion</button>
            : <Link to="/" aria-label="Accueil" className="h-10 flex items-center"><MhWordmark size={28} /></Link>}
        </div>

        <div className="w-full max-w-[420px] mx-auto flex-1 flex flex-col justify-center py-6">
          <h1 className="text-[30px] font-black leading-tight">{title}</h1>
          <p className="font-semibold text-muted-foreground mt-1">{sub}</p>

          {mode !== "forgot" && (
            <div className="grid grid-cols-2 gap-1 p-1 rounded-[14px] bg-muted mt-5">
              {[["login", "Connexion"], ["signup", "Inscription"]].map(([k, l]) => (
                <button key={k} type="button" onClick={() => switchMode(k)} className={`h-10 rounded-[10px] text-sm font-extrabold ${mode === k ? "bg-card text-accent-foreground shadow-[0_2px_0_hsl(var(--border))]" : "text-muted-foreground"}`}>{l}</button>
              ))}
            </div>
          )}

          {GOOGLE && mode !== "forgot" && (
            <>
              <button type="button" onClick={google} className="btn-relief w-full h-[52px] mt-5 bg-card text-foreground border-2 border-border [--relief-color:hsl(var(--border))]">
                <GoogleIcon />{mode === "signup" ? "S'inscrire avec Google" : "Continuer avec Google"}
              </button>
              <div className="flex items-center gap-3 my-4 text-xs font-extrabold uppercase tracking-wider text-muted-foreground"><span className="flex-1 h-0.5 bg-border" />ou avec ton email<span className="flex-1 h-0.5 bg-border" /></div>
            </>
          )}

          {success ? (
            <div className="card-flat p-5 mt-5 text-center">
              <CheckCircle weight="fill" className="w-12 h-12 mx-auto text-primary" />
              <p className="font-bold mt-2">{success}</p>
              <button onClick={() => switchMode("login")} className="mt-3 font-extrabold text-primary">Retour à la connexion</button>
            </div>
          ) : (
            <form onSubmit={submit} className={`space-y-3.5 ${GOOGLE && mode !== "forgot" ? "" : "mt-5"}`}>
              {mode === "signup" && (
                <Field label="Prénom"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" placeholder="Ton prénom" required /></Field>
              )}
              <Field label="Email"><input className={inputCls} type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="toi@exemple.com" required /></Field>
              {mode !== "forgot" && (
                <Field label="Mot de passe">
                  <div className="relative">
                    <input className={`${inputCls} pr-12`} type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                      autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder={mode === "signup" ? "8 caractères minimum" : "Ton mot de passe"} required />
                    <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Masquer" : "Afficher"} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-muted-foreground">
                      {show ? <EyeSlash weight="bold" className="w-5 h-5" /> : <Eye weight="bold" className="w-5 h-5" />}
                    </button>
                  </div>
                  {mode === "signup" && password && (
                    <span className={`mt-1.5 flex items-center gap-1 text-[13px] font-bold ${strong ? "text-primary" : "text-muted-foreground"}`}>{strong && <Check weight="bold" />}{strong ? "Bon mot de passe." : `Encore ${8 - password.length} caractère${8 - password.length > 1 ? "s" : ""}.`} 8 caractères minimum.</span>
                  )}
                </Field>
              )}
              {mode === "login" && (
                <div className="text-right -mt-1"><button type="button" onClick={() => switchMode("forgot")} className="text-sm font-extrabold text-primary">Mot de passe oublié ?</button></div>
              )}
              {error && <p role="alert" className="rounded-xl bg-destructive/10 text-destructive font-bold text-sm px-3.5 py-2.5">{error}</p>}
              <button type="submit" disabled={loading} className="btn-relief w-full h-[52px] bg-primary text-primary-foreground disabled:opacity-70">
                {loading ? <SpinnerGap weight="bold" className="w-5 h-5 animate-spin" /> : mode === "login" ? "Se connecter" : mode === "signup" ? "Créer mon compte" : "Envoyer le lien"}
              </button>
              {mode === "signup" && (
                <p className="text-xs font-semibold text-muted-foreground text-center">En créant un compte, tu acceptes les <Link to="/terms" className="underline">Conditions</Link> et la <Link to="/privacy" className="underline">Politique de confidentialité</Link>.</p>
              )}
            </form>
          )}
        </div>
      </div>

      {/* Ordinateur : verset et promesses à droite */}
      <div className="hidden lg:flex flex-col justify-center bg-accent px-16 border-l-2 border-border">
        <div className="max-w-[460px]">
          <MhLogo size={56} />
          <p className="font-arabic text-[34px] leading-[1.9] text-accent-foreground mt-6" dir="rtl">وَلَقَدْ يَسَّرْنَا ٱلْقُرْءَانَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍ</p>
          <p className="font-bold text-accent-foreground/80 mt-3">« En effet, Nous avons rendu le Coran facile pour la méditation. Y a-t-il quelqu'un pour réfléchir ? »</p>
          <p className="text-sm font-extrabold text-accent-foreground/70 mt-1">Al-Qamar, 17</p>
          <div className="mt-8 space-y-3">
            {["Ta séance sabaq, sabqi, manzil prête chaque jour", "Ta progression synchronisée sur téléphone et ordinateur", "Ton maître ou tes parents peuvent te suivre"].map((t) => (
              <p key={t} className="flex items-center gap-2.5 font-extrabold"><CheckCircle weight="fill" className="w-6 h-6 text-primary shrink-0" />{t}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
