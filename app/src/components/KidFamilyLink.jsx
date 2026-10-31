import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { HouseLine, CheckCircle, SpinnerGap } from "@phosphor-icons/react";
import { Groups } from "@/api/entities";
import { haptic } from "@/hooks/usePlatform";

/**
 * Relie le compte de l'enfant à un groupe Famille, pour que le parent suive sa progression
 * depuis son propre téléphone. Le parent crée le groupe Famille et donne son code.
 */
export default function KidFamilyLink() {
  const qc = useQueryClient();
  const { data: groups = [], isLoading } = useQuery({ queryKey: ["groups"], queryFn: () => Groups.mine() });
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const families = groups.filter((g) => g.kind === "family" && g.role === "child");
  const parentOf = groups.filter((g) => g.kind === "family" && g.role === "parent");

  const link = async () => {
    const c = code.trim().toUpperCase();
    if (c.length < 4) return;
    setBusy(true); setErr("");
    try {
      const info = await Groups.inviteInfo(c).catch(() => null);
      if (info && info.kind && info.kind !== "family") { setErr("Ce code n'est pas celui d'un groupe Famille."); return; }
      await Groups.join(c, "child"); haptic(); setCode("");
      qc.invalidateQueries({ queryKey: ["groups"] });
    } catch { setErr("Code introuvable. Vérifie-le avec le parent."); }
    finally { setBusy(false); }
  };

  if (isLoading) return null;
  return (
    <div className="p-3.5">
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-xl bg-accent text-primary flex items-center justify-center shrink-0"><HouseLine weight="fill" className="w-5 h-5" /></span>
        <div className="flex-1 min-w-0">
          <p className="font-extrabold">Suivi par le parent</p>
          {families.length ? (
            <p className="text-[12.5px] font-semibold text-muted-foreground flex items-center gap-1"><CheckCircle weight="fill" className="w-4 h-4 text-primary" />Relié à {families.map((g) => `« ${g.name} »`).join(", ")}. Le parent voit la progression.</p>
          ) : parentOf.length ? (
            <p className="text-[12.5px] font-semibold text-muted-foreground">Tu es parent dans {parentOf.map((g) => `« ${g.name} »`).join(", ")}. Sur le téléphone de l'enfant, connecte son compte puis entre le code de la famille ici.</p>
          ) : (
            <p className="text-[12.5px] font-semibold text-muted-foreground">Entre le code du groupe Famille créé par le parent (dans Groupes, sur son téléphone).</p>
          )}
        </div>
      </div>
      {!families.length && !parentOf.length && (
        <>
          <div className="flex gap-2 mt-3">
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))} placeholder="Code famille" autoCapitalize="characters" autoComplete="off"
              className="flex-1 min-w-0 h-11 px-3 rounded-xl border-2 border-border bg-card font-black tracking-widest text-center outline-none focus:border-primary" />
            <button onClick={link} disabled={busy || code.trim().length < 4} className="btn-relief h-11 px-4 bg-primary text-primary-foreground disabled:opacity-60">
              {busy ? <SpinnerGap weight="bold" className="w-5 h-5 animate-spin" /> : "Relier"}
            </button>
          </div>
          {err && <p className="text-[12.5px] font-bold text-destructive mt-1.5">{err}</p>}
          <p className="text-[12px] font-semibold text-muted-foreground mt-1.5">Pas encore de groupe ? Le parent le crée dans <Link to="/Groups" className="text-primary font-extrabold">Groupes</Link>, type Famille.</p>
        </>
      )}
    </div>
  );
}
