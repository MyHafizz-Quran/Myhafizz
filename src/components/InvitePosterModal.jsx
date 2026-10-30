import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Link2, Share2 } from "@/components/icons";
import { QRCodeCanvas } from "qrcode.react";

// ─── InvitePosterModal ────────────────────────────────────────────────────────
export default function InvitePosterModal({
  open,
  onClose,
  user,
  avatarUrl,
  avatarPreview,
  initials,
  totalMemorized,
  completedSurahs,
  overallPercent,
  toast,
}) {
  const appUrl = window.location.origin;
  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Hafiz";

  // ── Copy link to clipboard ──────────────────────────────────────────────────
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      if (toast) {
        toast({ title: "Lien copié !", description: "Partagez-le avec vos proches 🌙" });
      }
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = appUrl;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      if (toast) {
        toast({ title: "Lien copié !", description: "Partagez-le avec vos proches 🌙" });
      }
    }
  };

  // ── Share via Web Share API ─────────────────────────────────────────────────
  const handleShare = async () => {
    const shareText = `${userName} t'invite à mémoriser le Coran sur MyHafizz 🌙\n${totalMemorized} verset${totalMemorized !== 1 ? "s" : ""} mémorisé${totalMemorized !== 1 ? "s" : ""} · ${completedSurahs} sourate${completedSurahs !== 1 ? "s" : ""} complétée${completedSurahs !== 1 ? "s" : ""}\nRejoins l'aventure !`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Rejoins MyHafizz !",
          text: shareText,
          url: appUrl,
        });
      } catch (err) {
        if (err?.name !== "AbortError") {
          // Fallback: copy to clipboard
          try {
            await navigator.clipboard.writeText(`${shareText}\n${appUrl}`);
            if (toast) {
              toast({ title: "Texte copié !", description: "Partagez-le manuellement 🌙" });
            }
          } catch {
            if (toast) {
              toast({ title: "Erreur", description: "Impossible de partager.", variant: "destructive" });
            }
          }
        }
      }
    } else {
      // No Web Share API: copy to clipboard
      try {
        await navigator.clipboard.writeText(`${shareText}\n${appUrl}`);
        if (toast) {
          toast({ title: "Texte copié !", description: "Partagez-le manuellement 🌙" });
        }
      } catch {
        if (toast) {
          toast({ title: "Erreur", description: "Impossible de copier.", variant: "destructive" });
        }
      }
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* ── Overlay ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]"
            onClick={onClose}
          />

          {/* ── Modal panel ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed inset-0 z-[60] flex items-center justify-center py-8 sm:py-10 px-4 overflow-y-auto"
          >
            <div
              className="relative w-full max-w-[340px] sm:max-w-lg flex flex-col items-center gap-4 my-auto min-h-0"
              onClick={(e) => e.stopPropagation()}
            >
              {/* ── Close button ── */}
              <button
                onClick={onClose}
                className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-gray-800/90 border border-white/20 text-white flex items-center justify-center hover:bg-gray-700 transition-colors shadow-lg"
              >
                <X className="w-4 h-4" />
              </button>

              {/* ══════════════════════════════════════════════════════════════
                  THE POSTER CARD
              ══════════════════════════════════════════════════════════════ */}
              <div
                data-poster
                className="w-full rounded-2xl overflow-hidden shadow-2xl"
                style={{
                  background: "linear-gradient(160deg, #064e3b 0%, #065f46 35%, #047857 65%, #022c22 100%)",
                  fontFamily: "'Segoe UI', system-ui, sans-serif",
                }}
              >
                {/* ── Poster header with Islamic pattern overlay ── */}
                <div className="relative px-4 pt-6 pb-5 text-center overflow-hidden">
                  {/* Subtle geometric pattern */}
                  <div
                    className="absolute inset-0 opacity-[0.06]"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff'%3E%3Cpath d='M30 0l8.66 15H21.34L30 0zm0 60l8.66-15H21.34L30 60zM0 30l15-8.66v17.32L0 30zm60 0L45 21.34v17.32L60 30zM30 22.5a7.5 7.5 0 100 15 7.5 7.5 0 000-15z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                  />
                  {/* Top decorative arc */}
                  <div
                    className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-20 rounded-full opacity-20"
                    style={{ background: "radial-gradient(ellipse at center, #fcd34d 0%, transparent 70%)" }}
                  />

                  {/* Logo / Title */}
                  <div className="relative">
                    <p className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none">
                      MyHafizz
                      <span className="ml-1.5">🌙</span>
                    </p>
                    <p className="text-emerald-300 text-xs font-medium mt-1.5 tracking-wide">
                      Mémorise le Coran à ton rythme
                    </p>
                    {/* Decorative line */}
                    <div className="flex items-center justify-center gap-2 mt-3">
                      <div className="h-px flex-1 " />
                      <span className="text-amber-400 text-[10px]">✦</span>
                      <div className="h-px flex-1 " />
                    </div>
                  </div>
                </div>

                {/* ── User section ── */}
                <div className="px-4 py-3 flex items-center gap-3 bg-white/5">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {(avatarPreview || avatarUrl) ? (
                      <img
                        src={avatarPreview || avatarUrl}
                        alt="Avatar"
                        crossOrigin="anonymous"
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 rounded-full object-cover ring-2 ring-amber-400/60 shadow-lg"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center ring-2 ring-amber-400/60 shadow-lg"
                        style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
                      >
                        <span className="text-emerald-950 font-black text-xl">{initials}</span>
                      </div>
                    )}
                  </div>

                  {/* Name & stats */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-base leading-tight break-words">{userName}</p>
                    <p className="text-emerald-300/80 text-[11px] mt-0.5 leading-snug">
                      {totalMemorized} verset{totalMemorized !== 1 ? "s" : ""} mémorisé{totalMemorized !== 1 ? "s" : ""}
                      {` · ${completedSurahs} sourate${completedSurahs !== 1 ? "s" : ""} complétée${completedSurahs !== 1 ? "s" : ""}`}
                    </p>
                  </div>
                </div>

                {/* ── Marketing message ── */}
                <div className="px-4 py-3 text-center">
                  <p className="text-white font-semibold text-sm leading-relaxed">
                    {totalMemorized} verset{totalMemorized !== 1 ? "s" : ""} mémorisé{totalMemorized !== 1 ? "s" : ""} · {completedSurahs} sourate{completedSurahs !== 1 ? "s" : ""} complétée{completedSurahs !== 1 ? "s" : ""}
                  </p>
                  <p className="text-amber-300 font-bold text-sm mt-1">
                    Et toi, tu commences quand ? 🌟
                  </p>
                  <p className="text-white/70 text-xs mt-2.5 leading-relaxed">
                    Rejoins-moi sur MyHafizz et commence
                    <br />ton parcours de mémorisation ! 📖
                  </p>
                </div>

                {/* ── QR Code section ── */}
                <div className="px-4 pb-4 flex flex-col items-center gap-2">
                  {/* Divider */}
                  <div className="flex items-center gap-2 w-full">
                    <div className="h-px flex-1 bg-white/15" />
                    <span className="text-white/40 text-[9px] uppercase tracking-widest font-semibold">Scanner pour rejoindre</span>
                    <div className="h-px flex-1 bg-white/15" />
                  </div>

                  {/* QR Code */}
                  <div className="bg-white p-2 rounded-xl shadow-lg">
                    <QRCodeCanvas
                      value={appUrl}
                      size={120}
                      level="M"
                      includeMargin={false}
                      fgColor="#064e3b"
                      bgColor="#ffffff"
                    />
                  </div>

                  <p className="text-white/50 text-[10px] text-center">
                    Scanne pour rejoindre MyHafizz
                  </p>
                </div>

                {/* ── Footer ── */}
                <div className="px-4 py-1.5 text-center text-[7px] text-white/25">
                  Made with ❤️ from Samatiguila
                </div>
              </div>

              {/* ── Action buttons (outside poster) ── */}
              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={handleCopyLink}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold transition-colors shadow-lg"
                >
                  <Link2 className="w-4 h-4" />
                  Copier le lien
                </button>
                <button
                  onClick={handleShare}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs sm:text-sm font-semibold transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  Partager
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
