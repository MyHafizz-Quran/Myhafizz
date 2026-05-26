import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/api/supabaseClient";
import { StudyProfile, StudyMatchEntity, MemorizationProgress } from "@/api/entities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Users, Search, SlidersHorizontal, UserCheck, Bell, Sparkles } from "lucide-react";
import ProfileSetupModal from "@/components/study/ProfileSetupModal";
import MatchCard from "@/components/study/MatchCard";
import { useToast } from "@/components/ui/use-toast";

const LEVEL_ORDER = { "débutant": 0, "intermédiaire": 1, "avancé": 2, "hafidh": 3 };

function computeScore(myProfile, other) {
  let score = 0;
  const myLvl = LEVEL_ORDER[myProfile.level] ?? 0;
  const otherLvl = LEVEL_ORDER[other.level] ?? 0;
  const diff = Math.abs(myLvl - otherLvl);

  if (myProfile.looking_for === "même niveau" && diff === 0) score += 40;
  else if (myProfile.looking_for === "niveau supérieur" && otherLvl > myLvl) score += 40;
  else if (myProfile.looking_for === "peu importe") score += 20;
  else if (diff <= 1) score += 15;

  const sharedSlots = (myProfile.availability || []).filter(s => (other.availability || []).includes(s));
  score += sharedSlots.length * 15;

  return score;
}

export default function StudyMatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [showSetup, setShowSetup] = useState(false);
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState("tous");
  const [activeTab, setActiveTab] = useState("discover"); // discover | matches | requests

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUser(data.user)).catch(() => {}); }, []);

  // Fetch all profiles (including invisible) so we can always find the current user's own profile.
  // Visible filtering for the Discover feed is done client-side below.
  const { data: profiles = [] } = useQuery({
    queryKey: ["study-profiles"],
    queryFn: () => StudyProfile.listAll(),
  });

  const { data: matches = [] } = useQuery({
    queryKey: ["study-matches"],
    queryFn: () => StudyMatchEntity.list(),
  });

  const { data: progressList = [] } = useQuery({
    queryKey: ["memorization-progress"],
    queryFn: () => MemorizationProgress.list(),
  });

  const myProfile = profiles.find(p => p.user_email === user?.email);
  const totalMemorized = progressList.reduce((sum, p) => sum + (p.memorized_verses?.length || 0), 0);

  const saveProfileMutation = useMutation({
    mutationFn: (form) => {
      const data = {
        ...form,
        user_email: user.email,
        user_name: user.user_metadata?.full_name || user.email,
        memorized_count: totalMemorized,
        avatar_url: user.user_metadata?.avatar_url || null,
      };
      if (myProfile) return StudyProfile.update(myProfile.id, data);
      return StudyProfile.upsert(data);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["study-profiles"] }); setShowSetup(false); },
    onError: (error) => {
      toast({ title: "Erreur", description: error?.message || "Impossible de sauvegarder le profil.", variant: "destructive" });
    },
  });

  const requestMutation = useMutation({
    mutationFn: ({ targetEmail, targetName }) => {
      // If there's already a rejected match, update it to pending instead of creating a duplicate
      const rejectedMatch = matches.find(
        m => m.requester_email === user.email && m.target_email === targetEmail && m.status === "rejected"
      );
      if (rejectedMatch) {
        return StudyMatchEntity.update(rejectedMatch.id, { status: "pending" });
      }
      return StudyMatchEntity.create({
        requester_email: user.email, requester_name: user.user_metadata?.full_name || user.email,
        target_email: targetEmail, target_name: targetName,
        status: "pending",
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["study-matches"] }),
  });

  const updateMatchMutation = useMutation({
    mutationFn: ({ id, status }) => StudyMatchEntity.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["study-matches"] }),
  });

  function getMatchStatus(otherEmail) {
    const sent = matches.find(m => m.requester_email === user?.email && m.target_email === otherEmail);
    const received = matches.find(m => m.requester_email === otherEmail && m.target_email === user?.email);
    if (sent?.status === "accepted" || received?.status === "accepted") return "accepted";
    if (sent?.status === "pending") return "pending_sent";
    if (received?.status === "pending") return "pending_received";
    // "rejected" falls through to "none" so user can re-send a request
    return "none";
  }

  // Only show visible profiles in the Discover feed; the current user's own profile is excluded separately.
  const otherProfiles = profiles.filter(p => p.user_email !== user?.email && p.is_visible !== false);

  const rankedProfiles = useMemo(() => {
    if (!myProfile) return otherProfiles;
    return [...otherProfiles].sort((a, b) => computeScore(myProfile, b) - computeScore(myProfile, a));
  }, [myProfile, otherProfiles]);

  const filteredWithScore = useMemo(() => {
    return rankedProfiles
      .filter(p => {
        const matchSearch = p.user_name?.toLowerCase().includes(search.toLowerCase());
        const matchLevel = filterLevel === "tous" || p.level === filterLevel;
        return matchSearch && matchLevel;
      })
      .map(p => ({ profile: p, score: myProfile ? computeScore(myProfile, p) : null }));
  }, [rankedProfiles, search, filterLevel, myProfile]);

  const acceptedMatches = matches.filter(m =>
    m.status === "accepted" && (m.requester_email === user?.email || m.target_email === user?.email)
  );
  const pendingReceived = matches.filter(m => m.target_email === user?.email && m.status === "pending");

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="bg-white/[0.97] dark:bg-gray-950/[0.97] backdrop-blur-xl border-b border-border/60 sticky top-0 z-[var(--z-page-header)] shadow-[0_2px_8px_rgba(0,0,0,0.05)] dark:shadow-none">
        <div className="max-w-3xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <Link to="/Dashboard">
            <button className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <Users className="w-5 h-5 text-emerald-600" />
          <h1 className="text-base font-bold text-gray-900 dark:text-white flex-1">Partenaires d'étude</h1>
          {pendingReceived.length > 0 && (
            <button onClick={() => setActiveTab("requests")} className="relative">
              <Bell className="w-5 h-5 text-amber-500" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {pendingReceived.length}
              </span>
            </button>
          )}
          <button
            onClick={() => setShowSetup(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-primary/10 dark:bg-primary/20 text-primary dark:text-emerald-400 border border-primary/20 dark:border-primary/30 hover:bg-primary/20 transition-colors"
          >
            <UserCheck className="w-3.5 h-3.5" />
            {myProfile ? "Mon profil" : "Créer profil"}
            {myProfile && myProfile.is_visible === false && (
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40 leading-none">
                Indisponible
              </span>
            )}
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-3xl mx-auto px-4 pb-0 flex gap-0 border-t border-gray-100 dark:border-gray-800">
          {[
            { key: "discover", label: "Découvrir", count: filteredWithScore.length },
            { key: "matches", label: "Mes partenaires", count: acceptedMatches.length },
            { key: "requests", label: "Demandes", count: pendingReceived.length },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}>
              {tab.label}
              {tab.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === tab.key
                    ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">

        {/* No profile banner */}
        {!myProfile && activeTab === "discover" && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/10 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-4 flex items-center gap-3"
          >
            <span className="text-2xl">👤</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Créez votre profil pour être visible</p>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-500">Les autres apprenants pourront vous trouver et vous proposer de travailler ensemble.</p>
            </div>
            <button onClick={() => setShowSetup(true)}
              className="px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors flex-shrink-0">
              Commencer
            </button>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {/* DISCOVER TAB */}
          {activeTab === "discover" && (
            <motion.div key="discover" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.15 }} className="space-y-4">

              {/* Hero Banner */}
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-2xl p-5 text-white shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-black leading-tight">Trouve ton partenaire 🤝</p>
                    <p className="text-sm opacity-80 mt-1">Progressez ensemble dans la mémorisation du Coran</p>
                  </div>
                  <Sparkles className="w-6 h-6 opacity-60" />
                </div>
                <div className="flex gap-6 mt-4">
                  <div>
                    <p className="text-2xl font-black">{otherProfiles.length}</p>
                    <p className="text-xs opacity-70">Profils actifs</p>
                  </div>
                  <div className="border-l border-white/20 pl-6">
                    <p className="text-2xl font-black">{acceptedMatches.length}</p>
                    <p className="text-xs opacity-70">Partenariats actifs</p>
                  </div>
                </div>
              </motion.div>

              {/* Search + filter */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Rechercher un apprenant..."
                    className="w-full pl-10 pr-4 py-3 text-sm rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 outline-none focus:border-emerald-400 shadow-sm transition-shadow focus:shadow-md"
                  />
                </div>
                <select
                  value={filterLevel} onChange={e => setFilterLevel(e.target.value)}
                  className="px-3 py-3 text-sm rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 outline-none focus:border-emerald-400 shadow-sm"
                >
                  <option value="tous">Tous niveaux</option>
                  <option value="débutant">🌱 Débutant</option>
                  <option value="intermédiaire">📖 Intermédiaire</option>
                  <option value="avancé">🔥 Avancé</option>
                  <option value="hafidh">🏆 Hafidh</option>
                </select>
              </div>

              {/* Compatibility hint */}
              {myProfile && (
                <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3 h-3" />
                  Triés par compatibilité avec votre profil
                </p>
              )}

              {filteredWithScore.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-5xl mb-3">🔍</div>
                  <p className="font-bold text-gray-700 dark:text-gray-300">Aucun apprenant trouvé</p>
                  <p className="text-sm text-gray-400 mt-1">Invitez vos amis à rejoindre l'application !</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {filteredWithScore.map(({ profile, score }, i) => (
                    <MatchCard
                      key={profile.id}
                      profile={profile}
                      matchStatus={getMatchStatus(profile.user_email)}
                      score={score}
                      delay={i * 0.05}
                      onRequest={() => requestMutation.mutate({ targetEmail: profile.user_email, targetName: profile.user_name })}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* MATCHES TAB */}
          {activeTab === "matches" && (
            <motion.div key="matches" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }} className="space-y-4">
              {acceptedMatches.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-5xl mb-3">🤝</div>
                  <p className="font-bold text-gray-700 dark:text-gray-300">Aucun partenaire pour l'instant</p>
                  <p className="text-sm text-gray-400 mt-1">Envoyez des demandes depuis l'onglet Découvrir</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {acceptedMatches.map((m, i) => {
                    const partnerEmail = m.requester_email === user?.email ? m.target_email : m.requester_email;
                    const profile = profiles.find(p => p.user_email === partnerEmail);
                    if (!profile) return null;
                    return (
                      <MatchCard key={m.id} profile={profile} matchStatus="accepted" delay={i * 0.05} isMe={false} />
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* REQUESTS TAB */}
          {activeTab === "requests" && (
            <motion.div key="requests" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }} className="space-y-4">
              {pendingReceived.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-5xl mb-3">🔔</div>
                  <p className="font-bold text-gray-700 dark:text-gray-300">Aucune demande en attente</p>
                  <p className="text-sm text-gray-400 mt-1">Vous serez notifié ici quand quelqu'un souhaite étudier avec vous</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {pendingReceived.map((m, i) => {
                    const profile = profiles.find(p => p.user_email === m.requester_email);
                    if (!profile) return null;
                    return (
                      <MatchCard
                        key={m.id}
                        profile={profile}
                        matchStatus="pending_received"
                        delay={i * 0.05}
                        onAccept={() => updateMatchMutation.mutate({ id: m.id, status: "accepted" })}
                        onDecline={() => updateMatchMutation.mutate({ id: m.id, status: "rejected" })}
                      />
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showSetup && (
          <ProfileSetupModal
            initial={myProfile}
            user={user}
            isSaving={saveProfileMutation.isPending}
            onSave={saveProfileMutation.mutate}
            onClose={() => setShowSetup(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}