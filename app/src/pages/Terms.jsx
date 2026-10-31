import React from "react";
import { motion } from "framer-motion";
import { CaretLeft as ArrowLeft, FileText } from "@phosphor-icons/react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-background border-b-2 border-border sticky top-0 z-[var(--z-page-header)]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <h1 className="font-semibold text-foreground text-sm">Conditions d'utilisation</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-8"
        >
          {/* Title block */}
          <div className="text-center pb-4 border-b border-border">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-accent rounded-2xl mb-4">
              <FileText className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Conditions d'utilisation</h2>
            <p className="text-sm text-muted-foreground mt-1">MyHafizz · Dernière mise à jour : mars 2025</p>
          </div>

          {/* Section 1 */}
          <Section title="1. Acceptation des conditions">
            <p>
              En accédant à et en utilisant l'application MyHafizz (ci-après « l'Application »),
              vous acceptez d'être lié par les présentes Conditions d'utilisation. Si vous n'acceptez
              pas ces conditions, veuillez ne pas utiliser l'Application.
            </p>
            <p className="mt-3">
              Ces conditions s'appliquent à tous les utilisateurs, visiteurs et toute autre personne
              qui accède ou utilise l'Application.
            </p>
          </Section>

          {/* Section 2 */}
          <Section title="2. Description du service">
            <p>
              MyHafizz est une application web progressive (PWA) conçue pour aider les musulmans
              à mémoriser le Saint Coran (Hifz). L'Application propose notamment :
            </p>
            <ul className="mt-3 space-y-2 list-none">
              {[
                "La mémorisation verset par verset avec suivi de progression",
                "L'écoute audio de réciteurs professionnels",
                "Des quiz interactifs pour tester la mémorisation",
                "Un système de défis et de jalons",
                "La sauvegarde des données de progression dans le cloud",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3">
              MyHafizz se réserve le droit de modifier, suspendre ou interrompre tout aspect du
              service à tout moment, avec ou sans préavis.
            </p>
          </Section>

          {/* Section 3 */}
          <Section title="3. Comptes utilisateurs">
            <p>
              Pour accéder à toutes les fonctionnalités de l'Application, vous devez créer un compte
              en fournissant une adresse e-mail valide et un mot de passe sécurisé.
            </p>
            <p className="mt-3">Vous êtes responsable de :</p>
            <ul className="mt-2 space-y-2 list-none">
              {[
                "La confidentialité de vos identifiants de connexion",
                "Toutes les activités effectuées sous votre compte",
                "La fourniture d'informations exactes et à jour lors de l'inscription",
                "La notification immédiate en cas d'utilisation non autorisée de votre compte",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3">
              MyHafizz se réserve le droit de suspendre ou supprimer tout compte qui violerait ces
              conditions d'utilisation.
            </p>
          </Section>

          {/* Section 4 */}
          <Section title="4. Propriété intellectuelle">
            <p>
              L'Application, son contenu original (à l'exclusion du texte coranique qui est du domaine
              public), ses fonctionnalités et son interface graphique sont et resteront la propriété
              exclusive de MyHafizz et sont protégés par les lois sur la propriété intellectuelle.
            </p>
            <p className="mt-3">
              Le texte coranique, les traductions et les récitations audio utilisés dans l'Application
              sont fournis à des fins éducatives et spirituelles. Les enregistrements audio appartiennent
              à leurs auteurs respectifs.
            </p>
            <p className="mt-3">
              Vous ne pouvez pas reproduire, distribuer, modifier, créer des œuvres dérivées, afficher
              publiquement ou exploiter commercialement tout contenu de l'Application sans l'accord
              écrit préalable de MyHafizz.
            </p>
          </Section>

          {/* Section 5 */}
          <Section title="5. Comportement de l'utilisateur">
            <p>En utilisant MyHafizz, vous vous engagez à :</p>
            <ul className="mt-3 space-y-2 list-none">
              {[
                "Ne pas utiliser l'Application à des fins illégales ou non autorisées",
                "Ne pas tenter de pirater, perturber ou compromettre l'intégrité de l'Application",
                "Ne pas utiliser de bots, scrapers ou autres outils automatisés",
                "Ne pas publier de contenu offensant, trompeur ou préjudiciable",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </Section>

          {/* Section 6 */}
          <Section title="6. Limitation de responsabilité">
            <p>
              L'Application est fournie « en l'état » et « selon disponibilité », sans aucune garantie
              expresse ou implicite quant à son exactitude, sa fiabilité ou son adéquation à un usage
              particulier.
            </p>
            <p className="mt-3">
              MyHafizz ne sera pas responsable des dommages indirects, accessoires, spéciaux,
              consécutifs ou punitifs résultant de votre utilisation ou de votre incapacité à utiliser
              l'Application, y compris la perte de données de progression.
            </p>
            <p className="mt-3">
              Nous recommandons aux utilisateurs de sauvegarder régulièrement leurs données importantes.
            </p>
          </Section>

          {/* Section 7 */}
          <Section title="7. Modifications des conditions">
            <p>
              MyHafizz se réserve le droit de modifier ces conditions d'utilisation à tout moment.
              Les modifications entrent en vigueur dès leur publication dans l'Application.
            </p>
            <p className="mt-3">
              Votre utilisation continue de l'Application après la publication des modifications
              constitue votre acceptation des nouvelles conditions. Nous vous encourageons à consulter
              régulièrement cette page.
            </p>
          </Section>

          {/* Section 8 */}
          <Section title="8. Droit applicable">
            <p>
              Les présentes conditions d'utilisation sont régies et interprétées conformément aux lois
              en vigueur. Tout litige relatif à ces conditions sera soumis à la juridiction compétente.
            </p>
          </Section>

          {/* Section 9 */}
          <Section title="9. Contact">
            <p>
              Pour toute question, réclamation ou demande relative à ces conditions d'utilisation,
              vous pouvez nous contacter à l'adresse suivante :
            </p>
            <div className="mt-3 p-3 bg-accent rounded-xl border border-primary/30">
              <p className="text-sm font-medium text-accent-foreground">
                yiribasylla@gmail.com
              </p>
            </div>
          </Section>

          {/* Footer note */}
          <div className="text-center pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              MyHafizz v0.1 Beta · Made with ❤️ from Samatiguila
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2"
    >
      <h3 className="text-base font-bold text-foreground">{title}</h3>
      <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
    </motion.div>
  );
}
