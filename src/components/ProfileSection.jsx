import React from "react";
import { motion } from "framer-motion";
import { Mic2, Type, CheckCircle2, Moon, Sun, LogOut } from "lucide-react";
import { RECITERS } from "@/components/ReciterSelector";
import { useAuth } from "@/lib/AuthContext";

export default function ProfileSection({ user, reciter, setReciter, showPhonetic, setShowPhonetic, darkMode, setDarkMode }) {
  const { logout } = useAuth();
  const initials = (user?.user_metadata?.full_name || user?.email || "U")
    .split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-card overflow-hidden"
    >
      {/* User header */}
      <div className="hafiz-gradient-hero p-5 flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-400/30">
          <span className="text-emerald-950 font-black text-sm">{initials}</span>
        </div>
        <div className="min-w-0">
          <p className="font-bold text-white text-sm truncate">{user?.user_metadata?.full_name || user?.email || "Utilisateur"}</p>
          <p className="text-emerald-300/80 text-xs truncate">{user?.email || ""}</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Préférences</p>

        {/* Dark mode */}
        <Toggle
          icon={darkMode ? <Moon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
          iconBg={darkMode ? "bg-indigo-50 dark:bg-indigo-900/30" : "bg-amber-50 dark:bg-amber-900/30"}
          label="Mode sombre"
          sublabel={darkMode ? "Thème sombre activé" : "Thème clair activé"}
          value={darkMode}
          onChange={() => setDarkMode(!darkMode)}
        />

        {/* Phonetic */}
        <Toggle
          icon={<Type className="w-4 h-4 text-violet-500 dark:text-violet-400" />}
          iconBg="bg-violet-50 dark:bg-violet-900/30"
          label="Translittération"
          sublabel="Afficher la phonétique"
          value={showPhonetic}
          onChange={() => setShowPhonetic(!showPhonetic)}
        />

        {/* Reciter */}
        <div>
          <div className="flex items-center gap-2.5 mb-2 px-1">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
              <Mic2 className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Récitateur</p>
              <p className="text-xs text-muted-foreground">Voix pour l'audio</p>
            </div>
          </div>
          <div className="space-y-0.5 max-h-56 overflow-y-auto pr-0.5 scrollbar-hide">
            {RECITERS.map(r => (
              <button
                key={r.id}
                onClick={() => setReciter(r.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all ${
                  reciter === r.id
                    ? "bg-primary/8 dark:bg-primary/20 border border-primary/20 dark:border-primary/30"
                    : "hover:bg-muted border border-transparent"
                }`}
              >
                <span className="text-base">{r.flag}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold truncate ${reciter === r.id ? "text-primary dark:text-emerald-400" : "text-foreground"}`}>{r.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{r.nameAr}</p>
                </div>
                {reciter === r.id && <CheckCircle2 className="w-3.5 h-3.5 text-primary dark:text-emerald-400 flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 pt-2 border-t border-border">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Déconnexion
        </button>
      </div>
    </motion.div>
  );
}

function Toggle({ icon, iconBg, label, sublabel, value, onChange }) {
  return (
    <div className="flex items-center justify-between px-1">
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{sublabel}</p>
        </div>
      </div>
      <button
        onClick={onChange}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0 ${
          value ? "bg-primary dark:bg-emerald-500" : "bg-gray-200 dark:bg-gray-700"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
            value ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}