import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CaretLeft, ShareNetwork, Plus, BookOpen, Microphone, CheckCircle, ArrowCounterClockwise, Trash, SignOut, CaretDown, Copy } from "@phosphor-icons/react";
import { Groups as G, Assignments, Khatmas, ROLE_LABEL, KIND_LABEL, isStaff } from "@/api/entities";
import { SURAHS } from "@/components/quranData";
import Sheet, { Field, inputCls, JUZ_START } from "@/components/community/Sheet";
import { todayStr } from "@/lib/srs";
import { haptic } from "@/hooks/usePlatform";

const ago = (d) => {
  if (!d) return "jamais";
  const days = Math.floor((Date.now() - new Date(d)) / 86400000);
  return days <= 0 ? "aujourd'hui" : days === 1 ? "hier" : `il y a ${days} j`;
};
const initials = (n = "?") => n.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const rangeLabel = (a) => `${SURAHS[a.surah_number - 1]?.englishName} · v. ${a.from_verse}${a.to_verse !== a.from_verse ? `–${a.to_verse}` : ""}`;

// ── Suivi ────────────────────────────────────────────────────────────────────
function Tracking({ group }) {
  const students = group.members.filter((m) => m.role === "student" || m.role === "child");
  const { data } = useQuery({ queryKey: ["group-progress", group.id, students.length], queryFn: () => G.progress(students.map((s) => s.user_id)), enabled: students.length > 0 });
  const [open, setOpen] = useState(null);
  const qc = useQueryClient();
  const today = todayStr();
  const week = Date.now() - 7 * 86400000;

  if (!students.length) {
    return <div className="card-flat p-5 text-center"><p className="font-extrabold">Pas encore {group.kind === "family" ? "d'enfant" : "d'élève"}</p><p className="text-sm font-semibold text-muted-foreground mt-1">Partage le code d'invitation pour qu'ils rejoignent le groupe.</p></div>;
  }
  const rows = students.map((s) => {
    const pr = data?.progress.filter((p) => p.user_id === s.user_id) || [];
    const rv = data?.reviews.filter((r) => r.user_id === s.user_id) || [];
    const last = [...rv.map((r) => r.last_reviewed), ...pr.map((p) => p.updated_at)].filter(Boolean).sort().pop();
    return {
      s, last,
      memorized: pr.reduce((n, p) => n + (p.memorized_verses?.length || 0), 0),
      week: rv.filter((r) => r.last_reviewed && new Date(r.last_reviewed) > week).length,
      due: rv.filter((r) => r.due_date <= today).length,
      fragile: rv.filter((r) => r.last_grade === 0).length,
      surahs: pr.filter((p) => p.memorized_verses?.length).length,
    };
  });
  const sum = (k) => rows.reduce((n, r) => n + r[k], 0);
  const inactive = rows.filter((r) => !r.last || new Date(r.last) < week).length;
  return (
    <>
    {/* Tableau du maître (ordinateur) */}
    <div className="hidden lg:block">
      <div className="grid grid-cols-4 gap-3 mb-3">
        {[[rows.length, students.length > 1 ? "élèves" : "élève"], [sum("memorized"), "versets mémorisés au total"], [sum("week"), "révisions cette semaine"], [inactive, "inactifs depuis 7 jours"]].map(([v, l]) => (
          <div key={l} className="card-flat p-4"><p className="text-[26px] font-black">{v}</p><p className="text-sm font-bold text-muted-foreground">{l}</p></div>
        ))}
      </div>
      <div className="card-flat overflow-hidden">
        <table className="w-full text-left">
          <thead><tr className="border-b-2 border-border text-xs font-black uppercase tracking-wider text-muted-foreground">
            <th className="p-3.5">Élève</th><th className="p-3.5 text-right">Mémorisés</th><th className="p-3.5 text-right">Sourates</th><th className="p-3.5 text-right">Révisés (7 j)</th><th className="p-3.5 text-right">À réviser</th><th className="p-3.5 text-right">Fragiles</th><th className="p-3.5">Dernière activité</th><th className="p-3.5" />
          </tr></thead>
          <tbody className="divide-y-2 divide-border">
            {rows.map((r) => (
              <tr key={r.s.user_id} className="font-bold hover:bg-muted/60">
                <td className="p-3.5"><div className="flex items-center gap-2.5"><span className="w-9 h-9 rounded-full bg-accent text-primary font-extrabold flex items-center justify-center shrink-0 text-sm">{initials(r.s.display_name)}</span><span className="font-extrabold truncate">{r.s.display_name || "Élève"}</span></div></td>
                <td className="p-3.5 text-right font-black">{r.memorized}</td>
                <td className="p-3.5 text-right">{r.surahs}</td>
                <td className="p-3.5 text-right">{r.week}</td>
                <td className="p-3.5 text-right">{r.due ? <span className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-xs font-extrabold">{r.due}</span> : <span className="text-muted-foreground">0</span>}</td>
                <td className={`p-3.5 text-right ${r.fragile ? "text-gold-lip font-black" : "text-muted-foreground"}`}>{r.fragile}</td>
                <td className={`p-3.5 ${!r.last || new Date(r.last) < week ? "text-destructive" : "text-muted-foreground"}`}>{ago(r.last)}</td>
                <td className="p-3.5 text-right"><button onClick={async () => { if (confirm(`Retirer ${r.s.display_name || "ce membre"} du groupe ?`)) { await G.leave(group.id, r.s.user_id); qc.invalidateQueries({ queryKey: ["group", group.id] }); } }} className="text-xs font-extrabold text-muted-foreground hover:text-destructive">Retirer</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    <div className="card-flat divide-y-2 divide-border overflow-hidden lg:hidden">
      {students.map((s) => {
        const pr = data?.progress.filter((p) => p.user_id === s.user_id) || [];
        const rv = data?.reviews.filter((r) => r.user_id === s.user_id) || [];
        const memorized = pr.reduce((n, p) => n + (p.memorized_verses?.length || 0), 0);
        const weekCount = rv.filter((r) => r.last_reviewed && new Date(r.last_reviewed) > week).length;
        const due = rv.filter((r) => r.due_date <= today).length;
        const fragile = rv.filter((r) => r.last_grade === 0).length;
        const last = [...rv.map((r) => r.last_reviewed), ...pr.map((p) => p.updated_at)].filter(Boolean).sort().pop();
        return (
          <div key={s.user_id}>
            <button onClick={() => setOpen(open === s.user_id ? null : s.user_id)} className="w-full flex items-center gap-3 p-4 text-left active:bg-muted">
              <div className="w-10 h-10 rounded-full bg-accent text-primary font-extrabold flex items-center justify-center shrink-0">{initials(s.display_name)}</div>
              <div className="flex-1 min-w-0">
                <p className="font-extrabold truncate">{s.display_name || "Élève"}</p>
                <p className="text-sm font-semibold text-muted-foreground">{memorized} versets · actif {ago(last)}</p>
              </div>
              {due > 0 && <span className="px-2 py-0.5 rounded-full bg-accent text-primary text-xs font-extrabold">{due} à réviser</span>}
              <CaretDown weight="bold" className={`w-4 h-4 text-muted-foreground transition-transform ${open === s.user_id ? "rotate-180" : ""}`} />
            </button>
            {open === s.user_id && (
              <div className="px-4 pb-4">
                <div className="grid grid-cols-3 gap-2">
                  {[[memorized, "mémorisés"], [weekCount, "révisés (7 j)"], [fragile, "fragiles"]].map(([v, l]) => (
                    <div key={l} className="rounded-xl bg-muted p-2 text-center"><p className="text-lg font-extrabold">{v}</p><p className="text-[11px] font-bold text-muted-foreground">{l}</p></div>
                  ))}
                </div>
                {pr.filter((p) => p.memorized_verses?.length).length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {pr.filter((p) => p.memorized_verses?.length).sort((a, b) => a.surah_number - b.surah_number).map((p) => {
                      const s2 = SURAHS[p.surah_number - 1]; const pct = Math.round((p.memorized_verses.length / s2.numberOfAyahs) * 100);
                      return (
                        <div key={p.surah_number} className="flex items-center gap-2 text-sm">
                          <span className="w-28 truncate font-bold">{s2.englishName}</span>
                          <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} /></div>
                          <span className="w-10 text-right text-xs font-extrabold text-muted-foreground">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                <button onClick={async () => { if (confirm(`Retirer ${s.display_name || "ce membre"} du groupe ?`)) { await G.leave(group.id, s.user_id); qc.invalidateQueries({ queryKey: ["group", group.id] }); } }}
                  className="mt-3 text-xs font-extrabold text-destructive">Retirer du groupe</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
    </>
  );
}

function Members({ group }) {
  return (
    <div className="card-flat divide-y-2 divide-border overflow-hidden">
      {group.members.map((m) => (
        <div key={m.user_id} className="flex items-center gap-3 p-3">
          <div className="w-9 h-9 rounded-full bg-accent text-primary text-sm font-extrabold flex items-center justify-center">{initials(m.display_name)}</div>
          <p className="flex-1 font-extrabold truncate">{m.display_name || "Membre"}{m.user_id === group.me ? " (moi)" : ""}</p>
          <span className="text-xs font-bold text-muted-foreground">{ROLE_LABEL[m.role]}</span>
        </div>
      ))}
    </div>
  );
}

// ── Leçons ───────────────────────────────────────────────────────────────────
function Lessons({ group }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const staff = isStaff(group.role);
  const { data: items, isLoading } = useQuery({ queryKey: ["assignments", group.id], queryFn: () => Assignments.list(group.id) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["assignments", group.id] });
  const [sheet, setSheet] = useState(false);
  const [f, setF] = useState({ title: "", surah_number: 114, from_verse: 1, to_verse: 6, due_date: "", note: "" });
  const students = group.members.filter((m) => m.role === "student" || m.role === "child");
  const nameOf = (id) => group.members.find((m) => m.user_id === id)?.display_name || "Élève";
  const sMax = SURAHS[f.surah_number - 1]?.numberOfAyahs || 1;

  const create = async () => {
    await Assignments.create({ group_id: group.id, title: f.title.trim() || `Mémoriser ${SURAHS[f.surah_number - 1].englishName}`, surah_number: f.surah_number, from_verse: f.from_verse, to_verse: Math.max(f.from_verse, f.to_verse), due_date: f.due_date || null, note: f.note.trim() || null });
    haptic(); setSheet(false); refresh();
  };

  return (
    <div>
      {staff && <button onClick={() => setSheet(true)} className="btn-relief w-full h-[50px] bg-primary text-primary-foreground mb-4"><Plus weight="bold" /> Nouvelle leçon</button>}
      {isLoading ? <div className="h-24 rounded-2xl bg-muted animate-pulse" />
        : !items?.length ? <div className="card-flat p-5 text-center text-sm font-semibold text-muted-foreground">{staff ? "Donne une première leçon à tes élèves." : "Aucune leçon pour l'instant."}</div>
        : (
          <div className="space-y-3">
            {items.map((a) => {
              const mine = a.statuses.find((s) => s.user_id === group.me);
              const late = a.due_date && a.due_date < todayStr() && !mine;
              return (
                <div key={a.id} className="card-flat p-4">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold">{a.title}</p>
                      <p className="text-sm font-semibold text-muted-foreground">{rangeLabel(a)}{a.due_date ? ` · pour le ${new Date(a.due_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}` : ""}</p>
                      {a.note && <p className="text-sm font-semibold mt-1">{a.note}</p>}
                    </div>
                    {staff && <button onClick={async () => { if (confirm("Supprimer cette leçon ?")) { await Assignments.remove(a.id); refresh(); } }} className="w-8 h-8 flex items-center justify-center text-muted-foreground" aria-label="Supprimer"><Trash weight="bold" /></button>}
                  </div>

                  {staff ? (
                    <div className="mt-3 space-y-2">
                      {students.length === 0 && <p className="text-xs font-semibold text-muted-foreground">Aucun élève dans le groupe.</p>}
                      {students.map((s) => {
                        const st = a.statuses.find((x) => x.user_id === s.user_id);
                        return (
                          <div key={s.user_id} className="flex items-center gap-2">
                            <span className="flex-1 text-sm font-bold truncate">{s.display_name || "Élève"}</span>
                            <span className={`text-xs font-extrabold ${st?.status === "validated" ? "text-primary" : st?.status === "redo" ? "text-destructive" : st?.status === "done" ? "text-foreground" : "text-muted-foreground"}`}>
                              {st?.status === "validated" ? "Validé" : st?.status === "redo" ? "À revoir" : st?.status === "done" ? "Terminé" : "En cours"}
                            </span>
                            <button onClick={async () => { await Assignments.setStatus(a.id, "validated", s.user_id); haptic(); refresh(); }} className="h-8 px-2.5 rounded-lg bg-accent text-primary text-xs font-extrabold">Valider</button>
                            <button onClick={async () => { const n = prompt(`Remarque pour ${nameOf(s.user_id)} (optionnel)`) ?? undefined; await Assignments.setStatus(a.id, "redo", s.user_id, n || null); refresh(); }} className="h-8 px-2.5 rounded-lg bg-muted text-xs font-extrabold">À revoir</button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <>
                      {mine?.status === "validated" && <p className="mt-2 text-sm font-extrabold text-primary flex items-center gap-1.5"><CheckCircle weight="fill" /> Validé par ton maître</p>}
                      {mine?.status === "redo" && <p className="mt-2 text-sm font-extrabold text-destructive">À revoir{mine.teacher_note ? ` : ${mine.teacher_note}` : ""}</p>}
                      {late && <p className="mt-2 text-xs font-extrabold text-destructive">En retard</p>}
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        <button onClick={() => navigate(`/Memorize?surah=${a.surah_number}`)} className="h-10 rounded-xl border-2 border-border text-xs font-extrabold flex items-center justify-center gap-1"><BookOpen weight="bold" /> Ouvrir</button>
                        <button onClick={() => navigate(`/Recite?surah=${a.surah_number}&from=${a.from_verse}&to=${Math.min(a.to_verse, a.from_verse + 9)}`)} className="h-10 rounded-xl border-2 border-border text-xs font-extrabold flex items-center justify-center gap-1"><Microphone weight="bold" /> Réciter</button>
                        {mine?.status === "done" ? (
                          <button onClick={async () => { await Assignments.clearStatus(a.id); refresh(); }} className="h-10 rounded-xl bg-accent text-primary text-xs font-extrabold flex items-center justify-center gap-1"><ArrowCounterClockwise weight="bold" /> Annuler</button>
                        ) : mine?.status === "validated" ? <span />
                        : (
                          <button onClick={async () => { await Assignments.setStatus(a.id, "done"); haptic(); refresh(); }} className="h-10 rounded-xl bg-primary text-primary-foreground text-xs font-extrabold flex items-center justify-center gap-1"><CheckCircle weight="fill" /> Terminé</button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Nouvelle leçon">
        <Field label="Titre"><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Ex. Sabaq de la semaine" className={inputCls} /></Field>
        <Field label="Sourate">
          <select value={f.surah_number} onChange={(e) => { const n = +e.target.value; setF({ ...f, surah_number: n, from_verse: 1, to_verse: Math.min(5, SURAHS[n - 1].numberOfAyahs) }); }} className={inputCls}>
            {SURAHS.map((s) => <option key={s.number} value={s.number}>{s.number}. {s.englishName}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Du verset"><input type="number" min={1} max={sMax} value={f.from_verse} onChange={(e) => setF({ ...f, from_verse: Math.min(sMax, Math.max(1, +e.target.value || 1)) })} className={inputCls} /></Field>
          <Field label="Au verset"><input type="number" min={1} max={sMax} value={f.to_verse} onChange={(e) => setF({ ...f, to_verse: Math.min(sMax, Math.max(1, +e.target.value || 1)) })} className={inputCls} /></Field>
        </div>
        <Field label="Pour le (optionnel)"><input type="date" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} className={inputCls} /></Field>
        <Field label="Consigne (optionnel)"><textarea value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} rows={2} className={`${inputCls} h-auto py-2`} placeholder="Ex. Réciter 5 fois avant de dormir" /></Field>
        <button onClick={create} className="btn-relief w-full h-[50px] bg-primary text-primary-foreground">Donner la leçon</button>
      </Sheet>
    </div>
  );
}

// ── Khatma ───────────────────────────────────────────────────────────────────
function Khatma({ group }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: list, isLoading } = useQuery({ queryKey: ["khatmas", group.id], queryFn: () => Khatmas.list(group.id), refetchInterval: 30000 });
  const refresh = () => qc.invalidateQueries({ queryKey: ["khatmas", group.id] });
  const [sheet, setSheet] = useState(false);
  const [title, setTitle] = useState(""); const [date, setDate] = useState("");
  const [sel, setSel] = useState(null); // { k, juz, part }
  const [err, setErr] = useState("");

  const create = async () => { await Khatmas.create(group.id, title.trim() || "Khatma", date); setSheet(false); setTitle(""); setDate(""); refresh(); };
  const act = async (fn) => { setErr(""); try { await fn(); haptic(); setSel(null); refresh(); } catch { setErr("Ce juz vient d'être pris, choisis-en un autre."); refresh(); } };

  return (
    <div>
      <button onClick={() => setSheet(true)} className="btn-relief w-full h-[50px] bg-primary text-primary-foreground mb-4"><Plus weight="bold" /> Nouvelle khatma</button>
      {err && <p className="text-sm font-bold text-destructive mb-3">{err}</p>}
      {isLoading ? <div className="h-40 rounded-2xl bg-muted animate-pulse" />
        : !list?.length ? <div className="card-flat p-5 text-center text-sm font-semibold text-muted-foreground">Lancez une khatma : chacun choisit un ou plusieurs juz, et le Coran est complété ensemble.</div>
        : list.map((k) => {
          const done = k.parts.filter((p) => p.status === "done").length;
          const taken = k.parts.length;
          return (
            <div key={k.id} className="card-flat p-4 mb-3">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <p className="font-extrabold">{k.title}</p>
                  <p className="text-sm font-semibold text-muted-foreground">{done}/30 juz lus · {30 - taken} libres{k.target_date ? ` · avant le ${new Date(k.target_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}` : ""}</p>
                </div>
                {(k.created_by === group.me || isStaff(group.role)) && <button onClick={async () => { if (confirm("Supprimer cette khatma ?")) { await Khatmas.remove(k.id); refresh(); } }} className="w-8 h-8 flex items-center justify-center text-muted-foreground" aria-label="Supprimer"><Trash weight="bold" /></button>}
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden mt-3"><div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(done / 30) * 100}%` }} /></div>
              {done === 30 && <p className="text-sm font-extrabold text-primary mt-2">Khatma complétée. Qu'Allah l'accepte de vous.</p>}
              <div className="grid grid-cols-6 gap-1.5 mt-3">
                {Array.from({ length: 30 }, (_, i) => i + 1).map((juz) => {
                  const p = k.parts.find((x) => x.juz === juz);
                  const mine = p?.user_id === group.me;
                  const cls = !p ? "border-2 border-border bg-card text-foreground"
                    : p.status === "done" ? "bg-primary text-primary-foreground"
                    : mine ? "border-2 border-primary bg-accent text-primary" : "bg-muted text-muted-foreground";
                  return (
                    <button key={juz} onClick={() => setSel({ k, juz, part: p })} className={`aspect-square rounded-xl flex flex-col items-center justify-center press ${cls}`}>
                      <span className="text-sm font-extrabold leading-none">{juz}</span>
                      {p && <span className="text-[9px] font-bold leading-none mt-0.5 opacity-80">{mine ? "moi" : initials(p.user_name)}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

      <Sheet open={!!sel} onClose={() => setSel(null)} title={sel ? `Juz ${sel.juz}` : ""}>
        {sel && (() => {
          const [s, v] = JUZ_START[sel.juz - 1];
          const p = sel.part; const mine = p?.user_id === group.me;
          return (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-muted-foreground">Commence à {SURAHS[s - 1].englishName}, verset {v}.</p>
              {!p && <button onClick={() => act(() => Khatmas.reserve(sel.k.id, sel.juz))} className="btn-relief w-full h-[50px] bg-primary text-primary-foreground">Je prends ce juz</button>}
              {p && !mine && <p className="font-extrabold">{p.status === "done" ? "Lu" : "Réservé"} par {p.user_name || "un membre"}</p>}
              {mine && (
                <>
                  <button onClick={() => navigate(`/Memorize?surah=${s}`)} className="btn-relief w-full h-[50px] bg-card border-2 border-border text-foreground" style={{ "--relief-color": "hsl(var(--border))" }}><BookOpen weight="bold" /> Lire</button>
                  <button onClick={() => act(() => Khatmas.setDone(sel.k.id, sel.juz, p.status !== "done"))} className="btn-relief w-full h-[50px] bg-primary text-primary-foreground">{p.status === "done" ? "Marquer non lu" : "J'ai terminé ce juz"}</button>
                  <button onClick={() => act(() => Khatmas.release(sel.k.id, sel.juz))} className="w-full py-2 text-sm font-extrabold text-destructive">Libérer ce juz</button>
                </>
              )}
            </div>
          );
        })()}
      </Sheet>

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Nouvelle khatma">
        <Field label="Nom"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Khatma du Ramadan" className={inputCls} /></Field>
        <Field label="Objectif (optionnel)"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></Field>
        <button onClick={create} className="btn-relief w-full h-[50px] bg-primary text-primary-foreground">Lancer la khatma</button>
      </Sheet>
    </div>
  );
}

export default function Group() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const id = new URLSearchParams(window.location.search).get("id");
  const { data: group, isLoading } = useQuery({ queryKey: ["group", id], queryFn: () => G.get(id), enabled: !!id });
  const staff = isStaff(group?.role);
  const tabs = useMemo(() => [["track", staff ? "Suivi" : "Membres"], ["lessons", "Leçons"], ["khatma", "Khatma"]], [staff]);
  const [tab, setTab] = useState(() => new URLSearchParams(window.location.search).get("tab") || "lessons");
  const [copied, setCopied] = useState(false);

  const link = group ? `${window.location.origin}/Groups?join=${group.invite_code}` : "";
  const share = async () => {
    const text = `Rejoins « ${group.name} » sur MyHafizz avec le code ${group.invite_code}`;
    if (navigator.share) { try { await navigator.share({ title: "MyHafizz", text, url: link }); return; } catch { return; } }
    await navigator.clipboard?.writeText(`${text} : ${link}`); setCopied(true); setTimeout(() => setCopied(false), 1500);
  };
  const leave = async () => {
    const owner = group.owner_id === group.me;
    if (!confirm(owner ? "Supprimer définitivement ce groupe pour tous ses membres ?" : "Quitter ce groupe ?")) return;
    if (owner) await G.remove(group.id); else await G.leave(group.id);
    qc.invalidateQueries({ queryKey: ["groups"] }); navigate("/Groups", { replace: true });
  };

  if (isLoading) return <div className="max-w-xl mx-auto p-4"><div className="h-40 rounded-2xl bg-muted animate-pulse" /></div>;
  if (!group) return <div className="max-w-xl mx-auto p-6 text-center font-extrabold">Groupe introuvable.<button onClick={() => navigate("/Groups")} className="block mx-auto mt-3 text-primary">Retour</button></div>;

  return (
    <div className="max-w-xl lg:max-w-5xl mx-auto px-4 lg:px-8 pt-2 lg:pt-8 pb-6">
      <button onClick={() => navigate("/Groups")} className="flex items-center gap-1 -ml-1 h-10 text-sm font-extrabold text-muted-foreground"><CaretLeft weight="bold" /> Groupes</button>
      <h1 className="text-2xl font-extrabold">{group.name}</h1>
      <p className="text-sm font-semibold text-muted-foreground">{KIND_LABEL[group.kind]} · {group.members.length} membre{group.members.length > 1 ? "s" : ""} · {ROLE_LABEL[group.role]}</p>

      <div className="card-flat p-3 mt-4 flex items-center gap-3 lg:max-w-md">
        <div className="flex-1">
          <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Code d'invitation</p>
          <p className="text-2xl font-extrabold tracking-[0.25em] text-primary">{group.invite_code}</p>
        </div>
        <button onClick={share} className="btn-relief h-11 px-4 bg-primary text-primary-foreground text-sm">{copied ? <><Copy weight="bold" /> Copié</> : <><ShareNetwork weight="bold" /> Inviter</>}</button>
      </div>

      <div className="grid grid-cols-3 gap-1 p-1 mt-4 rounded-2xl bg-muted lg:max-w-md">
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => { haptic(); setTab(k); }} className={`h-10 rounded-xl font-extrabold text-sm ${tab === k ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}>{l}</button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "track" ? (staff ? <Tracking group={group} /> : <Members group={group} />)
          : tab === "lessons" ? <Lessons group={group} /> : <Khatma group={group} />}
      </div>

      <button onClick={leave} className="mt-8 mx-auto flex items-center gap-1.5 text-sm font-extrabold text-destructive"><SignOut weight="bold" /> {group.owner_id === group.me ? "Supprimer le groupe" : "Quitter le groupe"}</button>
    </div>
  );
}
