import React from "react";
import { supabase } from "@/api/neonClient";
import { Challenge, ChallengeParticipant, MemorizationProgress } from "@/api/entities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, Users, Calendar, CheckCircle2, Zap, Medal, Crown, Star, Lock } from "lucide-react";
import { SURAHS } from "@/components/quranData";

function daysDiff(dateStr) {
  const diff = new Date(dateStr) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function progressPercent(memorized, target) {
  if (!target) return 0;
  return Math.min(100, Math.round((memorized / target) * 100));
}

const RANK_COLORS = ["text-amber-400", "text-gray-400", "text-amber-600"];
const RANK_ICONS = [Crown, Medal, Star];

const LEVEL_BADGES = [
  { min: 0, max: 24, label: "Bronze", color: "from-amber-700 to-amber-600", emoji: "🥉" },
  { min: 25, max: 49, label: "Argent", color: "from-gray-400 to-gray-300", emoji: "🥈" },
  { min: 50, max: 74, label: "Or", color: "from-amber-400 to-amber-300", emoji: "🥇" },
  { min: 75, max: 100, label: "Hafidh", color: "from-emerald-500 to-emerald-400", emoji: "🌟" },
];

function getLevelBadge(pct) {
  return LEVEL_BADGES.find(b => pct >= b.min && pct <= b.max) || LEVEL_BADGES[0];
}

export default function Challenges() {
  const queryClient = useQueryClient();
  const [user, setUser] = React.useState(null);
  React.useEffect(() => { supabase.auth.getUser().then(({ data }) => setUser(data.user)).catch(() => {}); }, []);

  const { data: challenges = [] } = useQuery({
    queryKey: ["challenges"],
    queryFn: () => Challenge.filter({ is_active: true }, "-created_date"),
  });

  const { data: allParticipants = [] } = useQuery({
    queryKey: ["challenge-participants"],
    queryFn: () => ChallengeParticipant.list(),
  });

  const { data: progressList = [] } = useQuery({
    queryKey: ["memorization-progress"],
    queryFn: () => MemorizationProgress.list(),
  });

  const joinMutation = useMutation({
    mutationFn: ({ challengeId }) =>
      ChallengeParticipant.create({
        challenge_id: challengeId,
        user_email: user.email,
        user_name: user.user_metadata?.full_name || user.email,
        memorized_count: 0,
        completed: false,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["challenge-participants"] }),
  });

  const syncMutation = useMutation({
    mutationFn: ({ participant, challenge }) => {
      const prog = progressList.find(p => p.surah_number === challenge.surah_number);
      const memorized = prog?.memorized_verses?.length || 0;
      const completed = memorized >= challenge.target_verses;
      return ChallengeParticipant.update(participant.id, {
        memorized_count: memorized,
        completed,
        ...(completed && !participant.completed ? { completed_date: new Date().toISOString() } : {}),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["challenge-participants"] }),
  });

  const myParticipations = allParticipants.filter(p => p.user_id === user?.id);

  return (
    <div className="min-h-screen bg-background">
      {/* Glass Header */}
      <div className="bg-white/[0.97] dark:bg-gray-950/[0.97] backdrop-blur-xl border-b border-border/60 sticky top-0 z-[var(--z-page-header)] shadow-[0_2px_8px_rgba(0,0,0,0.05)] dark:shadow-none">
        <div className="max-w-3xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <Link to="/Dashboard">
            <button className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-amber-500" />
          </div>
          <h1 className="text-base font-black text-foreground flex-1">Défis de Mémorisation</h1>
          <span className="text-xs font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
            {challenges.length} défi{challenges.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* My badges */}
        {myParticipations.some(p => p.completed) && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="glass-card p-4 border border-amber-100/60 dark:border-amber-900/20"
          >
            <p className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" /> Mes badges obtenus
            </p>
            <div className="flex flex-wrap gap-2">
              {myParticipations.filter(p => p.completed).map(p => {
                const ch = challenges.find(c => c.id === p.challenge_id);
                if (!ch) return null;
                return (
                  <div key={p.id} className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/40 rounded-xl px-3 py-1.5 shadow-sm">
                    <span className="text-lg">{ch.badge_emoji}</span>
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-300">{ch.badge_name}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Challenges list */}
        {challenges.length === 0 ? (
          <div className="text-center py-20 glass-card">
            <Trophy className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="font-bold text-foreground">Aucun défi actif pour l'instant</p>
            <p className="text-sm text-muted-foreground mt-1">Revenez bientôt !</p>
          </div>
        ) : (
          <div className="space-y-5">
            {challenges.map((challenge, ci) => {
              const surah = SURAHS.find(s => s.number === challenge.surah_number);
              const participants = allParticipants.filter(p => p.challenge_id === challenge.id);
              const myEntry = participants.find(p => p.user_id === user?.id);
              const isJoined = !!myEntry;
              const daysLeft = daysDiff(challenge.deadline);
              const isExpired = daysLeft === 0;
              const myPct = progressPercent(myEntry?.memorized_count || 0, challenge.target_verses);
              const level = getLevelBadge(myPct);
              const leaderboard = [...participants].sort((a, b) => (b.memorized_count || 0) - (a.memorized_count || 0));

              return (
                <motion.div
                  key={challenge.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: ci * 0.08 }}
                  className="glass-card overflow-hidden"
                >
                  {/* Challenge header */}
                  <div className="bg-gradient-to-r from-emerald-700 to-emerald-800 dark:from-emerald-800 dark:to-emerald-950 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-2xl">{challenge.badge_emoji}</span>
                          <h3 className="text-white font-black text-base leading-tight">{challenge.title}</h3>
                        </div>
                        {challenge.description && (
                          <p className="text-emerald-200/80 text-xs leading-relaxed">{challenge.description}</p>
                        )}
                      </div>
                      <div className={`flex-shrink-0 text-center px-3 py-1.5 rounded-xl text-xs font-black ${
                        isExpired ? "bg-red-500/20 text-red-200" : daysLeft <= 2 ? "bg-amber-500/20 text-amber-200" : "bg-white/15 text-white"
                      }`}>
                        <Calendar className="w-3 h-3 mx-auto mb-0.5" />
                        {isExpired ? "Terminé" : `J-${daysLeft}`}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-xs text-emerald-200">
                      {surah && (
                        <span className="flex items-center gap-1">
                          <span className="font-arabic text-white text-sm">{surah.name}</span>
                          <span>· {challenge.target_verses} versets</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {participants.length} participant{participants.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Level badge + my progress */}
                    {isJoined && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r ${level.color} text-white text-xs font-black shadow-sm`}>
                            <span>{level.emoji}</span> Niveau {level.label}
                          </div>
                          <div className="flex items-center gap-2">
                            {myEntry.completed ? (
                              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Défi relevé !
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {myEntry.memorized_count || 0}/{challenge.target_verses} versets
                              </span>
                            )}
                            <button
                              onClick={() => syncMutation.mutate({ participant: myEntry, challenge })}
                              disabled={syncMutation.isPending}
                              className="flex items-center gap-1 text-xs font-bold text-primary dark:text-emerald-400 hover:text-primary/80 px-2 py-1 rounded-lg hover:bg-primary/10 transition-colors"
                            >
                              <Zap className="w-3 h-3" /> Sync
                            </button>
                          </div>
                        </div>
                        <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                          <motion.div
                            animate={{ width: `${myPct}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className={`h-3 rounded-full ${myEntry.completed ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : "bg-gradient-to-r from-amber-400 to-amber-500"}`}
                          />
                        </div>
                      </div>
                    )}

                    {/* Leaderboard */}
                    {leaderboard.length > 0 && (
                      <div>
                        <p className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Trophy className="w-3 h-3" /> Classement
                        </p>
                        <div className="space-y-1.5">
                          {leaderboard.slice(0, 5).map((p, rank) => {
                            const RankIcon = RANK_ICONS[rank] || null;
                            const isMe = p.user_id === user?.id;
                            const initials = (p.user_name || p.user_email || "?")[0].toUpperCase();
                            return (
                              <div key={p.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors ${
                                isMe ? "bg-primary/8 dark:bg-primary/20 border border-primary/20 dark:border-primary/30" : "bg-muted/60"
                              }`}>
                                <div className="w-5 text-center flex-shrink-0">
                                  {RankIcon ? (
                                    <RankIcon className={`w-4 h-4 mx-auto ${RANK_COLORS[rank]}`} />
                                  ) : (
                                    <span className="text-xs font-bold text-muted-foreground">#{rank + 1}</span>
                                  )}
                                </div>
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0">
                                  <span className="text-white text-[10px] font-black">{initials}</span>
                                </div>
                                <span className={`flex-1 text-sm font-medium truncate ${isMe ? "text-primary dark:text-emerald-300 font-bold" : "text-foreground"}`}>
                                  {p.user_name || p.user_email} {isMe && <span className="text-xs opacity-70">(moi)</span>}
                                </span>
                                {p.completed && <span className="text-base" title="Défi complété">✅</span>}
                                <span className="text-xs font-bold text-muted-foreground flex-shrink-0">
                                  {p.memorized_count || 0}/{challenge.target_verses}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Join / status button */}
                    <div className="pt-1">
                      {!isJoined ? (
                        <button
                          onClick={() => joinMutation.mutate({ challengeId: challenge.id })}
                          disabled={joinMutation.isPending || isExpired || !user}
                          className={`w-full py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all ${
                            isExpired
                              ? "bg-muted text-muted-foreground cursor-not-allowed"
                              : "hafiz-gradient-gold text-emerald-950 shadow-sm shadow-amber-400/25 hover:opacity-90"
                          }`}
                        >
                          {isExpired ? <><Lock className="w-4 h-4" /> Défi terminé</> : <><Zap className="w-4 h-4" /> Rejoindre ce défi</>}
                        </button>
                      ) : myEntry.completed ? (
                        <div className="w-full py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 bg-primary/8 dark:bg-primary/20 text-primary dark:text-emerald-300 border border-primary/20 dark:border-primary/30">
                          <span className="text-lg">{challenge.badge_emoji}</span>
                          Badge «{challenge.badge_name}» obtenu !
                        </div>
                      ) : (
                        <Link to={`/Memorize?surah=${challenge.surah_number}`}>
                          <button className="w-full py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors">
                            <Zap className="w-4 h-4" /> Continuer à mémoriser
                          </button>
                        </Link>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
