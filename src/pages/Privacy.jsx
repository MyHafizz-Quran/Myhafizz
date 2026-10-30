import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Shield } from "@/components/icons";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white/[0.97] dark:bg-gray-950/[0.97] backdrop-blur-xl border-b border-border/60 sticky top-0 z-[var(--z-page-header)] shadow-[0_2px_8px_rgba(0,0,0,0.05)] dark:shadow-none">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h1 className="font-semibold text-foreground text-sm">Politique des données</h1>
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
            <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl mb-4">
              <Shield className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Politique des données</h2>
            <p className="text-sm text-muted-foreground mt-1">MyHafizz · Dernière mise à jour : mars 2025</p>
          </div>

          {/* Intro */}
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40">
            <p className="text-sm text-emerald-700 dark:text-emerald-300 leading-relaxed">
              Chez MyHafizz, nous prenons la protection de vos données personnelles très au sérieux.
              Cette politique explique quelles données nous collectons, comment nous les utilisons et
              comment nous les protégeons.
            </p>
          </div>

          {/* Section 1 */}
          <Section title="1. Données collectées">
            <p>Nous collectons les données suivantes lorsque vous utilisez MyHafizz :</p>
            <div className="mt-3 space-y-3">
              <DataCategory label="Données de compte">
                Adresse e-mail, nom d'affichage, photo de profil (optionnelle).
              </DataCategory>
              <DataCategory label="Données de progression">
                Sourates et versets mémorisés, statut de progression (en cours / complété),
                date de dernière révision, scores aux quiz.
              </DataCategory>
              <DataCategory label="Données StudyMatch">
                Niveau de mémorisation, disponibilités, numéro WhatsApp (optionnel, uniquement
                si vous choisissez de le partager).
              </DataCategory>
              <DataCategory label="Données techniques">
                Type d'appareil, navigateur, préférences de l'application (thème, réciteur,
                mode hors-ligne) stockées localement sur votre appareil.
              </DataCategory>
            </div>
          </Section>

          {/* Section 2 */}
          <Section title="2. Utilisation des données">
            <p>Vos données sont utilisées exclusivement pour :</p>
            <ul className="mt-3 space-y-2 list-none">
              {[
                "Créer et gérer votre compte utilisateur",
                "Sauvegarder et synchroniser votre progression de mémorisation",
                "Afficher vos statistiques et votre tableau de bord personnel",
                "Faciliter la mise en relation avec des partenaires d'étude (StudyMatch)",
                "Améliorer les performances et l'expérience de l'Application",
                "Vous envoyer des notifications importantes liées à votre compte (si activées)",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3">
              Nous ne vendons, ne louons et ne partageons pas vos données personnelles à des fins
              commerciales ou publicitaires.
            </p>
          </Section>

          {/* Section 3 */}
          <Section title="3. Stockage des données (Supabase)">
            <p>
              MyHafizz utilise <strong className="text-foreground">Supabase</strong> comme infrastructure
              de base de données et d'authentification. Supabase est une plateforme de confiance,
              conforme aux standards de sécurité internationaux.
            </p>
            <p className="mt-3">
              Vos données sont stockées dans des serveurs sécurisés. Supabase applique le chiffrement
              des données au repos et en transit (TLS/SSL). Pour en savoir plus sur les pratiques de
              sécurité de Supabase, consultez leur politique de confidentialité sur supabase.com.
            </p>
            <p className="mt-3">
              Les données de stockage de fichiers (photos de profil) sont hébergées dans des buckets
              Supabase Storage avec des politiques d'accès strictes.
            </p>
          </Section>

          {/* Section 4 */}
          <Section title="4. Cookies et stockage local">
            <p>
              MyHafizz utilise le stockage local (localStorage) de votre navigateur pour conserver :
            </p>
            <ul className="mt-3 space-y-2 list-none">
              {[
                "Vos préférences d'application (thème clair/sombre, réciteur sélectionné)",
                "Les données de progression hors-ligne en attente de synchronisation",
                "Le cache des versets téléchargés pour l'utilisation hors connexion",
                "Votre session d'authentification (token sécurisé géré par Supabase)",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3">
              Aucun cookie de tracking ou de publicité n'est utilisé dans MyHafizz. Vous pouvez
              effacer les données locales à tout moment depuis les paramètres de votre navigateur.
            </p>
          </Section>

          {/* Section 5 */}
          <Section title="5. Partage des données">
            <p>
              Vos données personnelles ne sont jamais partagées avec des tiers à des fins commerciales.
              Les seuls cas de partage sont :
            </p>
            <ul className="mt-3 space-y-2 list-none">
              {[
                "Supabase (infrastructure technique) — uniquement pour le fonctionnement du service",
                "Votre numéro WhatsApp dans StudyMatch — uniquement visible par les utilisateurs que vous choisissez de contacter",
                "Si requis par la loi ou une autorité judiciaire compétente",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </Section>

          {/* Section 6 */}
          <Section title="6. Vos droits">
            <p>Conformément aux réglementations sur la protection des données, vous disposez des droits suivants :</p>
            <div className="mt-3 space-y-3">
              <DataCategory label="Droit d'accès">
                Vous pouvez demander une copie de toutes les données que nous détenons sur vous.
              </DataCategory>
              <DataCategory label="Droit de rectification">
                Vous pouvez corriger vos données personnelles directement depuis votre profil dans l'Application.
              </DataCategory>
              <DataCategory label="Droit à l'effacement">
                Vous pouvez demander la suppression complète de votre compte et de toutes les données associées.
              </DataCategory>
              <DataCategory label="Droit à la portabilité">
                Vous pouvez demander une exportation de vos données de progression.
              </DataCategory>
            </div>
            <p className="mt-4">
              Pour exercer ces droits, contactez-nous à l'adresse indiquée en section 10.
            </p>
          </Section>

          {/* Section 7 */}
          <Section title="7. Sécurité des données">
            <p>
              Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles appropriées
              pour protéger vos données personnelles contre tout accès non autorisé, modification,
              divulgation ou destruction :
            </p>
            <ul className="mt-3 space-y-2 list-none">
              {[
                "Chiffrement de toutes les communications (HTTPS/TLS)",
                "Authentification sécurisée via Supabase Auth",
                "Politiques d'accès aux données (Row Level Security) sur la base de données",
                "Aucun stockage de mots de passe en clair",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </Section>

          {/* Section 8 */}
          <Section title="8. Protection des mineurs">
            <p>
              MyHafizz n'est pas destiné aux enfants de moins de 13 ans. Nous ne collectons pas
              sciemment de données personnelles auprès d'enfants de moins de 13 ans. Si nous
              apprenons qu'un mineur de moins de 13 ans a créé un compte, nous prendrons des mesures
              pour supprimer ces informations dans les meilleurs délais.
            </p>
            <p className="mt-3">
              Les utilisateurs âgés de 13 à 18 ans doivent obtenir le consentement d'un parent ou
              tuteur légal avant d'utiliser l'Application.
            </p>
          </Section>

          {/* Section 9 */}
          <Section title="9. Modifications de cette politique">
            <p>
              MyHafizz se réserve le droit de modifier cette politique de confidentialité à tout
              moment. Les modifications seront publiées dans l'Application avec la date de mise à jour.
            </p>
            <p className="mt-3">
              En continuant à utiliser l'Application après la publication des modifications, vous
              acceptez la nouvelle politique. Nous vous recommandons de consulter cette page
              régulièrement.
            </p>
          </Section>

          {/* Section 10 */}
          <Section title="10. Contact et demandes">
            <p>
              Pour toute question, demande d'exercice de vos droits, ou réclamation concernant la
              protection de vos données personnelles :
            </p>
            <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40">
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                📧 yiribasylla@gmail.com
              </p>
            </div>
            <p className="mt-3">
              Nous nous engageons à répondre à toute demande dans un délai raisonnable.
            </p>
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

function DataCategory({ label, children }) {
  return (
    <div className="p-3 bg-muted/50 rounded-xl">
      <p className="text-xs font-semibold text-foreground mb-1">{label}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}
