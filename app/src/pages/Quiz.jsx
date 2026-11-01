import React, { useState, useEffect, useRef, useCallback } from "react";
import { MemorizationProgress } from "@/api/entities";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { X, Brain, Trophy, ArrowsClockwise, CheckCircle, XCircle, Lightbulb, SpinnerGap, Microphone, Stop, Keyboard, Star } from "@phosphor-icons/react";
import { SURAHS } from "@/components/quranData";
import { report, userMsg } from "@/lib/report";

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
function Shell({ children, footer, phase, qIndex, total, onQuit }) {
  return (
    <div className="fixed inset-0 bg-card flex flex-col">
      <div className="max-w-2xl w-full mx-auto px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] flex items-center gap-3">
        <button onClick={onQuit} aria-label="Quitter" className="w-10 h-10 -ml-1 rounded-full flex items-center justify-center text-muted-foreground active:bg-muted"><X weight="bold" className="w-6 h-6" /></button>
        {(phase === "question" || phase === "result") && (
          <div className="flex-1 h-4 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((qIndex + (phase === "result" ? 1 : 0)) / total) * 100}%` }} /></div>
        )}
        {(phase === "question" || phase === "result") && <span className="font-black text-muted-foreground text-sm">{qIndex + 1}/{total}</span>}
      </div>
      <div className="flex-1 overflow-y-auto"><div className="max-w-2xl mx-auto px-4 py-4">{children}</div></div>
      {footer}
    </div>
  );
}

export default function Quiz() {
  const navigate = useNavigate();
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
    } catch (e) {
      report(e, "quiz:load");
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

  const total = questions.length;
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const good = result && result.score >= 80;
  const mid = result && result.score >= 50 && result.score < 80;

  if (phase === "intro" || phase === "loading") {
    return (
      <Shell phase={phase} qIndex={qIndex} total={questions.length} onQuit={() => { stopRecording(); navigate(-1); }} footer={
        <div className="max-w-2xl w-full mx-auto px-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
          {totalMemorized > 0 ? (
            <button disabled={phase === "loading"} onClick={startQuiz} className="btn-relief w-full h-[52px] bg-primary text-primary-foreground disabled:opacity-70">
              {phase === "loading" ? <><SpinnerGap weight="bold" className="w-5 h-5 animate-spin" />Préparation…</> : "Commencer le quiz"}
            </button>
          ) : (
            <Link to="/SurahList" className="btn-relief w-full h-[52px] bg-primary text-primary-foreground">Mémoriser un premier verset</Link>
          )}
        </div>
      }>
        <div className="text-center pt-6">
          <span className="w-20 h-20 mx-auto rounded-3xl bg-accent text-primary flex items-center justify-center"><Brain weight="fill" className="w-11 h-11" /></span>
          <h1 className="text-[26px] font-black mt-4">Quiz de récitation</h1>
          <p className="font-semibold text-muted-foreground mt-2 max-w-sm mx-auto">On te donne le début d'un verset que tu as mémorisé. Complète la suite, au clavier ou à voix haute.</p>
        </div>
        <div className="card-flat flex mt-6">
          <div className="flex-1 p-3 text-center"><p className="text-[22px] font-black">{isLoadingProgress ? "…" : totalMemorized}</p><p className="text-[11.5px] font-bold text-muted-foreground">versets disponibles</p></div>
          <div className="flex-1 p-3 text-center border-l-2 border-border"><p className="text-[22px] font-black">{Math.min(MAX_QUESTIONS, totalMemorized)}</p><p className="text-[11.5px] font-bold text-muted-foreground">questions</p></div>
        </div>
        {speechSupported && (
          <div className="grid grid-cols-2 gap-1 p-1 rounded-[14px] bg-muted mt-4">
            {[["audio", "À voix haute", Microphone], ["text", "Au clavier", Keyboard]].map(([k, l, I]) => (
              <button key={k} onClick={() => setMode(k)} className={`h-10 rounded-[10px] text-sm font-extrabold flex items-center justify-center gap-1.5 ${mode === k ? "bg-card text-accent-foreground shadow-[0_2px_0_hsl(var(--border))]" : "text-muted-foreground"}`}><I weight="fill" className="w-4 h-4" />{l}</button>
            ))}
          </div>
        )}
        {loadError && <p className="mt-4 text-sm font-bold text-destructive text-center">{loadError}</p>}
      </Shell>
    );
  }

  if (phase === "summary") {
    const perfect = scores.filter((x) => x >= 80).length;
    return (
      <Shell phase={phase} qIndex={qIndex} total={questions.length} onQuit={() => { stopRecording(); navigate(-1); }} footer={
        <div className="max-w-2xl w-full mx-auto px-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] space-y-2">
          <button onClick={startQuiz} className="btn-relief w-full h-[52px] bg-primary text-primary-foreground"><ArrowsClockwise weight="bold" className="w-5 h-5" />Nouveau quiz</button>
          <Link to="/Revision" className="flex items-center justify-center h-12 font-extrabold text-muted-foreground">Retour aux révisions</Link>
        </div>
      }>
        <div className="text-center pt-8">
          {avg >= 80 ? <Trophy weight="fill" className="w-20 h-20 mx-auto text-gold" /> : <Star weight="fill" className="w-20 h-20 mx-auto text-gold" />}
          <h1 className="text-[28px] font-black mt-3">{avg >= 80 ? "Excellent travail" : avg >= 50 ? "Bon entraînement" : "Continue à réviser"}</h1>
          <p className="font-semibold text-muted-foreground mt-1">{perfect} réponse{perfect > 1 ? "s" : ""} juste{perfect > 1 ? "s" : ""} sur {total}</p>
        </div>
        <div className="card-flat flex mt-6">
          <div className="flex-1 p-3 text-center"><p className="text-[22px] font-black text-primary">{avg} %</p><p className="text-[11.5px] font-bold text-muted-foreground">précision</p></div>
          <div className="flex-1 p-3 text-center border-l-2 border-border"><p className="text-[22px] font-black">{total}</p><p className="text-[11.5px] font-bold text-muted-foreground">questions</p></div>
        </div>
        <div className="card-flat overflow-hidden divide-y-2 divide-border mt-3">
          {questions.map((q, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              {scores[i] >= 80 ? <CheckCircle weight="fill" className="w-6 h-6 text-primary shrink-0" /> : <XCircle weight="fill" className="w-6 h-6 text-destructive shrink-0" />}
              <p className="flex-1 font-extrabold truncate">{q.surah.englishName}, verset {q.ayah.numberInSurah}</p>
              <span className="font-black text-sm text-muted-foreground">{scores[i]} %</span>
            </div>
          ))}
        </div>
      </Shell>
    );
  }

  const q = questions[qIndex];
  const prompt = q.words.slice(0, PROMPT_WORDS).join(" ");
  const rest = q.words.slice(PROMPT_WORDS);
  return (
    <Shell phase={phase} qIndex={qIndex} total={questions.length} onQuit={() => { stopRecording(); navigate(-1); }} footer={
      phase === "result" ? (
        <div className={`border-t-2 ${good ? "bg-accent border-primary/30" : "bg-[#FDECEC] border-destructive/30 dark:bg-destructive/15"}`}>
          <div className="max-w-2xl mx-auto px-4 pt-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
            <p className={`font-black text-xl flex items-center gap-2 ${good ? "text-accent-foreground" : "text-destructive"}`}>
              {good ? <CheckCircle weight="fill" className="w-7 h-7" /> : <XCircle weight="fill" className="w-7 h-7" />}
              {good ? (result.score === 100 ? "Parfait" : "Bien joué") : mid ? "Presque" : "Pas tout à fait"} · {result.score} %
            </p>
            {!good && <><p className={`text-sm font-extrabold mt-2 ${good ? "" : "text-destructive"}`}>Bonne réponse :</p><p className="font-arabic text-2xl leading-loose text-foreground" dir="rtl">{result.correct}</p></>}
            <button onClick={nextQuestion} className={`btn-relief w-full h-[52px] mt-3 ${good ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground [--relief-color:#B8343A]"}`}>
              {qIndex + 1 >= total ? "Voir le résultat" : "Continuer"}
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl w-full mx-auto px-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
          <button disabled={!answer.trim()} onClick={submitAnswer} className="btn-relief w-full h-[52px] bg-primary text-primary-foreground disabled:opacity-50 disabled:shadow-none">Vérifier</button>
        </div>
      )
    }>
      <p className="font-black text-[22px]">Complète le verset</p>
      <p className="text-sm font-semibold text-muted-foreground">{q.surah.englishName} · verset {q.ayah.numberInSurah}</p>
      <div className="rounded-2xl bg-background border-2 border-border p-4 mt-4">
        <p className="font-arabic text-[28px] leading-[2.1] text-right" dir="rtl">{prompt} <span className="text-muted-foreground">…</span></p>
      </div>

      {phase === "question" && (
        <>
          {mode === "audio" && speechSupported ? (
            <div className="text-center mt-6">
              <button onClick={isRecording ? stopRecording : startRecording} aria-label={isRecording ? "Arrêter" : "Réciter"}
                className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${isRecording ? "bg-destructive text-destructive-foreground shadow-[0_4px_0_#B8343A]" : "bg-primary text-primary-foreground shadow-[0_4px_0_var(--primary-lip)]"}`}>
                {isRecording ? <Stop weight="fill" className="w-8 h-8" /> : <Microphone weight="fill" className="w-9 h-9" />}
              </button>
              <p className="font-extrabold text-muted-foreground mt-3">{isRecording ? `J'écoute… ${recordingTime} s` : "Touche et récite la suite"}</p>
              {answer && <p className="font-arabic text-2xl leading-loose mt-3" dir="rtl">{answer}</p>}
              <button onClick={() => { stopRecording(); setMode("text"); }} className="mt-3 text-sm font-extrabold text-primary">Écrire plutôt</button>
            </div>
          ) : (
            <>
              <textarea ref={textareaRef} value={answer} onChange={(e) => setAnswer(e.target.value)} dir="rtl" rows={3} placeholder="اكتب بقية الآية…"
                className="w-full mt-4 p-4 rounded-2xl border-2 border-border bg-card font-arabic text-2xl leading-loose focus:outline-none focus:border-primary resize-none" />
              {speechSupported && <button onClick={() => setMode("audio")} className="mt-2 text-sm font-extrabold text-primary">Réciter à voix haute</button>}
            </>
          )}
          <button onClick={() => setShowHint(!showHint)} className="mt-4 h-10 px-3 rounded-xl border-2 border-border bg-card text-sm font-extrabold flex items-center gap-1.5">
            <Lightbulb weight="fill" className="w-4 h-4 text-gold" />{showHint ? "Masquer l'indice" : "Indice"}
          </button>
          {showHint && <p className="font-arabic text-2xl mt-2 text-muted-foreground" dir="rtl">{rest.slice(0, 2).join(" ")} …</p>}
        </>
      )}
      {phase === "result" && result.given && (
        <div className="mt-4"><p className="text-sm font-extrabold text-muted-foreground">Ta réponse</p><p className="font-arabic text-2xl leading-loose" dir="rtl">{result.given}</p></div>
      )}
    </Shell>
  );
}
