import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { GearSix, Camera, At, IdentificationCard, PencilSimple, Fire, Medal, BookOpenText, Crown, Star, UsersThree, Ranking, BookmarkSimple, DownloadSimple, Question, Gift, CaretRight, Check, X, ChartLineUp } from "@phosphor-icons/react";
import { db } from "@/api/neonClient";
import { MemorizationProgress, ActivityDays } from "@/api/entities";
import { currentStreak, longestStreak } from "@/lib/srs";
import { useAuth } from "@/lib/AuthContext";
import InviteSheet from "@/components/InviteSheet";
import { haptic } from "@/hooks/usePlatform";
import PageHeader from "@/components/PageHeader";
import UsernameSheet from "@/components/UsernameSheet";
import { forgetAvatar } from "@/lib/avatars";
import { report, userMsg } from "@/lib/report";

const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

function Row({ icon: Icon, title, sub, onClick, to, right }) {
  const inner = (
    <>
      <span className="w-[38px] h-[38px] rounded-xl bg-accent text-primary flex items-center justify-center shrink-0"><Icon weight="fill" className="w-[21px] h-[21px]" /></span>
      <div className="flex-1 min-w-0"><p className="font-extrabold">{title}</p>{sub && <p className="text-[12.5px] font-semibold text-muted-foreground truncate">{sub}</p>}</div>
      {right ?? <CaretRight weight="bold" className="w-4 h-4 text-muted-foreground shrink-0" />}
    </>
  );
  const cls = "w-full flex items-center gap-3 p-3.5 text-left active:bg-muted";
  return to ? <Link to={to} onClick={() => haptic()} className={cls}>{inner}</Link> : <button onClick={() => { haptic(); onClick?.(); }} className={cls}>{inner}</button>;
}

export default function Profile() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [nameSheet, setNameSheet] = useState(false);
  const { data: uinfo, refetch: refetchU } = useQuery({ queryKey: ["username-info"], queryFn: async () => { const { data, error } = await db.rpc("username_info"); if (error) throw error; return data; }, staleTime: 30_000 });
  const [user, setUser] = useState(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [invite, setInvite] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => { db.auth.getUser().then(({ data }) => setUser(data.user)).catch(() => {}); }, []);
  useEffect(() => {
    if (!user) return;
    setName(user.user_metadata?.full_name || "");
    db.from("profiles").upsert({ id: user.id, full_name: user.user_metadata?.full_name || "", avatar_url: user.user_metadata?.avatar_url || "" }, { onConflict: "id" }).then(() => {}, () => {});
  }, [user]);

  const { data: progress = [] } = useQuery({ queryKey: ["memorization-progress"], queryFn: () => MemorizationProgress.list() });
  const { data: days = [] } = useQuery({ queryKey: ["activity-days"], queryFn: () => ActivityDays.list() });

  const total = progress.reduce((n, p) => n + (p.memorized_verses?.length || 0), 0);
  const completed = new Set(progress.filter((p) => p.status === "completed").map((p) => p.surah_number));
  const streak = currentStreak(days);
  const best = longestStreak(days);
  const juzAmma = Array.from({ length: 37 }, (_, i) => 78 + i).every((n) => completed.has(n));
  const badges = [
    { icon: Medal, t: "1re sourate", on: completed.size >= 1 },
    { icon: Star, t: "100 versets", on: total >= 100 },
    { icon: Fire, t: "7 jours", on: best >= 7 },
    { icon: BookOpenText, t: "Juz Amma", on: juzAmma },
    { icon: Crown, t: "Hafiz", on: completed.size >= 114 },
  ];

  const fullName = user?.user_metadata?.full_name || "";
  const avatar = avatarPreview || user?.user_metadata?.avatar_url;
  const initial = (fullName || user?.email || "?")[0].toUpperCase();
  const since = user?.created_at ? new Date(user.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : null;

  const refresh = async () => { const { data } = await db.auth.getUser(); setUser(data.user); };
  const saveName = async () => {
    if (!name.trim()) return;
    setBusy(true); setError(null);
    const { error: e } = await db.auth.updateUser({ data: { full_name: name.trim() } });
    if (e) report(e, "profile:name"); else { await refresh(); setEditing(false); }
    setBusy(false);
  };
  const pickAvatar = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(f.type)) { setError("Choisis une image JPG, PNG, GIF ou WebP."); return; }
    setAvatarFile(f);
    const r = new FileReader(); r.onloadend = () => setAvatarPreview(r.result); r.readAsDataURL(f);
  };
  const saveAvatar = async () => {
    if (!avatarFile || !user) return;
    setBusy(true); setError(null);
    try {
      const ext = { "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp" }[avatarFile.type];
      const path = `${user.id}/avatar.${ext}`;
      const { error: up } = await db.storage.from("avatars").upload(path, avatarFile, { upsert: true });
      if (up) throw up;
      const { data } = db.storage.from("avatars").getPublicUrl(path);
      await db.auth.updateUser({ data: { avatar_url: data.publicUrl } });
      await db.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", user.id);
      forgetAvatar(user.id);
      await refresh(); setAvatarFile(null); setAvatarPreview(null);
    } catch (e) { report(e, "profile:photo"); }
    setBusy(false);
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-nav">
      <div className="max-w-2xl mx-auto px-4">
        <PageHeader title="Profil" back="/Dashboard" right={<Link to="/Settings" aria-label="Réglages" className="w-10 h-10 rounded-full bg-card border-2 border-border flex items-center justify-center press"><GearSix weight="bold" className="w-5 h-5" /></Link>} />

        <div className="text-center">
          <button onClick={() => fileRef.current?.click()} className="relative mx-auto block" aria-label="Changer la photo">
            {avatar
              ? <img src={avatar} alt="" className="w-[92px] h-[92px] rounded-full object-cover border-4 border-card ring-2 ring-border" />
              : <span className="w-[92px] h-[92px] rounded-full bg-accent text-accent-foreground text-[38px] font-black flex items-center justify-center border-4 border-card ring-2 ring-border">{initial}</span>}
            <span className="absolute -bottom-0.5 -right-0.5 w-8 h-8 rounded-full bg-primary text-primary-foreground border-[3px] border-background flex items-center justify-center"><Camera weight="fill" className="w-4 h-4" /></span>
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={pickAvatar} />
          {avatarFile && (
            <div className="flex gap-2 justify-center mt-3">
              <button onClick={() => { setAvatarFile(null); setAvatarPreview(null); }} className="h-9 px-4 rounded-xl border-2 border-border bg-card font-extrabold text-sm">Annuler</button>
              <button disabled={busy} onClick={saveAvatar} className="btn-relief h-9 px-4 bg-primary text-primary-foreground text-xs">Enregistrer la photo</button>
            </div>
          )}

          {editing ? (
            <div className="flex gap-2 items-center justify-center mt-3 max-w-xs mx-auto">
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveName()}
                className="flex-1 h-11 px-3 rounded-xl border-2 border-primary bg-card font-extrabold text-center" />
              <button disabled={busy} onClick={saveName} aria-label="Enregistrer" className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center"><Check weight="bold" /></button>
              <button onClick={() => { setEditing(false); setName(fullName); }} aria-label="Annuler" className="w-11 h-11 rounded-xl border-2 border-border bg-card flex items-center justify-center"><X weight="bold" /></button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 mt-2.5">
              <span className="text-2xl font-black">{fullName || "Ajoute ton prénom"}</span><PencilSimple weight="bold" className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          {uinfo?.username && <p className="text-[15px] font-extrabold text-accent-foreground">@{uinfo.username}</p>}
          <p className="text-sm font-semibold text-muted-foreground">{since ? `Membre depuis ${since}` : user?.email}</p>
          {error && <p className="text-sm font-bold text-destructive mt-2">{error}</p>}
        </div>

        <div className="card-flat flex mt-4">
          <div className="flex-1 p-3 text-center"><p className="text-[22px] font-black">{total}</p><p className="text-[11.5px] font-bold text-muted-foreground">versets</p></div>
          <div className="flex-1 p-3 text-center border-l-2 border-border"><p className="text-[22px] font-black text-gold-lip flex items-center justify-center gap-1"><Fire weight="fill" className="w-5 h-5" />{streak}</p><p className="text-[11.5px] font-bold text-muted-foreground">jours de série</p></div>
          <div className="flex-1 p-3 text-center border-l-2 border-border"><p className="text-[22px] font-black">{completed.size}</p><p className="text-[11.5px] font-bold text-muted-foreground">sourates</p></div>
        </div>

        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mt-5 mb-2 ml-1">Succès</p>
        <div className="card-flat p-3.5 grid grid-cols-5 gap-2 text-center">
          {badges.map(({ icon: I, t, on }) => (
            <div key={t}>
              <span className={`w-12 h-12 mx-auto rounded-2xl flex items-center justify-center ${on ? "bg-accent text-primary" : "bg-muted text-border"}`}><I weight="fill" className="w-6 h-6" /></span>
              <p className={`text-[10.5px] font-extrabold mt-1 leading-tight ${on ? "" : "text-muted-foreground"}`}>{t}</p>
            </div>
          ))}
        </div>

        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mt-5 mb-2 ml-1">Identité</p>
        <div className="card-flat overflow-hidden divide-y-2 divide-border">
          <Row icon={IdentificationCard} title="Nom complet" sub={fullName || "À ajouter"} onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); setEditing(true); }} />
          <Row icon={At} title="Nom d'utilisateur" sub={uinfo?.username ? `@${uinfo.username} · tes amis te trouvent avec` : "À choisir"} onClick={() => setNameSheet(true)} />
        </div>

        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mt-5 mb-2 ml-1">Mon espace</p>
        <div className="card-flat overflow-hidden divide-y-2 divide-border">
          <Row icon={ChartLineUp} title="Mes progrès" sub="Versets, régularité, solidité" to="/Progres" />
          <Row icon={UsersThree} title="Mes groupes" to="/Groups" />
          <Row icon={Ranking} title="Classement" to="/Leaderboard" />
          <Row icon={BookmarkSimple} title="Signets" to="/Bookmarks" />
          {!isStandalone() && <Row icon={DownloadSimple} title="Installer l'application" sub="Sur ton écran d'accueil" onClick={() => navigate("/telecharger")} />}
        </div>

        <div className="card-flat overflow-hidden divide-y-2 divide-border mt-3">
          <Row icon={Question} title="Aide" to="/Help" />
          <Row icon={Gift} title="Inviter un proche" onClick={() => setInvite(true)} />
          <button onClick={() => setLogoutOpen(true)} className="w-full p-3.5 font-extrabold text-destructive active:bg-muted">Se déconnecter</button>
        </div>

        <p className="text-center text-xs font-semibold text-muted-foreground mt-4">
          MyHafizz 1.0 · <Link to="/terms" className="underline">Conditions</Link> · <Link to="/privacy" className="underline">Confidentialité</Link>
        </p>
      </div>

      <InviteSheet open={invite} onClose={() => setInvite(false)} kind="app" name={fullName.trim().split(/\s+/)[0] || ""} stats={{ verses: total, streak, surahs: completed.size }} />

      <AnimatePresence>{nameSheet && <UsernameSheet info={uinfo} onClose={() => setNameSheet(false)} onSaved={() => { setNameSheet(false); refetchU(); }} />}</AnimatePresence>

      <AnimatePresence>
        {logoutOpen && (
          <motion.div className="fixed inset-0 z-[200] flex items-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-foreground/30" onClick={() => setLogoutOpen(false)} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative w-full bg-card rounded-t-3xl p-5 pb-[calc(env(safe-area-inset-bottom,0px)+20px)]">
              <p className="text-lg font-black">Se déconnecter ?</p>
              <p className="text-sm font-semibold text-muted-foreground mt-1 mb-5">Ta progression reste enregistrée sur ton compte.</p>
              <button onClick={logout} className="btn-relief w-full h-[50px] bg-destructive text-destructive-foreground [--relief-color:#B8343A]">Se déconnecter</button>
              <button onClick={() => setLogoutOpen(false)} className="w-full h-12 mt-2 font-extrabold text-muted-foreground">Annuler</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
