import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppleLogo, AndroidLogo, Desktop, CheckCircle, LockSimple, DotsThreeVertical, DownloadSimple, CaretLeft, CaretRight, BookOpen, Copy, PlusSquare, Star, MonitorArrowUp, DeviceMobile, Plus, Minus } from "@phosphor-icons/react";
import MhLogo, { MhWordmark } from "@/components/MhLogo";

const detectOS = () => {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "pc";
};
const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

const Hl = ({ className = "" }) => <span className={`absolute rounded-xl border-[3px] border-primary animate-[mhpulse_1.4s_ease-in-out_infinite] ${className}`} />;
const Share = () => (
  <svg width="22" height="22" viewBox="0 0 256 256"><path fill="#007AFF" d="M216 112v96a16 16 0 0 1-16 16H56a16 16 0 0 1-16-16v-96a16 16 0 0 1 16-16h24a8 8 0 0 1 0 16H56v96h144v-96h-24a8 8 0 0 1 0-16h24a16 16 0 0 1 16 16ZM93.7 69.7 120 43.3V136a8 8 0 0 0 16 0V43.3l26.3 26.4a8 8 0 0 0 11.4-11.4l-40-40a8 8 0 0 0-11.4 0l-40 40a8 8 0 0 0 11.4 11.4Z" /></svg>
);
const Url = ({ round, menu }) => (
  <div className={`relative w-[86%] h-11 bg-white flex items-center gap-1.5 px-3 text-[13px] font-extrabold text-[#555] ${round ? "rounded-full" : "rounded-xl"}`}>
    <LockSimple weight="fill" />myhafizz.com{menu && <><span className="flex-1" /><DotsThreeVertical weight="bold" className="w-5 h-5" /></>}
  </div>
);
const Menu = ({ rows, hi }) => (
  <div className="w-[86%] bg-white rounded-xl overflow-hidden text-[13px] font-bold text-[#222]">
    {rows.map(([t, I], i) => (
      <div key={t} className={`relative px-3.5 py-2.5 flex items-center justify-between ${i < rows.length - 1 ? "border-b border-[#eee]" : ""}`}>
        <span className="flex items-center gap-2">{t}</span>{I && <I weight="bold" />}{i === hi && <Hl className="inset-0.5" />}
      </div>
    ))}
  </div>
);

const STEPS = {
  ios: [
    ["Ouvre Safari", "Va sur myhafizz.com avec Safari. Sur iPhone, les autres navigateurs ne permettent pas l'installation.", <><Url /><Hl className="w-[86%] h-[50px]" /></>],
    ["Touche Partager", "Le carré avec une flèche, en bas de l'écran.", <div className="absolute bottom-0 inset-x-0 h-[52px] bg-white flex justify-around items-center text-[#007AFF] text-[22px]"><CaretLeft weight="bold" /><CaretRight weight="bold" /><span className="relative"><Share /><Hl className="-inset-2" /></span><BookOpen weight="bold" /><Copy weight="bold" /></div>],
    ["« Sur l'écran d'accueil »", "Fais défiler, touche cette ligne, puis « Ajouter » en haut à droite.", <Menu rows={[["Copier", Copy], ["Sur l'écran d'accueil", PlusSquare], ["Ajouter aux favoris", Star]]} hi={1} />],
  ],
  android: [
    ["Ouvre Chrome", "Va sur myhafizz.com avec Google Chrome.", <><Url round menu /><Hl className="w-[86%] h-[50px] !rounded-full" /></>],
    ["Touche le menu ⋮", "Les trois points en haut à droite.", <div className="absolute top-0 inset-x-0 h-[50px] bg-white flex items-center px-3.5 text-[13px] font-extrabold text-[#555]">myhafizz.com<span className="flex-1" /><span className="relative text-[22px]"><DotsThreeVertical weight="bold" /><Hl className="-inset-2" /></span></div>],
    ["« Installer l'application »", "Puis confirme avec « Installer ». L'icône apparaît sur ton écran d'accueil.", <Menu rows={[["Nouvel onglet"], ["Installer l'application", DownloadSimple], ["Partager…"]]} hi={1} />],
  ],
  pc: [
    ["Ouvre Chrome ou Edge", "Va sur myhafizz.com.", <Url />],
    ["Clique sur l'icône d'installation", "À droite de la barre d'adresse : un écran avec une flèche.", <div className="w-[86%] h-10 rounded-xl bg-white flex items-center px-3 text-[13px] font-extrabold text-[#555]">myhafizz.com<span className="flex-1" /><span className="relative text-xl"><MonitorArrowUp weight="bold" /><Hl className="-inset-[7px]" /></span></div>],
    ["Confirme « Installer »", "MyHafizz s'ouvre dans sa propre fenêtre, comme un logiciel.", <div className="w-4/5 bg-white rounded-xl p-3.5 text-[13px] font-extrabold text-[#222]">Installer l'application ?<div className="flex gap-2 mt-3 justify-end"><span className="px-3 py-1.5 rounded-lg border border-[#ddd]">Annuler</span><span className="relative px-3 py-1.5 rounded-lg bg-primary text-white">Installer<Hl className="-inset-[5px]" /></span></div></div>],
  ],
};
const OS = [["ios", "iPhone", AppleLogo], ["android", "Android", AndroidLogo], ["pc", "Ordinateur", Desktop]];
const FAQ = [
  ["C'est vraiment une application ?", "Oui. Une fois installée, MyHafizz a son icône, s'ouvre en plein écran sans barre de navigateur et garde tes données sur le téléphone."],
  ["Ça prend de la place ?", "Moins de 5 Mo au départ. Tu peux télécharger le texte complet pour le hors ligne (environ 10 Mo) dans les réglages."],
  ["Je ne vois pas « Sur l'écran d'accueil » sur iPhone", "Ouvre le lien dans Safari, pas dans Chrome, WhatsApp ou Instagram. Le bouton Partager est en bas de l'écran."],
  ["Comment la mettre à jour ?", "Rien à faire : MyHafizz se met à jour toute seule à la prochaine ouverture."],
];

export default function Download() {
  const [os, setOs] = useState(detectOS);
  const [prompt, setPrompt] = useState(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [open, setOpen] = useState(0);
  const detected = detectOS();

  useEffect(() => {
    document.title = "Installer MyHafizz";
    const h = (e) => { e.preventDefault(); setPrompt(e); };
    const done = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", h);
    window.addEventListener("appinstalled", done);
    return () => { window.removeEventListener("beforeinstallprompt", h); window.removeEventListener("appinstalled", done); };
  }, []);

  const install = async () => { if (!prompt) return; prompt.prompt(); const r = await prompt.userChoice; if (r.outcome === "accepted") setInstalled(true); setPrompt(null); };

  return (
    <div className="min-h-[100dvh] bg-card text-foreground">
      <style>{`@keyframes mhpulse{0%,100%{box-shadow:0 0 0 0 rgba(0,163,168,.35)}50%{box-shadow:0 0 0 8px rgba(0,163,168,0)}}`}</style>
      <header className="max-w-5xl mx-auto px-5 pt-[calc(env(safe-area-inset-top,0px)+14px)] pb-3 flex items-center justify-between">
        <Link to="/"><MhWordmark size={28} /></Link>
        <Link to="/login" className="text-sm font-extrabold text-primary">Se connecter</Link>
      </header>

      <main className="max-w-5xl mx-auto px-5 pb-16">
        <section className="grid md:grid-cols-[1.2fr_.8fr] gap-10 items-center pt-6">
          <div>
            <p className="text-xs font-black tracking-widest uppercase text-primary">Gratuit · moins de 5 Mo · sans store</p>
            <h1 className="text-[34px] md:text-[42px] leading-[1.1] font-black mt-2.5">Installe MyHafizz sur ton téléphone</h1>
            <p className="text-[17px] font-semibold text-muted-foreground mt-3 leading-relaxed">Pas besoin de l'App Store ni de Google Play. Ajoute MyHafizz à ton écran d'accueil en 3 gestes : elle s'ouvre en plein écran et fonctionne sans internet.</p>
            {installed ? (
              <p className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent text-accent-foreground font-black text-sm"><CheckCircle weight="fill" />MyHafizz est déjà installée sur cet appareil</p>
            ) : prompt ? (
              <button onClick={install} className="btn-relief mt-6 h-[52px] px-6 bg-primary text-primary-foreground"><DownloadSimple weight="bold" className="w-5 h-5" />Installer maintenant</button>
            ) : (
              <p className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent text-accent-foreground font-black text-sm"><CheckCircle weight="fill" />Appareil détecté : {OS.find((o) => o[0] === detected)[1].toLowerCase()}</p>
            )}
          </div>
          <div className="hidden md:flex justify-center">
            <div className="w-[220px] h-[440px] rounded-[34px] border-8 border-[#1B1F20] bg-[#CFE9E9] px-[18px] pt-10">
              <div className="grid grid-cols-4 gap-x-2.5 gap-y-3.5">
                {[0, 1, 2, 3, 4].map((i) => <div key={i} className="w-10 h-10 rounded-[11px] bg-white mx-auto" />)}
                <div className="text-center"><div className="w-10 h-10 rounded-[11px] bg-white mx-auto flex items-center justify-center ring-[3px] ring-primary"><MhLogo size={30} /></div><p className="text-[9px] font-extrabold mt-1">MyHafizz</p></div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-[18px] bg-muted max-w-[560px] mt-10">
          {OS.map(([k, label, I]) => (
            <button key={k} onClick={() => setOs(k)} className={`h-12 rounded-[13px] font-black text-[15px] flex items-center justify-center gap-2 ${os === k ? "bg-card text-accent-foreground shadow-[0_2px_0_hsl(var(--border))]" : "text-muted-foreground"}`}>
              <I weight="fill" className="w-5 h-5" />{label}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mt-6">
          {STEPS[os].map(([t, d, mock], i) => (
            <div key={t} className="card-flat p-[18px]">
              <span className="w-[34px] h-[34px] rounded-full bg-primary text-primary-foreground font-black flex items-center justify-center shadow-[0_3px_0_var(--primary-lip)]">{i + 1}</span>
              <div className="relative h-[150px] rounded-[14px] bg-background my-3.5 overflow-hidden flex items-center justify-center">{mock}</div>
              <p className="font-black">{t}</p>
              <p className="text-sm font-semibold text-muted-foreground mt-1 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>

        {detected === "pc" && (
          <div className="card-flat mt-8 p-5 flex items-center gap-4">
            <span className="w-[52px] h-[52px] rounded-[14px] bg-accent text-primary flex items-center justify-center shrink-0"><DeviceMobile weight="fill" className="w-7 h-7" /></span>
            <div><p className="font-black text-[17px]">Tu es sur ordinateur ?</p><p className="text-sm font-semibold text-muted-foreground">Ouvre <b className="text-foreground">myhafizz.com/telecharger</b> sur ton téléphone pour l'installer.</p></div>
          </div>
        )}

        <h2 className="text-2xl font-black mt-11">Questions fréquentes</h2>
        <div className="mt-2">
          {FAQ.map(([q, a], i) => (
            <div key={q} className="border-b-2 border-border py-4">
              <button onClick={() => setOpen(open === i ? -1 : i)} className="w-full flex justify-between items-center gap-3 text-left font-black text-base">
                {q}{open === i ? <Minus weight="bold" className="text-muted-foreground shrink-0" /> : <Plus weight="bold" className="text-muted-foreground shrink-0" />}
              </button>
              {open === i && <p className="mt-2 font-semibold text-muted-foreground leading-relaxed">{a}</p>}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
