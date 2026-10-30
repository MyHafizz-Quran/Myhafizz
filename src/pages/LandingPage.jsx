import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Play, Pause, CaretDown, CheckCircle, XCircle, EyeSlash, Headphones, Microphone, ListNumbers, Translate, Palette, Copy, CloudArrowDown,
  SquaresFour, WarningCircle, Fire, Bell, User, UsersThree, Student, DeviceMobile, ArrowsClockwise, WifiSlash, Desktop, Shuffle, EarSlash, CalendarCheck,
} from "@phosphor-icons/react";
import { MhWordmark } from "@/components/MhLogo";
import { loadSurah } from "@/lib/learningData";

const GOOGLE = import.meta.env.VITE_GOOGLE_AUTH === "1";

const initialLang = () => {
  try { const s = localStorage.getItem("mh_lang"); if (s) return s; } catch { /* ignore */ }
  return typeof navigator !== "undefined" && !/^fr/i.test(navigator.language || "fr") ? "en" : "fr";
};
const firstLetters = (t) => t.split(" ").map((w) => { const c = [...w]; let out = ""; for (const ch of c) { out += ch; if (/[\u0621-\u064A\u0671-\u06D3]/.test(ch)) break; } return out; }).join(" ");

function Section({ id, eyebrow, title, intro, children, className = "" }) {
  return (
    <section id={id} className={`px-5 py-16 lg:py-24 ${className}`}>
      <div className="max-w-5xl mx-auto">
        {eyebrow && <p className="text-sm font-black uppercase tracking-wider text-primary">{eyebrow}</p>}
        {title && <h2 className="text-[28px] lg:text-[40px] font-black leading-[1.15] mt-2 max-w-3xl">{title}</h2>}
        {intro && <p className="text-[17px] font-semibold text-muted-foreground mt-3 max-w-2xl leading-relaxed">{intro}</p>}
        {children}
      </div>
    </section>
  );
}

export default function LandingPage() {
  const [lang, setLang] = useState(initialLang);
  const t = (fr, en) => (lang === "fr" ? fr : en);
  useEffect(() => { try { localStorage.setItem("mh_lang", lang); } catch { /* ignore */ } document.documentElement.lang = lang; }, [lang]);

  // ─── Données réelles (alquran.cloud) pour les démos ───
  const [ikhlas, setIkhlas] = useState([]);
  const [quizSrc, setQuizSrc] = useState({});
  useEffect(() => {
    loadSurah(112).then((d) => setIkhlas(d?.ayahs || d || [])).catch(() => {});
    Promise.all([1, 103, 114].map((n) => loadSurah(n).then((d) => [n, d?.ayahs || d || []]))).then((r) => setQuizSrc(Object.fromEntries(r))).catch(() => {});
  }, []);

  // ─── Héros : masquage + écoute ───
  const [mask, setMask] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(-1);
  const audio = useRef(null);
  const stop = () => { audio.current?.pause(); audio.current = null; setPlaying(false); setCur(-1); };
  const listen = () => {
    if (playing) return stop();
    if (!ikhlas.length) return;
    setPlaying(true);
    const playAt = (i) => {
      if (i >= ikhlas.length) return stop();
      setCur(i);
      const a = new Audio(`https://cdn.islamic.network/quran/audio/128/ar.alafasy/${ikhlas[i].number}.mp3`);
      audio.current = a; a.onended = () => playAt(i + 1); a.play().catch(stop);
    };
    playAt(0);
  };
  useEffect(() => () => audio.current?.pause(), []);

  // ─── Essai : 3 questions « verset suivant » ───
  const questions = useMemo(() => {
    const q = [];
    const mk = (n, i, name) => {
      const a = quizSrc[n]; if (!a || a.length < i + 2) return;
      const correct = a[i + 1].text;
      const others = a.filter((_, j) => j !== i + 1 && j !== i).slice(0, 2).map((x) => x.text);
      const opts = [correct, ...others].sort((x, y) => (x.length % 3) - (y.length % 3));
      q.push({ name, ref: i + 1, prompt: a[i].text, correct, opts });
    };
    mk(1, 3, "Al-Fatiha"); mk(103, 0, "Al-Asr"); mk(114, 2, "An-Nas");
    return q;
  }, [quizSrc]);
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const q = questions[qi];
  const pick = (o) => { if (picked) return; setPicked(o); if (o === q.correct) setScore((s) => s + 1); };
  const nextQ = () => { setPicked(null); setQi((i) => i + 1); };

  // ─── Calcul d'objectif ───
  const [goal, setGoal] = useState("juz");
  const [perDay, setPerDay] = useState(3);
  const totalV = goal === "juz" ? 564 : 6236;
  const endDate = new Date(Date.now() + Math.ceil(totalV / perDay) * 86400000).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB", { month: "long", year: "numeric" });

  // ─── Khatma démo ───
  const [taken, setTaken] = useState(() => new Set([1, 2, 3, 5, 8, 9, 12, 15, 18, 22, 27, 30]));
  const [done] = useState(() => new Set([1, 2, 5, 9, 15]));
  const [mine, setMine] = useState(null);

  const [faq, setFaq] = useState(0);

  const CTA = ({ className = "" }) => (
    <Link to="/login?mode=signup" className={`btn-relief h-[56px] px-7 bg-primary text-primary-foreground text-[17px] ${className}`}>{t("Commencer ma première sourate", "Start my first surah")}</Link>
  );

  const problems = [
    [Shuffle, t("Tu révises au hasard", "You review at random"), t("Tu relis les sourates que tu connais déjà bien et tu repousses celles qui coincent. Les versets faibles restent faibles.", "You reread the surahs you already know and put off the ones that trip you up. Weak verses stay weak.")],
    [Copy, t("Les versets se mélangent", "Verses get mixed up"), t("Deux passages qui commencent pareil, et pendant la prière tu enchaînes sur la mauvaise sourate.", "Two passages that start the same way, and during prayer you carry on into the wrong surah.")],
    [EarSlash, t("Personne ne te fait réciter", "Nobody listens to you recite"), t("Sans maître ni binôme, tu ne sais pas si ta récitation tient vraiment, ni quel verset tu as sauté.", "Without a teacher or a study partner, you can't tell whether your recitation holds up, or which verse you skipped.")],
  ];
  const method = [
    ["Sabaq", t("Le nouveau", "The new lesson"), t("Les versets du jour, selon le rythme que tu as choisi (de 1 à 20 par jour).", "Today's verses, at the pace you picked (1 to 20 a day)."), t("Ex. Al-Mulk, versets 4 à 6", "e.g. Al-Mulk, verses 4 to 6")],
    ["Sabqi", t("Le récent", "Recent review"), t("Ce que tu as appris ces derniers jours, tant que ce n'est pas solide.", "What you learned in the past few days, until it holds."), t("Ex. 12 versets de la semaine", "e.g. 12 verses from this week")],
    ["Manzil", t("L'ancien", "Older surahs"), t("Tes anciennes sourates reviennent en rotation, plus souvent quand tu as hésité dessus.", "Your older surahs come back in rotation, more often when you hesitated on them."), t("Ex. Juz Amma, 20 versets", "e.g. Juz Amma, 20 verses")],
  ];
  const steps = [
    [t("Choisis ton objectif", "Pick your goal"), t("Une sourate, Juz Amma ou le Coran entier, et ton nombre de versets par jour.", "A surah, Juz Amma or the whole Quran, and how many verses a day.")],
    [t("Écoute et répète", "Listen and repeat"), t("Le verset en boucle, à la vitesse que tu veux, avec une pause pour répéter après le récitateur.", "The verse on loop, at your speed, with a pause to repeat after the reciter.")],
    [t("Cache et récite", "Hide and recite"), t("Le texte passe aux initiales, puis disparaît. Tu récites au micro ou de tête.", "The text turns into first letters, then disappears. Recite into the mic or from memory.")],
    [t("Reviens demain", "Come back tomorrow"), t("Ta prochaine séance est prête, avec les versets fragiles en premier.", "Your next session is ready, with your weakest verses first.")],
  ];
  const tools = [
    [t("Apprendre", "Learn"), [
      [EyeSlash, t("Texte qui s'efface", "Fading text"), t("Texte complet, puis premières lettres, puis rien. Touche un mot pour le revoir.", "Full text, then first letters, then nothing. Tap a word to see it again.")],
      [Headphones, t("Écoute en boucle", "Loop audio"), t("Récitation de Mishary Alafasy, répétitions, vitesse et pause réglables.", "Mishary Alafasy's recitation, with adjustable repeats, speed and pause.")],
      [Microphone, t("Récitation au micro", "Recite into the mic"), t("L'app suit ta voix et surligne les mots sautés ou oubliés.", "The app follows your voice and highlights skipped or forgotten words.")],
      [ListNumbers, t("Quiz d'enchaînement", "Next-verse quiz"), t("On te montre un verset, tu choisis le suivant. Les erreurs partent en révision.", "You see a verse and pick the next one. Mistakes go into your review.")],
    ]],
    [t("Comprendre", "Understand"), [
      [Translate, t("Traduction et translittération", "Translation & transliteration"), t("Traduction française de Muhammad Hamidullah, et translittération pour qui débute en arabe.", "French translation by Muhammad Hamidullah, plus transliteration for Arabic beginners.")],
      [Palette, t("Couleurs du tajwîd", "Tajweed colours"), t("Les règles (ghunna, madd, qalqala…) colorées dans le texte, avec l'explication au toucher.", "Rules (ghunna, madd, qalqala…) coloured in the text, with an explanation on tap.")],
      [Copy, t("Versets semblables", "Similar verses"), t("L'app te prévient quand un verset ressemble à un autre et te montre la différence.", "The app warns you when a verse looks like another one and shows you the difference.")],
      [CloudArrowDown, t("Hors ligne", "Offline"), t("Télécharge le texte et continue tes révisions sans connexion.", "Download the text and keep reviewing without a connection.")],
    ]],
    [t("Suivre", "Track"), [
      [SquaresFour, t("Carte de solidité", "Strength map"), t("Chaque verset a sa couleur : solide, en cours, fragile ou pas encore vu.", "Every verse has a colour: strong, in progress, weak or not yet seen.")],
      [WarningCircle, t("Versets fragiles", "Weak verses"), t("La liste exacte des versets à reprendre, dans l'ordre où tu les oublies.", "The exact list of verses to fix, in the order you forget them.")],
      [Fire, t("Série et défis", "Streaks & challenges"), t("Ta série de jours, et des défis communs comme Al-Kahf avant vendredi.", "Your daily streak, and shared challenges like Al-Kahf before Friday.")],
      [Bell, t("Rappels après la prière (bientôt)", "Reminders after prayer (soon)"), t("Un rappel 15 minutes après la prière de ton choix.", "A reminder 15 minutes after the prayer you pick.")],
    ]],
  ];
  const who = [
    [User, t("Seul", "On your own"), [t("Ta séance du jour toute prête", "Your daily session, ready"), t("Le micro pour remplacer le binôme", "The mic stands in for a study partner"), t("Des défis avec la communauté", "Challenges with the community")]],
    [UsersThree, t("Parents", "Parents"), [t("Crée un groupe Famille et invite tes enfants avec un code", "Create a Family group and invite your kids with a code"), t("Vois ce qu'ils ont révisé cette semaine et leurs versets fragiles", "See what they reviewed this week and their weak verses"), t("Mode enfant avec code parent (bientôt)", "Kid mode with a parent PIN (soon)")]],
    [Student, t("Maîtres et madrasas", "Teachers & madrasas"), [t("Donne une leçon à toute la classe (sourate, versets, date)", "Assign a lesson to the whole class (surah, verses, due date)"), t("Valide ou renvoie « À revoir » avec une remarque", "Approve, or send back with a note"), t("Tableau de suivi sur ordinateur", "Progress table on desktop")]],
  ];
  const faqs = [
    [t("D'où viennent le texte, la traduction et l'audio ?", "Where do the text, translation and audio come from?"), t("Le texte arabe est en écriture ʿuthmânî. La traduction française est celle de Muhammad Hamidullah. La récitation est celle de Mishary Rashid Alafasy.", "The Arabic text is in the ʿUthmani script. The French translation is by Muhammad Hamidullah. The recitation is by Mishary Rashid Alafasy.")],
    [t("Je ne lis pas encore bien l'arabe. Est-ce que je peux commencer ?", "I can't read Arabic well yet. Can I start?"), t("Oui. Active la translittération dans les réglages et appuie-toi sur l'audio en boucle. Commence par les courtes sourates de Juz Amma.", "Yes. Turn on transliteration in settings and lean on the loop audio. Start with the short surahs of Juz Amma.")],
    [t("Est-ce que l'app remplace un maître ?", "Does the app replace a teacher?"), t("Non. Elle t'aide à réviser entre deux séances et elle permet à ton maître de suivre ta progression. La validation de la récitation reste son rôle.", "No. It helps you review between lessons and lets your teacher follow your progress. Approving your recitation is still their job.")],
    [t("Mes enfants peuvent-ils l'utiliser ?", "Can my children use it?"), t("Oui. Crée un groupe Famille, invite-les avec le code, et tu verras leurs révisions et leurs versets fragiles. Un mode enfant avec code parent arrive bientôt.", "Yes. Create a Family group, invite them with the code, and you'll see their reviews and weak verses. A kid mode with a parent PIN is coming soon.")],
    [t("Ça marche sans internet ?", "Does it work offline?"), t("Oui, une fois le texte téléchargé dans les réglages. Tes révisions se synchronisent quand la connexion revient.", "Yes, once you download the text in settings. Your reviews sync when you're back online.")],
    [t("Que deviennent mes données ?", "What happens to my data?"), t("Ta progression est liée à ton compte pour que tu la retrouves sur tous tes appareils. Tout est détaillé dans la politique de confidentialité.", "Your progress is tied to your account so you find it on every device. Details are in the privacy policy.")],
    ...(GOOGLE ? [[t("Je peux me connecter avec Google ?", "Can I sign in with Google?"), t("Oui, en un clic. Tu peux aussi créer un compte avec ton email et un mot de passe.", "Yes, in one click. You can also sign up with an email and password.")]] : []),
  ];

  return (
    <div className="min-h-[100dvh] bg-card text-foreground overflow-x-hidden">
      {/* ─── Navigation ─── */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b-2 border-border pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center gap-4">
          <Link to="/" aria-label="MyHafizz"><MhWordmark size={30} /></Link>
          <nav className="hidden md:flex items-center gap-6 ml-6 font-extrabold text-muted-foreground">
            <a href="#methode" className="hover:text-foreground">{t("La méthode", "The method")}</a>
            <a href="#outils" className="hover:text-foreground">{t("Les outils", "Features")}</a>
            <a href="#pour-qui" className="hover:text-foreground">{t("Familles et madrasas", "Families & madrasas")}</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex p-0.5 rounded-xl bg-muted text-xs font-black">
              {["fr", "en"].map((l) => <button key={l} onClick={() => setLang(l)} className={`h-8 w-9 rounded-[10px] uppercase ${lang === l ? "bg-card text-accent-foreground shadow-[0_2px_0_hsl(var(--border))]" : "text-muted-foreground"}`}>{l}</button>)}
            </div>
            <Link to="/login" className="hidden sm:flex h-10 px-3 items-center font-extrabold text-primary">{t("Connexion", "Log in")}</Link>
            <Link to="/login?mode=signup" className="btn-relief h-10 px-4 bg-primary text-primary-foreground text-sm">{t("Commencer", "Get started")}</Link>
          </div>
        </div>
      </header>

      {/* ─── 1. Héros ─── */}
      <section className="px-5 pt-10 pb-16 lg:pt-20 lg:pb-24">
        <div className="max-w-5xl mx-auto lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12 lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-wider text-primary">{t("Mémorisation du Coran · hifz", "Quran memorization · hifz")}</p>
            <h1 className="text-[36px] lg:text-[56px] font-black leading-[1.08] mt-3">{t("Apprends une sourate cette semaine. Récite-la encore dans dix ans.", "Learn a surah this week. Still recite it ten years from now.")}</h1>
            <p className="text-[17px] lg:text-lg font-semibold text-muted-foreground mt-4 leading-relaxed">{t("Chaque jour, MyHafizz prépare ta séance comme dans une madrasa : le nouveau (sabaq), le récent (sabqi) et l'ancien (manzil). Tu récites, l'app repère les versets qui glissent et te les redonne au bon moment.", "Every day, MyHafizz builds your session the way madrasas do: the new lesson (sabaq), the recent review (sabqi) and your older surahs (manzil). You recite, the app spots the verses that slip and brings them back at the right time.")}</p>
            <div className="flex flex-wrap gap-3 mt-7">
              <CTA />
              <Link to="/telecharger" className="btn-relief h-[56px] px-6 bg-card border-2 border-border text-foreground [--relief-color:hsl(var(--border))]">{t("L'app", "Get the app")}</Link>
            </div>
            <p className="text-sm font-bold text-muted-foreground mt-4">{GOOGLE ? t("Compte en une minute avec Google · ", "One-minute sign-up with Google · ") : t("Compte en une minute · ", "One-minute sign-up · ")}{t("iPhone, Android et ordinateur", "iPhone, Android and desktop")}</p>
          </div>

          <div className="card-flat p-5 mt-10 lg:mt-0 bg-background">
            <div className="flex items-center justify-between">
              <div><p className="font-black">Al-Ikhlas</p><p className="text-[13px] font-semibold text-muted-foreground">{t("Essaie : cache le texte, récite, vérifie.", "Try it: hide the text, recite, check.")}</p></div>
              <button onClick={listen} aria-label={t("Écouter", "Listen")} className="h-11 px-4 rounded-full bg-primary text-primary-foreground font-extrabold flex items-center gap-2 shadow-[0_3px_0_var(--primary-lip)]">
                {playing ? <Pause weight="fill" /> : <Play weight="fill" />}{t("Écouter", "Listen")}
              </button>
            </div>
            <div className="mt-4 space-y-2 min-h-[220px]" dir="rtl">
              {ikhlas.length ? ikhlas.map((a, i) => (
                <p key={a.number} className={`font-arabic text-[26px] leading-[1.9] rounded-xl px-3 transition-colors ${cur === i ? "bg-accent" : ""}`}>
                  {mask === 0 ? a.text : mask === 1 ? firstLetters(a.text) : <span className="inline-block h-6 rounded-lg bg-muted align-middle" style={{ width: `${Math.min(100, a.text.length * 2.4)}%` }} />}
                  <span className="text-primary text-xl"> ﴿{(i + 1).toLocaleString("ar-EG")}﴾</span>
                </p>
              )) : [0, 1, 2, 3].map((i) => <div key={i} className="h-10 rounded-xl bg-muted animate-pulse" />)}
            </div>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-[14px] bg-muted mt-4">
              {[t("Texte", "Full text"), t("Initiales", "First letters"), t("Caché", "Hidden")].map((l, i) => (
                <button key={l} onClick={() => setMask(i)} className={`h-10 rounded-[10px] text-sm font-extrabold ${mask === i ? "bg-card text-accent-foreground shadow-[0_2px_0_hsl(var(--border))]" : "text-muted-foreground"}`}>{l}</button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. Problème ─── */}
      <Section className="bg-background" eyebrow={t("Le problème", "The problem")} title={t("Tu as appris Al-Mulk au Ramadan. Il t'en reste combien de versets aujourd'hui ?", "You learned Al-Mulk last Ramadan. How many verses can you still recite today?")}
        intro={t("Apprendre un verset prend quelques minutes. Le garder demande de le revoir au bon moment, et c'est là que la plupart des apprenants décrochent.", "Learning a verse takes a few minutes. Keeping it means reviewing it at the right moment, and that is where most learners drop off.")}>
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          {problems.map(([I, h, d]) => (
            <div key={h} className="card-flat p-5"><span className="w-11 h-11 rounded-xl bg-muted text-muted-foreground flex items-center justify-center"><I weight="fill" className="w-6 h-6" /></span><p className="font-black text-lg mt-3">{h}</p><p className="font-semibold text-muted-foreground mt-1">{d}</p></div>
          ))}
        </div>
      </Section>

      {/* ─── 3. Méthode ─── */}
      <Section id="methode" eyebrow={t("La méthode", "The method")} title={t("La méthode des madrasas, recalculée pour toi chaque matin", "The madrasa method, recalculated for you every morning")}
        intro={t("Les écoles coraniques font travailler trois choses chaque jour. MyHafizz garde cette méthode et fait le calcul à ta place : combien de nouveaux versets, quoi revoir, et dans quel ordre.", "Quran schools work on three things every day. MyHafizz keeps that method and does the planning for you: how many new verses, what to review, and in what order.")}>
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          {method.map(([k, h, d, ex], i) => (
            <div key={k} className="card-flat p-5">
              <span className="inline-flex h-8 px-3 rounded-lg bg-accent text-accent-foreground font-black items-center">{i + 1} · {k}</span>
              <p className="font-black text-xl mt-3">{h}</p><p className="font-semibold text-muted-foreground mt-1">{d}</p>
              <p className="text-sm font-extrabold text-accent-foreground mt-3">{ex}</p>
            </div>
          ))}
        </div>
        <div className="card-flat p-5 mt-4 flex flex-col md:flex-row md:items-center gap-4">
          <p className="font-semibold text-muted-foreground flex-1">{t("Après chaque verset, tu dis comment ça s'est passé : Oublié, Hésité ou Facile. Un verset oublié revient demain. Un verset facile revient de plus en plus tard.", "After each verse you say how it went: Forgot, Hesitated or Easy. A forgotten verse comes back tomorrow. An easy one comes back later and later.")}</p>
          <div className="flex gap-2 shrink-0">
            <span className="h-10 px-3 rounded-xl bg-destructive text-destructive-foreground font-extrabold flex items-center shadow-[0_3px_0_#B8343A]">{t("Oublié", "Forgot")}</span>
            <span className="h-10 px-3 rounded-xl bg-gold text-[#5C4300] font-extrabold flex items-center shadow-[0_3px_0_#C99000]">{t("Hésité", "Hesitated")}</span>
            <span className="h-10 px-3 rounded-xl bg-primary text-primary-foreground font-extrabold flex items-center shadow-[0_3px_0_var(--primary-lip)]">{t("Facile", "Easy")}</span>
          </div>
        </div>
      </Section>

      {/* ─── 4. Étapes ─── */}
      <Section className="bg-background" eyebrow={t("Comment ça marche", "How it works")} title={t("Quatre étapes, environ 15 minutes par jour", "Four steps, about 15 minutes a day")}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          {steps.map(([h, d], i) => (
            <div key={h} className="card-flat p-5"><span className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-black flex items-center justify-center shadow-[0_3px_0_var(--primary-lip)]">{i + 1}</span><p className="font-black text-lg mt-3">{h}</p><p className="font-semibold text-muted-foreground mt-1">{d}</p></div>
          ))}
        </div>
      </Section>

      {/* ─── 5. Outils ─── */}
      <Section id="outils" eyebrow={t("Les outils", "Features")} title={t("Tout ce qu'il faut pour apprendre, comprendre et retenir", "Everything you need to learn, understand and retain")}>
        <div className="grid lg:grid-cols-3 gap-4 mt-8">
          {tools.map(([g, items]) => (
            <div key={g} className="card-flat overflow-hidden">
              <p className="px-5 pt-4 pb-2 text-xs font-black uppercase tracking-wider text-muted-foreground">{g}</p>
              <div className="divide-y-2 divide-border">
                {items.map(([I, h, d]) => (
                  <div key={h} className="flex gap-3 px-5 py-3.5"><span className="w-10 h-10 rounded-xl bg-accent text-primary flex items-center justify-center shrink-0"><I weight="fill" className="w-5 h-5" /></span><div><p className="font-extrabold">{h}</p><p className="text-[14px] font-semibold text-muted-foreground">{d}</p></div></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ─── 6. Essai + calcul d'objectif ─── */}
      <Section className="bg-background" eyebrow={t("Essaie maintenant", "Try it now")} title={t("Tu connais la suite ?", "Do you know what comes next?")}
        intro={t("Trois questions, comme dans l'app. Ensuite, choisis ton objectif : la date de fin se calcule toute seule.", "Three questions, just like in the app. Then pick your goal and see your finish date.")}>
        <div className="grid lg:grid-cols-2 gap-4 mt-8">
          <div className="card-flat p-5">
            {!questions.length ? <div className="h-64 rounded-xl bg-muted animate-pulse" /> : q ? (
              <>
                <div className="flex items-center gap-3"><div className="flex-1 h-3 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary rounded-full transition-all" style={{ width: `${((qi + (picked ? 1 : 0)) / questions.length) * 100}%` }} /></div><span className="text-sm font-black text-muted-foreground">{qi + 1}/{questions.length}</span></div>
                <p className="text-sm font-extrabold text-muted-foreground mt-4">{q.name} · {t("après le verset", "after verse")} {q.ref}</p>
                <p className="font-arabic text-[24px] leading-[1.9] mt-1 p-3 rounded-xl bg-background border-2 border-border" dir="rtl">{q.prompt}</p>
                <div className="space-y-2 mt-3">
                  {q.opts.map((o) => {
                    const st = !picked ? "border-border bg-card" : o === q.correct ? "border-primary bg-accent" : o === picked ? "border-destructive bg-destructive/10" : "border-border bg-card opacity-60";
                    return <button key={o} onClick={() => pick(o)} className={`w-full p-3 rounded-2xl border-2 border-b-4 font-arabic text-[21px] leading-[1.8] text-right ${st}`} dir="rtl">{o}</button>;
                  })}
                </div>
                {picked && (
                  <div className="flex items-center justify-between mt-3">
                    <p className={`font-black flex items-center gap-1.5 ${picked === q.correct ? "text-primary" : "text-destructive"}`}>{picked === q.correct ? <CheckCircle weight="fill" className="w-6 h-6" /> : <XCircle weight="fill" className="w-6 h-6" />}{picked === q.correct ? t("Bien joué", "Well done") : t("Pas tout à fait", "Not quite")}</p>
                    <button onClick={nextQ} className="btn-relief h-11 px-5 bg-primary text-primary-foreground">{t("Continuer", "Continue")}</button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-[40px] font-black text-primary">{score}/{questions.length}</p>
                <p className="font-black text-lg">{score === questions.length ? t("Parfait. Imagine avec tes propres sourates.", "Perfect. Now imagine it with your own surahs.") : t("Dans l'app, ces versets reviendraient demain.", "In the app, these verses would come back tomorrow.")}</p>
                <button onClick={() => { setQi(0); setScore(0); setPicked(null); }} className="mt-3 font-extrabold text-primary inline-flex items-center gap-1.5"><ArrowsClockwise weight="bold" />{t("Recommencer", "Try again")}</button>
              </div>
            )}
          </div>

          <div className="card-flat p-5">
            <div className="grid grid-cols-2 gap-1 p-1 rounded-[14px] bg-muted">
              {[["juz", "Juz Amma · 564 v."], ["full", t("Le Coran · 6236 v.", "Whole Quran · 6236 v.")]].map(([k, l]) => (
                <button key={k} onClick={() => setGoal(k)} className={`h-11 rounded-[10px] text-sm font-extrabold ${goal === k ? "bg-card text-accent-foreground shadow-[0_2px_0_hsl(var(--border))]" : "text-muted-foreground"}`}>{l}</button>
              ))}
            </div>
            <div className="flex items-center justify-between mt-6"><p className="font-extrabold">{t("Nouveaux versets par jour", "New verses per day")}</p><p className="text-2xl font-black text-primary">{perDay}</p></div>
            <input type="range" min={1} max={20} value={perDay} onChange={(e) => setPerDay(+e.target.value)} className="w-full mt-2 accent-[#00A3A8] h-2" aria-label={t("Nouveaux versets par jour", "New verses per day")} />
            <div className="grid grid-cols-2 gap-3 mt-6">
              <div className="rounded-2xl bg-accent p-4"><p className="text-sm font-extrabold text-accent-foreground/80">{t("Terminé vers le", "Done around")}</p><p className="text-xl font-black text-accent-foreground capitalize">{endDate}</p></div>
              <div className="rounded-2xl bg-background border-2 border-border p-4"><p className="text-sm font-extrabold text-muted-foreground">{t("Par jour", "Per day")}</p><p className="text-xl font-black">{perDay} + {t("révision", "review")}</p></div>
            </div>
            <CTA className="w-full mt-5" />
          </div>
        </div>
      </Section>

      {/* ─── 7. Pour qui + khatma ─── */}
      <Section id="pour-qui" eyebrow={t("Pour qui", "Who it's for")} title={t("Seul, en famille ou avec toute ta madrasa", "On your own, with your family or your whole madrasa")}>
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          {who.map(([I, h, list]) => (
            <div key={h} className="card-flat p-5">
              <span className="w-11 h-11 rounded-xl bg-accent text-primary flex items-center justify-center"><I weight="fill" className="w-6 h-6" /></span>
              <p className="font-black text-xl mt-3">{h}</p>
              <ul className="mt-2 space-y-2">{list.map((x) => <li key={x} className="flex gap-2 font-semibold text-muted-foreground"><CheckCircle weight="fill" className="w-5 h-5 text-primary shrink-0 mt-0.5" />{x}</li>)}</ul>
            </div>
          ))}
        </div>
        <div className="card-flat p-5 mt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-8 lg:items-center">
          <div>
            <p className="font-black text-xl">{t("Une khatma à plusieurs", "A shared khatma")}</p>
            <p className="font-semibold text-muted-foreground mt-1">{t("Chacun réserve un juz, le marque comme lu, et tout le groupe voit le Coran se compléter. Essaie : prends un juz libre.", "Everyone reserves a juz, marks it as read, and the whole group watches the Quran get completed. Try it: take a free juz.")}</p>
            <p className="text-sm font-extrabold text-accent-foreground mt-3">{t("Khatma de la famille", "Family khatma")} · {taken.size + (mine ? 1 : 0)}/30 {t("réservés", "reserved")}</p>
          </div>
          <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5 mt-4 lg:mt-0">
            {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => {
              const isMine = mine === j, isDone = done.has(j), isTaken = taken.has(j);
              return (
                <button key={j} disabled={isTaken} onClick={() => setMine(isMine ? null : j)}
                  className={`h-11 rounded-xl font-black text-sm border-2 ${isMine ? "bg-gold border-gold text-[#5C4300]" : isDone ? "bg-primary border-primary text-primary-foreground" : isTaken ? "bg-accent border-accent text-accent-foreground" : "bg-card border-border text-muted-foreground hover:border-primary"}`}>{j}</button>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ─── 8. Partout ─── */}
      <Section className="bg-background" eyebrow={t("Partout", "Everywhere")} title={t("Sur ton téléphone sans passer par un store", "On your phone, straight from the browser")}
        intro={t("MyHafizz s'installe depuis le navigateur en trois gestes et se met à jour tout seul. Ta progression te suit sur iPhone, Android et ordinateur.", "MyHafizz installs from your browser in three taps and updates itself. Your progress follows you on iPhone, Android and desktop.")}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          {[[DeviceMobile, t("Plein écran", "Full screen"), t("Icône sur l'écran d'accueil, ouverture sans barre de navigateur.", "Home-screen icon, opens without a browser bar.")],
            [ArrowsClockwise, t("Synchronisé", "Synced"), t("Commence sur ton téléphone, continue sur l'ordinateur.", "Start on your phone, carry on on your computer.")],
            [WifiSlash, t("Hors ligne", "Offline"), t("Révise dans le métro ou en voyage.", "Review on the bus or while travelling.")],
            [Desktop, t("Ordinateur", "Desktop"), t("Grand écran et raccourcis clavier.", "Big screen and keyboard shortcuts.")]].map(([I, h, d]) => (
            <div key={h} className="card-flat p-5"><I weight="fill" className="w-7 h-7 text-primary" /><p className="font-black text-lg mt-2">{h}</p><p className="font-semibold text-muted-foreground mt-1">{d}</p></div>
          ))}
        </div>
        <Link to="/telecharger" className="btn-relief h-12 px-5 mt-6 inline-flex bg-card border-2 border-border text-foreground [--relief-color:hsl(var(--border))]">{t("Installer l'application", "Install the app")}</Link>
      </Section>

      {/* ─── 9. FAQ ─── */}
      <Section id="faq" eyebrow="FAQ" title={t("Questions fréquentes", "Frequently asked questions")}>
        <div className="card-flat overflow-hidden divide-y-2 divide-border mt-8 max-w-3xl">
          {faqs.map(([qq, a], i) => (
            <div key={qq}>
              <button onClick={() => setFaq(faq === i ? -1 : i)} className="w-full flex items-center gap-3 p-4 text-left font-extrabold text-[17px]"><span className="flex-1">{qq}</span><CaretDown weight="bold" className={`w-5 h-5 text-muted-foreground transition-transform ${faq === i ? "rotate-180" : ""}`} /></button>
              {faq === i && <p className="px-4 pb-4 -mt-1 font-semibold text-muted-foreground leading-relaxed">{a}</p>}
            </div>
          ))}
        </div>
      </Section>

      {/* ─── 10. Appel final ─── */}
      <section className="px-5 py-16 lg:py-24 bg-accent">
        <div className="max-w-3xl mx-auto text-center">
          <CalendarCheck weight="fill" className="w-14 h-14 mx-auto text-primary" />
          <h2 className="text-[30px] lg:text-[44px] font-black leading-tight mt-3 text-accent-foreground">{t("Ta première séance est prête.", "Your first session is ready.")}</h2>
          <p className="text-lg font-semibold text-accent-foreground/80 mt-2">{t("Choisis une sourate, écoute-la, cache-la, récite-la. Demain, MyHafizz te dira quoi revoir.", "Pick a surah, listen, hide it, recite it. Tomorrow, MyHafizz will tell you what to review.")}</p>
          <CTA className="mt-7" />
        </div>
      </section>

      <footer className="px-5 py-8 border-t-2 border-border pb-[calc(env(safe-area-inset-bottom,0px)+32px)]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center gap-4 justify-between text-sm font-bold text-muted-foreground">
          <MhWordmark size={24} />
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            <Link to="/telecharger">{t("Télécharger", "Download")}</Link><Link to="/terms">{t("Conditions", "Terms")}</Link><Link to="/privacy">{t("Confidentialité", "Privacy")}</Link>
          </div>
          <span>© 2026 MyHafizz</span>
        </div>
      </footer>
    </div>
  );
}
