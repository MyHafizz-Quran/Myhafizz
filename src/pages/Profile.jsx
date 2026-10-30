import React, { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/api/neonClient";
import { MemorizationProgress } from "@/api/entities";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Settings, LogOut, AlertTriangle, Loader2,
  Camera, Check, Edit3, HelpCircle, Share2, Copy,
  Gift,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { TOTAL_VERSES, SURAHS } from "@/components/quranData";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import InvitePosterModal from "@/components/InvitePosterModal";

// ─── Main Profile page ────────────────────────────────────────────────────────
export default function Profile() {
  const { logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showInvitePoster, setShowInvitePoster] = useState(false);

  // ── Profile edit state ──
  const [editingName, setEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // ── Avatar upload state ──
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);


  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user)).catch(() => {});
  }, []);

  useEffect(() => {
    const syncProfile = async () => {
      if (!user) return;
      try {
        await supabase.from("profiles").upsert({
          id: user.id,
          full_name: user.user_metadata?.full_name || "",
          avatar_url: user.user_metadata?.avatar_url || "",
        }, { onConflict: "id" });
      } catch (err) {
        // Silent — profile sync is best-effort
        console.warn("Profile sync failed:", err);
      }
    };
    syncProfile();
  }, [user]);

  useEffect(() => {
    if (user) {
      setEditNameValue(user.user_metadata?.full_name || "");
    }
  }, [user]);

  // ── Profile save / avatar functions ────────────────────────────────────
  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    const fullName = editNameValue.trim();
    const { error } = await supabase.auth.updateUser({ data: { full_name: fullName } });
    if (error) {
      setSaveError(error.message);
    } else {
      setSaveSuccess(true);
      setEditingName(false);
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
    setSaving(false);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setSaveError("Type de fichier non supporté. Utilisez JPG, PNG, GIF ou WebP.");
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile || !user) return;
    setUploadingAvatar(true);
    setSaveError(null);
    try {
      const allowedExtensions = { "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp" };
      const ext = allowedExtensions[avatarFile.type];
      if (!ext) throw new Error("Type de fichier non supporté");
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) throw new Error("Impossible d'obtenir l'URL de la photo");
      await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (err) {
      console.error("Avatar upload error:", err);
      setSaveError("Erreur lors de l'upload de la photo");
    }
    setUploadingAvatar(false);
  };

  const { data: progressList = [] } = useQuery({
    queryKey: ["memorization-progress"],
    queryFn: () => MemorizationProgress.list(),
  });

  const totalMemorized = progressList.reduce((sum, p) => sum + (p.memorized_verses?.length || 0), 0);
  const completedSurahs = progressList.filter(p => p.status === "completed").length;
  const inProgressSurahs = progressList.filter(p => p.status === "in_progress").length;
  const overallPercent = TOTAL_VERSES > 0 ? (totalMemorized / TOTAL_VERSES) * 100 : 0;

  // ── Success feed posts ────────────────────────────────────────────────────
  const successFeedPosts = useMemo(() => {
    const posts = [];
    const completedItems = progressList
      .filter(p => p.status === "completed")
      .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
    completedItems.forEach(p => {
      const surahInfo = SURAHS.find(s => s.number === p.surah_number);
      if (!surahInfo) return;
      posts.push({
        id: `completed-${p.surah_number}`,
        text: `🎉 Tu viens de terminer Sourate ${surahInfo.englishName} (${surahInfo.name}) ! Mashallah !`,
        type: "completed",
      });
    });
    const inProgressItems = progressList
      .filter(p => p.status === "in_progress")
      .sort((a, b) => (b.memorized_verses?.length || 0) - (a.memorized_verses?.length || 0));
    inProgressItems.forEach(p => {
      const surahInfo = SURAHS.find(s => s.number === p.surah_number);
      if (!surahInfo) return;
      const count = p.memorized_verses?.length || 0;
      posts.push({
        id: `progress-${p.surah_number}`,
        text: `📖 Tu as mémorisé ${count} verset${count !== 1 ? 's' : ''} de Sourate ${surahInfo.englishName} (${surahInfo.name}) — continue comme ça !`,
        type: "in_progress",
      });
    });
    return posts;
  }, [progressList]);

  // ── Level config ─────────────────────────────────────────────────────────
  const levelConfig = completedSurahs >= 114
    ? { label: "Hafidh", gradient: "from-amber-400 via-yellow-400 to-amber-500", ring: "#f59e0b" }
    : completedSurahs >= 30
    ? { label: "Avancé", gradient: "from-violet-500 via-purple-500 to-violet-600", ring: "#8b5cf6" }
    : completedSurahs >= 5
    ? { label: "Intermédiaire", gradient: "from-blue-500 via-sky-500 to-blue-600", ring: "#3b82f6" }
    : { label: "Débutant", gradient: "from-emerald-500 via-emerald-400 to-teal-500", ring: "#10b981" };

  const avatarUrl = user?.user_metadata?.avatar_url;

  const initials = (user?.user_metadata?.full_name || user?.email || "U")
    .split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const handleCopyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copié !", description: "Texte copié dans le presse-papier." });
    } catch {
      toast({ title: "Erreur", description: "Impossible de copier. Vérifiez les permissions du navigateur.", variant: "destructive" });
    }
  };

  const handleShareText = async (text) => {
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        // User dismissed the share dialog — no action needed
      }
    } else {
      await handleCopyText(text);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28 flex flex-col">

      {/* ─── HEADER ─── */}
      <div className="hafiz-gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.035]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff'%3E%3Cpath d='M30 0l8.66 15H21.34L30 0zm0 60l8.66-15H21.34L30 60zM0 30l15-8.66v17.32L0 30zm60 0L45 21.34v17.32L60 30zM30 22.5a7.5 7.5 0 100 15 7.5 7.5 0 000-15z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-8 pb-6 relative">

          {/* Avatar + name — centered */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center"
          >
            <div className="relative">
              {(avatarPreview || avatarUrl) ? (
                <img
                  src={avatarPreview || avatarUrl}
                  alt="Avatar"
                  className="w-20 h-20 rounded-full object-cover shadow-xl ring-4 ring-amber-400/50"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-xl ring-4 ring-amber-400/50">
                  <span className="text-emerald-950 font-black text-2xl">{initials}</span>
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 shadow-lg hover:bg-emerald-600 transition-colors"
              >
                <Camera className="w-3.5 h-3.5 text-white" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            {/* Name + edit */}
            <div className="mt-3 text-center">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editNameValue}
                    onChange={e => setEditNameValue(e.target.value)}
                    autoFocus
                    maxLength={80}
                    className="flex-1 min-w-0 bg-white/15 border border-white/30 rounded-xl px-2 py-1 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                    onKeyDown={e => {
                      if (e.key === "Enter") handleSaveProfile();
                      if (e.key === "Escape") {
                        setEditingName(false);
                        setEditNameValue(user?.user_metadata?.full_name || "");
                      }
                    }}
                  />
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 flex items-center justify-center transition-colors"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                  <button
                    onClick={() => { setEditingName(false); setEditNameValue(user?.user_metadata?.full_name || ""); }}
                    className="flex-shrink-0 w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
                  >
                    <span className="text-white text-xs font-bold">✕</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-1.5">
                  <h1 className="font-bold text-white text-lg">
                    {user?.user_metadata?.full_name || user?.email || "Utilisateur"}
                  </h1>
                  <button
                    onClick={() => { setEditNameValue(user?.user_metadata?.full_name || ""); setEditingName(true); }}
                    className="w-6 h-6 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
                    title="Modifier le nom"
                  >
                    <Edit3 className="w-3 h-3 text-white/80" />
                  </button>
                </div>
              )}
              <p className="text-emerald-300/70 text-xs mt-0.5">{user?.email || ""}</p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-3">
              <Link
                to="/Settings"
                className="px-4 py-1.5 rounded-full bg-white/15 border border-white/20 text-white text-xs font-semibold hover:bg-white/25 transition-colors flex items-center gap-1.5"
              >
                <Settings className="w-3.5 h-3.5" /> Paramètres
              </Link>
              <button
                  onClick={() => setShowInvitePoster(true)}
                  className="px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-semibold hover:bg-amber-500/30 transition-colors flex items-center gap-1.5"
                >
                  <Gift className="w-3.5 h-3.5" /> Inviter
                </button>
              <Link
                to="/Help"
                className="px-4 py-1.5 rounded-full bg-white/15 border border-white/20 text-white text-xs font-semibold hover:bg-white/25 transition-colors flex items-center gap-1.5"
              >
                <HelpCircle className="w-3.5 h-3.5" /> Aide
              </Link>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="px-4 py-1.5 rounded-full bg-red-500/20 border border-red-400/30 text-red-300 text-xs font-semibold hover:bg-red-500/30 transition-colors flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" /> Déco
              </button>
            </div>
          </motion.div>

          {/* Stats — 4 columns */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="mt-5 bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-4"
          >
            <div className="grid grid-cols-4 divide-x divide-white/15">
              {[
                { value: totalMemorized, label: "Versets" },
                { value: completedSurahs, label: "Sourates" },
                { value: inProgressSurahs, label: "En cours" },
              ].map(({ value, label }) => (
                <div key={label} className="text-center px-2">
                  <p className="text-white font-black text-lg leading-none">{value}</p>
                  <p className="text-white/50 text-[10px] mt-1">{label}</p>
                </div>
              ))}
              <button
                onClick={() => navigate("/Leaderboard")}
                className="text-center px-2 hover:opacity-80 active:scale-95 transition-all"
              >
                <p className="text-white font-black text-lg leading-none">🏆</p>
                <p className="text-amber-300/80 text-[10px] mt-1">Classement</p>
              </button>
            </div>
          </motion.div>

          {/* Bio */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="mt-3 text-center space-y-1"
          >
            <p className="text-white/80 text-xs">
              📖 {completedSurahs >= 114 ? 'Hafidh' : completedSurahs >= 30 ? 'Avancé' : completedSurahs >= 5 ? 'Intermédiaire' : 'Débutant'} · Parcours Coran
            </p>
            <p className="text-white/50 text-[11px]">
              📅 Membre depuis {user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '...'}
            </p>
          </motion.div>

        </div>
      </div>

      {/* ─── CONTENT ─── */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 pb-nav space-y-6 flex flex-col flex-1">

        {/* ─── AVATAR PREVIEW CONFIRM ─── */}
        {avatarPreview && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40">
              <img src={avatarPreview} alt="Aperçu" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Aperçu de la photo</p>
                <p className="text-[10px] text-emerald-500 dark:text-emerald-500 truncate">{avatarFile?.name}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => { setAvatarFile(null); setAvatarPreview(null); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg border border-border"
                >
                  Annuler
                </button>
                <button
                  onClick={handleUploadAvatar}
                  disabled={uploadingAvatar}
                  className="text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 transition-colors px-3 py-1 rounded-lg flex items-center gap-1"
                >
                  {uploadingAvatar && <Loader2 className="w-3 h-3 animate-spin" />}
                  Confirmer
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {saveError && (
          <p className="text-xs text-red-500 px-1">{saveError}</p>
        )}
        {saveSuccess && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 px-1 flex items-center gap-1">
            <Check className="w-3 h-3" /> Profil mis à jour !
          </p>
        )}

        {/* ─── FEED DE SUCCÈS ─── */}

        {/* Posts de succès individuels */}
        {successFeedPosts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-border text-center"
          >
            <p className="text-2xl mb-2">🌱</p>
            <p className="text-sm font-semibold text-foreground">Commence ta mémorisation !</p>
            <p className="text-xs text-muted-foreground mt-1">Tes succès apparaîtront ici au fil de ta progression.</p>
          </motion.div>
        ) : (
          successFeedPosts.map((post, idx) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 + idx * 0.04 }}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-border overflow-hidden"
            >
              {/* Post header */}
              <div className="flex items-center gap-2.5 px-4 pt-4 pb-3 border-b border-border/50">
                {(avatarPreview || avatarUrl) ? (
                  <img src={avatarPreview || avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${levelConfig.gradient}`}>
                    <span className="text-white font-bold text-[10px]">{initials}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Moi"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{post.type === "completed" ? "Sourate complétée" : "En cours de mémorisation"}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                  post.type === "completed"
                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                    : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                }`}>
                  {post.type === "completed" ? "✅ Terminé" : "📖 En cours"}
                </span>
              </div>
              {/* Post body */}
              <div className="px-4 py-3">
                <p className="text-sm text-foreground leading-relaxed">{post.text}</p>
              </div>
              {/* Post actions */}
              <div className="flex gap-2 px-4 pb-4">
                <button
                  onClick={() => handleShareText(post.text)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-muted-foreground bg-muted hover:bg-muted/80 transition-colors border border-border"
                >
                  <Share2 className="w-3 h-3" /> Partager
                </button>
                <button
                  onClick={() => handleCopyText(post.text)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-muted-foreground bg-muted hover:bg-muted/80 transition-colors border border-border"
                >
                  <Copy className="w-3 h-3" /> Copier
                </button>
              </div>
            </motion.div>
          ))
        )}

        {/* ─── FOOTER ─── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="!mt-auto pt-2 pb-nav border-t border-border"
        >
          <div className="flex items-center justify-center gap-4 py-3">
            <Link
              to="/terms"
              className="text-xs text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              Conditions d'utilisation
            </Link>
            <span className="w-1 h-1 rounded-full bg-border" />
            <Link
              to="/privacy"
              className="text-xs text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              Politique des données
            </Link>
          </div>
          <div className="text-center space-y-1 pb-2">
            <p className="text-[11px] text-muted-foreground/70">MyHafizz v0.1 Beta</p>
            <p className="text-[11px] text-muted-foreground/50">Made with ❤️ from Samatiguila</p>
          </div>
        </motion.div>

      </div>

      {/* ─── INVITE POSTER MODAL ─── */}
      <InvitePosterModal
        open={showInvitePoster}
        onClose={() => setShowInvitePoster(false)}
        user={user}
        avatarUrl={avatarUrl}
        avatarPreview={avatarPreview}
        initials={initials}
        totalMemorized={totalMemorized}
        completedSurahs={completedSurahs}
        overallPercent={overallPercent}
        toast={toast}
      />

      {/* ─── LOGOUT CONFIRMATION POPUP ─── */}
      {showLogoutConfirm && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowLogoutConfirm(false)}
          />
          {/* Simple centered popup */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-xl">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Déconnexion</h3>
                <p className="text-sm text-muted-foreground">
                  Êtes-vous sûr de vouloir vous déconnecter ?
                </p>
                <div className="flex gap-3 w-full mt-2">
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl border border-border text-foreground font-semibold text-sm hover:bg-muted transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={logout}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors"
                  >
                    Se déconnecter
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}