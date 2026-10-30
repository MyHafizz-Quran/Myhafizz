import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, User, ChevronRight, Loader2, Eye, EyeOff } from "@/components/icons";

const LEVELS = [
  { value: "débutant", label: "Débutant", desc: "< 10 sourates mémorisées", emoji: "🌱" },
  { value: "intermédiaire", label: "Intermédiaire", desc: "10–50 sourates", emoji: "📖" },
  { value: "avancé", label: "Avancé", desc: "50–100 sourates", emoji: "🔥" },
  { value: "hafidh", label: "Hafidh", desc: "Coran complet", emoji: "🏆" },
];
const SLOTS = [
  { value: "matin", emoji: "🌅" },
  { value: "après-midi", emoji: "☀️" },
  { value: "soir", emoji: "🌙" },
  { value: "week-end", emoji: "📅" },
];
const LOOKING = [
  { value: "même niveau", label: "Même niveau que moi" },
  { value: "niveau supérieur", label: "Quelqu'un de plus avancé" },
  { value: "peu importe", label: "Peu importe le niveau" },
];

const MIN_PHONE_DIGITS = 7;
const MAX_PHONE_DIGITS = 15;

const AVATAR_COLORS = [
  "bg-emerald-500",
  "bg-amber-400",
  "bg-violet-500",
  "bg-sky-400",
  "bg-rose-400",
];

const LEVEL_COLOR = {
  "débutant": "bg-emerald-100 text-emerald-700",
  "intermédiaire": "bg-amber-100 text-amber-700",
  "avancé": "bg-rose-100 text-rose-700",
  "hafidh": "bg-violet-100 text-violet-700",
};

function getAvatarGradient(name) {
  const idx = (name?.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

export default function ProfileSetupModal({ onSave, onClose, initial, user, isSaving = false }) {
  const [form, setForm] = useState({
    level: initial?.level || "débutant",
    availability: initial?.availability || [],
    looking_for: initial?.looking_for || "même niveau",
    whatsapp_number: initial?.whatsapp_number || "",
    is_visible: initial?.is_visible !== false,
  });
  const [whatsappError, setWhatsappError] = useState("");

  const toggleSlot = (s) => setForm(f => ({
    ...f,
    availability: f.availability.includes(s) ? f.availability.filter(x => x !== s) : [...f.availability, s],
  }));

  const handleSave = () => {
    const digits = form.whatsapp_number.replace(/\D/g, "");
    if (!form.whatsapp_number.trim() || digits.length < MIN_PHONE_DIGITS || digits.length > MAX_PHONE_DIGITS) {
      setWhatsappError("Veuillez entrer un numéro WhatsApp valide (ex : +33 6 12 34 56 78).");
      return;
    }
    setWhatsappError("");
    onSave(form);
  };

  const userName = initial?.user_name || user?.user_metadata?.full_name || user?.email || "Vous";
  const avatarUrl = initial?.avatar_url || user?.user_metadata?.avatar_url || null;
  const initials = userName.split(" ").filter(w => w).map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  const avatarGrad = getAvatarGradient(userName);
  const levelEmoji = LEVELS.find(l => l.value === form.level)?.emoji || "🌱";

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[var(--z-modal)] flex items-end sm:items-center justify-center sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 80 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 80 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-y-auto max-h-[92vh]"
      >
        {/* Handle bar — mobile only */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-600" />
            <h2 className="font-bold text-gray-900 dark:text-white">Mon profil d'étude</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile preview */}
        <div className="px-5 pt-4 pb-1">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Aperçu de votre carte</p>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-3 border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              {avatarUrl ? (
                <img src={avatarUrl} alt={userName} className="w-11 h-11 rounded-xl object-cover flex-shrink-0 shadow-sm" />
              ) : (
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${avatarGrad} shadow-sm`}>
                  <span className="text-white font-black text-xs">{initials}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-gray-800 dark:text-gray-200 text-sm">{userName}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${LEVEL_COLOR[form.level] || "bg-gray-100 text-gray-600"}`}>
                    {levelEmoji} {form.level}
                  </span>
                </div>
                {form.looking_for && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">🔍 Cherche : {form.looking_for}</p>
                )}
                {form.availability.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {form.availability.slice(0, 3).map(s => {
                      const slot = SLOTS.find(sl => sl.value === s);
                      return (
                        <span key={s} className="text-[10px] bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full px-2 py-0.5 border border-gray-200 dark:border-gray-700">
                          {slot?.emoji} {s}
                        </span>
                      );
                    })}
                  </div>
                )}
                {form.whatsapp_number && (
                  <p className="text-[10px] text-[#25D366] font-semibold mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp disponible
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Level */}
          <div>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Mon niveau</p>
            <div className="grid grid-cols-2 gap-2">
              {LEVELS.map(l => (
                <button key={l.value} onClick={() => setForm(f => ({ ...f, level: l.value }))}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                    form.level === l.value
                      ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-600"
                      : "border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700"
                  }`}>
                  <span className="text-xl">{l.emoji}</span>
                  <div>
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{l.label}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{l.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Availability */}
          <div>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Disponibilités</p>
            <div className="flex flex-wrap gap-2">
              {SLOTS.map(s => (
                <button key={s.value} onClick={() => toggleSlot(s.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all border ${
                    form.availability.includes(s.value)
                      ? "bg-emerald-500 text-white border-emerald-500"
                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-emerald-300"
                  }`}>
                  {s.emoji} {s.value}
                </button>
              ))}
            </div>
          </div>

          {/* Looking for */}
          <div>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Je recherche</p>
            <div className="space-y-1.5">
              {LOOKING.map(l => (
                <button key={l.value} onClick={() => setForm(f => ({ ...f, looking_for: l.value }))}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all border ${
                    form.looking_for === l.value
                      ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 font-semibold"
                      : "border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-200"
                  }`}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* WhatsApp number */}
          <div>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Numéro WhatsApp <span className="font-normal normal-case text-red-500">(obligatoire — visible seulement par vos partenaires acceptés)</span>
            </p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">📱</span>
              <input
                type="tel"
                value={form.whatsapp_number}
                onChange={e => { setForm(f => ({ ...f, whatsapp_number: e.target.value })); setWhatsappError(""); }}
                placeholder="+33 6 12 34 56 78"
                className={`w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 outline-none transition-colors ${whatsappError ? "border-red-400 focus:border-red-500" : "border-gray-200 dark:border-gray-700 focus:border-emerald-400"}`}
              />
            </div>
            {whatsappError ? (
              <p className="text-[11px] text-red-500 font-medium mt-1.5">{whatsappError}</p>
            ) : (
              <p className="text-[10px] text-gray-400 mt-1.5">Seuls vos partenaires acceptés pourront vous contacter sur WhatsApp.</p>
            )}
          </div>

          {/* Visibility toggle */}
          <div>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Disponibilité dans le feed</p>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, is_visible: !f.is_visible }))}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                form.is_visible
                  ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20"
                  : "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20"
              }`}
            >
              <div className="flex items-center gap-2.5">
                {form.is_visible ? (
                  <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                ) : (
                  <EyeOff className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0" />
                )}
                <div className="text-left">
                  <p className={`text-sm font-bold ${form.is_visible ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-400"}`}>
                    {form.is_visible ? "Disponible" : "Indisponible"}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    {form.is_visible
                      ? "Votre profil apparaît dans le feed Découvrir"
                      : "Votre profil est masqué du feed Découvrir"}
                  </p>
                </div>
              </div>
              {/* Toggle pill */}
              <div className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${form.is_visible ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_visible ? "translate-x-5" : "translate-x-0.5"}`} />
              </div>
            </button>
          </div>
        </div>

        <div className="px-5 pb-6 pt-0">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-3 bg-emerald-500 disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            {isSaving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement...</>
            ) : (
              <>Enregistrer mon profil <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}