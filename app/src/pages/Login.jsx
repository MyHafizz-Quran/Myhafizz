import React, { useEffect, useRef, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Eye, EyeSlash, SpinnerGap, CheckCircle, CaretLeft, Check, EnvelopeOpen, UserCircle, X } from "@phosphor-icons/react";
import { db, frAuthError } from "@/api/neonClient";
import { useAuth } from "@/lib/AuthContext";
import { Profile, usernameAvailable, pendingProfile, cleanUsername, USERNAME_RE } from "@/api/entities";
import MhLogo, { MhWordmark } from "@/components/MhLogo";

/** Connexion Google (fournisseur intégré de Neon Auth). VITE_GOOGLE_AUTH=0 pour la masquer. */
const GOOGLE = import.meta.env.VITE_GOOGLE_AUTH !== "0";

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

const Field = ({ label, hint, children }) => (
  <label className="block">
    <span className="block text-sm font-extrabold mb-1.5">{label}</span>
    {children}
    {hint}
  </label>
);
const inputCls = "w-full h-[52px] px-4 rounded-2xl border-2 border-border bg-card font-bold placeholder:text-muted-foreground focus:outline-none focus:border-primary";
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
const mask = (e) => { const [a, d] = e.split("@"); return d ? `${a.slice(0, 1)}***@${d}` : e; };

/** Saisie d'un code à 6 chiffres (collage accepté, remplissage auto iOS/Android). */
function CodeInput({ value, onChange, onComplete }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div className="relative mt-5" onClick={() => ref.current?.focus()}>
      <input ref={ref} value={value} inputMode="numeric" autoComplete="one-time-code" maxLength={6} aria-label="Code à 6 chiffres"
        onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 6); onChange(v); if (v.length === 6) onComplete?.(v); }}
        className="absolute inset-0 opacity-0" />
      <div className="grid grid-cols-6 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`h-14 rounded-2xl border-2 bg-card flex items-center justify-center text-2xl font-black ${i === value.length ? "border-primary" : "border-border"}`}>{value[i] || ""}</div>
        ))}
      </div>
    </div>
  );
}

function Steps({ n, of }) {
  return (
    <div className="flex items-center gap-1.5 flex-1">
      {Array.from({ length: of }).map((_, i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i < n ? "bg-primary" : "bg-border"}`} />)}
      <span className="ml-1.5 text-xs font-extrabold text-muted-foreground">{n}/{of}</span>
    </div>
  );
}

function EmailChip({ email, onEdit }) {
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-2xl border-2 border-border bg-card">
      <UserCircle weight="fill" className="w-6 h-6 text-primary shrink-0" />
      <span className="flex-1 min-w-0 truncate font-extrabold text-sm">{email}</span>
      <button type="button" onClick={onEdit} className="text-sm font-extrabold text-primary">Modifier</button>
    </div>
  );
}

function Password({ value, onChange, signup, autoFocus }) {
  const [show, setShow] = useState(false);
  const strong = value.length >= 8;
  return (
    <Field label="Mot de passe" hint={signup && value && (
      <span className={`mt-1.5 flex items-center gap-1 text-[13px] font-bold ${strong ? "text-primary" : "text-muted-foreground"}`}>{strong && <Check weight="bold" />}{strong ? "Bon mot de passe." : `Encore ${8 - value.length} caractère${8 - value.length > 1 ? "s" : ""}.`} 8 caractères minimum.</span>
    )}>
      <div className="relative">
        <input className={`${inputCls} pr-12`} type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} autoFocus={autoFocus}
          autoComplete={signup ? "new-password" : "current-password"} placeholder={signup ? "8 caractères minimum" : "Ton mot de passe"} required />
        <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Masquer" : "Afficher"} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-muted-foreground">
          {show ? <EyeSlash weight="bold" className="w-5 h-5" /> : <Eye weight="bold" className="w-5 h-5" />}
        </button>
      </div>
    </Field>
  );
}

/**
 * Connexion et inscription par étapes.
 * Connexion : e-mail → mot de passe (→ code si l'adresse n'est pas encore confirmée).
 * Inscription : nom complet + nom d'utilisateur + e-mail → mot de passe → code reçu par e-mail.
 * Mot de passe oublié : e-mail → code + nouveau mot de passe.
 */
export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { syncSession } = useAuth();
  const [mode, setMode] = useState(params.get("mode") === "signup" ? "signup" : "login");
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [userState, setUserState] = useState(null); // null | "checking" | "free" | "taken" | "format"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [terms, setTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [wait, setWait] = useState(0);

  useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait(wait - 1), 1000); return () => clearTimeout(t); }, [wait]);

  // Vérification du nom d'utilisateur pendant la saisie
  useEffect(() => {
    if (mode !== "signup") return;
    const u = cleanUsername(username);
    if (!u) { setUserState(null); return; }
    if (!USERNAME_RE.test(u)) { setUserState("format"); return; }
    setUserState("checking");
    const t = setTimeout(async () => {
      const ok = await usernameAvailable(u);
      setUserState(ok === false ? "taken" : "free");
    }, 400);
    return () => clearTimeout(t);
  }, [username, mode]);

  const go = (m, s = 0) => { setMode(m); setStep(s); setError(null); setInfo(null); setCode(""); if (m !== mode) setPassword(""); };
  const back = () => { setError(null); setInfo(null); setCode(""); if (step > 0) setStep(step - 1); else if (mode === "forgot") go("login", 1); };

  const google = async () => {
    setError(null);
    const { error: e } = await db.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/Dashboard` } });
    if (e) setError(frAuthError(e));
  };

  const run = async (fn) => {
    setLoading(true); setError(null);
    try { await fn(); } catch (err) { setError(frAuthError(err)); } finally { setLoading(false); }
  };

  /** Après confirmation du compte : nom complet et nom d'utilisateur dans le profil, puis onboarding. */
  const finishSignup = async () => {
    const ok = await syncSession();
    if (!ok) { go("login", 1); setInfo("Adresse confirmée. Connecte-toi avec ton mot de passe."); return; }
    const p = pendingProfile.take(email.trim().toLowerCase());
    if (p) {
      try { await Profile.update({ full_name: p.full_name, username: p.username }); }
      catch { /* nom déjà pris entre-temps : il sera redemandé dans l'onboarding */ }
      db.auth.updateUser({ data: { full_name: p.full_name } }).catch(() => {});
    }
    navigate("/Bienvenue", { replace: true });
  };

  const submit = (e) => {
    e.preventDefault();
    const mail = email.trim().toLowerCase();
    if (mode === "login" && step === 0) {
      if (!emailOk(mail)) { setError("Cette adresse e-mail n'est pas valide."); return; }
      setError(null); setStep(1); return;
    }
    if (mode === "login" && step === 1) return run(async () => {
      const { error: err } = await db.auth.signInWithPassword({ email: mail, password });
      if (err) {
        const m = String(err.message || "").toLowerCase();
        if (m.includes("not verified") || m.includes("email_not_verified") || m.includes("verify")) {
          // Adresse jamais confirmée : Neon Auth vient d'envoyer un code.
          setMode("signup"); setStep(2); setWait(45); setInfo(null); return;
        }
        throw err;
      }
      const ok = await syncSession();
      if (ok) navigate("/Dashboard", { replace: true }); else window.location.replace("/Dashboard");
    });
    if (mode === "signup" && step === 0) {
      if (name.trim().split(/\s+/).length < 2) { setError("Indique ton prénom et ton nom."); return; }
      if (userState === "format") { setError("Nom d'utilisateur : 3 à 20 caractères, lettres minuscules, chiffres, point ou tiret bas."); return; }
      if (userState === "taken") { setError("Ce nom d'utilisateur est déjà pris."); return; }
      if (!cleanUsername(username)) { setError("Choisis un nom d'utilisateur."); return; }
      if (!emailOk(mail)) { setError("Cette adresse e-mail n'est pas valide."); return; }
      setError(null); setStep(1); return;
    }
    if (mode === "signup" && step === 1) {
      if (password.length < 8) { setError("Le mot de passe doit contenir au moins 8 caractères."); return; }
      if (!terms) { setError("Accepte les conditions pour créer ton compte."); return; }
      return run(async () => {
        if ((await usernameAvailable(username)) === false) { setStep(0); setUserState("taken"); throw new Error("Ce nom d'utilisateur vient d'être pris. Choisis-en un autre."); }
        pendingProfile.set({ email: mail, full_name: name.trim(), username: cleanUsername(username) });
        const { error: err } = await db.auth.signUp({ email: mail, password, options: { data: { full_name: name.trim() } } });
        if (err) throw err;
        setStep(2); setWait(45);
      });
    }
    if (mode === "signup" && step === 2) return verify(code);
    if (mode === "forgot" && step === 0) return run(async () => {
      if (!emailOk(mail)) throw new Error("Cette adresse e-mail n'est pas valide.");
      await db.auth.sendCode(mail, "forget-password");
      setStep(1); setWait(45); setCode(""); setPassword("");
    });
    if (mode === "forgot" && step === 1) return run(async () => {
      if (code.length !== 6) throw new Error("Saisis les 6 chiffres du code.");
      if (password.length < 8) throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
      const { error: err } = await db.auth.resetWithCode(mail, code, password);
      if (err) throw err;
      const { error: e2 } = await db.auth.signInWithPassword({ email: mail, password });
      if (e2) { go("login", 1); setInfo("Mot de passe changé. Connecte-toi."); return; }
      const ok = await syncSession();
      if (ok) navigate("/Dashboard", { replace: true }); else window.location.replace("/Dashboard");
    });
  };

  const verify = (c) => run(async () => {
    if (c.length !== 6) throw new Error("Saisis les 6 chiffres du code.");
    const { error: err } = await db.auth.verifySignupCode(email.trim().toLowerCase(), c);
    if (err) { setCode(""); throw err; }
    await finishSignup();
  });

  const resend = () => run(async () => {
    const { error: err } = await db.auth.sendCode(email.trim().toLowerCase(), mode === "forgot" ? "forget-password" : "email-verification");
    if (err) throw err;
    setWait(45); setInfo("Nouveau code envoyé.");
  });

  const isCode = (mode === "signup" && step === 2);
  const total = mode === "forgot" ? 2 : mode === "signup" ? 3 : 2;
  const title = mode === "login" ? (step === 0 ? "Content de te revoir" : "Ton mot de passe")
    : mode === "signup" ? (step === 0 ? "Crée ton compte" : step === 1 ? "Choisis un mot de passe" : "Confirme ton e-mail")
    : step === 0 ? "Mot de passe oublié" : "Nouveau mot de passe";
  const sub = mode === "login" && step === 0 ? "Connecte-toi pour continuer ta mémorisation."
    : mode === "signup" && step === 0 ? "Ta progression sera sauvegardée sur tous tes appareils."
    : mode === "forgot" && step === 0 ? "On t'envoie un code à 6 chiffres pour en choisir un nouveau."
    : null;
  const cta = mode === "login" ? (step === 0 ? "Continuer" : "Se connecter")
    : mode === "signup" ? (step === 0 ? "Continuer" : step === 1 ? "Créer mon compte" : "Valider et commencer")
    : step === 0 ? "Recevoir un code" : "Enregistrer et me connecter";
  const userHint = { checking: ["Vérification…", "text-muted-foreground"], free: ["Disponible", "text-primary"], taken: ["Déjà pris", "text-destructive"], format: ["3 à 20 caractères : a-z, 0-9, point ou tiret bas", "text-muted-foreground"] }[userState];

  return (
    <div className="min-h-[100dvh] bg-background lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col px-5 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-[calc(env(safe-area-inset-bottom,0px)+20px)] lg:px-16 lg:py-10">
        <div className="flex items-center gap-3 h-10">
          {(step > 0 || mode === "forgot")
            ? <button onClick={back} aria-label="Retour" className="h-10 -ml-1 flex items-center text-muted-foreground"><CaretLeft weight="bold" className="w-6 h-6" /></button>
            : <Link to="/" aria-label="Accueil" className="h-10 flex items-center"><MhWordmark size={28} /></Link>}
          {(step > 0 || mode !== "login") && <Steps n={step + 1} of={total} />}
        </div>

        <div className="w-full max-w-[420px] mx-auto flex-1 flex flex-col justify-center py-6">
          {isCode && (
            <div className="w-16 h-16 rounded-[20px] bg-accent border-2 border-primary flex items-center justify-center shadow-[0_4px_0_var(--primary-lip)] mb-4">
              <EnvelopeOpen weight="bold" className="w-8 h-8 text-accent-foreground" />
            </div>
          )}
          <h1 className="text-[30px] font-black leading-tight">{title}</h1>
          {sub && <p className="font-semibold text-muted-foreground mt-1">{sub}</p>}
          {isCode && <p className="font-semibold text-muted-foreground mt-1">Code à 6 chiffres envoyé à <span className="font-extrabold text-foreground">{mask(email.trim())}</span>. Pense à regarder dans les spams.</p>}

          {step === 0 && mode !== "forgot" && GOOGLE && (
            <>
              <button type="button" onClick={google} className="btn-relief w-full h-[52px] mt-5 bg-card text-foreground border-2 border-border [--relief-color:hsl(var(--border))]">
                <GoogleIcon />{mode === "signup" ? "S'inscrire avec Google" : "Continuer avec Google"}
              </button>
              <div className="flex items-center gap-3 my-4 text-xs font-extrabold uppercase tracking-wider text-muted-foreground"><span className="flex-1 h-0.5 bg-border" />ou<span className="flex-1 h-0.5 bg-border" /></div>
            </>
          )}

          <form onSubmit={submit} className={`space-y-3.5 ${step === 0 && mode !== "forgot" && GOOGLE ? "" : "mt-5"}`} noValidate>
            {mode === "signup" && step === 0 && (
              <>
                <Field label="Nom complet"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Prénom et nom" autoFocus /></Field>
                <Field label="Nom d'utilisateur" hint={userHint && <span className={`mt-1.5 flex items-center gap-1 text-[13px] font-bold ${userHint[1]}`}>{userState === "free" && <Check weight="bold" />}{userState === "taken" && <X weight="bold" />}{userHint[0]}</span>}>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-extrabold text-muted-foreground">@</span>
                    <input className={`${inputCls} pl-9`} value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))} autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" placeholder="ibrahim.k" maxLength={20} />
                  </div>
                </Field>
              </>
            )}
            {step === 0 && (
              <Field label="Adresse e-mail"><input className={inputCls} type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="toi@exemple.com" autoFocus={mode !== "signup"} /></Field>
            )}
            {((mode === "login" && step === 1) || (mode === "signup" && step === 1) || (mode === "forgot" && step === 1)) && (
              <EmailChip email={email.trim()} onEdit={() => { setStep(0); setError(null); }} />
            )}
            {mode === "login" && step === 1 && (
              <>
                <Password value={password} onChange={setPassword} autoFocus />
                <div className="text-right -mt-1"><button type="button" onClick={() => go("forgot")} className="text-sm font-extrabold text-primary">Mot de passe oublié ?</button></div>
              </>
            )}
            {mode === "signup" && step === 1 && (
              <>
                <Password value={password} onChange={setPassword} signup autoFocus />
                <label className="flex items-start gap-2.5 text-[13px] font-semibold text-muted-foreground">
                  <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5 w-5 h-5 accent-[hsl(var(--primary))]" />
                  <span>J'accepte les <Link to="/terms" className="underline">conditions d'utilisation</Link> et la <Link to="/privacy" className="underline">politique de confidentialité</Link>.</span>
                </label>
              </>
            )}
            {isCode && <CodeInput value={code} onChange={setCode} onComplete={verify} />}
            {mode === "forgot" && step === 1 && (
              <>
                <p className="text-sm font-bold text-muted-foreground">Code reçu par e-mail</p>
                <CodeInput value={code} onChange={setCode} />
                <Password value={password} onChange={setPassword} signup />
              </>
            )}

            {info && <p className="rounded-xl bg-accent text-accent-foreground font-bold text-sm px-3.5 py-2.5 flex items-center gap-2"><CheckCircle weight="fill" className="w-5 h-5 shrink-0" />{info}</p>}
            {error && <p role="alert" className="rounded-xl bg-destructive/10 text-destructive font-bold text-sm px-3.5 py-2.5">{error}</p>}
            <button type="submit" disabled={loading} className="btn-relief w-full h-[52px] bg-primary text-primary-foreground disabled:opacity-70">
              {loading ? <SpinnerGap weight="bold" className="w-5 h-5 animate-spin" /> : cta}
            </button>
            {(isCode || (mode === "forgot" && step === 1)) && (
              <p className="text-center text-sm font-bold text-muted-foreground">
                {wait > 0 ? `Renvoyer le code dans 0:${String(wait).padStart(2, "0")}` : <button type="button" onClick={resend} className="font-extrabold text-primary">Renvoyer le code</button>}
              </p>
            )}
          </form>

          {step === 0 && mode !== "forgot" && (
            <p className="mt-6 pt-4 border-t-2 border-border text-center text-sm font-bold text-muted-foreground">
              {mode === "login" ? "Pas de compte ?" : "Déjà un compte ?"}{" "}
              <button onClick={() => go(mode === "login" ? "signup" : "login")} className="font-extrabold text-primary">{mode === "login" ? "Créer un compte" : "Se connecter"}</button>
            </p>
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
