import React from "react";
import { supabase } from "@/api/neonClient";
import { Challenge, ChallengeParticipant, MemorizationProgress } from "@/api/entities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CaretLeft, Trophy, UsersThree, CalendarBlank, CheckCircle, ArrowsClockwise, Medal } from "@phosphor-icons/react";
import { SURAHS } from "@/components/quranData";

function daysDiff(dateStr) {
  const diff = new Date(dateStr) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function progressPercent(memorized, target) {
  if (!target) return 0;
  return Math.min(100, Math.round((memorized / target) * 100));
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

  const done = myParticipations.filter((p) => p.completed).map((p) => challenges.find((c) => c.id === p.challenge_id)).filter(Boolean);

  return (
    <div className="min-h-[100dvh] bg-background pb-nav">
      <div className="max-w-2xl mx-auto px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)]">
        <div className="flex items-center gap-2">
          <Link to="/Dashboard" aria-label="Retour" className="w-10 h-10 -ml-1 rounded-full flex items-center justify-center active:bg-muted"><CaretLeft weight="bold" className="w-6 h-6" /></Link>
          <h1 className="text-[26px] font-black flex-1">Défis</h1>
          <span className="text-sm font-extrabold text-muted-foreground">{challenges.length} en cours</span>
        </div>

        {done.length > 0 && (
          <>
            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mt-5 mb-2 ml-1">Mes badges</p>
            <div className="flex flex-wrap gap-2">
              {done.map((c) => (
                <span key={c.id} className="h-9 px-3 rounded-xl bg-gold-tint text-[#8A6400] font-extrabold text-sm flex items-center gap-1.5"><Medal weight="fill" className="w-4 h-4 text-gold" />{c.badge_name || c.title}</span>
              ))}
            </div>
          </>
        )}

        {!challenges.length ? (
          <div className="card-flat p-6 mt-4 text-center">
            <span className="w-14 h-14 mx-auto rounded-2xl bg-accent text-primary flex items-center justify-center"><Trophy weight="fill" className="w-7 h-7" /></span>
            <p className="font-black text-lg mt-3">Aucun défi pour le moment</p>
            <p className="text-sm font-semibold text-muted-foreground mt-1">Les prochains défis communs apparaîtront ici.</p>
          </div>
        ) : (
          <div className="space-y-3 mt-4">
            {challenges.map((challenge) => {
              const surah = SURAHS.find((s) => s.number === challenge.surah_number);
              const participants = allParticipants.filter((p) => p.challenge_id === challenge.id);
              const mine = participants.find((p) => p.user_id === user?.id);
              const daysLeft = daysDiff(challenge.deadline);
              const pct = progressPercent(mine?.memorized_count || 0, challenge.target_verses);
              const top = [...participants].sort((a, b) => (b.memorized_count || 0) - (a.memorized_count || 0)).slice(0, 3);
              return (
                <div key={challenge.id} className="card-flat p-4">
                  <div className="flex items-start gap-3">
                    <span className="w-12 h-12 rounded-2xl bg-accent text-primary flex items-center justify-center shrink-0"><Trophy weight="fill" className="w-6 h-6" /></span>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-[17px] leading-tight">{challenge.title}</p>
                      {challenge.description && <p className="text-[13px] font-semibold text-muted-foreground mt-0.5">{challenge.description}</p>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[12.5px] font-bold text-muted-foreground">
                    <span>{surah?.englishName} · {challenge.target_verses} versets</span>
                    <span className="flex items-center gap-1"><CalendarBlank weight="bold" />{daysLeft ? `${daysLeft} jour${daysLeft > 1 ? "s" : ""} restant${daysLeft > 1 ? "s" : ""}` : "Terminé"}</span>
                    <span className="flex items-center gap-1"><UsersThree weight="bold" />{participants.length} participant{participants.length > 1 ? "s" : ""}</span>
                  </div>

                  {mine ? (
                    <>
                      <div className="flex items-center justify-between mt-3 text-sm font-extrabold">
                        <span>{mine.completed ? <span className="text-primary flex items-center gap-1"><CheckCircle weight="fill" />Défi réussi</span> : "Ta progression"}</span>
                        <span>{mine.memorized_count || 0}/{challenge.target_verses}</span>
                      </div>
                      <div className="h-3 rounded-full bg-muted overflow-hidden mt-1.5"><div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
                      <div className="flex gap-2 mt-3">
                        <Link to={`/Memorize?surah=${challenge.surah_number}`} className="btn-relief flex-1 h-11 bg-primary text-primary-foreground">Mémoriser</Link>
                        <button onClick={() => syncMutation.mutate({ participant: mine, challenge })} disabled={syncMutation.isPending} aria-label="Mettre à jour"
                          className="w-11 h-11 rounded-xl border-2 border-border bg-card flex items-center justify-center"><ArrowsClockwise weight="bold" className={syncMutation.isPending ? "animate-spin" : ""} /></button>
                      </div>
                    </>
                  ) : (
                    <button disabled={!daysLeft || joinMutation.isPending || !user} onClick={() => joinMutation.mutate({ challengeId: challenge.id })}
                      className="btn-relief w-full h-11 mt-3 bg-primary text-primary-foreground disabled:opacity-60">Rejoindre le défi</button>
                  )}

                  {top.length > 0 && (
                    <div className="mt-3 pt-3 border-t-2 border-border space-y-1.5">
                      {top.map((p, i) => (
                        <div key={p.id} className="flex items-center gap-2 text-sm font-bold">
                          <span className="w-5 text-center font-black text-gold-lip">{i + 1}</span>
                          <span className="flex-1 truncate">{(p.user_name || "Participant").split(/[\s@]/)[0]}{p.user_id === user?.id ? " (toi)" : ""}</span>
                          <span className="text-muted-foreground">{p.memorized_count || 0}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
