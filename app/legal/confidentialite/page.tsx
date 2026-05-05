import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { getPublicAppConfig } from "@/lib/config/app-config"

export default function ConfidentialitePage() {
  const { privacyEmail } = getPublicAppConfig()
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background py-20">
        <div className="container max-w-4xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-8">Politique de Confidentialité</h1>
          <p className="text-muted-foreground mb-8">Dernière mise à jour : {new Date().toLocaleDateString("fr-FR")}</p>

          <div className="space-y-8 text-foreground/90">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
              <p className="leading-relaxed">
                Teens Party Morocco (ci-après "nous", "notre" ou "la Plateforme") s'engage à protéger la vie privée de
                ses utilisateurs, en particulier les mineurs. Cette politique de confidentialité explique comment nous
                collectons, utilisons, partageons et protégeons vos données personnelles.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Données Collectées</h2>
              <h3 className="text-xl font-medium mb-3">2.1 Informations des Parents/Tuteurs</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Nom complet, email, numéro de téléphone</li>
                <li>Adresse postale</li>
                <li>Informations de paiement (traitées de manière sécurisée)</li>
              </ul>

              <h3 className="text-xl font-medium mb-3">2.2 Informations des Adolescents</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Prénom, date de naissance</li>
                <li>Informations médicales pertinentes (allergies, urgences)</li>
                <li>Photos lors d'événements (avec consentement parental)</li>
                <li>Préférences et centres d'intérêt</li>
              </ul>

              <h3 className="text-xl font-medium mb-3">2.3 Données Techniques</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Adresse IP, type de navigateur, système d'exploitation</li>
                <li>Cookies et technologies similaires</li>
                <li>Données de navigation sur la plateforme</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Utilisation des Données</h2>
              <p className="leading-relaxed mb-3">Nous utilisons vos données pour :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Gérer les réservations et inscriptions aux événements</li>
                <li>Assurer la sécurité lors des événements</li>
                <li>Communiquer les informations importantes (confirmations, rappels, annulations)</li>
                <li>Personnaliser votre expérience sur la plateforme</li>
                <li>Améliorer nos services et développer de nouvelles fonctionnalités</li>
                <li>Respecter nos obligations légales</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Protection des Mineurs</h2>
              <p className="leading-relaxed mb-3">
                Conformément à la législation marocaine et internationale sur la protection des mineurs :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Tout compte adolescent nécessite l'autorisation parentale</li>
                <li>Les parents ont un accès complet aux activités de leurs enfants</li>
                <li>Nous ne partageons jamais les données des mineurs à des tiers à des fins marketing</li>
                <li>Les photos sont uniquement utilisées avec consentement parental explicite</li>
                <li>Possibilité de suppression de toute photo à tout moment</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Partage des Données</h2>
              <p className="leading-relaxed mb-3">Nous partageons vos données uniquement avec :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Partenaires événements :</strong> Informations nécessaires pour l'organisation (nombre de
                  participants, besoins spéciaux)
                </li>
                <li>
                  <strong>Processeurs de paiement :</strong> Données de transaction sécurisées
                </li>
                <li>
                  <strong>Autorités :</strong> Si requis par la loi ou pour protéger la sécurité
                </li>
                <li>
                  <strong>Prestataires techniques :</strong> Hébergement, analytics (avec accords de confidentialité)
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Vos Droits</h2>
              <p className="leading-relaxed mb-3">
                Conformément au RGPD et à la loi marocaine, vous disposez des droits suivants :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Droit d'accès :</strong> Consulter toutes les données vous concernant
                </li>
                <li>
                  <strong>Droit de rectification :</strong> Corriger les informations inexactes
                </li>
                <li>
                  <strong>Droit à l'effacement :</strong> Demander la suppression de vos données
                </li>
                <li>
                  <strong>Droit à la portabilité :</strong> Recevoir vos données dans un format structuré
                </li>
                <li>
                  <strong>Droit d'opposition :</strong> Refuser certains traitements de données
                </li>
                <li>
                  <strong>Droit de retrait du consentement :</strong> À tout moment
                </li>
              </ul>
              <p className="mt-4 leading-relaxed">
                Pour exercer ces droits, contactez-nous à :{" "}
                <a href={`mailto:${privacyEmail}`} className="text-primary hover:underline">
                  {privacyEmail}
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Sécurité des Données</h2>
              <p className="leading-relaxed mb-3">Nous mettons en œuvre des mesures de sécurité strictes :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Chiffrement SSL/TLS pour toutes les communications</li>
                <li>Stockage sécurisé sur serveurs certifiés (Supabase/AWS)</li>
                <li>Accès restreint aux données par mot de passe et authentification</li>
                <li>Audits de sécurité réguliers</li>
                <li>Formation du personnel sur la protection des données</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Cookies</h2>
              <p className="leading-relaxed mb-3">
                Nous utilisons des cookies pour améliorer votre expérience. Types de cookies :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Cookies essentiels :</strong> Nécessaires au fonctionnement (connexion, panier)
                </li>
                <li>
                  <strong>Cookies analytiques :</strong> Comprendre l'utilisation de la plateforme
                </li>
                <li>
                  <strong>Cookies de personnalisation :</strong> Mémoriser vos préférences
                </li>
              </ul>
              <p className="mt-4 leading-relaxed">
                Vous pouvez gérer vos préférences cookies dans les paramètres de votre navigateur.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Conservation des Données</h2>
              <p className="leading-relaxed">
                Nous conservons vos données personnelles uniquement le temps nécessaire aux finalités pour lesquelles
                elles ont été collectées, ou conformément aux obligations légales (généralement 5 ans pour les données
                comptables, 3 ans pour les données marketing après dernier contact).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Modifications de la Politique</h2>
              <p className="leading-relaxed">
                Nous nous réservons le droit de modifier cette politique. Toute modification sera notifiée par email
                et/ou notification sur la plateforme. La date de dernière mise à jour est indiquée en haut de cette
                page.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Contact</h2>
              <p className="leading-relaxed">
                Pour toute question concernant cette politique ou vos données personnelles :
              </p>
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p>
                  <strong>Teens Party Morocco</strong>
                </p>
                <p>
                  Email :{" "}
                  <a href={`mailto:${privacyEmail}`} className="text-primary hover:underline">
                    {privacyEmail}
                  </a>
                </p>
                <p>Téléphone : +212 5XX-XXXXXX</p>
                <p>Adresse : [Votre adresse complète]</p>
              </div>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
