import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LockSimple, Backspace, SpinnerGap } from "@phosphor-icons/react";
import { checkPin, disableKidMode } from "@/lib/kidMode";
import { supabase } from "@/api/neonClient";
import { useAuth } from "@/lib/AuthContext";
import { haptic } from "@/hooks/usePlatform";

/** Pavé de 4 chiffres, partagé par l'écran verrouillé et la création du code. */
export function PinPad({ title, sub, onComplete, error, busy }) {
  const [pin, setPin] = useState("");
  useEffect(() => { if (error) setPin(""); }, [error]);
  const press = (d) => {
    if (busy) return;
    haptic();
    const next = (pin + d).slice(0, 4);
    setPin(next);
    if (next.length === 4) setTimeout(() => { onComplete(next); setPin(""); }, 120);
  };
  useEffect(() => {
    const k = (e) => { if (/^\d$/.test(e.key)) press(e.key); else if (e.key === "Backspace") setPin((p) => p.slice(0, -1)); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });
  return (
    <div className="w-full max-w-[320px] mx-auto text-center">
      <p className="text-[22px] font-black">{title}</p>
      {sub && <p className="font-semibold text-muted-foreground mt-1">{sub}</p>}
      <div className="flex justify-center gap-3.5 my-6" aria-label={`${pin.length} chiffres saisis sur 4`}>
        {[0, 1, 2, 3].map((i) => <span key={i} className={`w-4 h-4 rounded-full border-2 ${i < pin.length ? "bg-primary border-primary" : "border-border"}`} />)}
      </div>
      <p className="h-6 text-sm font-bold text-destructive" role="alert">{error}</p>
      <div className="grid grid-cols-3 gap-3 mt-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} onClick={() => press(d)} className="h-16 rounded-2xl border-2 border-border border-b-4 bg-card text-2xl font-black active:translate-y-[2px] active:border-b-2">{d}</button>
        ))}
        <span />
        <button onClick={() => press("0")} className="h-16 rounded-2xl border-2 border-border border-b-4 bg-card text-2xl font-black active:translate-y-[2px] active:border-b-2">0</button>
        <button onClick={() => setPin((p) => p.slice(0, -1))} aria-label="Effacer" className="h-16 rounded-2xl flex items-center justify-center text-muted-foreground">
          {busy ? <SpinnerGap weight="bold" className="w-7 h-7 animate-spin" /> : <Backspace weight="bold" className="w-7 h-7" />}
        </button>
      </div>
    </div>
  );
}

/** Écran affiché à la place des écrans réservés aux parents. */
export function KidLock() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState(null);
  const [forgot, setForgot] = useState(false);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (pin) => {
    const r = await checkPin(pin);
    if (!r.ok) setError(r.wait ? `Trop d'essais. Réessaie dans ${r.wait} secondes.` : "Ce n'est pas le bon code.");
  };
  const reset = async (e) => {
    e.preventDefault(); setBusy(true); setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email: user?.email, password: pw });
    setBusy(false);
    if (err) { setError("Mot de passe incorrect."); return; }
    disableKidMode();
  };

  return (
    <div className="min-h-[80dvh] flex flex-col items-center justify-center px-5 py-10">
      <span className="w-16 h-16 rounded-2xl bg-accent text-primary flex items-center justify-center mb-4"><LockSimple weight="fill" className="w-9 h-9" /></span>
      {!forgot ? (
        <>
          <PinPad title="Espace parent" sub="Demande à un parent de taper le code." onComplete={submit} error={error} />
          <div className="flex gap-6 mt-6">
            <button onClick={() => navigate("/Dashboard")} className="font-extrabold text-primary">Retour</button>
            <button onClick={() => { setForgot(true); setError(null); }} className="font-extrabold text-muted-foreground">Code oublié ?</button>
          </div>
        </>
      ) : (
        <form onSubmit={reset} className="w-full max-w-[340px] text-center">
          <p className="text-[22px] font-black">Code oublié</p>
          <p className="font-semibold text-muted-foreground mt-1">Tape le mot de passe du compte {user?.email} pour désactiver le mode enfant.</p>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" placeholder="Mot de passe"
            className="w-full h-[52px] px-4 mt-5 rounded-2xl border-2 border-border bg-card font-bold focus:outline-none focus:border-primary" required />
          {error && <p className="mt-2 text-sm font-bold text-destructive">{error}</p>}
          <button disabled={busy} className="btn-relief w-full h-[52px] mt-4 bg-primary text-primary-foreground">{busy ? <SpinnerGap weight="bold" className="w-5 h-5 animate-spin" /> : "Désactiver le mode enfant"}</button>
          <button type="button" onClick={() => setForgot(false)} className="mt-3 font-extrabold text-muted-foreground">Retour au code</button>
        </form>
      )}
    </div>
  );
}
