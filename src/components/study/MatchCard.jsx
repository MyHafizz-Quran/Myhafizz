import React from "react";
import { motion } from "framer-motion";
import { MessageCircle, CheckCircle2, XCircle, Hourglass } from "@/components/icons";

const LEVEL_EMOJI = { "débutant": "🌱", "intermédiaire": "📖", "avancé": "🔥", "hafidh": "🏆" };
const LEVEL_COLOR = {
  "débutant": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "intermédiaire": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "avancé": "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  "hafidh": "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
};

const AVATAR_COLORS = [
  "bg-emerald-500",
  "bg-amber-400",
  "bg-violet-500",
  "bg-sky-400",
  "bg-rose-400",
];

const SLOT_EMOJI = { "matin": "🌅", "après-midi": "☀️", "soir": "🌙", "week-end": "📅" };

function getAvatarGradient(name) {
  const idx = (name?.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function formatWhatsApp(raw) {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  // Require between 7 and 15 digits for a valid international phone number
  return digits.length >= 7 && digits.length <= 15 ? digits : null;
}

const MAX_SCORE = 70;

export default function MatchCard({ profile, matchStatus, onRequest, onAccept, onDecline, isMe, delay = 0, score }) {
  const initials = profile.user_name?.split(" ").filter(w => w).map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  const avatarGrad = getAvatarGradient(profile.user_name);
  const compatPercent = score != null ? Math.min(100, Math.round((score / MAX_SCORE) * 100)) : null;
  const isPendingReceived = matchStatus === "pending_received";
  const isAccepted = matchStatus === "accepted";
  const waNumber = formatWhatsApp(profile.whatsapp_number);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`relative glass-card p-4 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/20 dark:hover:border-primary/20 transition-all duration-200 ${isPendingReceived ? "ring-1 ring-amber-300 dark:ring-amber-700" : ""}`}
    >
      {/* Pulse overlay for pending received */}
      {isPendingReceived && (
        <motion.div
          animate={{ opacity: [0.04, 0.1, 0.04] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-2xl bg-amber-400 pointer-events-none"
        />
      )}

      <div className="flex items-start gap-3">
        {/* Avatar: real photo or gradient initials */}
        <div className="relative flex-shrink-0">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.user_name}
              className="w-12 h-12 rounded-2xl object-cover shadow-sm"
            />
          ) : (
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${avatarGrad} shadow-sm`}>
              <span className="text-white font-black text-sm">{initials}</span>
            </div>
          )}
          {isPendingReceived && (
            <motion.span
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-white dark:border-gray-900"
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-foreground text-sm">{profile.user_name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${LEVEL_COLOR[profile.level]}`}>
              {LEVEL_EMOJI[profile.level]} {profile.level}
            </span>
          </div>

          {profile.looking_for && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">🔍 Cherche : {profile.looking_for}</p>
          )}

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-xs text-muted-foreground">
              🕌 {profile.memorized_count || 0} versets
            </span>
            {profile.availability?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {profile.availability.slice(0, 2).map(slot => (
                  <span key={slot} className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-muted text-muted-foreground rounded-full px-2 py-0.5">
                    {SLOT_EMOJI[slot] || "⏰"} {slot}
                  </span>
                ))}
                {profile.availability.length > 2 && (
                  <span className="text-[10px] text-muted-foreground">+{profile.availability.length - 2}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compatibility score bar */}
      {compatPercent != null && compatPercent > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground font-medium">Compatibilité</span>
            <span className={`text-[10px] font-bold ${compatPercent >= 70 ? "text-emerald-600 dark:text-emerald-400" : compatPercent >= 40 ? "text-amber-600 dark:text-amber-400" : "text-gray-500"}`}>
              {compatPercent}%
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${compatPercent}%` }}
              transition={{ delay: delay + 0.2, duration: 0.6, ease: "easeOut" }}
              className={`h-full rounded-full ${compatPercent >= 70 ? "bg-emerald-400 " : compatPercent >= 40 ? "bg-amber-400 " : "bg-gray-400"}`}
            />
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!isMe && (
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          {matchStatus === "none" && (
            <button onClick={onRequest}
              className="w-full py-2 rounded-xl text-xs font-bold bg-emerald-500 text-white flex items-center justify-center gap-1.5 transition-all shadow-sm hover:shadow-md">
              <MessageCircle className="w-3.5 h-3.5" /> Demander à étudier ensemble
            </button>
          )}
          {matchStatus === "pending_sent" && (
            <div className="w-full py-2 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40 flex items-center justify-center gap-1.5">
              <Hourglass className="w-3.5 h-3.5" /> Demande envoyée
            </div>
          )}
          {matchStatus === "pending_received" && (
            <div className="flex gap-2">
              <button onClick={onAccept}
                className="flex-1 py-2 rounded-xl text-xs font-black bg-emerald-500 text-white flex items-center justify-center gap-1.5 transition-all shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5" /> Accepter
              </button>
              <button onClick={onDecline}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200/60 dark:border-red-800/40 hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center justify-center gap-1.5 transition-colors">
                <XCircle className="w-3.5 h-3.5" /> Refuser
              </button>
            </div>
          )}
          {isAccepted && (
            <>
              <div className="w-full py-2 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Partenaires d'étude ✨
              </div>
              {waNumber ? (
                <a
                  href={`https://wa.me/${waNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#25D366] hover:bg-[#1da851] text-white flex items-center justify-center gap-2 transition-colors shadow-sm hover:shadow-md"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  📱 Contacter sur WhatsApp
                </a>
              ) : (
                <div className="w-full py-2 rounded-xl text-[11px] font-medium bg-gray-50 dark:bg-gray-800/50 text-muted-foreground border border-gray-200/60 dark:border-gray-700/40 flex items-center justify-center gap-1.5">
                  📱 Numéro WhatsApp non renseigné
                </div>
              )}
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}
