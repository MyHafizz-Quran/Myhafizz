import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CaretLeft, Microphone, Stop, Play, Pause, ShareNetwork, Trash, CheckCircle, ArrowCounterClockwise, Minus, Plus, Eye } from "@phosphor-icons/react";
import { SURAHS } from "@/components/quranData";
import { loadSurah } from "@/lib/learningData";
import { align, cmpKey, SpeechRec, Recordings, pickMime } from "@/lib/recitation";
import { VerseReview } from "@/api/entities";
import { schedule, GRADES } from "@/lib/srs";
import { haptic } from "@/hooks/usePlatform";

const isWord = (w) => /[\u0621-\u064A]/.test(w);
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function Stepper({ label, value, onChange, min, max }) {
  return (
    <div className="flex-1">
      <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mb-2">{label}</p>
      <div className="flex items-center justify-between card-flat px-2 h-12">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} className="w-9 h-9 flex items-center justify-center press" aria-label="Moins"><Minus weight="bold" /></button>
        <span className="font-extrabold text-lg">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} className="w-9 h-9 flex items-center justify-center press" aria-label="Plus"><Plus weight="bold" /></button>
      </div>
    </div>
  );
}

// ── Vérifier : reconnaissance vocale ─────────────────────────────────────────
function Verify({ surah, from, to, ayahs }) {
  const qc = useQueryClient();
  const { data: reviews = [] } = useQuery({ queryKey: ["verse-reviews"], queryFn: () => VerseReview.list() });
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [done, setDone] = useState(false);
  const [peek, setPeek] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const recRef = useRef(null), finalRef = useRef(""), wantRef = useRef(false);

  const expected = useMemo(() => {
    const out = [];
    for (let v = from; v <= to; v++) (ayahs[v - 1]?.text || "").split(/\s+/).filter(isWord).forEach((t) => out.push({ text: t, key: cmpKey(t), verse: v }));
    return out;
  }, [ayahs, from, to]);
  const { status, cursor } = useMemo(() => align(expected, heard), [expected, heard]);
  const finalStatus = done ? status.map((s) => (s === "pending" ? "missed" : s)) : status;
  const okCount = finalStatus.filter((s) => s === "ok").length;

  useEffect(() => () => { wantRef.current = false; recRef.current?.abort?.(); }, []);
  useEffect(() => { stop(true); reset(); }, [from, to, surah.number]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (listening && cursor >= expected.length && expected.length) stop(); }, [cursor]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => { finalRef.current = ""; setHeard(""); setDone(false); setSaved(false); setError(""); };
  const start = () => {
    if (!SpeechRec) return;
    haptic(); reset();
    const r = new SpeechRec();
    r.lang = "ar-SA"; r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
    r.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalRef.current += " " + t; else interim += " " + t;
      }
      setHeard(finalRef.current + interim);
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") { setError("Autorise le micro pour vérifier ta récitation."); wantRef.current = false; }
      else if (e.error === "network") { setError("La reconnaissance vocale a besoin d'Internet."); wantRef.current = false; }
    };
    // Le navigateur coupe l'écoute après un silence : on relance tant que l'élève récite
    r.onend = () => { if (wantRef.current) { try { r.start(); } catch { /* déjà relancé */ } } else setListening(false); };
    recRef.current = r; wantRef.current = true;
    try { r.start(); setListening(true); } catch { setError("Impossible de démarrer le micro."); }
  };
  function stop(silent) {
    wantRef.current = false;
    try { recRef.current?.stop(); } catch { /* rien */ }
    setListening(false);
    if (!silent) { haptic(); setDone(true); }
  }

  const saveReviews = async () => {
    const rows = [];
    for (let v = from; v <= to; v++) {
      const st = finalStatus.filter((_, i) => expected[i].verse === v);
      const miss = st.filter((s) => s !== "ok").length;
      const g = miss === 0 ? GRADES.EASY : miss <= Math.max(1, Math.round(st.length * 0.15)) ? GRADES.HARD : GRADES.FORGOT;
      const prev = reviews.find((r) => r.surah_number === surah.number && r.verse_number === v);
      rows.push({ surah_number: surah.number, verse_number: v, ...schedule(prev, g) });
    }
    try { await VerseReview.upsert(rows); setSaved(true); qc.invalidateQueries({ queryKey: ["verse-reviews"] }); } catch { setError("Enregistrement impossible, réessaie."); }
  };

  if (!SpeechRec) {
    return (
      <div className="card-flat p-5 text-center">
        <p className="font-extrabold">Vérification vocale indisponible ici</p>
        <p className="text-sm font-semibold text-muted-foreground mt-1">Ton navigateur ne propose pas la reconnaissance vocale. Utilise Chrome sur Android ou Safari sur iPhone, ou enregistre-toi dans l'onglet « Enregistrer ».</p>
      </div>
    );
  }

  return (
    <div>
      <div className="card-flat p-4">
        {Array.from({ length: to - from + 1 }, (_, k) => from + k).map((v) => (
          <div key={v} className="mb-3 last:mb-0">
            <p className="text-xs font-extrabold text-muted-foreground mb-1">Verset {v}</p>
            <p dir="rtl" className="font-arabic text-[28px] leading-[2.2] text-right">
              {expected.map((w, i) => w.verse !== v ? null : (
                <React.Fragment key={i}>
                  {finalStatus[i] === "ok" ? <span>{w.text}</span>
                    : finalStatus[i] === "missed" ? <span className="text-destructive bg-destructive/10 rounded-md px-0.5 font-bold">{w.text}</span>
                    : peek ? <span className="text-muted-foreground/60">{w.text}</span>
                    : <span className="inline-block align-middle h-3 rounded-full bg-muted" style={{ width: `${Math.max(1.2, w.text.length * 0.42)}em` }} />}
                  {" "}
                </React.Fragment>
              ))}
            </p>
          </div>
        ))}
      </div>

      {error && <p className="text-sm font-bold text-destructive text-center mt-3">{error}</p>}

      {done ? (
        <div className="mt-4">
          <div className="card-flat p-4 flex items-center gap-3">
            <CheckCircle weight="fill" className={`w-10 h-10 shrink-0 ${okCount === expected.length ? "text-primary" : "text-muted-foreground"}`} />
            <div>
              <p className="font-extrabold text-lg">{okCount} / {expected.length} mots</p>
              <p className="text-sm font-semibold text-muted-foreground">{okCount === expected.length ? "Récitation complète, bravo." : "Les mots en rouge ont été oubliés ou mal entendus."}</p>
            </div>
          </div>
          <p className="text-[11px] font-semibold text-muted-foreground text-center mt-2">La reconnaissance vocale peut se tromper : réécoute en cas de doute.</p>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <button onClick={start} className="btn-relief h-[50px] bg-card border-2 border-border text-foreground" style={{ "--relief-color": "hsl(var(--border))" }}><ArrowCounterClockwise weight="bold" /> Recommencer</button>
            <button onClick={saveReviews} disabled={saved} className="btn-relief h-[50px] bg-primary text-primary-foreground">{saved ? "Enregistré" : "Noter"}</button>
          </div>
          {saved && <p className="text-xs font-bold text-primary text-center mt-2">Résultat ajouté à tes révisions.</p>}
        </div>
      ) : (
        <div className="flex flex-col items-center mt-6">
          <button onClick={() => (listening ? stop() : start())}
            className={`btn-relief w-20 h-20 rounded-full ${listening ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}`}
            style={listening ? { "--relief-color": "#B3261E" } : undefined} aria-label={listening ? "Arrêter" : "Réciter"}>
            {listening ? <Stop weight="fill" className="w-8 h-8" /> : <Microphone weight="fill" className="w-8 h-8" />}
          </button>
          <p className="font-extrabold mt-3">{listening ? "Je t'écoute…" : "Touche le micro et récite"}</p>
          <p className="text-sm font-semibold text-muted-foreground">{listening ? `${cursor} / ${expected.length} mots` : "Les mots apparaissent au fil de ta récitation"}</p>
          <button onClick={() => setPeek((p) => !p)} className="mt-3 flex items-center gap-1.5 text-sm font-extrabold text-primary"><Eye weight="bold" /> {peek ? "Cacher le texte" : "Voir le texte"}</button>
        </div>
      )}
    </div>
  );
}

// ── Enregistrer : réécouter et partager ──────────────────────────────────────
function Record({ surah, from, to }) {
  const [recs, setRecs] = useState([]);
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [playing, setPlaying] = useState(null);
  const [error, setError] = useState("");
  const mrRef = useRef(null), chunks = useRef([]), timer = useRef(null), audio = useRef(null), t0 = useRef(0);
  const mime = pickMime();

  const refresh = () => Recordings.list().then(setRecs).catch(() => setRecs([]));
  useEffect(() => { refresh(); return () => { clearInterval(timer.current); audio.current?.pause(); mrRef.current?.stream?.getTracks().forEach((t) => t.stop()); }; }, []);

  const start = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: true } });
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunks.current = [];
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = mr.mimeType || mime || "audio/webm";
        const blob = new Blob(chunks.current, { type });
        const duration = (Date.now() - t0.current) / 1000;
        if (duration > 1) await Recordings.add({ id: crypto.randomUUID(), surah: surah.number, from, to, created: Date.now(), duration, mime: type, blob });
        refresh();
      };
      mr.start(); mrRef.current = mr; t0.current = Date.now(); setSecs(0); setRecording(true); haptic();
      timer.current = setInterval(() => setSecs((Date.now() - t0.current) / 1000), 250);
    } catch {
      setError("Autorise le micro pour t'enregistrer.");
    }
  };
  const stop = () => { clearInterval(timer.current); mrRef.current?.stop(); setRecording(false); haptic(); };

  const play = (r) => {
    if (playing === r.id) { audio.current?.pause(); setPlaying(null); return; }
    audio.current?.pause();
    const a = new Audio(URL.createObjectURL(r.blob)); audio.current = a;
    a.onended = () => setPlaying(null); a.play().then(() => setPlaying(r.id)).catch(() => setPlaying(null));
  };
  const label = (r) => `${SURAHS[r.surah - 1]?.englishName} · ${r.from === r.to ? `v. ${r.from}` : `v. ${r.from}–${r.to}`}`;
  const share = async (r) => {
    const ext = r.mime.includes("mp4") ? "m4a" : r.mime.includes("ogg") ? "ogg" : "webm";
    const file = new File([r.blob], `MyHafizz-${SURAHS[r.surah - 1]?.englishName}-${r.from}-${r.to}.${ext}`, { type: r.mime });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: "Ma récitation", text: `Ma récitation : ${label(r)} (MyHafizz)` }); } catch { /* annulé */ }
    } else {
      const a = document.createElement("a"); a.href = URL.createObjectURL(file); a.download = file.name; a.click();
    }
  };
  const remove = async (r) => { if (playing === r.id) audio.current?.pause(); await Recordings.remove(r.id); refresh(); };

  if (!mime && mime !== "") {
    return <div className="card-flat p-5 text-center font-semibold text-muted-foreground">L'enregistrement n'est pas pris en charge par ce navigateur.</div>;
  }

  return (
    <div>
      <div className="flex flex-col items-center mt-2">
        <button onClick={() => (recording ? stop() : start())}
          className={`btn-relief w-20 h-20 rounded-full ${recording ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}`}
          style={recording ? { "--relief-color": "#B3261E" } : undefined} aria-label={recording ? "Arrêter" : "Enregistrer"}>
          {recording ? <Stop weight="fill" className="w-8 h-8" /> : <Microphone weight="fill" className="w-8 h-8" />}
        </button>
        <p className="font-extrabold mt-3">{recording ? `Enregistrement… ${fmt(secs)}` : "Touche pour t'enregistrer"}</p>
        <p className="text-sm font-semibold text-muted-foreground text-center">Réécoute-toi, puis envoie la récitation à ton maître.</p>
        {error && <p className="text-sm font-bold text-destructive mt-2">{error}</p>}
      </div>

      <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mt-6 mb-2">Mes enregistrements</p>
      {recs.length === 0 ? (
        <div className="card-flat p-4 text-sm font-semibold text-muted-foreground text-center">Aucun enregistrement pour l'instant.</div>
      ) : (
        <div className="card-flat divide-y-2 divide-border overflow-hidden">
          {recs.map((r) => (
            <div key={r.id} className="flex items-center gap-3 p-3">
              <button onClick={() => play(r)} className="w-11 h-11 rounded-full bg-accent text-primary flex items-center justify-center shrink-0 press" aria-label="Écouter">
                {playing === r.id ? <Pause weight="fill" className="w-5 h-5" /> : <Play weight="fill" className="w-5 h-5" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className="font-extrabold truncate">{label(r)}</p>
                <p className="text-xs font-semibold text-muted-foreground">{new Date(r.created).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} · {fmt(r.duration)}</p>
              </div>
              <button onClick={() => share(r)} className="w-10 h-10 flex items-center justify-center text-primary press" aria-label="Envoyer"><ShareNetwork weight="bold" className="w-5 h-5" /></button>
              <button onClick={() => remove(r)} className="w-10 h-10 flex items-center justify-center text-muted-foreground press" aria-label="Supprimer"><Trash weight="bold" className="w-5 h-5" /></button>
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] font-semibold text-muted-foreground text-center mt-2">Les enregistrements restent sur ton téléphone.</p>
    </div>
  );
}

export default function Recite() {
  const navigate = useNavigate();
  const qs = new URLSearchParams(window.location.search);
  const [n, setN] = useState(parseInt(qs.get("surah") || "1", 10));
  const surah = SURAHS.find((s) => s.number === n) || SURAHS[0];
  const [from, setFrom] = useState(parseInt(qs.get("from") || "1", 10));
  const [to, setTo] = useState(parseInt(qs.get("to") || "0", 10) || Math.min(surah.numberOfAyahs, from + 2));
  const [tab, setTab] = useState(qs.get("mode") === "record" ? "record" : "verify");
  const [ayahs, setAyahs] = useState(null);

  useEffect(() => { setAyahs(null); loadSurah(n).then(setAyahs).catch(() => setAyahs([])); }, [n]);
  const changeSurah = (v) => { const s = SURAHS[v - 1]; setN(v); setFrom(1); setTo(Math.min(s.numberOfAyahs, 3)); };
  const setF = (v) => { setFrom(v); if (to < v) setTo(v); };
  const setT = (v) => { setTo(v); if (from > v) setFrom(v); };

  return (
    <div className="min-h-[100dvh] bg-background pb-[calc(env(safe-area-inset-bottom,0px)+24px)]">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b-2 border-border pt-[env(safe-area-inset-top,0px)]">
        <div className="flex items-center gap-2 px-3 h-14">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center press" aria-label="Retour"><CaretLeft weight="bold" className="w-6 h-6" /></button>
          <h1 className="font-extrabold text-lg flex-1">Réciter</h1>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 pt-4">
        <select value={n} onChange={(e) => changeSurah(parseInt(e.target.value, 10))} className="w-full h-12 card-flat px-3 font-extrabold bg-card">
          {SURAHS.map((s) => <option key={s.number} value={s.number}>{s.number}. {s.englishName} · {s.name}</option>)}
        </select>
        <div className="flex gap-3 mt-3">
          <Stepper label="Du verset" value={from} onChange={setF} min={1} max={surah.numberOfAyahs} />
          <Stepper label="Au verset" value={to} onChange={setT} min={1} max={Math.min(surah.numberOfAyahs, from + 9)} />
        </div>

        <div className="grid grid-cols-2 gap-1 p-1 mt-4 rounded-2xl bg-muted">
          {[["verify", "Vérifier"], ["record", "Enregistrer"]].map(([k, l]) => (
            <button key={k} onClick={() => { haptic(); setTab(k); }} className={`h-10 rounded-xl font-extrabold text-sm ${tab === k ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}>{l}</button>
          ))}
        </div>

        <div className="mt-4">
          {!ayahs ? <div className="h-40 rounded-2xl bg-muted animate-pulse" />
            : tab === "verify" ? <Verify surah={surah} from={from} to={to} ayahs={ayahs} />
            : <Record surah={surah} from={from} to={to} />}
        </div>
      </div>
    </div>
  );
}
