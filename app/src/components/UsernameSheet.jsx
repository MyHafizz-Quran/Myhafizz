import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, CircleNotch } from "@phosphor-icons/react";
import { db } from "@/api/neonClient";
import { haptic } from "@/hooks/usePlatform";
import { report, userMsg } from "@/lib/report";

const RE = /^[a-z0-9_.]{3,20}$/;
const fmt = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

/** Changer de nom d'utilisateur : vérification en direct, une fois tous les 30 jours. */
export default function UsernameSheet({ info, onClose, onSaved }) {
  const cur = info?.username || "";
  const [v, setV] = useState(cur);
  const [state, setState] = useState("same"); // same | bad | checking | free | taken
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const u = v.trim().toLowerCase().replace(/^@/, "");
  useEffect(() => {
    setErr("");
    if (u === cur) return setState("same");
    if (!RE.test(u)) return setState("bad");
    setState("checking");
    const t = setTimeout(async () => {
      try { const { data } = await db.rpc("username_available", { u }); setState(data ? "free" : "taken"); } catch { setState("free"); }
    }, 350);
    return () => clearTimeout(t);
  }, [u, cur]);
  const locked = info && !info.can_change;
  const save = async () => {
    haptic(); setBusy(true); setErr("");
    const { data, error } = await db.rpc("set_username", { p_username: u });
    setBusy(false);
    if (error) return setErr(userMsg(error, "username:set") || "");
    onSaved?.(data);
  };
  const hint = { bad: "3 à 20 caractères : lettres minuscules, chiffres, point et tiret bas.", taken: "Déjà pris, essaie une autre version.", free: "Disponible", checking: "Vérification…", same: "C'est ton nom actuel." }[state];
  return (
    <motion.div className="fixed inset-0 z-[200] flex items-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-foreground/30" onClick={onClose} />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative w-full max-w-lg mx-auto bg-card rounded-t-3xl p-5 pb-[calc(env(safe-area-inset-bottom,0px)+20px)]">
        <p className="text-lg font-black">Nom d'utilisateur</p>
        <p className="text-sm font-semibold text-muted-foreground mt-1">Tes amis te trouvent et te défient avec ce nom.</p>
        <label className={`mt-4 h-[52px] rounded-2xl border-2 bg-card flex items-center gap-1.5 px-4 ${state === "taken" || state === "bad" ? "border-destructive" : state === "free" ? "border-primary" : "border-border"}`}>
          <span className="font-extrabold text-muted-foreground">@</span>
          <input value={v} disabled={locked} onChange={(e) => setV(e.target.value.toLowerCase().replace(/\s/g, ""))} maxLength={21} autoCapitalize="none" autoCorrect="off" spellCheck={false}
            className="flex-1 min-w-0 bg-transparent outline-none font-extrabold text-[16px]" aria-label="Nom d'utilisateur" />
          {state === "free" && <CheckCircle weight="fill" className="w-6 h-6 text-primary shrink-0" />}
          {(state === "taken" || state === "bad") && <XCircle weight="fill" className="w-6 h-6 text-destructive shrink-0" />}
          {state === "checking" && <CircleNotch weight="bold" className="w-5 h-5 text-muted-foreground animate-spin shrink-0" />}
        </label>
        {!locked && <p className={`text-[13px] font-extrabold mt-1.5 ${state === "free" ? "text-accent-foreground" : state === "taken" || state === "bad" ? "text-destructive" : "text-muted-foreground"}`}>{hint}</p>}
        <div className="rounded-2xl bg-muted p-3.5 mt-3 text-[13px] font-semibold text-muted-foreground leading-relaxed">
          {locked
            ? <>Tu as changé de nom récemment. Tu pourras le changer à nouveau le <b className="text-foreground">{fmt(info.next_at)}</b>.</>
            : <>Tes duels, ligues, tournois et groupes suivent ton compte : rien n'est perdu.{cur ? <> Ton ancien nom @{cur} ne fonctionnera plus pour te défier.</> : null} Après ce changement, tu devras attendre 30 jours pour le modifier à nouveau.</>}
        </div>
        {err && <p className="text-[13px] font-bold text-destructive mt-3">{err}</p>}
        <button disabled={locked || busy || state !== "free"} onClick={save} className="btn-relief w-full h-[50px] mt-4 bg-primary text-primary-foreground disabled:opacity-50">{busy ? "Enregistrement…" : "Enregistrer"}</button>
        <button onClick={onClose} className="w-full h-12 mt-2 font-extrabold text-muted-foreground">Annuler</button>
      </motion.div>
    </motion.div>
  );
}
