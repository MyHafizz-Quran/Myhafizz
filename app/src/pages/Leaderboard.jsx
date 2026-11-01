import React, { useMemo, useState } from "react";
import { db } from "@/api/neonClient";
import { useQuery } from "@tanstack/react-query";
import { Trophy } from "@phosphor-icons/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ReadingSessions } from "@/api/entities/learning";
import { weekStart, daysLeftInWeek } from "@/lib/readingGame";
import { TOTAL_VERSES } from "@/components/quranData";
import { useAuth } from "@/lib/AuthContext";
import PageHeader from "@/components/PageHeader";
import PlayerPic from "@/components/PlayerPic";


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
  const [params, setParams] = useSearchParams();
  const [tab, setTabState] = useState(params.get("tab") === "lecture" ? "lecture" : "hifz");
  const setTab = (t) => { setTabState(t); setParams(t === "lecture" ? { tab: "lecture" } : {}, { replace: true }); };
  const since = weekStart().toISOString();
  const { data: readingBoard = [], isLoading: readLoading } = useQuery({
    queryKey: ["reading-leaderboard", since],
    queryFn: () => ReadingSessions.leaderboard(since),
  });

  const { data: allProgress = [], isLoading } = useQuery({
    queryKey: ["leaderboard-progress"],
    queryFn: async () => {
      // totaux seulement : le détail des versets de chacun reste privé
      const { data, error } = await db.rpc("get_memorization_leaderboard");
      if (error) throw error;
      return data;
    },
  });

  const uniqueUserIds = useMemo(
    () => [...new Set([...allProgress.map(p => p.user_id), ...readingBoard.map(r => r.user_id)])].sort(),
    [allProgress, readingBoard]
  );

  const { data: userDisplayData = [] } = useQuery({
    queryKey: ["leaderboard-user-display", uniqueUserIds],
    queryFn: async () => {
      const userIds = uniqueUserIds;
      if (userIds.length === 0) return [];

      try {
        const { data, error } = await db.rpc("get_leaderboard_users", {
          user_ids: userIds,
        });
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.warn("Failed to fetch user display names via RPC, falling back to profiles table:", err);
        try {
          const { data, error } = await db
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
    if (tab === "lecture") readingBoard.forEach(r => { totals[r.user_id] = Number(r.xp) || 0; });
    else allProgress.forEach(p => {
      totals[p.user_id] = Number(p.total) || 0;
    });
    const max = Math.max(1, ...Object.values(totals));
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
          percent: tab === "lecture" ? (total / max) * 100 : TOTAL_VERSES > 0 ? (total / TOTAL_VERSES) * 100 : 0,
          isMe,
          displayName,
          initials,
          avatarSrc,
        };
      });
  }, [allProgress, readingBoard, tab, user, userDisplayMap]);
  const loading = tab === "lecture" ? readLoading : isLoading;
  const left = daysLeftInWeek();
  const unitLabel = tab === "lecture" ? "points" : "versets";

  const me = rankings.find((r) => r.isMe);
  const Avatar = ({ r, size = 40 }) => <PlayerPic p={{ id: r.userId, name: r.displayName, image: r.avatarSrc }} size={size} tone={r.isMe ? "primary" : "accent"} />;

  return (
    <div className="min-h-[100dvh] bg-background pb-nav">
      <div className="max-w-2xl mx-auto px-4">
        <PageHeader title="Classement" back />
        <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-muted mt-3">
          {[["hifz", "Mémorisation"], ["lecture", "Lecture"]].map(([k, t]) => (
            <button key={k} onClick={() => setTab(k)} className={`h-10 rounded-xl font-extrabold text-sm ${tab === k ? "bg-card text-foreground border-2 border-border" : "text-muted-foreground"}`}>{t}</button>
          ))}
        </div>
        <p className="text-sm font-semibold text-muted-foreground ml-1 mt-2">{tab === "lecture" ? `Points de lecture gagnés cette semaine · remise à zéro dans ${left} jour${left > 1 ? "s" : ""}` : "Selon le nombre de versets mémorisés"}</p>

        {me && (
          <div className="card-flat p-4 mt-4 flex items-center gap-3 border-primary">
            <span className="text-[26px] font-black text-primary w-12 text-center">{me.rank}<sup className="text-xs">{me.rank === 1 ? "er" : "e"}</sup></span>
            <div className="flex-1 min-w-0"><p className="font-black">Ta place</p><p className="text-[12.5px] font-semibold text-muted-foreground">{me.total} {unitLabel} · {rankings.length} participant{rankings.length > 1 ? "s" : ""}</p></div>
            <Trophy weight="fill" className="w-7 h-7 text-gold" />
          </div>
        )}

        {tab === "lecture" && !me && !loading && (
          <button onClick={() => navigate("/LireArabe")} className="card-flat w-full p-4 mt-4 text-left press">
            <p className="font-black">Tu n'es pas encore classé cette semaine</p>
            <p className="text-[12.5px] font-semibold text-muted-foreground">Fais une leçon de lecture pour entrer dans le classement.</p>
          </button>
        )}

        {loading ? (
          <div className="space-y-2 mt-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />)}</div>
        ) : !rankings.length ? (
          <div className="card-flat p-6 mt-4 text-center font-bold text-muted-foreground">{tab === "lecture" ? "Personne n'a encore fait de leçon cette semaine." : "Le classement apparaîtra dès les premiers versets mémorisés."}</div>
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
