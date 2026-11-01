import { useKidMode } from "@/lib/kidMode";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UsersThree, Plus, SignIn, CaretRight, GraduationCap, House, Users, Handshake } from "@phosphor-icons/react";
import { Groups as G, KIND_LABEL, ROLE_LABEL } from "@/api/entities";
import PageHeader from "@/components/PageHeader";
import Sheet, { Field, inputCls } from "@/components/community/Sheet";
import { haptic } from "@/hooks/usePlatform";
import { report, userMsg } from "@/lib/report";

const KINDS = [
  { k: "class", icon: GraduationCap, t: "Classe / madrasa", d: "Tu es le maître : leçons, suivi et validation des élèves" },
  { k: "family", icon: House, t: "Famille", d: "Suis la progression de tes enfants, khatma familiale" },
  { k: "circle", icon: Users, t: "Cercle", d: "Entre amis : khatma collective, motivation" },
  { k: "duo", icon: Handshake, t: "Binôme", d: "À deux : chacun voit la régularité de l'autre et peut l'encourager" },
];

export default function Groups() {
  const kid = useKidMode();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: groups, isLoading } = useQuery({ queryKey: ["groups"], queryFn: () => G.mine() });
  const [create, setCreate] = useState(false);
  const [join, setJoin] = useState(() => new URLSearchParams(window.location.search).get("join") || "");
  const [joinOpen, setJoinOpen] = useState(!!join);
  const [name, setName] = useState(""); const [kind, setKind] = useState("class");
  const [preview, setPreview] = useState(null); const [role, setRole] = useState("child");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");

  useEffect(() => {
    setPreview(null); setErr("");
    if (join.trim().length !== 6) return;
    G.preview(join).then((p) => (p ? setPreview(p) : setErr("Code introuvable."))).catch((e) => report(e, "groups:preview"));
  }, [join]);

  const doCreate = async () => {
    if (!name.trim()) return;
    setBusy(true); setErr("");
    try { const id = await G.create(name.trim(), kind); qc.invalidateQueries({ queryKey: ["groups"] }); haptic(); navigate(`/Group?id=${id}`); }
    catch (e) { report(e, "groups:create"); } finally { setBusy(false); }
  };
  const doJoin = async () => {
    setBusy(true); setErr("");
    try { const id = await G.join(join, role); localStorage.removeItem("mh_pending_join"); qc.invalidateQueries({ queryKey: ["groups"] }); haptic(); navigate(`/Group?id=${id}`, { replace: true }); }
    catch (e) { if (/duo full/.test(e?.message || "")) setErr("Ce binôme a déjà deux membres."); else report(e, "groups:join"); } finally { setBusy(false); }
  };

  return (
    <div className="max-w-xl mx-auto px-4 pb-6">
      <PageHeader title="Groupes" back subtitle="Madrasa, famille ou amis : apprenez ensemble." />

      {!kid.on && <div className="grid grid-cols-2 gap-3 mt-4">
        <button onClick={() => { haptic(); setCreate(true); }} className="btn-relief h-[50px] bg-primary text-primary-foreground"><Plus weight="bold" /> Créer</button>
        <button onClick={() => { haptic(); setJoinOpen(true); }} className="btn-relief h-[50px] bg-card border-2 border-border text-foreground" style={{ "--relief-color": "hsl(var(--border))" }}><SignIn weight="bold" /> Rejoindre</button>
      </div>}

      <div className="mt-6">
        {isLoading ? <div className="h-24 rounded-2xl bg-muted animate-pulse" />
          : !groups?.length ? (
            <div className="card-flat p-6 text-center">
              <UsersThree weight="fill" className="w-12 h-12 text-primary mx-auto" />
              <p className="font-extrabold mt-2">Aucun groupe pour l'instant</p>
              <p className="text-sm font-semibold text-muted-foreground mt-1">Crée une classe ou ta famille, puis partage le code d'invitation.</p>
            </div>
          ) : (
            <div className="card-flat divide-y-2 divide-border overflow-hidden">
              {groups.map((g) => (
                <button key={g.id} onClick={() => { haptic(); navigate(`/Group?id=${g.id}`); }} className="w-full flex items-center gap-3 p-4 text-left active:bg-muted">
                  <div className="w-11 h-11 rounded-xl bg-accent text-primary flex items-center justify-center shrink-0">
                    {React.createElement(KINDS.find((k) => k.k === g.kind)?.icon || Users, { weight: "fill", className: "w-6 h-6" })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold truncate">{g.name}</p>
                    <p className="text-sm font-semibold text-muted-foreground">{KIND_LABEL[g.kind]} · {g.members} membre{g.members > 1 ? "s" : ""} · {ROLE_LABEL[g.role]}</p>
                  </div>
                  <CaretRight weight="bold" className="w-5 h-5 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
      </div>

      <Sheet open={create} onClose={() => setCreate(false)} title="Nouveau groupe">
        <Field label="Nom"><input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Ex. Madrasa An-Nour" className={inputCls} /></Field>
        <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mb-1.5">Type</p>
        <div className="space-y-2">
          {KINDS.map(({ k, icon: I, t, d }) => (
            <button key={k} onClick={() => setKind(k)} className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 text-left ${kind === k ? "border-primary bg-accent" : "border-border"}`}>
              <I weight="fill" className="w-6 h-6 text-primary shrink-0" />
              <div><p className="font-extrabold">{t}</p><p className="text-xs font-semibold text-muted-foreground">{d}</p></div>
            </button>
          ))}
        </div>
        {err && <p className="text-sm font-bold text-destructive mt-3">{err}</p>}
        <button disabled={busy || !name.trim()} onClick={doCreate} className="btn-relief w-full h-[50px] bg-primary text-primary-foreground mt-4">{busy ? "Création…" : "Créer le groupe"}</button>
      </Sheet>

      <Sheet open={joinOpen} onClose={() => setJoinOpen(false)} title="Rejoindre un groupe">
        <Field label="Code d'invitation"><input value={join} onChange={(e) => setJoin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} placeholder="ABC123" className={`${inputCls} tracking-[0.3em] text-center text-xl uppercase`} autoCapitalize="characters" /></Field>
        {preview && (
          <div className="card-flat p-3 mb-3">
            <p className="font-extrabold">{preview.name}</p>
            <p className="text-sm font-semibold text-muted-foreground">{KIND_LABEL[preview.kind]} · {preview.members} membre{preview.members > 1 ? "s" : ""}</p>
            {preview.kind === "family" && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                {[["child", "Je suis l'enfant"], ["parent", "Je suis parent"]].map(([r, l]) => (
                  <button key={r} onClick={() => setRole(r)} className={`h-11 rounded-xl border-2 font-extrabold text-sm ${role === r ? "border-primary bg-accent text-primary" : "border-border"}`}>{l}</button>
                ))}
              </div>
            )}
            {preview.kind === "class" && <p className="text-xs font-semibold text-muted-foreground mt-2">Tu rejoins en tant qu'élève : ton maître verra ta progression.</p>}
          </div>
        )}
        {err && <p className="text-sm font-bold text-destructive mb-3">{err}</p>}
        <button disabled={busy || !preview} onClick={doJoin} className="btn-relief w-full h-[50px] bg-primary text-primary-foreground">{busy ? "…" : "Rejoindre"}</button>
      </Sheet>
    </div>
  );
}
