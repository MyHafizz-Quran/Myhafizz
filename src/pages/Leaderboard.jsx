import React, { useMemo } from "react";
import { supabase } from "@/api/neonClient";
import { useQuery } from "@tanstack/react-query";
import { CaretLeft, Trophy } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { TOTAL_VERSES } from "@/components/quranData";
import { useAuth } from "@/lib/AuthContext";


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

  const me = rankings.find((r) => r.isMe);
  const Avatar = ({ r, size = 40 }) => r.avatarSrc
    ? <img src={r.avatarSrc} alt="" style={{ width: size, height: size }} className="rounded-full object-cover shrink-0" />
    : <span style={{ width: size, height: size }} className={`rounded-full font-black flex items-center justify-center shrink-0 ${r.isMe ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}`}>{r.initials}</span>;

  return (
    <div className="min-h-[100dvh] bg-background pb-nav">
      <div className="max-w-2xl mx-auto px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)]">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} aria-label="Retour" className="w-10 h-10 -ml-1 rounded-full flex items-center justify-center active:bg-muted"><CaretLeft weight="bold" className="w-6 h-6" /></button>
          <h1 className="text-[26px] font-black">Classement</h1>
        </div>
        <p className="text-sm font-semibold text-muted-foreground ml-1">Selon le nombre de versets mémorisés</p>

        {me && (
          <div className="card-flat p-4 mt-4 flex items-center gap-3 border-primary">
            <span className="text-[26px] font-black text-primary w-12 text-center">{me.rank}<sup className="text-xs">{me.rank === 1 ? "er" : "e"}</sup></span>
            <div className="flex-1 min-w-0"><p className="font-black">Ta place</p><p className="text-[12.5px] font-semibold text-muted-foreground">{me.total} versets sur {rankings.length} participants</p></div>
            <Trophy weight="fill" className="w-7 h-7 text-gold" />
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2 mt-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />)}</div>
        ) : !rankings.length ? (
          <div className="card-flat p-6 mt-4 text-center font-bold text-muted-foreground">Le classement apparaîtra dès les premiers versets mémorisés.</div>
        ) : (
          <div className="card-flat overflow-hidden divide-y-2 divide-border mt-4">
            {rankings.slice(0, 50).map((r) => (
              <div key={r.userId} className={`flex items-center gap-3 p-3.5 ${r.isMe ? "bg-accent" : ""}`}>
                <span className={`w-7 text-center font-black ${r.rank <= 3 ? "text-gold-lip" : "text-muted-foreground"}`}>{r.rank}</span>
                <Avatar r={r} />
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold truncate">{r.displayName}{r.isMe ? " (toi)" : ""}</p>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1.5"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, r.percent)}%` }} /></div>
                </div>
                <span className="font-black text-sm shrink-0">{r.total}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
