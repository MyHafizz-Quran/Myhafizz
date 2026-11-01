import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, ArrowLeft, UsersThree, House, GraduationCap, Handshake, CheckCircle, Medal, CaretRight } from "@phosphor-icons/react";
import { TK_SCOPES, TK_ILM, tkList, tkGet, tkCreate, tkUnitName, loadQuran, loadSettings } from "@/lib/games";
import { haptic } from "@/hooks/usePlatform";

const KIND_ICON = { family: House, class: GraduationCap, circle: UsersThree, duo: Handshake };
const KIND_WORD = { family: "Famille", class: "Classe", circle: "Cercle", duo: "Binôme" };
const groupName = (g) => (g?.kind === "duo" ? `Binôme${g.partner ? ` avec @${g.partner}` : ""}` : g?.name || "Groupe");
const daysLeft = (iso) => { const h = (Date.parse(iso) - Date.now()) / 36e5; return h >= 24 ? `encore ${Math.ceil(h / 24)} jours` : h > 0 ? `encore ${Math.max(1, Math.round(h))} h` : "terminé"; };
const initials = (u) => String(u || "?").replace(/^@/, "").split(/[._\s-]+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase() || "?";

const Section = ({ children }) => <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mt-5 mb-2">{children}</p>;
const Btn = ({ children, secondary, ...p }) => (
  <button {...p} className={`w-full h-[52px] flex items-center justify-center gap-2 disabled:opacity-50 ${secondary ? "rounded-2xl border-2 border-b-[5px] border-border bg-card font-extrabold" : "btn-relief bg-primary text-primary-foreground"}`}>{children}</button>
);
const Screen = ({ children, footer }) => (
  <div className="min-h-[100dvh] bg-background" style={{ paddingTop: "env(safe-area-inset-top)" }}>
    <div className={`max-w-xl mx-auto px-4 ${footer ? "pb-40" : "pb-10"}`}>{children}</div>
    {footer && <div className="fixed inset-x-0 bottom-0 bg-background border-t-2 border-border" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}><div className="max-w-xl mx-auto px-4 pt-4 space-y-3">{footer}</div></div>}
  </div>
);
const Head = ({ title, onBack, close }) => (
  <div className="h-14 flex items-center gap-2">
    <button onClick={onBack} aria-label="Retour" className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-muted-foreground press">{close ? <X weight="bold" className="w-6 h-6" /> : <ArrowLeft weight="bold" className="w-6 h-6" />}</button>
    <h1 className="text-[20px] font-black truncate">{title}</h1>
  </div>
);
const Bar = ({ done, total, h = 12 }) => (
  <div className="flex items-center gap-3"><div className="flex-1 rounded-full bg-muted overflow-hidden" style={{ height: h }}><div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div><b className="text-[14px]">{done} / {total}</b></div>
);
const GroupIcon = ({ kind, gold }) => { const I = KIND_ICON[kind] || UsersThree; return <span className={`w-[42px] h-[42px] rounded-full flex items-center justify-center shrink-0 ${gold ? "bg-gold-tint text-[#8A6100]" : "bg-accent text-accent-foreground"}`}><I weight="fill" className="w-5 h-5" /></span>; };

/** Onglet « Équipe » de l'écran Jouer. */
export function EquipeTab() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({ queryKey: ["tk-list"], queryFn: tkList, refetchInterval: 30_000 });
  const { data: quran } = useQuery({ queryKey: ["quran-names"], queryFn: loadQuran, staleTime: Infinity });
  const list = data?.khatmas || [];
  const active = list.filter((k) => k.status === "active"), past = list.filter((k) => k.status !== "active").slice(0, 10);
  const noGroup = data && !data.groups?.length;
  return (
    <div className="mt-4">
      <Btn onClick={() => { haptic(); navigate(noGroup ? "/Groups" : "/Equipe?new=1"); }}><UsersThree weight="bold" className="w-5 h-5" />{noGroup ? "Créer ou rejoindre un groupe" : "Lancer une khatma d'équipe"}</Btn>
      <p className="text-[13px] font-semibold text-muted-foreground mt-3">{noGroup ? "La khatma d'équipe se joue dans un groupe (famille, classe, cercle) ou avec ton binôme." : "Révisez ensemble : chaque sourate est validée quand un membre réussit une partie dessus."}</p>
      {isLoading && <p className="text-center font-bold text-muted-foreground mt-10">Chargement…</p>}
      {error && <p className="text-center font-bold text-muted-foreground mt-10">Impossible de charger tes khatmas. Vérifie ta connexion.</p>}
      {!isLoading && !error && !list.length && !noGroup && <p className="text-center font-bold text-muted-foreground mt-10">Aucune khatma d'équipe pour l'instant.</p>}
      {active.length > 0 && <Section>En cours</Section>}
      <div className="space-y-2.5">{active.map((k) => (
        <button key={k.id} onClick={() => { haptic(); navigate(`/Equipe?id=${k.id}`); }} className="w-full text-left card-flat p-3.5 press">
          <span className="flex items-center gap-3"><GroupIcon kind={k.group.kind} gold={k.mine > 0} />
            <span className="flex-1 min-w-0"><span className="block font-extrabold truncate">{groupName({ ...k.group, partner: k.partner })} · {TK_SCOPES[k.scope].title}</span><span className="block text-[13px] font-semibold text-muted-foreground">{k.members} membres · {daysLeft(k.ends_at)}</span></span>
            <CaretRight weight="bold" className="w-5 h-5 text-muted-foreground" /></span>
          <span className="block mt-3"><Bar done={k.done} total={k.total} h={10} /></span>
          <span className="block text-[13px] font-semibold text-muted-foreground mt-2">{k.mine ? `Tu as validé ${k.mine} ${TK_SCOPES[k.scope].unit}${k.mine > 1 ? "s" : ""}.` : "Tu n'as encore rien validé."}{k.next ? ` Prochaine libre : ${tkUnitName(k.scope, k.next, quran)}.` : ""}</span>
        </button>
      ))}</div>
      {past.length > 0 && <Section>Terminées</Section>}
      <div className="space-y-2.5">{past.map((k) => (
        <button key={k.id} onClick={() => { haptic(); navigate(`/Equipe?id=${k.id}`); }} className="w-full text-left card-flat p-3.5 flex items-center gap-3 press">
          <GroupIcon kind={k.group.kind} />
          <span className="flex-1 min-w-0"><span className="block font-extrabold truncate">{groupName({ ...k.group, partner: k.partner })} · {TK_SCOPES[k.scope].title}</span><span className="block text-[13px] font-semibold text-muted-foreground">{k.status === "done" ? `Terminée · ${k.members} membres` : `Délai passé · ${k.done} / ${k.total} validées`}</span></span>
          <span className={`h-6 px-2 rounded-lg text-xs font-extrabold flex items-center ${k.status === "done" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>{k.status === "done" ? "Terminée" : "Close"}</span>
        </button>
      ))}</div>
    </div>
  );
}

export default function Equipe() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("id")) return <Detail id={params.get("id")} />;
  return <Create />;
}

function Create() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, error } = useQuery({ queryKey: ["tk-list"], queryFn: tkList });
  const { data: settings } = useQuery({ queryKey: ["game-settings"], queryFn: loadSettings, staleTime: 60_000 });
  const groups = data?.groups || [];
  const [gid, setGid] = useState(null);
  const [scope, setScope] = useState("amma");
  const daysOpts = (settings?.khatma?.days || [3, 7, 14]).slice(0, 4);
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const sel = groups.find((g) => g.id === (gid || groups.find((x) => !x.busy)?.id));
  const total = scope === "amma" ? 37 : scope === "tabarak" ? 11 : TK_ILM.length;
  const create = async () => {
    setBusy(true); setErr("");
    try { const id = await tkCreate(sel.id, scope, daysOpts.includes(days) ? days : daysOpts[0]); qc.invalidateQueries({ queryKey: ["tk-list"] }); navigate(`/Equipe?id=${id}`, { replace: true }); }
    catch (e) { setErr(e.message); setBusy(false); }
  };
  return (
    <Screen footer={<>{err && <p className="text-[13px] font-bold text-destructive text-center">{err}</p>}<Btn disabled={!sel || sel.busy || busy} onClick={create}>{busy ? "Création…" : sel ? `Lancer pour ${sel.kind === "duo" ? "le binôme" : sel.kind === "family" ? "la famille" : sel.kind === "class" ? "la classe" : "le cercle"}` : "Choisis un groupe"}</Btn></>}>
      <Head title="Nouvelle khatma" close onBack={() => navigate("/Jouer?tab=equipe", { replace: true })} />
      {error && <p className="font-bold text-muted-foreground mt-6">Impossible de charger tes groupes. Vérifie ta connexion.</p>}
      <Section>Avec qui ?</Section>
      {data && !groups.length && <div className="card-flat p-4"><p className="font-semibold text-muted-foreground">Tu n'es dans aucun groupe. Crée un groupe ou un binôme, puis reviens ici.</p><div className="mt-3"><Btn secondary onClick={() => navigate("/Groups")}>Mes groupes</Btn></div></div>}
      <div className="space-y-2.5">{groups.map((g) => {
        const I = KIND_ICON[g.kind] || UsersThree, on = sel?.id === g.id;
        return (
          <button key={g.id} disabled={g.busy} onClick={() => { haptic(); setGid(g.id); }} className={`w-full text-left rounded-2xl border-2 border-b-4 p-3 flex items-center gap-3 font-extrabold disabled:opacity-55 ${on ? "border-primary bg-accent text-accent-foreground" : "border-border bg-card"}`}>
            <I weight={on ? "fill" : "bold"} className="w-6 h-6 text-primary shrink-0" />
            <span className="flex-1 min-w-0"><span className="block truncate">{groupName(g)}</span><span className="block text-[12.5px] font-semibold text-muted-foreground">{g.busy ? "Une khatma est déjà en cours" : `${KIND_WORD[g.kind] || "Groupe"} · ${g.members} membre${g.members > 1 ? "s" : ""}`}</span></span>
            {on && <CheckCircle weight="fill" className="w-6 h-6 text-primary" />}
          </button>
        );
      })}</div>
      <Section>Quoi réviser ?</Section>
      <div className="flex bg-muted rounded-2xl p-1 gap-1">{[["amma", "Juz Amma · 37"], ["tabarak", "Tabarak · 11"], ["ilm", `Al-Ilm · ${TK_ILM.length}`]].map(([k, l]) => (
        <button key={k} onClick={() => { haptic(); setScope(k); }} className={`flex-1 h-10 rounded-xl font-extrabold text-[13px] ${scope === k ? "bg-card text-accent-foreground shadow-[0_2px_0_var(--border)]" : "text-muted-foreground"}`}>{l}</button>
      ))}</div>
      <Section>En combien de temps ?</Section>
      <div className="flex bg-muted rounded-2xl p-1 gap-1">{daysOpts.map((d) => (
        <button key={d} onClick={() => { haptic(); setDays(d); }} className={`flex-1 h-10 rounded-xl font-extrabold text-[13px] ${days === d ? "bg-card text-accent-foreground shadow-[0_2px_0_var(--border)]" : "text-muted-foreground"}`}>{d} jours</button>
      ))}</div>
      <div className="card-flat p-3.5 mt-5 text-[13px] font-semibold text-muted-foreground"><b className="text-foreground">La règle.</b> {scope === "ilm" ? "Chaque thème" : "Chaque sourate"} est validé{scope === "ilm" ? "" : "e"} quand un membre réussit une partie dessus à {settings?.khatma?.pct ?? 80} %. Quand les {total} sont validé{scope === "ilm" ? "s" : "es"}, la khatma est terminée et chacun gagne +{settings?.khatma?.bonus ?? 50} points. Chacun joue à son niveau : la phonétique aide ceux qui ne lisent pas encore l'arabe.</div>
    </Screen>
  );
}

function Detail({ id }) {
  const navigate = useNavigate();
  const { data: k, error, isLoading } = useQuery({ queryKey: ["tk", id], queryFn: () => tkGet(id), refetchInterval: 30_000 });
  const { data: quran } = useQuery({ queryKey: ["quran-names"], queryFn: loadQuran, staleTime: Infinity });
  const back = () => navigate("/Jouer?tab=equipe", { replace: true });
  if (isLoading) return <Screen><Head title="Khatma d'équipe" onBack={back} /><p className="text-center font-bold text-muted-foreground mt-16">Chargement…</p></Screen>;
  if (error || !k) return <Screen><Head title="Khatma d'équipe" onBack={back} /><p className="text-center font-bold text-muted-foreground mt-16">{error?.message || "Khatma introuvable."}</p></Screen>;
  const by = Object.fromEntries(k.parts.map((p) => [p.unit, p]));
  const who = Object.fromEntries(k.team.map((m) => [m.user_id, m]));
  const tag = (uid) => (uid === k.me ? "Toi" : initials(who[uid]?.username || who[uid]?.name));
  const ilm = k.scope === "ilm";
  const unitWord = ilm ? "thème" : "sourate";
  const left = k.total - k.done;
  const nextName = k.next ? tkUnitName(k.scope, k.next, quran) : null;
  const play = (u) => { haptic(); navigate(`/Partie?tk=${k.id}&u=${u}`); };
  const title = `${TK_SCOPES[k.scope].title} · ${groupName({ ...k.group, partner: k.partner })}`;

  if (k.status === "done") {
    return (
      <Screen footer={<Btn secondary onClick={back}>Retour</Btn>}>
        <Head title="" close onBack={back} />
        <div className="text-center mt-6">
          <div className="w-24 h-24 mx-auto rounded-3xl bg-gold-tint text-gold flex items-center justify-center"><Medal weight="fill" className="w-12 h-12" /></div>
          <h1 className="text-[28px] font-black mt-6">{TK_SCOPES[k.scope].title} terminé</h1>
          <p className="font-semibold text-muted-foreground mt-1">{groupName({ ...k.group, partner: k.partner })} a validé les {k.total} {unitWord}s{k.finished_at ? ` en ${Math.max(1, Math.ceil((Date.parse(k.finished_at) - Date.parse(k.created_at)) / 864e5))} jour${Math.ceil((Date.parse(k.finished_at) - Date.parse(k.created_at)) / 864e5) > 1 ? "s" : ""}` : ""}.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-6">
          <div className="card-flat p-4 text-center"><p className="text-2xl font-black">+{k.bonus}</p><p className="text-xs font-bold text-muted-foreground">points pour chacun</p></div>
          <div className="card-flat p-4 text-center"><p className="text-2xl font-black">{k.total} / {k.total}</p><p className="text-xs font-bold text-muted-foreground">{unitWord}s</p></div>
        </div>
        <Team k={k} title="Qui a fait quoi" />
      </Screen>
    );
  }

  return (
    <Screen footer={k.status === "active" && k.next ? <Btn onClick={() => play(k.next)}>Jouer {nextName}</Btn> : <Btn secondary onClick={back}>Retour</Btn>}>
      <Head title={title} onBack={back} />
      <div className="card-flat p-4"><Bar done={k.done} total={k.total} /><p className="text-[13px] font-semibold text-muted-foreground mt-2">{k.status === "expired" ? `Délai passé. L'équipe garde ses ${k.done} ${unitWord}${k.done > 1 ? "s" : ""} validé${ilm ? "" : "e"}${k.done > 1 ? "s" : ""}.` : `${daysLeft(k.ends_at).replace(/^./, (c) => c.toUpperCase())} · ${left} ${unitWord}${left > 1 ? "s" : ""} à valider`}</p></div>
      <div className={`grid ${ilm ? "grid-cols-3" : "grid-cols-6"} gap-1.5 mt-4`}>
        {k.units.map((u) => {
          const p = by[u], mine = p?.user_id === k.me;
          return (
            <button key={u} disabled={k.status !== "active"} onClick={() => play(u)} aria-label={`${tkUnitName(k.scope, u, quran)}${p ? `, validée par ${tag(p.user_id)}` : ", libre"}`}
              className={`rounded-[10px] border-2 flex flex-col items-center justify-center font-black leading-[1.05] press ${ilm ? "h-14 px-1 text-[12.5px]" : "h-11 text-[13px]"} ${p ? (mine ? "bg-gold-tint border-gold text-[#6B4D00]" : "bg-primary border-[var(--primary-lip)] text-primary-foreground") : u === k.next ? "bg-card border-primary border-dashed" : "bg-card border-border"}`}>
              <span className="truncate max-w-full">{ilm ? tkUnitName(k.scope, u) : u}</span>
              <span className={`text-[9.5px] font-extrabold ${p ? (mine ? "text-[#8A6100]" : "text-primary-foreground/80") : "text-muted-foreground"}`}>{p ? tag(p.user_id) : "libre"}</span>
            </button>
          );
        })}
      </div>
      <div className="flex gap-3.5 mt-3 text-[12px] font-extrabold text-muted-foreground">
        <span className="flex items-center gap-1.5"><i className="w-3 h-3 rounded bg-primary inline-block" />validée</span>
        <span className="flex items-center gap-1.5"><i className="w-3 h-3 rounded bg-gold-tint border-2 border-gold inline-block" />par toi</span>
        <span className="flex items-center gap-1.5"><i className="w-3 h-3 rounded border-2 border-border inline-block" />libre</span>
      </div>
      <p className="text-[12.5px] font-semibold text-muted-foreground mt-3">Touche une {unitWord} pour la jouer. Une {unitWord} déjà validée peut être rejouée pour s'entraîner, sans compter deux fois.</p>
      <Team k={k} title="L'équipe" />
    </Screen>
  );
}

function Team({ k, title }) {
  return (
    <>
      <Section>{title}</Section>
      <div className="card-flat p-3.5 space-y-2.5">{k.team.map((m) => (
        <div key={m.user_id} className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-black text-[12px] shrink-0">{initials(m.username || m.name)}</span>
          <span className="flex-1 min-w-0 font-extrabold truncate">{m.user_id === k.me ? "Toi" : m.username ? `@${m.username}` : m.name || "Membre"}</span>
          <b>{m.count}</b>
        </div>
      ))}</div>
    </>
  );
}
