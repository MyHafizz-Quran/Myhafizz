import React, { useState, useEffect, useRef, useCallback } from "react";
import { MemorizationProgress } from "@/api/entities";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Brain, Trophy, RefreshCw, ChevronRight,
  CheckCircle2, XCircle, Lightbulb, Zap, Target, BookOpen, Loader2,
  Mic, MicOff, Keyboard
} from "lucide-react";
import { SURAHS } from "@/components/quranData";

// ── Normalisation arabe ──────────────────────────────────────────────────────
function normalize(text) {
  return text
    .replace(/[\u064B-\u065F\u0670]/g, "")   // tashkeel
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreAnswer(answer, correct) {
  const aWords = normalize(answer).split(" ").filter(Boolean);
  const cWords = normalize(correct).split(" ").filter(Boolean);
  if (!cWords.length) return 0;
  const used = new Array(cWords.length).fill(false);
  let matches = 0;
  aWords.forEach(aw => {
    const idx = cWords.findIndex((cw, i) => !used[i] && cw === aw);
    if (idx !== -1) { matches++; used[idx] = true; }
  });
  return Math.round((matches / cWords.length) * 100);
}

function getScoreInfo(score) {
  if (score === 100) return { label: "Parfait !", icon: "🌟", color: "emerald" };
  if (score >= 80)  return { label: "Excellent !", icon: "✅", color: "emerald" };
  if (score >= 60)  return { label: "Bien !", icon: "👍", color: "amber" };
  if (score >= 40)  return { label: "Passable", icon: "😐", color: "orange" };
  return { label: "À retravailler", icon: "📖", color: "red" };
}

const COLOR_MAP = {
  emerald: { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-200 dark:border-emerald-800", bar: "bg-emerald-500" },
  amber:   { text: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-50 dark:bg-amber-900/20",   border: "border-amber-200 dark:border-amber-800",   bar: "bg-amber-400" },
  orange:  { text: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-200 dark:border-orange-800", bar: "bg-orange-400" },
  red:     { text: "text-red-600 dark:text-red-400",       bg: "bg-red-50 dark:bg-red-900/20",       border: "border-red-200 dark:border-red-800",       bar: "bg-red-400" },
};

const PROMPT_WORDS = 4;
const MAX_QUESTIONS = 10;

// ── Fetch un seul surah ──────────────────────────────────────────────────────
async function fetchSurahVerses(surahNum) {
  const res = await fetch(`https://api.alquran.cloud/v1/surah/${surahNum}`);
  const json = await res.json();
  if (json.code !== 200 || !json.data?.ayahs) return [];
  return json.data.ayahs.map((a, i) => ({
    ...a,
    numberInSurah: a.numberInSurah ?? (i + 1),
  }));
}

// ── Composant Header ─────────────────────────────────────────────────────────
function QuizHeader() {
  return (
    <div className="bg-white/[0.97] dark:bg-gray-950/[0.97] backdrop-blur-xl border-b border-border/60 sticky top-0 z-[var(--z-page-header)] shadow-[0_2px_8px_rgba(0,0,0,0.05)] dark:shadow-none">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
        <Link to="/Dashboard">
          <button className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <Brain className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Quiz Hifdh</h1>
      </div>
    </div>
  );
}

// ── Page principale ──────────────────────────────────────────────────────────
export default function Quiz() {
  const [phase, setPhase] = useState("intro"); // intro | loading | question | result | summary
  const [questions, setQuestions] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState(null);
  const [scores, setScores] = useState([]);
  const [showHint, setShowHint] = useState(false);
  const [loadError, setLoadError] = useState("");
  const textareaRef = useRef(null);

  // ── Audio mode state ──────────────────────────────────────────────────────
  const [mode, setMode] = useState("text"); // "text" | "audio"
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef(null);
  const recordingTimerRef = useRef(null);

  const { data: progressList = [], isLoading: isLoadingProgress } = useQuery({
    queryKey: ["memorization-progress"],
    queryFn: () => MemorizationProgress.list(),
  });

  const memorizedItems = progressList.filter(p => p.memorized_verses?.length > 0);
  const totalMemorized = memorizedItems.reduce((s, p) => s + (p.memorized_verses?.length || 0), 0);

  // Focus textarea when entering question phase
  useEffect(() => {
    if (phase === "question") {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [phase, qIndex]);

  // Detect browser speech recognition support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSpeechSupported(!!SpeechRecognition);
    if (SpeechRecognition) {
      setMode("audio");
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      clearInterval(recordingTimerRef.current);
    };
  }, []);

  const startQuiz = useCallback(async () => {
    setPhase("loading");
    setLoadError("");
    try {
      // Fetch all surahs with memorized verses
      const surahNums = [...new Set(memorizedItems.map(p => p.surah_number))];
      const results = await Promise.all(surahNums.map(fetchSurahVerses));
      
      const versesMap = {};
      surahNums.forEach((n, i) => { versesMap[n] = results[i]; });

      // Build pool
      const pool = [];
      memorizedItems.forEach(prog => {
        const ayahs = versesMap[prog.surah_number] || [];
        const surah = SURAHS.find(s => s.number === prog.surah_number);
        if (!surah) return;
        prog.memorized_verses.forEach(vNum => {
          const ayah = ayahs.find(a => a.numberInSurah === vNum);
          if (!ayah) return;
          const words = ayah.text.trim().split(/\s+/);
          if (words.length <= PROMPT_WORDS) return; // trop court
          pool.push({ ayah, surah, words });
        });
      });

      if (pool.length === 0) {
        setLoadError("Aucun verset utilisable trouvé. Assurez-vous d'avoir mémorisé des versets contenant plus de 4 mots.");
        setPhase("intro");
        return;
      }

      // Shuffle & pick
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      const picked = shuffled.slice(0, Math.min(MAX_QUESTIONS, shuffled.length));

      setQuestions(picked);
      setQIndex(0);
      setScores([]);
      setAnswer("");
      setResult(null);
      setShowHint(false);
      setPhase("question");
    } catch (err) {
      setLoadError("Erreur de chargement des versets. Vérifiez votre connexion.");
      setPhase("intro");
    }
  }, [memorizedItems]);

  function submitAnswer() {
    const q = questions[qIndex];
    const correct = q.words.slice(PROMPT_WORDS).join(" ");
    const score = scoreAnswer(answer.trim(), correct);

    // Vibration if wrong answer
    if (score < 80 && navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }

    // Stop recording if active
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    clearInterval(recordingTimerRef.current);

    setResult({ score, correct, given: answer.trim(), prompt: q.words.slice(0, PROMPT_WORDS).join(" ") });
    setScores(prev => [...prev, score]);
    setPhase("result");
  }

  function nextQuestion() {
    stopRecording();
    if (qIndex + 1 >= questions.length) {
      setPhase("summary");
    } else {
      setQIndex(i => i + 1);
      setAnswer("");
      setResult(null);
      setShowHint(false);
      setPhase("question");
    }
  }

  function startRecording() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "ar-SA";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setAnswer(transcript);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
      if (event.error === "not-allowed") {
        setMode("text");
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setRecordingTime(0);

    recordingTimerRef.current = setInterval(() => {
      setRecordingTime(t => t + 1);
    }, 1000);
  }

  function stopRecording() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    clearInterval(recordingTimerRef.current);
  }

  // ── INTRO ────────────────────────────────────────────────────────────────
  if (phase === "intro" || phase === "loading") {
    return (
      <div className="min-h-screen bg-background">
        <QuizHeader />
        <div className="max-w-xl mx-auto px-4 sm:px-6 py-10 space-y-5">
          {/* Hero */}
          <div className="bg-gradient-to-br from-emerald-900 to-emerald-800 rounded-3xl p-7 text-center">
            <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Quiz de mémorisation</h2>
            <p className="text-emerald-300/80 text-sm leading-relaxed">
              L'application affiche le début d'un verset mémorisé — récitez la suite pour tester votre hifdh.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Target, label: "Versets mémorisés", value: isLoadingProgress ? "…" : totalMemorized, c: "text-emerald-500" },
              { icon: Zap,    label: "Questions/quiz",    value: Math.min(MAX_QUESTIONS, totalMemorized) || "—", c: "text-amber-500" },
              { icon: Trophy, label: "Score max",         value: "100%", c: "text-sky-500" },
            ].map(({ icon: Icon, label, value, c }) => (
              <div key={label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-3.5 text-center">
                <Icon className={`w-5 h-5 mx-auto mb-1.5 ${c}`} />
                <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
                <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* How it works */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Comment ça marche</p>
            {[
              "Un verset mémorisé est affiché partiellement",
              "Récitez la suite à voix haute 🎙️ ou tapez en arabe",
              "Votre récitation est convertie en texte et comparée",
              "Un score de précision vous est attribué",
              "Vibration si la réponse est incorrecte 📳",
            ].map((txt, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{txt}</p>
              </div>
            ))}
          </div>

          {/* Error */}
          {loadError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <p className="text-sm text-red-700 dark:text-red-400">{loadError}</p>
            </div>
          )}

          {/* CTA */}
          {isLoadingProgress ? (
            <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 text-emerald-500 animate-spin" /></div>
          ) : totalMemorized === 0 ? (
            <div className="text-center py-4 space-y-3">
              <p className="text-gray-500 dark:text-gray-400 text-sm">Vous n'avez pas encore de versets mémorisés.</p>
              <Link to="/SurahList">
                <button className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold">
                  <BookOpen className="w-4 h-4" /> Commencer à mémoriser
                </button>
              </Link>
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={startQuiz}
              disabled={phase === "loading"}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold text-base shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {phase === "loading" ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Chargement des versets...</>
              ) : (
                "Lancer le quiz 🚀"
              )}
            </motion.button>
          )}
        </div>
      </div>
    );
  }

  // ── SUMMARY ──────────────────────────────────────────────────────────────
  if (phase === "summary") {
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const perfect = scores.filter(s => s === 100).length;
    const good    = scores.filter(s => s >= 80 && s < 100).length;
    const poor    = scores.filter(s => s < 40).length;
    return (
      <div className="min-h-screen bg-background">
        <QuizHeader />
        <div className="max-w-xl mx-auto px-4 sm:px-6 py-10 space-y-5">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <div className={`rounded-3xl p-8 text-center mb-5 ${avg >= 80 ? "bg-gradient-to-br from-emerald-900 to-emerald-700" : avg >= 50 ? "bg-gradient-to-br from-amber-700 to-amber-600" : "bg-gradient-to-br from-gray-800 to-gray-700"}`}>
              <Trophy className="w-12 h-12 text-amber-300 mx-auto mb-4" />
              <p className="text-white/70 text-sm mb-1">Score final</p>
              <p className="text-6xl font-black text-white">{avg}<span className="text-3xl text-white/60">%</span></p>
              <p className="text-white/70 text-sm mt-2">{scores.length} question{scores.length > 1 ? "s" : ""} répondue{scores.length > 1 ? "s" : ""}</p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { val: perfect, label: "Parfait 🌟", c: "text-emerald-600 dark:text-emerald-400" },
                { val: good,    label: "Bien ✅",    c: "text-amber-600 dark:text-amber-400" },
                { val: poor,    label: "À revoir 📖", c: "text-red-500 dark:text-red-400" },
              ].map(({ val, label, c }) => (
                <div key={label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 text-center">
                  <p className={`text-2xl font-black ${c}`}>{val}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 mb-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Détail par question</p>
              <div className="space-y-2">
                {scores.map((s, i) => {
                  const bar = s >= 80 ? "bg-emerald-500" : s >= 50 ? "bg-amber-400" : "bg-red-400";
                  const tc  = s >= 80 ? "text-emerald-600" : s >= 50 ? "text-amber-600" : "text-red-500";
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-6 text-right flex-shrink-0">Q{i + 1}</span>
                      <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                        <div className={`h-2 rounded-full ${bar}`} style={{ width: `${s}%` }} />
                      </div>
                      <span className={`text-xs font-bold w-10 text-right flex-shrink-0 ${tc}`}>{s}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3">
              <motion.button whileTap={{ scale: 0.97 }} onClick={startQuiz}
                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/20">
                <RefreshCw className="w-4 h-4" /> Rejouer
              </motion.button>
              <Link to="/Dashboard" className="flex-1">
                <button className="w-full py-4 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold">
                  Accueil
                </button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── QUESTION / RESULT ────────────────────────────────────────────────────
  const q = questions[qIndex];
  if (!q) return null;
  const promptText  = q.words.slice(0, PROMPT_WORDS).join(" ");
  const hintText    = q.words.slice(PROMPT_WORDS, PROMPT_WORDS + 4).join(" ") + "...";

  return (
    <div className="min-h-screen bg-background">
      <QuizHeader />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">

        {/* Progress */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 bg-gray-200 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
              style={{ width: `${(qIndex / questions.length) * 100}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex-shrink-0">
            {qIndex + 1} / {questions.length}
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={`${qIndex}-${phase}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">

            {/* Surah badge */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">{q.surah.number}</span>
              </div>
              <span className="text-sm font-bold text-gray-800 dark:text-gray-200" style={{ fontFamily: "'Amiri', serif" }}>{q.surah.name}</span>
              <span className="text-gray-400 text-xs">— Verset {q.ayah.numberInSurah}</span>
            </div>

            {/* Prompt */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-3">Début du verset</p>
              <p dir="rtl" className="text-3xl sm:text-4xl leading-[2.2] text-gray-900 dark:text-gray-100" style={{ fontFamily: "'Amiri', 'Traditional Arabic', serif" }}>
                {promptText}
                <span className="text-emerald-400 ml-2">...</span>
              </p>
            </div>

            {/* Answer input */}
            {phase === "question" && (
              <>
                {/* Mode Toggle */}
                {speechSupported && (
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => { setMode("text"); stopRecording(); }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        mode === "text"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                          : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      }`}
                    >
                      <Keyboard className="w-3.5 h-3.5" /> Texte
                    </button>
                    <button
                      onClick={() => setMode("audio")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        mode === "audio"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                          : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      }`}
                    >
                      <Mic className="w-3.5 h-3.5" /> Audio
                    </button>
                  </div>
                )}

                {/* Audio mode UI */}
                {mode === "audio" && (
                  <div className="flex flex-col items-center gap-4 py-2">
                    {/* Mic button */}
                    <div className="relative flex items-center justify-center">
                      {isRecording && (
                        <motion.div
                          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.2, 0.5] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="absolute w-24 h-24 rounded-full bg-red-400/30"
                        />
                      )}
                      <motion.button
                        whileTap={{ scale: 0.93 }}
                        animate={isRecording ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                        transition={isRecording ? { duration: 1.2, repeat: Infinity } : {}}
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-colors ${
                          isRecording
                            ? "bg-red-500 shadow-red-500/30"
                            : "bg-emerald-500 shadow-emerald-500/30"
                        }`}
                      >
                        {isRecording
                          ? <MicOff className="w-8 h-8 text-white" />
                          : <Mic className="w-8 h-8 text-white" />
                        }
                      </motion.button>
                    </div>

                    {/* Status text */}
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                      {isRecording
                        ? `🔴 Écoute en cours... ${recordingTime}s`
                        : "Appuyez pour réciter"
                      }
                    </p>

                    {/* Live transcript preview */}
                    {answer.trim() && (
                      <div className="w-full bg-muted/50 rounded-xl p-3">
                        <p dir="rtl" className="text-base leading-loose text-gray-800 dark:text-gray-200 text-center"
                          style={{ fontFamily: "'Amiri', 'Traditional Arabic', serif" }}>
                          {answer}
                        </p>
                      </div>
                    )}

                    {/* Optional text correction */}
                    <div className="w-full">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 text-center">
                        💡 Ou tapez votre réponse
                      </p>
                      <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden focus-within:border-emerald-400 dark:focus-within:border-emerald-600 transition-colors">
                        <textarea
                          value={answer}
                          onChange={e => setAnswer(e.target.value)}
                          dir="rtl"
                          rows={3}
                          placeholder="اكتب هنا..."
                          className="w-full px-4 py-3 text-xl leading-loose bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600 resize-none outline-none"
                          style={{ fontFamily: "'Amiri', 'Traditional Arabic', serif" }}
                          onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && answer.trim()) submitAnswer(); }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Text mode UI */}
                {mode === "text" && (
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden focus-within:border-emerald-400 dark:focus-within:border-emerald-600 transition-colors">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4 pt-3">Votre récitation</p>
                    <textarea
                      ref={textareaRef}
                      value={answer}
                      onChange={e => setAnswer(e.target.value)}
                      dir="rtl"
                      rows={4}
                      placeholder="اكتب هنا..."
                      className="w-full px-4 pb-4 pt-2 text-2xl leading-loose bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600 resize-none outline-none"
                      style={{ fontFamily: "'Amiri', 'Traditional Arabic', serif" }}
                      onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && answer.trim()) submitAnswer(); }}
                    />
                  </div>
                )}

                {showHint && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
                    <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p dir="rtl" className="text-base text-amber-700 dark:text-amber-400" style={{ fontFamily: "'Amiri', serif" }}>{hintText}</p>
                  </motion.div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setShowHint(v => !v)}
                    className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <Lightbulb className="w-4 h-4" /> Indice
                  </button>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={submitAnswer} disabled={!answer.trim()}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/20">
                    Valider <ChevronRight className="w-4 h-4" />
                  </motion.button>
                </div>
              </>
            )}

            {/* Result */}
            {phase === "result" && result && (() => {
              const info  = getScoreInfo(result.score);
              const cm    = result.score < 80
                ? { text: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/30", border: "border-2 border-red-400", bar: "bg-red-400" }
                : COLOR_MAP[info.color];
              return (
                <>
                  <motion.div
                    initial={{ x: 0 }}
                    animate={result.score < 80
                      ? { x: [0, -12, 12, -12, 12, -6, 6, 0] }
                      : { scale: [0.95, 1.02, 1] }
                    }
                    transition={{ duration: result.score < 80 ? 0.5 : 0.4 }}
                  >
                    <div className={`rounded-2xl border p-5 space-y-4 ${cm.bg} ${cm.border}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {result.score >= 80
                            ? (
                              <motion.div
                                initial={{ scale: 0.5 }}
                                animate={{ scale: [0.5, 1.2, 1] }}
                                transition={{ duration: 0.4 }}
                              >
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                              </motion.div>
                            )
                            : <XCircle className="w-5 h-5 text-red-400" />
                          }
                          <span className={`font-bold text-sm ${cm.text}`}>{info.icon} {info.label}</span>
                        </div>
                        <span className={`text-2xl font-black ${cm.text}`}>{result.score}%</span>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Verset complet</p>
                        <p dir="rtl" className="text-xl leading-loose text-gray-900 dark:text-gray-100" style={{ fontFamily: "'Amiri', serif" }}>
                          <span className="text-gray-400">{result.prompt} </span>
                          <span className="text-emerald-700 dark:text-emerald-400">{result.correct}</span>
                        </p>
                      </div>

                      {result.given && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Votre réponse</p>
                          <p dir="rtl" className={`text-base leading-loose ${result.score < 80 ? "text-red-500" : "text-gray-500 dark:text-gray-400"}`} style={{ fontFamily: "'Amiri', serif" }}>{result.given}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>

                  <motion.button whileTap={{ scale: 0.97 }} onClick={nextQuestion}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2">
                    {qIndex + 1 >= questions.length
                      ? <><Trophy className="w-4 h-4" /> Voir les résultats</>
                      : <>Question suivante <ChevronRight className="w-4 h-4" /></>
                    }
                  </motion.button>
                </>
              );
            })()}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}