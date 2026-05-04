import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { HelpCircle, Search } from 'lucide-react'
import { Input } from "@/components/ui/input"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export default function FAQPage() {
  const faqCategories = [
    {
      category: "Inscriptions & Compte",
      questions: [
        {
          q: "Comment créer un compte ?",
          a: "Cliquez sur 'Connexion' puis 'Créer un compte'. Remplissez vos informations et validez votre email."
        },
        {
          q: "Puis-je inscrire plusieurs enfants ?",
          a: "Oui, vous pouvez ajouter jusqu'à 5 profils enfants depuis votre espace parent."
        },
        {
          q: "Comment modifier les informations de mon enfant ?",
          a: "Allez dans Profil > Mes Enfants > Sélectionnez l'enfant > Modifier."
        }
      ]
    },
    {
      category: "Réservations & Paiements",
      questions: [
        {
          q: "Quels moyens de paiement acceptez-vous ?",
          a: "Carte bancaire (CMI), Mobile Money (Orange, inwi, Maroc Telecom), et paiement cash via nos ambassadeurs."
        },
        {
          q: "Puis-je payer en plusieurs fois ?",
          a: "Oui, le paiement en 3 fois sans frais est disponible pour les montants supérieurs à 300 DH."
        },
        {
          q: "Comment annuler une réservation ?",
          a: "Depuis 'Mes Réservations', sélectionnez la réservation et cliquez sur 'Annuler'. Remboursement intégral si annulation 48h avant."
        }
      ]
    },
    {
      category: "Événements",
      questions: [
        {
          q: "Quelle est la tranche d'âge acceptée ?",
          a: "Nos événements sont conçus pour les 11-17 ans. L'âge est vérifié lors du check-in."
        },
        {
          q: "Y a-t-il de l'alcool aux événements ?",
          a: "Absolument pas. Nos événements sont 100% sans alcool, sans tabac, et strictement supervisés."
        },
        {
          q: "Que se passe-t-il si l'événement est annulé ?",
          a: "Vous êtes remboursé intégralement ou recevez un crédit avec bonus de 10%."
        }
      ]
    },
    {
      category: "Sécurité",
      questions: [
        {
          q: "Quel est le ratio d'encadrement ?",
          a: "Nous garantissons 1 encadrant professionnel pour 10 adolescents maximum."
        },
        {
          q: "Comment gérez-vous les urgences médicales ?",
          a: "Équipe formée aux premiers secours, trousse médicale complète, et partenariats avec cliniques locales."
        },
        {
          q: "Mon enfant peut-il sortir avant la fin ?",
          a: "Uniquement avec autorisation parentale préalable ou appel téléphonique de confirmation."
        }
      ]
    },
    {
      category: "Programme Fidélité",
      questions: [
        {
          q: "Comment gagner des points ?",
          a: "10 points par événement participé, 50 points par ami parrainé, bonus mensuels selon votre activité."
        },
        {
          q: "Comment utiliser mes points ?",
          a: "100 points = 10 DH de réduction. Utilisables sur votre prochaine réservation."
        },
        {
          q: "Les points expirent-ils ?",
          a: "Oui, après 12 mois d'inactivité. Participez à au moins 1 événement par an pour les conserver."
        }
      ]
    }
  ]

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        {/* Hero */}
        <section className="relative pt-32 pb-20 px-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10" />
          
          <div className="max-w-4xl mx-auto relative z-10">
            <div className="text-center space-y-6 mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 text-blue-400 text-sm font-semibold mb-6">
                <HelpCircle className="w-4 h-4" />
                Questions Fréquentes
              </div>
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-500 to-pink-600 bg-clip-text text-transparent">
                Comment pouvons-nous vous aider ?
              </h1>
              <p className="text-xl text-muted-foreground">
                Trouvez rapidement les réponses à vos questions
              </p>
            </div>

            {/* Search */}
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Rechercher une question..."
                  className="pl-12 h-14 text-lg border-2"
                />
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Categories */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto space-y-12">
            {faqCategories.map((category, idx) => (
              <div key={idx}>
                <h2 className="text-2xl font-bold mb-6">{category.category}</h2>
                <Accordion type="single" collapsible className="space-y-4">
                  {category.questions.map((item, qIdx) => (
                    <AccordionItem key={qIdx} value={`item-${idx}-${qIdx}`} className="border rounded-lg px-6">
                      <AccordionTrigger className="text-left hover:no-underline">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
