import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { getPublicAppConfig } from "@/lib/config/app-config"

export default function CGUPage() {
  const { contactEmail } = getPublicAppConfig()
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background py-20">
        <div className="container max-w-4xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-8">Conditions Générales d'Utilisation</h1>
          <p className="text-muted-foreground mb-8">Dernière mise à jour : {new Date().toLocaleDateString("fr-FR")}</p>

          <div className="space-y-8 text-foreground/90">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Objet</h2>
              <p className="leading-relaxed">
                Les présentes Conditions Générales d'Utilisation (CGU) régissent l'utilisation de la plateforme Teens
                Party Morocco, accessible à l'adresse [votre-domaine.com]. En utilisant nos services, vous acceptez sans
                réserve les présentes CGU.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Définitions</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Plateforme :</strong> Site web et application Nivy
                </li>
                <li>
                  <strong>Utilisateur :</strong> Parent ou tuteur légal créant un compte
                </li>
                <li>
                  <strong>Participant :</strong> Adolescent(e) de 13 à 17 ans inscrit à un événement
                </li>
                <li>
                  <strong>Événement :</strong> Toute activité organisée via la plateforme
                </li>
                <li>
                  <strong>Club :</strong> Activité récurrente avec inscription mensuelle
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Inscription et Compte</h2>
              <h3 className="text-xl font-medium mb-3">3.1 Conditions d'inscription</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Vous devez être majeur(e) pour créer un compte</li>
                <li>Vous devez être parent ou tuteur légal du/des participant(s)</li>
                <li>Les informations fournies doivent être exactes et à jour</li>
                <li>Un seul compte par parent/tuteur est autorisé</li>
              </ul>

              <h3 className="text-xl font-medium mb-3">3.2 Sécurité du compte</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Vous êtes responsable de la confidentialité de vos identifiants</li>
                <li>Toute activité sur votre compte est sous votre responsabilité</li>
                <li>Informez-nous immédiatement en cas d'utilisation non autorisée</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Réservations et Paiements</h2>
              <h3 className="text-xl font-medium mb-3">4.1 Réservation d'événements</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Les réservations sont confirmées après paiement intégral</li>
                <li>Le nombre de places est limité (premier arrivé, premier servi)</li>
                <li>Un billet électronique vous sera envoyé par email</li>
                <li>Présentation obligatoire du billet + pièce d'identité à l'entrée</li>
              </ul>

              <h3 className="text-xl font-medium mb-3">4.2 Tarifs</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Tous les prix sont affichés en Dirhams marocains (MAD) TTC</li>
                <li>Les tarifs peuvent varier selon l'événement</li>
                <li>Réductions ambassadeurs et programme fidélité applicables</li>
              </ul>

              <h3 className="text-xl font-medium mb-3">4.3 Moyens de paiement</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Carte bancaire (Visa, Mastercard)</li>
                <li>Paiement mobile (selon disponibilité)</li>
                <li>Tous les paiements sont sécurisés (SSL/TLS)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Annulation et Remboursement</h2>
              <h3 className="text-xl font-medium mb-3">5.1 Annulation par l'utilisateur</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>
                  <strong>Plus de 7 jours avant :</strong> Remboursement intégral
                </li>
                <li>
                  <strong>3 à 7 jours avant :</strong> Remboursement à 50%
                </li>
                <li>
                  <strong>Moins de 3 jours avant :</strong> Aucun remboursement
                </li>
                <li>
                  <strong>Clubs :</strong> Résiliation possible avec préavis de 30 jours
                </li>
              </ul>

              <h3 className="text-xl font-medium mb-3">5.2 Annulation par Nivy</h3>
              <p className="leading-relaxed mb-2">
                En cas d'annulation de notre fait (météo, force majeure, nombre insuffisant) :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Remboursement intégral sous 7 jours ouvrés</li>
                <li>Ou report sur un événement équivalent à votre choix</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Règles de Conduite</h2>
              <h3 className="text-xl font-medium mb-3">6.1 Participants</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Respect des autres participants et encadrants</li>
                <li>Interdiction formelle : alcool, tabac, drogues, armes</li>
                <li>Respect du matériel et des lieux</li>
                <li>Participation active et bienveillante</li>
              </ul>

              <h3 className="text-xl font-medium mb-3">6.2 Sanctions</h3>
              <p className="leading-relaxed mb-2">En cas de non-respect des règles :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Avertissement verbal</li>
                <li>Exclusion immédiate de l'événement sans remboursement</li>
                <li>Suspension ou fermeture du compte en cas de récidive</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Responsabilités</h2>
              <h3 className="text-xl font-medium mb-3">7.1 Responsabilité de Nivy</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Encadrement professionnel et diplômé</li>
                <li>Assurance responsabilité civile</li>
                <li>Mesures de sécurité conformes à la réglementation</li>
                <li>Premiers secours disponibles sur site</li>
              </ul>

              <h3 className="text-xl font-medium mb-3">7.2 Responsabilité des parents</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Informations médicales à jour (allergies, traitements)</li>
                <li>Joignabilité pendant l'événement</li>
                <li>Respect des horaires de dépôt et récupération</li>
                <li>Assurance individuelle accident recommandée</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Droit à l'Image</h2>
              <p className="leading-relaxed mb-3">Lors de l'inscription, vous autorisez ou refusez explicitement :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>La prise de photos/vidéos de votre enfant</li>
                <li>Leur utilisation sur nos supports de communication (site, réseaux sociaux)</li>
                <li>Révocable à tout moment par email</li>
                <li>Floutage ou suppression à la demande sous 48h</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Programme de Fidélité</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Points accumulés : 1 point = 1 MAD dépensé</li>
                <li>Récompenses échangeables contre réductions ou cadeaux</li>
                <li>Points valables 12 mois après obtention</li>
                <li>Non transférables, non remboursables en espèces</li>
                <li>Programme modifiable avec préavis de 30 jours</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Programme Ambassadeurs</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Code de parrainage unique par ambassadeur</li>
                <li>Commission de 10% sur les réservations valides</li>
                <li>Paiement mensuel si solde ≥ 200 MAD</li>
                <li>Respect du code de conduite ambassadeur</li>
                <li>Nivy se réserve le droit de suspendre un compte ambassadeur</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Propriété Intellectuelle</h2>
              <p className="leading-relaxed mb-3">
                Tous les contenus de la plateforme (textes, images, logos, vidéos) sont protégés par le droit d'auteur.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Reproduction interdite sans autorisation écrite</li>
                <li>Usage personnel uniquement</li>
                <li>Marque "Nivy" déposée</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">12. Données Personnelles</h2>
              <p className="leading-relaxed">
                Le traitement de vos données personnelles est détaillé dans notre{" "}
                <a href="/legal/confidentialite" className="text-primary hover:underline">
                  Politique de Confidentialité
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">13. Modifications des CGU</h2>
              <p className="leading-relaxed">
                Nous nous réservons le droit de modifier les présentes CGU à tout moment. Les modifications entrent en
                vigueur dès leur publication. Votre utilisation continue de la plateforme vaut acceptation des nouvelles
                CGU.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">14. Loi Applicable et Juridiction</h2>
              <p className="leading-relaxed">
                Les présentes CGU sont régies par le droit marocain. En cas de litige, et après tentative de résolution
                amiable, les tribunaux de Casablanca seront seuls compétents.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">15. Contact</h2>
              <div className="p-4 bg-muted rounded-lg">
                <p>
                  <strong>Nivy</strong>
                </p>
                <p>
                  Email :{" "}
                  <a href={`mailto:${contactEmail}`} className="text-primary hover:underline">
                    {contactEmail}
                  </a>
                </p>
                <p>Téléphone : +212 5XX-XXXXXX</p>
                <p>Service client : Lun-Ven 9h-18h</p>
              </div>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
