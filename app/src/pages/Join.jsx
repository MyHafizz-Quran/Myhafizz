import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { GraduationCap, House, Users, CheckCircle, WarningCircle, Handshake } from "@phosphor-icons/react";
import { Groups as G, KIND_LABEL } from "@/api/entities";
import { useAuth } from "@/lib/AuthContext";
import MhLogo from "@/components/MhLogo";

const ICON = { class: GraduationCap, family: House, circle: Users, duo: Handshake };
const PROMISE = {
  class: ["Les leçons de ton maître arrivent directement dans l'app", "Il voit ta progression et valide tes récitations", "Révisions préparées chaque jour"],
  family: ["Toute la famille au même endroit", "Les parents suivent la progression des enfants", "Khatma familiale partagée"],
  circle: ["Khatma collective entre amis", "On se motive les uns les autres", "Révisions préparées chaque jour"],
  duo: ["Révisez à deux, sans classement", "Chacun voit la régularité de l'autre", "Un encouragement par jour"],
};

/** Page publique d'invitation : /rejoindre/CODE */
export default function Join() {
  const { code: raw = "" } = useParams();
  const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const [info, setInfo] = useState(undefined);
  const [role, setRole] = useState(() => localStorage.getItem("mh_pending_join_role") || "child");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Sans compte, la base n'est pas lisible : on affiche ce que contient le lien, puis les vraies infos une fois connecté
  const hint = useMemo(() => {
    const q = new URLSearchParams(window.location.search);
    return { name: q.get("g") || "", kind: ["class", "family", "circle", "duo"].includes(q.get("k")) ? q.get("k") : "circle", owner_name: q.get("de") || "", members: null };
  }, []);
  useEffect(() => {
    if (code.length !== 6) { setInfo(null); return; }
    if (isLoadingAuth) return;
    if (!isAuthenticated) { setInfo({ ...hint, name: hint.name || `Groupe ${code}`, guest: true }); return; }
    G.inviteInfo(code).then((r) => setInfo(r || null)).catch(() => setInfo(null));
  }, [code, isAuthenticated, isLoadingAuth, hint]);

  const join = async () => {
    setBusy(true); setErr("");
    try {
      const id = await G.join(code, role);
      localStorage.removeItem("mh_pending_join");
      qc.invalidateQueries({ queryKey: ["groups"] });
      navigate(`/Group?id=${id}`, { replace: true });
    } catch { setErr("Impossible de rejoindre ce groupe pour le moment. Réessaie."); } finally { setBusy(false); }
  };
  const toAuth = (mode) => {
    localStorage.setItem("mh_pending_join", code);
    localStorage.setItem("mh_pending_join_role", role);
    navigate(`/login${mode === "signup" ? "?mode=signup" : ""}`);
  };

  const Icon = info ? ICON[info.kind] || Users : null;
  const n = Number(info?.members || 0);

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <div className="w-full max-w-[460px] mx-auto px-5 flex-1 flex flex-col" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 20px)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)" }}>
        <Link to="/" className="inline-flex items-center gap-2 self-center"><MhLogo size={34} /><span className="font-black text-xl">MyHafizz</span></Link>

        {info === undefined ? (
          <div className="mt-10 h-64 rounded-3xl bg-muted animate-pulse" />
        ) : info === null ? (
          <div className="card-flat p-6 mt-10 text-center">
            <WarningCircle weight="fill" className="w-12 h-12 text-destructive mx-auto" />
            <p className="text-xl font-black mt-2">Invitation introuvable</p>
            <p className="text-sm font-semibold text-muted-foreground mt-1">Le code <b className="tracking-widest">{code || "?"}</b> ne correspond à aucun groupe. Demande un nouveau lien à la personne qui t'a invité.</p>
            <Link to="/" className="btn-relief w-full h-[52px] mt-5 bg-primary text-primary-foreground">Découvrir MyHafizz</Link>
          </div>
        ) : (
          <>
            <div className="card-flat p-5 mt-8 text-center">
              <span className="w-16 h-16 rounded-2xl bg-accent text-primary flex items-center justify-center mx-auto"><Icon weight="fill" className="w-9 h-9" /></span>
              <p className="text-sm font-extrabold text-muted-foreground mt-3">{info.owner_name ? `${info.owner_name} t'invite à rejoindre` : "Tu es invité à rejoindre"}</p>
              <h1 className="text-[26px] leading-tight font-black mt-1 break-words">{info.name}</h1>
              <p className="text-sm font-bold text-accent-foreground mt-1">{KIND_LABEL[info.kind]}{info.members != null ? ` · ${n} membre${n > 1 ? "s" : ""}` : ""} · code <span className="tracking-widest">{code}</span></p>
              <ul className="text-left mt-5 space-y-2.5">
                {(PROMISE[info.kind] || PROMISE.circle).map((t) => (
                  <li key={t} className="flex items-start gap-2.5 font-bold text-[15px]"><CheckCircle weight="fill" className="w-5 h-5 text-primary shrink-0 mt-0.5" />{t}</li>
                ))}
              </ul>
            </div>

            {info.kind === "family" && (
              <div className="mt-4">
                <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mb-2">Je rejoins en tant que</p>
                <div className="grid grid-cols-2 gap-2">
                  {[["child", "Enfant"], ["parent", "Parent"]].map(([r, l]) => (
                    <button key={r} onClick={() => setRole(r)} className={`h-12 rounded-2xl border-2 border-b-4 font-extrabold ${role === r ? "border-primary bg-accent text-primary" : "border-border bg-card"}`}>{l}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-auto pt-6">
              {err && <p className="text-sm font-bold text-destructive mb-3 text-center">{err}</p>}
              {isLoadingAuth ? null : isAuthenticated ? (
                <button disabled={busy} onClick={join} className="btn-relief w-full h-[52px] bg-primary text-primary-foreground">{busy ? "…" : "Rejoindre le groupe"}</button>
              ) : (
                <>
                  <button onClick={() => toAuth("signup")} className="btn-relief w-full h-[52px] bg-primary text-primary-foreground">Créer mon compte et rejoindre</button>
                  <button onClick={() => toAuth("login")} className="btn-relief w-full h-[52px] mt-3 bg-card text-foreground border-2 border-border" style={{ "--relief-color": "hsl(var(--border))" }}>J'ai déjà un compte</button>
                  <p className="text-xs font-semibold text-muted-foreground text-center mt-3">Gratuit · Connexion avec Google ou par email</p>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
