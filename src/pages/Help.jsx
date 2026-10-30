import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CaretDown, MagnifyingGlass, RocketLaunch, CalendarCheck, Toolbox, UsersThree, DeviceMobile, UserCircle, EnvelopeSimple } from "@phosphor-icons/react";
import PageHeader from "@/components/PageHeader";

const SECTIONS = [
  { icon: RocketLaunch, title: "Bien démarrer", items: [
    ["Par où commencer ?", "Ouvre l'onglet Réviser et crée ton programme : choisis un objectif (une sourate, Juz Amma ou le Coran entier) et ton nombre de nouveaux versets par jour. L'accueil te montre ensuite ta séance du jour."],
    ["Je ne lis pas encore bien l'arabe", "Active la translittération dans Réglages > Lecture, et appuie-toi sur l'écoute en boucle. Commence par les courtes sourates de Juz Amma."],
    ["Comment marquer un verset comme mémorisé ?", "Dans une sourate, touche le rond à côté du verset. Il entre alors dans tes révisions."],
  ] },
  { icon: CalendarCheck, title: "La séance du jour", items: [
    ["Sabaq, sabqi, manzil : c'est quoi ?", "Sabaq : les nouveaux versets du jour. Sabqi : ce que tu as appris ces derniers jours. Manzil : tes anciennes sourates, en rotation. C'est la méthode des écoles coraniques, calculée pour toi chaque matin."],
    ["Oublié, Hésité, Facile", "Après chaque verset, dis comment ça s'est passé. Un verset oublié revient demain. Un verset facile revient de plus en plus tard. Sois honnête : c'est ce qui rend la révision efficace."],
    ["Que sont les versets fragiles ?", "Ce sont les versets que tu as oubliés ou qui ne sont pas encore solides. Touche le chiffre sur l'accueil pour les revoir directement."],
    ["Comment changer mon rythme ?", "Onglet Réviser, bouton de réglage en haut à droite. Tu peux modifier l'objectif, la date visée, les nouveaux versets et la révision ancienne par jour."],
  ] },
  { icon: Toolbox, title: "Les outils", items: [
    ["Texte qui s'efface", "Dans une séance, passe du texte complet aux initiales, puis au texte caché. Touche un mot pour le revoir."],
    ["Répétition audio", "Réviser > Répétition audio : répète un verset ou une plage, choisis le nombre de répétitions, la vitesse et une pause pour répéter après le récitateur. La lecture continue écran éteint."],
    ["Réciter au micro", "Réviser > Réciter : l'app suit ta voix et surligne les mots sautés. Fonctionne sur Chrome (Android, ordinateur) et Safari récent. Tu peux aussi t'enregistrer et t'écouter."],
    ["Enchaînement", "Trouve le verset suivant, la fin d'un verset ou remets les mots dans l'ordre. Les erreurs partent dans tes révisions."],
    ["Carte de solidité", "Chaque verset mémorisé a une couleur, du fragile au solide. Touche une sourate pour voir le détail."],
  ] },
  { icon: UsersThree, title: "Groupes et khatma", items: [
    ["Créer ou rejoindre un groupe", "Onglet Groupes : crée une classe, une famille ou un cercle, puis partage le code ou le lien d'invitation."],
    ["Donner une leçon", "Le maître ou le parent choisit la sourate, les versets et la date. Chaque élève marque la leçon comme prête, puis le maître la valide ou la renvoie avec une remarque."],
    ["Organiser une khatma", "Dans un groupe, crée une khatma : chacun réserve un juz et le marque comme lu. Tout le groupe voit l'avancement."],
  ] },
  { icon: DeviceMobile, title: "Installer et hors ligne", items: [
    ["Installer l'application", "Va sur la page Télécharger : elle te montre les 3 gestes pour ton appareil (Safari sur iPhone, Chrome sur Android)."],
    ["Utiliser sans internet", "Réglages > Hors ligne > Télécharger tout le Coran. Tes révisions se synchronisent quand la connexion revient."],
  ] },
  { icon: UserCircle, title: "Compte", items: [
    ["Changer mon prénom ou ma photo", "Profil : touche ton nom pour le modifier, ou ta photo pour la changer."],
    ["J'ai oublié mon mot de passe", "Sur l'écran de connexion, touche « Mot de passe oublié ? » et suis le lien reçu par email."],
    ["Retrouver ma progression sur un autre appareil", "Connecte-toi avec le même compte : tout est synchronisé."],
  ] },
];

export default function Help() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const nq = norm(q.trim());
  const sections = SECTIONS.map((s) => ({ ...s, items: nq ? s.items.filter(([t, d]) => norm(t + " " + d).includes(nq)) : s.items })).filter((s) => s.items.length);

  return (
    <div className="min-h-[100dvh] bg-background pb-nav">
      <div className="max-w-2xl mx-auto px-4">
        <PageHeader title="Aide" back />
        <div className="relative mt-3">
          <MagnifyingGlass weight="bold" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une question"
            className="w-full h-12 pl-11 pr-4 rounded-2xl border-2 border-border bg-card font-bold placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
        </div>

        {sections.map((s) => (
          <div key={s.title}>
            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mt-5 mb-2 ml-1 flex items-center gap-1.5"><s.icon weight="fill" className="w-4 h-4 text-primary" />{s.title}</p>
            <div className="card-flat overflow-hidden divide-y-2 divide-border">
              {s.items.map(([t, d]) => {
                const id = s.title + t, on = open === id || !!nq;
                return (
                  <div key={t}>
                    <button onClick={() => setOpen(open === id ? null : id)} className="w-full flex items-center gap-3 p-3.5 text-left active:bg-muted">
                      <span className="flex-1 font-extrabold">{t}</span>
                      <CaretDown weight="bold" className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${on ? "rotate-180" : ""}`} />
                    </button>
                    {on && <p className="px-3.5 pb-3.5 -mt-1 text-[14.5px] font-semibold text-muted-foreground leading-relaxed">{d}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {!sections.length && <p className="card-flat p-6 mt-4 text-center font-bold text-muted-foreground">Aucune réponse trouvée. Écris-nous, on te répond.</p>}

        <div className="card-flat p-4 mt-5 flex items-center gap-3">
          <span className="w-[38px] h-[38px] rounded-xl bg-accent text-primary flex items-center justify-center shrink-0"><EnvelopeSimple weight="fill" className="w-[21px] h-[21px]" /></span>
          <div className="flex-1 min-w-0"><p className="font-extrabold">Une autre question ?</p><p className="text-[12.5px] font-semibold text-muted-foreground">Écris-nous, on te répond par email.</p></div>
          <a href="mailto:yiribasylla@gmail.com?subject=MyHafizz%20-%20Aide" className="btn-relief h-10 px-4 bg-primary text-primary-foreground text-xs">Écrire</a>
        </div>
        <p className="text-center text-xs font-semibold text-muted-foreground mt-4"><Link to="/telecharger" className="underline">Installer l'app</Link> · <Link to="/terms" className="underline">Conditions</Link> · <Link to="/privacy" className="underline">Confidentialité</Link></p>
      </div>
    </div>
  );
}
