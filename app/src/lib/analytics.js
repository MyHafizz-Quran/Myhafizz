/**
 * Google Analytics 4 (propriété Firebase myhafizz-b2a88, flux Web « MyHafizz PWA »).
 * - un page_view par écran (nom lisible dans screen_name)
 * - un événement par action envoyée au serveur (nom de la fonction : tajwid_done, dc_submit, ld_invite…)
 * - ui_click pour chaque bouton ou lien touché (libellé + écran)
 * - événements dédiés : audio_play, share, notif_permission, login, sign_up
 * Jamais bloquant : toute erreur est ignorée.
 */
const ID = "G-KWWPN2KSGT";
let started = false;
let screen = "";

const SCREENS = {
  "/": "Accueil", "/Dashboard": "Accueil", "/SurahList": "Coran", "/Lire": "Apprendre", "/Memorize": "Mémoriser", "/Revision": "Réviser",
  "/ReviewSession": "Séance de révision", "/Repeat": "Répétition", "/Recite": "Réciter", "/Exercises": "Exercices", "/Quiz": "Quiz",
  "/Tafsir": "Tafsir", "/Tajwid": "Tajwid", "/Lecon": "Lire l'arabe · leçon", "/Noms": "99 noms", "/Jouer": "Jouer", "/Partie": "Partie",
  "/Duel": "Duel", "/Equipe": "Khatma d'équipe", "/Defi": "Défi du jour", "/Ligue": "Ligue", "/Tournoi": "Tournoi", "/Joueur": "Profil joueur",
  "/Notifications": "Notifications", "/Profile": "Profil", "/Settings": "Réglages", "/Qibla": "Qibla", "/Live": "Live", "/Adhkar": "Adhkar",
  "/Tasbih": "Tasbih", "/Qiyam": "Qiyam", "/Calendrier": "Calendrier", "/Groups": "Groupes", "/Group": "Groupe", "/Leaderboard": "Classement",
  "/Bookmarks": "Favoris", "/Objectif": "Objectif", "/Bilan": "Bilan", "/Strength": "Points forts", "/Challenges": "Défis", "/Help": "Aide",
  "/Login": "Connexion", "/Welcome": "Bienvenue", "/Bienvenue": "Onboarding", "/Download": "Télécharger", "/Join": "Rejoindre",
};
export const screenName = (path) => SCREENS[path] || path.replace(/^\//, "") || "Accueil";

const standalone = () => { try { return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true; } catch { return false; } };

function gtag() { (window.dataLayer = window.dataLayer || []).push(arguments); }

export function initAnalytics() {
  if (started || typeof window === "undefined" || /localhost|127\.0\.0\.1/.test(location.hostname)) return;
  started = true;
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", ID, { send_page_view: false });
  gtag("set", "user_properties", { app_mode: standalone() ? "pwa" : "navigateur" });
  const s = document.createElement("script");
  s.async = true; s.src = `https://www.googletagmanager.com/gtag/js?id=${ID}`;
  document.head.appendChild(s);
  // Chaque bouton ou lien touché, partout dans l'app
  document.addEventListener("click", (e) => {
    const el = e.target?.closest?.("button, a, [role=button], [role=tab], [role=switch]");
    if (!el) return;
    const label = (el.getAttribute("aria-label") || el.getAttribute("data-track") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80);
    if (label) track("ui_click", { label, element: el.tagName.toLowerCase() });
  }, { capture: true, passive: true });
}

export function track(name, params = {}) {
  if (!started) return;
  try { gtag("event", String(name).slice(0, 40), { screen_name: screen, ...params }); } catch { /* ignore */ }
}

export function trackPage(path, search = "") {
  screen = screenName(path);
  track("page_view", { page_title: screen, page_path: path + search, page_location: location.origin + path + search });
}

export function identify(user, profile) {
  if (!started || !user?.id) return;
  try {
    gtag("config", ID, { user_id: user.id, send_page_view: false });
    if (profile) gtag("set", "user_properties", { arabic_level: profile.arabic_level || "", goal: profile.goal || "", pace: profile.pace || "" });
  } catch { /* ignore */ }
}

// Fonctions serveur qui ne font que lire : pas d'événement (trop de bruit)
const READ = /(_get|_list|_state|_search|_poll|_map|_me|_info|_board|_all|_plan|_questions|_profile|_scope|_seen|^player_|^notif_list|^avatar)/;
export function trackRpc(fn, args) {
  if (!fn || READ.test(fn)) return;
  const p = {};
  for (const [k, v] of Object.entries(args || {})) if (["string", "number", "boolean"].includes(typeof v) && !/user|email|name|q$/i.test(k)) p[k.replace(/^p_/, "")] = typeof v === "string" ? v.slice(0, 80) : v;
  track(fn, p);
}
