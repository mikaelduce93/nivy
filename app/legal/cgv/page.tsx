import { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, ShoppingCart, CreditCard, RefreshCw, Shield, Scale, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Conditions Générales de Vente | Teens Party Morocco",
  description: "Conditions générales de vente de Teens Party Morocco",
}

export default function CGVPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-32 max-w-4xl">
        <Button asChild variant="ghost" className="mb-8 text-muted-foreground hover:text-foreground">
          <Link href="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à l'accueil
          </Link>
        </Button>

        <div className="mb-12">
          <h1 className="text-4xl font-black mb-4">Conditions Générales de Vente</h1>
          <p className="text-muted-foreground">
            Dernière mise à jour : Janvier 2026
          </p>
        </div>

        <div className="space-y-8">
          {/* Article 1 */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Scale className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-4">Article 1 - Objet et champ d'application</h2>
                <div className="text-muted-foreground space-y-3">
                  <p>
                    Les présentes Conditions Générales de Vente (CGV) régissent les relations contractuelles entre
                    Teens Party Morocco, société de droit marocain, et toute personne physique ou morale
                    effectuant un achat sur le site teensparty.ma.
                  </p>
                  <p>
                    Les présentes CGV s'appliquent à la vente de :
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Billets pour événements (soirées, concerts, festivals)</li>
                    <li>Inscriptions aux clubs et activités</li>
                    <li>Forfaits anniversaires</li>
                    <li>Cartes VIP et abonnements</li>
                    <li>Produits de la boutique (physiques et virtuels)</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>

          {/* Article 2 */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <ShoppingCart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-4">Article 2 - Commandes</h2>
                <div className="text-muted-foreground space-y-3">
                  <p><strong>2.1 Processus de commande</strong></p>
                  <p>
                    Le client sélectionne les produits ou services souhaités, les ajoute à son panier,
                    puis valide sa commande après avoir accepté les présentes CGV. Un email de confirmation
                    est envoyé à l'adresse indiquée.
                  </p>
                  <p><strong>2.2 Conditions d'âge</strong></p>
                  <p>
                    Les événements Teens Party sont réservés aux adolescents âgés de 12 à 17 ans.
                    Une autorisation parentale est obligatoire pour tout mineur. Le parent ou tuteur légal
                    effectuant l'achat certifie avoir l'autorité parentale sur l'enfant concerné.
                  </p>
                  <p><strong>2.3 Disponibilité</strong></p>
                  <p>
                    Nos offres sont valables dans la limite des places disponibles. En cas d'indisponibilité
                    après validation de la commande, le client sera remboursé intégralement.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Article 3 */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-4">Article 3 - Prix et paiement</h2>
                <div className="text-muted-foreground space-y-3">
                  <p><strong>3.1 Prix</strong></p>
                  <p>
                    Les prix sont indiqués en Dirhams marocains (DH) toutes taxes comprises.
                    Teens Party Morocco se réserve le droit de modifier ses prix à tout moment,
                    les produits étant facturés au tarif en vigueur au moment de la commande.
                  </p>
                  <p><strong>3.2 Moyens de paiement acceptés</strong></p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Carte bancaire (Visa, Mastercard) via Stripe</li>
                    <li>Cartes marocaines via CMI</li>
                    <li>Mobile Money (Orange Money, inwi money, MT Cash)</li>
                    <li>Points XP (réduction partielle ou totale)</li>
                    <li>Paiement en espèces chez un ambassadeur agréé</li>
                  </ul>
                  <p><strong>3.3 Paiement hybride XP</strong></p>
                  <p>
                    Les clients peuvent utiliser leurs points XP accumulés pour réduire le montant
                    de leur commande. Le taux de conversion est de 100 XP = 10 DH. Les XP utilisés
                    sont non remboursables.
                  </p>
                  <p><strong>3.4 Réductions VIP</strong></p>
                  <p>
                    Les détenteurs de cartes VIP Gold bénéficient de 20% de réduction, et les
                    détenteurs Platinum de 30% de réduction sur les événements et clubs.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Article 4 */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <RefreshCw className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-4">Article 4 - Annulation et remboursement</h2>
                <div className="text-muted-foreground space-y-3">
                  <p><strong>4.1 Droit de rétractation</strong></p>
                  <p>
                    Conformément à la législation marocaine, le droit de rétractation ne s'applique pas
                    aux services de loisirs fournis à une date déterminée (événements, activités).
                  </p>
                  <p><strong>4.2 Politique d'annulation par le client</strong></p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Annulation plus de 48h avant l'événement : remboursement intégral</li>
                    <li>Annulation entre 24h et 48h avant : remboursement de 50%</li>
                    <li>Annulation moins de 24h avant : aucun remboursement</li>
                  </ul>
                  <p><strong>4.3 Annulation par Teens Party Morocco</strong></p>
                  <p>
                    En cas d'annulation d'un événement par nos soins (force majeure, conditions
                    météorologiques, etc.), le client sera remboursé intégralement ou pourra
                    reporter sa réservation sur un événement ultérieur.
                  </p>
                  <p><strong>4.4 Abonnements VIP</strong></p>
                  <p>
                    Les abonnements VIP sont résiliables à tout moment. La résiliation prend effet
                    à la fin de la période mensuelle en cours. Aucun remboursement au prorata n'est
                    effectué pour le mois en cours.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Article 5 */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-4">Article 5 - Responsabilités</h2>
                <div className="text-muted-foreground space-y-3">
                  <p><strong>5.1 Responsabilité de Teens Party Morocco</strong></p>
                  <p>
                    Teens Party Morocco s'engage à assurer la sécurité des participants lors des
                    événements. Une équipe de sécurité professionnelle est présente. Les événements
                    sont 100% sans alcool et encadrés par des adultes formés.
                  </p>
                  <p><strong>5.2 Responsabilité des parents</strong></p>
                  <p>
                    Les parents ou tuteurs légaux restent responsables de leurs enfants. Ils
                    s'engagent à fournir des informations exactes et à récupérer leur enfant
                    à l'heure de fin indiquée.
                  </p>
                  <p><strong>5.3 Comportement</strong></p>
                  <p>
                    Teens Party Morocco se réserve le droit d'exclure tout participant dont le
                    comportement mettrait en danger sa sécurité ou celle des autres, sans
                    remboursement.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Article 6 */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-4">Article 6 - Droit à l'image</h2>
                <div className="text-muted-foreground space-y-3">
                  <p>
                    Des photos et vidéos peuvent être prises lors des événements à des fins
                    promotionnelles. Les participants qui ne souhaitent pas apparaître peuvent
                    demander un badge "NO-PHOTO" à l'entrée.
                  </p>
                  <p>
                    En acceptant les présentes CGV, le parent autorise Teens Party Morocco à
                    utiliser l'image de son enfant sauf demande contraire explicite.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Article 7 */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Article 7 - Protection des données</h2>
            <div className="text-muted-foreground space-y-3">
              <p>
                Les données personnelles collectées sont traitées conformément à notre
                <Link href="/legal/confidentialite" className="text-primary hover:underline mx-1">
                  Politique de Confidentialité
                </Link>
                et à la loi marocaine n°09-08 relative à la protection des personnes physiques
                à l'égard du traitement des données à caractère personnel.
              </p>
            </div>
          </Card>

          {/* Article 8 */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Article 8 - Litiges</h2>
            <div className="text-muted-foreground space-y-3">
              <p>
                Les présentes CGV sont soumises au droit marocain. En cas de litige, les parties
                s'engagent à rechercher une solution amiable. À défaut, les tribunaux de Casablanca
                seront seuls compétents.
              </p>
            </div>
          </Card>

          {/* Contact */}
          <Card className="p-6 bg-primary/5 border-primary/20">
            <h2 className="text-xl font-bold mb-4">Contact</h2>
            <div className="text-muted-foreground space-y-2">
              <p><strong>Teens Party Morocco</strong></p>
              <p>Email : contact@teensparty.ma</p>
              <p>Téléphone : +212 6 00 00 00 00</p>
              <p>Adresse : Casablanca, Maroc</p>
            </div>
          </Card>
        </div>

        {/* Navigation */}
        <div className="mt-12 pt-8 border-t flex flex-wrap gap-4">
          <Button asChild variant="outline">
            <Link href="/legal/cgu">CGU</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/legal/confidentialite">Confidentialité</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/legal/cookies">Cookies</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/legal/mentions-legales">Mentions légales</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
