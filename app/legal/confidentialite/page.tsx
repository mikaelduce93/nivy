import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { getPublicAppConfig } from "@/lib/config/app-config"
import Link from "next/link"

export const metadata = {
  title: "Politique de Confidentialité",
  description: "Comment Nivy collecte, utilise et protège tes données personnelles. Loi 09-08 + CNDP.",
}

export default function ConfidentialitePage() {
  const { privacyEmail, brandName } = getPublicAppConfig()
  const lastUpdated = "2026-05-07"

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background py-20">
        <div className="container max-w-4xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-8">Politique de Confidentialité</h1>
          <p className="text-muted-foreground mb-8">
            Dernière mise à jour : {new Date(lastUpdated).toLocaleDateString("fr-FR")}
          </p>

          <div className="space-y-8 text-foreground/90">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
              <p className="leading-relaxed">
                {brandName} (ci-après « nous », « notre » ou « la Plateforme ») est un écosystème lifestyle et
                gamification pour adolescents de 13 à 17 ans au Maroc. Nous traitons des données personnelles
                concernant des mineurs, leurs parents, et nos partenaires. Cette politique explique ce que nous
                collectons, pourquoi, avec qui nous le partageons, combien de temps nous le conservons, et quels
                droits tu as sur tes données.
              </p>
              <p className="mt-3 leading-relaxed">
                Ce traitement est conforme à la Loi 09-08 relative à la protection des personnes physiques à
                l&apos;égard du traitement des données à caractère personnel (Maroc) et est déclaré auprès de la
                Commission Nationale de contrôle de la Protection des Données à caractère Personnel (CNDP).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Données collectées</h2>
              <h3 className="text-xl font-medium mb-3">2.1 Adolescents (13-17 ans)</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Prénom, nom, date de naissance, ville</li>
                <li>Email et téléphone (si renseignés)</li>
                <li>Centres d&apos;intérêt, objectifs, style d&apos;apprentissage (déclaratifs)</li>
                <li>Activité sur la plateforme : missions complétées, défis, quizz, score XP, transactions coins</li>
                <li>Photos / vidéos uploadées dans des défis (preuves) — stockage privé, partage limité au parent et aux modérateurs</li>
                <li>Messages avec mentor (si activé) — chiffrés, conservés 90 jours</li>
              </ul>

              <h3 className="text-xl font-medium mb-3">2.2 Parents</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Nom complet, email, téléphone</li>
                <li>Lien avec le compte ado (parent_teen_links)</li>
                <li>Décisions d&apos;approbation parentale (paiements, sorties, mentorat, etc.)</li>
                <li>Informations de paiement traitées par notre prestataire e-monnaie agréé BAM (jamais stockées sur nos serveurs en clair)</li>
              </ul>

              <h3 className="text-xl font-medium mb-3">2.3 Partenaires (commerces, événements, mentors, chauffeurs)</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Documents KYC (CIN, registre de commerce, ICE, RIB) — stockage privé, accessible uniquement aux administrateurs</li>
                <li>Coordonnées bancaires pour les paiements de commission</li>
              </ul>

              <h3 className="text-xl font-medium mb-3">2.4 Données techniques</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Adresse IP, type de navigateur, système d&apos;exploitation</li>
                <li>Cookies essentiels (session, sécurité) et analytiques (avec ton consentement)</li>
                <li>Logs serveur (durée 30 jours pour la sécurité, prolongée en cas d&apos;incident)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Finalités du traitement</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Faire fonctionner la plateforme : authentification, gamification, paiements, livraisons</li>
                <li>Personnaliser ton expérience : recommandations de quizz, missions, contenus pertinents</li>
                <li>Sécuriser les mineurs : approbation parentale, modération, couvre-feu transport, KYC partenaires</li>
                <li>Communiquer : confirmations, rappels d&apos;événements, notifications push (avec ton consentement)</li>
                <li>Respecter nos obligations légales : comptabilité, lutte anti-blanchiment (e-monnaie), CNDP</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Protection spécifique des mineurs</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Tout compte ado nécessite la validation préalable d&apos;un parent (e-signature)</li>
                <li>Les parents ont accès au tableau de bord d&apos;activité et de dépenses de leur ado</li>
                <li>Aucune donnée d&apos;ado n&apos;est partagée à des tiers à des fins marketing</li>
                <li>Photos et vidéos uploadées sont chiffrées au repos, accessibles uniquement à l&apos;ado, à son parent et aux modérateurs</li>
                <li>Pas de messagerie directe avec des inconnus ; seuls les amis acceptés peuvent communiquer</li>
                <li>Couvre-feu transport (22h-05h heure locale) avec autorisation parentale explicite requise pour exception</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Partage des données</h2>
              <p className="leading-relaxed mb-3">Nous partageons des données limitées avec :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Prestataire e-monnaie BAM-agréé</strong> (Cash Plus, Wafacash, M2T) pour les top-up et débits</li>
                <li><strong>Stripe / CMI</strong> pour le traitement carte bancaire (parents uniquement)</li>
                <li><strong>Supabase (Frankfurt, UE)</strong> pour l&apos;hébergement de la base de données</li>
                <li><strong>Vercel (UE)</strong> pour l&apos;hébergement de l&apos;application</li>
                <li><strong>Sentry (UE)</strong> pour le suivi des erreurs (anonymisé)</li>
                <li><strong>Resend</strong> pour l&apos;envoi d&apos;emails transactionnels</li>
                <li><strong>Autorités</strong> si requis par décision judiciaire ou pour protéger la sécurité d&apos;un mineur</li>
              </ul>
              <p className="mt-3 leading-relaxed">
                Aucun de ces prestataires ne peut utiliser tes données à des fins propres. Tous sont liés par
                contrat de sous-traitance conforme à la Loi 09-08.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Tes droits (Loi 09-08 / CNDP)</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Droit d&apos;accès :</strong> consulter toutes les données te concernant</li>
                <li><strong>Droit de rectification :</strong> corriger les informations inexactes</li>
                <li><strong>Droit à l&apos;effacement :</strong> demander la suppression de ton compte (délai de 30 jours pour la finalisation, sauf obligation légale)</li>
                <li><strong>Droit à la portabilité :</strong> recevoir tes données dans un format JSON structuré et lisible</li>
                <li><strong>Droit d&apos;opposition :</strong> refuser certains traitements (ex. analytics non-essentiels)</li>
                <li><strong>Droit de retrait du consentement :</strong> à tout moment, sans justification</li>
              </ul>
              <p className="mt-4 leading-relaxed">
                Pour exercer ces droits depuis ton compte : <Link href="/parametres/donnees" className="text-primary hover:underline">/parametres/donnees</Link> (export + demande de suppression). Pour toute question :{" "}
                <a href={`mailto:${privacyEmail}`} className="text-primary hover:underline">{privacyEmail}</a>.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Tu peux également déposer une plainte auprès de la CNDP : <a href="https://www.cndp.ma" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.cndp.ma</a>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Sécurité</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Chiffrement TLS pour toutes les communications</li>
                <li>Chiffrement au repos pour les fichiers sensibles (CIN, KYC, preuves défis)</li>
                <li>Authentification deux facteurs disponible</li>
                <li>Accès aux données restreint au strict nécessaire (RBAC)</li>
                <li>Audits de sécurité réguliers + tests de pénétration</li>
                <li>Politique de divulgation responsable : <a href={`mailto:${privacyEmail}`} className="text-primary hover:underline">{privacyEmail}</a></li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Cookies</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Cookies essentiels :</strong> session, sécurité (CSRF), préférence de langue. Indispensables, non bloquables.</li>
                <li><strong>Cookies analytiques :</strong> Vercel Analytics (anonymisé). Optionnel, demande ton consentement.</li>
                <li><strong>Cookies de personnalisation :</strong> mémorise tes préférences UI. Optionnel.</li>
              </ul>
              <p className="mt-3 leading-relaxed">
                Tu peux gérer ces préférences via la bannière cookies (premier lancement) ou les paramètres de
                ton navigateur.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Conservation des données</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Compte actif : tant que tu utilises la plateforme</li>
                <li>Compte inactif : suppression automatique après 24 mois sans connexion (avec préavis)</li>
                <li>Données comptables (transactions DH) : 10 ans (obligation légale)</li>
                <li>Données KYC partenaires : 5 ans après fin de la relation contractuelle (obligation AML)</li>
                <li>Logs sécurité : 30 jours, sauf incident</li>
                <li>Backups : 30 jours, chiffrés</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Modifications</h2>
              <p className="leading-relaxed">
                Nous nous réservons le droit de modifier cette politique. Toute modification importante sera
                notifiée par email et/ou notification sur la plateforme. La date de dernière mise à jour est
                indiquée en haut de cette page.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Contact &amp; DPO</h2>
              <p className="leading-relaxed">
                Pour toute question concernant tes données personnelles, contacte notre Délégué à la Protection
                des Données :
              </p>
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p><strong>{brandName}</strong></p>
                <p>Email DPO :{" "}
                  <a href={`mailto:${privacyEmail}`} className="text-primary hover:underline">{privacyEmail}</a>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  L&apos;adresse postale et le téléphone du DPO seront communiqués sur demande à l&apos;adresse email ci-dessus.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
