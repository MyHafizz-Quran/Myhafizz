import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Sword, Trophy, Crown, Fire, Target, ArrowsClockwise, Handshake, UsersThree, GameController, Medal, CaretDoubleUp, Star, CaretRight } from "@phosphor-icons/react";
import { playerProfile, gradeOf, GRADES, BADGES } from "@/lib/games";
import { PlayerPic } from "@/pages/Partie";
import { HistoryRow } from "@/pages/Duel";
import { report, userMsg } from "@/lib/report";

const ICON = { sword: Sword, trophy: Trophy, crown: Crown, fire: Fire, target: Target, arrows: ArrowsClockwise, handshake: Handshake, users: UsersThree, game: GameController, medal: Medal };
const Section = ({ children }) => <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mt-5 mb-2">{children}</p>;

export default function Joueur() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const u = params.get("u") || "";
  const grades = params.get("grades");
  const { data: p, error, isLoading } = useQuery({ queryKey: ["player", u], queryFn: () => playerProfile(u), staleTime: 10_000 });
  const back = () => (window.history.length > 1 ? navigate(-1) : navigate("/Jouer?tab=duels", { replace: true }));
  const Head = ({ title }) => (
    <div className="h-14 flex items-center gap-2">
      <button onClick={back} aria-label="Retour" className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-muted-foreground press"><ArrowLeft weight="bold" className="w-6 h-6" /></button>
      <h1 className="text-[20px] font-black truncate">{title}</h1>
    </div>
  );
  const wrap = (c) => <div className="min-h-[100dvh] bg-background" style={{ paddingTop: "env(safe-area-inset-top)" }}><div className="max-w-xl mx-auto px-4 pb-12">{c}</div></div>;
  if (isLoading) return wrap(<><Head title="Profil joueur" /><p className="text-center font-bold text-muted-foreground mt-16">Chargement…</p></>);
  if (error || !p) return wrap(<><Head title="Profil joueur" /><p className="text-center font-bold text-muted-foreground mt-16">{error ? (/introuvable/i.test(error.message || "") ? "Joueur introuvable." : "Chargement…") : "Joueur introuvable."}</p></>);
  const g = gradeOf(p.points);

  if (grades) {
    return wrap(<>
      <Head title="Grades" />
      <p className="font-semibold text-muted-foreground">Chaque grade a 3 échelons (I, II, III). On monte en gagnant des points, et on peut redescendre en perdant.</p>
      <div className="space-y-2.5 mt-4">{GRADES.map((x, k) => {
        const me = k === g.index, I = k < 4 ? CaretDoubleUp : Star;
        return (
          <div key={x.name} className={`card-flat p-3 flex items-center gap-3 ${me ? "border-primary bg-accent" : ""}`}>
            <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${k <= g.index ? "bg-accent text-primary" : "bg-muted text-muted-foreground"}`}><I weight="fill" className="w-6 h-6" /></span>
            <span className="flex-1"><span className="block font-extrabold">{x.name}</span><span className="block text-[13px] font-semibold text-muted-foreground">{GRADES[k + 1] ? `${x.min.toLocaleString("fr-FR")} à ${(GRADES[k + 1].min - 1).toLocaleString("fr-FR")} pts` : `${x.min.toLocaleString("fr-FR")} pts et plus`}</span></span>
            {me && <span className="h-6 px-2 rounded-lg bg-primary text-primary-foreground text-xs font-extrabold flex items-center">{g.label}</span>}
          </div>
        );
      })}</div>
    </>);
  }

  const st = p.stats || {};
  const owned = new Set((p.badges || []).map((b) => b.id));
  const pct = st.asked ? Math.round((st.correct / st.asked) * 100) : 0;
  return wrap(<>
    <Head title={p.is_me ? "Mon profil joueur" : `@${p.username}`} />
    <div className="card-flat p-4 flex items-center gap-4">
      <PlayerPic p={p} size={68} />
      <div className="flex-1 min-w-0">
        <p className="text-[19px] font-black truncate">@{p.username || "joueur"}</p>
        <button onClick={() => navigate(`/Joueur?grades=1${u ? `&u=${encodeURIComponent(u)}` : ""}`)} className="font-extrabold text-primary flex items-center gap-1">{g.label} · {p.points.toLocaleString("fr-FR")} points<CaretRight weight="bold" className="w-4 h-4" /></button>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden mt-2"><div className="h-full rounded-full bg-primary" style={{ width: `${g.pct}%` }} /></div>
        {g.nextLabel && <p className="text-[12px] font-semibold text-muted-foreground mt-1">{g.toNext} pts avant {g.nextLabel}</p>}
      </div>
    </div>
    <div className="grid grid-cols-3 gap-2.5 mt-3">
      {[[st.duels || 0, "duels"], [st.wins || 0, "victoires"], [`${pct} %`, "réussite"], [st.losses || 0, "défaites"], [st.draws || 0, "égalités"], [p.solo || 0, "parties solo"]].map(([v, l]) => (
        <div key={l} className="card-flat p-3 text-center"><p className="text-[20px] font-black">{v}</p><p className="text-[12px] font-bold text-muted-foreground">{l}</p></div>
      ))}
    </div>
    <Section>Badges · {owned.size} sur {BADGES.length}</Section>
    <div className="grid grid-cols-4 gap-2">{BADGES.map(([id, name, icon]) => {
      const I = ICON[icon] || Medal, on = owned.has(id);
      return (
        <div key={id} title={name} className={`card-flat h-[78px] p-1 flex flex-col items-center justify-center text-center ${on ? "" : "opacity-40"}`}>
          <I weight="fill" className={`w-6 h-6 ${on ? "text-primary" : "text-muted-foreground"}`} />
          <span className="text-[10.5px] font-extrabold leading-tight mt-1 text-muted-foreground line-clamp-2">{name}</span>
        </div>
      );
    })}</div>
    <Section>Historique</Section>
    {!p.history?.length && <p className="font-semibold text-muted-foreground">Aucun duel terminé pour l'instant.</p>}
    <div className="space-y-2.5">{(p.history || []).map((h) => <HistoryRow key={h.id} h={h} onClick={() => p.is_me && navigate(`/Duel?id=${h.id}`)} />)}</div>
    {p.is_me && <p className="text-[12.5px] font-semibold text-muted-foreground mt-4">Points : victoire +30, égalité +5, défaite −10, abandon −20. Les parties solo, les khatmas d'équipe et le défi du jour en rapportent aussi. Le total ne descend jamais sous 0.</p>}
  </>);
}
