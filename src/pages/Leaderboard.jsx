import React, { useMemo } from "react";
import { supabase } from "@/api/neonClient";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy } from "@/components/icons";
import { useNavigate } from "react-router-dom";
import { TOTAL_VERSES } from "@/components/quranData";
import { useAuth } from "@/lib/AuthContext";

const MEDAL = ["🥇", "🥈", "🥉"];
const ANIM_BASE_DELAY = 0.12;
const ANIM_DELAY_INCREMENT = 0.03;
const ANIM_MAX_STAGGER = 0.5;
const ANIM_BAR_BASE_DELAY = 0.2;
const ANIM_BAR_DURATION = 0.6;

// Extract first name from a full name string
const getFirstName = (fullName) => {
  if (!fullName) return null;
  const trimmed = fullName.trim();
  if (!trimmed) return null;
  return trimmed.split(" ")[0];
};

export default function Leaderboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: allProgress = [], isLoading } = useQuery({
    queryKey: ["leaderboard-progress"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memorization_progress")
        .select("user_id, memorized_verses");
      if (error) throw error;
      return data;
    },
  });

  const uniqueUserIds = useMemo(
    () => [...new Set(allProgress.map(p => p.user_id))].sort(),
    [allProgress]
  );

  const { data: userDisplayData = [] } = useQuery({
    queryKey: ["leaderboard-user-display", uniqueUserIds],
    queryFn: async () => {
      const userIds = uniqueUserIds;
      if (userIds.length === 0) return [];

      try {
        const { data, error } = await supabase.rpc("get_leaderboard_users", {
          user_ids: userIds,
        });
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.warn("Failed to fetch user display names via RPC, falling back to profiles table:", err);
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url");
          if (error) return [];
          return (data || []).map(p => ({
            user_id: p.id,
            display_name: p.full_name?.trim() || null,
            avatar_url: p.avatar_url || null,
          }));
        } catch {
          return [];
        }
      }
    },
    enabled: uniqueUserIds.length > 0,
  });

  const userDisplayMap = useMemo(() => {
    const map = {};
    userDisplayData.forEach(u => { map[u.user_id] = u; });
    return map;
  }, [userDisplayData]);

  const rankings = useMemo(() => {
    const totals = {};
    allProgress.forEach(p => {
      totals[p.user_id] = (totals[p.user_id] || 0) + (p.memorized_verses?.length || 0);
    });
    return Object.entries(totals)
      .sort(([, a], [, b]) => b - a)
      .map(([userId, total], idx) => {
        const isMe = userId === user?.id;
        const userDisplay = userDisplayMap[userId];
        const displayName = isMe
          ? (getFirstName(user?.user_metadata?.full_name) || user?.email?.split("@")[0] || "Moi")
          : (getFirstName(userDisplay?.display_name) || `Utilisateur #${idx + 1}`);
        const avatarSrc = isMe
          ? (user?.user_metadata?.avatar_url || null)
          : (userDisplay?.avatar_url || null);
        const initials = displayName.slice(0, 1).toUpperCase() || "U";
        return {
          userId,
          total,
          rank: idx + 1,
          percent: TOTAL_VERSES > 0 ? (total / TOTAL_VERSES) * 100 : 0,
          isMe,
          displayName,
          initials,
          avatarSrc,
        };
      });
  }, [allProgress, user, userDisplayMap]);

  return (
    <div className="min-h-screen bg-background pb-28">

      {/* ─── HEADER ─── */}
      <div className="hafiz-gradient-hero relative overflow-hidden pt-safe">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 pb-5 relative">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/Profile")}
              className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-white" />
            </button>
            <div>
              <h1 className="text-white font-black text-xl leading-tight">Classement 🏆</h1>
              <p className="text-white/60 text-xs mt-0.5">
                {isLoading ? "Chargement..." : `${rankings.length} utilisateur${rankings.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 space-y-5">

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          </div>
        ) : rankings.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucun classement disponible pour l'instant.</p>
          </div>
        ) : (
          <>
            {/* ─── FULL RANKING LIST ─── */}
            {rankings.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden"
              >
                <div className="px-4 pt-4 pb-2">
                  <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Classement général</h2>
                </div>
                <div className="divide-y divide-border">
                  {rankings.map((entry, idx) => (
                    <motion.div
                      key={entry.userId}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: ANIM_BASE_DELAY + Math.min(idx * ANIM_DELAY_INCREMENT, ANIM_MAX_STAGGER) }}
                      className={`flex items-center gap-3 px-4 py-3 ${
                        entry.isMe
                          ? "bg-emerald-50 dark:bg-emerald-900/20 border-l-4 border-emerald-500"
                          : ""
                      }`}>
                      {/* Rank */}
                      <div className="w-8 text-center flex-shrink-0">
                        {idx < 3 ? (
                          <span className="text-lg">{MEDAL[idx]}</span>
                        ) : (
                          <span className="text-xs font-bold text-muted-foreground">#{entry.rank}</span>
                        )}
                      </div>

                      {/* Avatar */}
                      {entry.avatarSrc ? (
                        <img src={entry.avatarSrc} alt={entry.displayName} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                          entry.isMe
                            ? "bg-emerald-500 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {entry.initials}
                        </div>
                      )}

                      {/* Name + progress */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className={`text-sm font-semibold truncate ${entry.isMe ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"}`}>{entry.displayName}</p>
                          {entry.isMe && (
                            <span className="text-[9px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded-full flex-shrink-0">Moi</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 max-w-[120px] bg-muted rounded-full h-1.5 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(entry.percent, 100)}%` }}
                              transition={{ delay: ANIM_BAR_BASE_DELAY + Math.min(idx * ANIM_DELAY_INCREMENT, ANIM_MAX_STAGGER), duration: ANIM_BAR_DURATION }}
                              className={`h-full rounded-full ${entry.isMe ? "bg-emerald-500" : "bg-blue-400"}`}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">{Math.round(entry.percent)}%</span>
                        </div>
                      </div>

                      {/* Total verses */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-foreground">{entry.total}</p>
                        <p className="text-[10px] text-muted-foreground">versets</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}