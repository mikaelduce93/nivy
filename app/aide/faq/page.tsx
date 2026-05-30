import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Niv } from "@/components/brand"
import { MeshBackground } from "@/components/ui/effects/mesh-background"
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
        { q: "Comment créer un compte ?", a: "Cliquez sur 'Connexion' puis 'Créer un compte'. Remplissez vos informations et validez votre email." },
        { q: "Puis-je inscrire plusieurs enfants ?", a: "Oui, vous pouvez ajouter jusqu'à 5 profils enfants depuis votre espace parent." },
        { q: "Comment modifier les informations de mon enfant ?", a: "Allez dans Profil > Mes Enfants > Sélectionnez l'enfant > Modifier." },
      ],
    },
    {
      category: "Réservations & Paiements",
      questions: [
        { q: "Quels moyens de paiement acceptez-vous ?", a: "Carte bancaire (CMI), Mobile Money (Orange, inwi, Maroc Telecom), et paiement cash via nos ambassadeurs." },
        { q: "Puis-je payer en plusieurs fois ?", a: "Oui, le paiement en 3 fois sans frais est disponible pour les montants supérieurs à 300 DH." },
        { q: "Comment annuler une réservation ?", a: "Depuis 'Mes Réservations', sélectionnez la réservation et cliquez sur 'Annuler'. Remboursement intégral si annulation 48h avant." },
      ],
    },
    {
      category: "Événements",
      questions: [
        { q: "Quelle est la tranche d'âge acceptée ?", a: "Nos événements sont conçus pour les 11-17 ans. L'âge est vérifié lors du check-in." },
        { q: "Y a-t-il de l'alcool aux événements ?", a: "Absolument pas. Nos événements sont 100% sans alcool, sans tabac, et strictement supervisés." },
        { q: "Que se passe-t-il si l'événement est annulé ?", a: "Vous êtes remboursé intégralement ou recevez un crédit avec bonus de 10%." },
      ],
    },
    {
      category: "Sécurité",
      questions: [
        { q: "Quel est le ratio d'encadrement ?", a: "Nous garantissons 1 encadrant professionnel pour 10 adolescents maximum." },
        { q: "Comment gérez-vous les urgences médicales ?", a: "Équipe formée aux premiers secours, trousse médicale complète, et partenariats avec cliniques locales." },
        { q: "Mon enfant peut-il sortir avant la fin ?", a: "Uniquement avec autorisation parentale préalable ou appel téléphonique de confirmation." },
      ],
    },
    {
      category: "Programme Fidélité",
      questions: [
        { q: "Comment gagner des points ?", a: "10 points par événement participé, 50 points par ami parrainé, bonus mensuels selon votre activité." },
        { q: "Comment utiliser mes points ?", a: "100 points = 10 DH de réduction. Utilisables sur votre prochaine réservation." },
        { q: "Les points expirent-ils ?", a: "Oui, après 12 mois d'inactivité. Participez à au moins 1 événement par an pour les conserver." },
      ],
    },
  ]

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-paper">
        {/* Hero */}
        <section className="relative overflow-hidden px-4 pb-16 pt-32">
          <MeshBackground />
          <div className="relative z-10 mx-auto max-w-4xl">
            <div className="mb-10 flex flex-col items-center gap-5 text-center">
              <Niv mood="calm" size={100} float />
              <p className="eyebrow tracking-[0.16em]">Questions fréquentes</p>
              <h1 className="font-display text-5xl font-extrabold leading-[1.04] tracking-tight md:text-6xl">
                Comment on peut t'<em className="font-semibold italic text-pink">aider</em> ?
              </h1>
              <p className="text-xl text-ink-2">Trouve vite la réponse à ta question.</p>
            </div>

            {/* Search */}
            <div className="mx-auto max-w-2xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-mute" aria-hidden="true" />
                <Input
                  placeholder="Rechercher une question…"
                  className="h-14 border-2 border-ink pl-12 text-lg focus-visible:ring-0"
                />
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Categories */}
        <section className="px-4 py-12">
          <div className="mx-auto max-w-4xl space-y-10">
            {faqCategories.map((category, idx) => (
              <div key={idx}>
                <h2 className="mb-5 font-display text-2xl font-extrabold tracking-tight">
                  {category.category}
                </h2>
                <Accordion type="single" collapsible className="space-y-3">
                  {category.questions.map((item, qIdx) => (
                    <AccordionItem
                      key={qIdx}
                      value={`item-${idx}-${qIdx}`}
                      className="rounded-xl border-2 border-ink bg-white px-6 shadow-stkr-sm"
                    >
                      <AccordionTrigger className="text-left font-display font-bold hover:no-underline">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-mute">{item.a}</AccordionContent>
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
