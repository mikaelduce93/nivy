'use client'

import { useState } from 'react'
import { Search, MessageCircle, Mail, Phone, FileQuestion, CreditCard, Calendar, Shield, Users, ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { getPublicAppConfig } from '@/lib/config/app-config'

const { supportEmail: SUPPORT_EMAIL, whatsappPhone: WHATSAPP_PHONE, supportPhone: SUPPORT_PHONE } = getPublicAppConfig()

const categories = [
  { id: 'reservations', name: 'Réservations & Paiements', icon: CreditCard },
  { id: 'compte', name: 'Mon Compte', icon: Users },
  { id: 'evenements', name: 'Événements & Clubs', icon: Calendar },
  { id: 'securite', name: 'Sécurité & Autorisations', icon: Shield },
  { id: 'autre', name: 'Autre', icon: FileQuestion },
]

const faqs = [
  {
    category: 'reservations',
    question: 'Comment réserver un événement ?',
    answer: 'Pour réserver un événement, connecte-toi à ton compte, sélectionne l\'événement qui t\'intéresse dans l\'agenda, choisis le nombre de places et procède au paiement. Tu recevras ta confirmation par email avec ton QR code.'
  },
  {
    category: 'reservations',
    question: 'Quels moyens de paiement acceptez-vous ?',
    answer: 'Nous acceptons les paiements par carte bancaire (Visa, Mastercard), CMI, et Mobile Money (Orange Money, Maroc Telecom Cash). Le paiement en espèces est possible pour certains événements.'
  },
  {
    category: 'reservations',
    question: 'Puis-je annuler ma réservation ?',
    answer: 'Les annulations sont possibles jusqu\'à 48h avant l\'événement avec remboursement complet. Après ce délai, aucun remboursement ne sera effectué, sauf circonstances exceptionnelles.'
  },
  {
    category: 'compte',
    question: 'Comment créer mon compte ?',
    answer: 'Clique sur "Mon Compte" dans le menu, puis sur "S\'inscrire". Remplis le formulaire avec tes informations (email, mot de passe, nom complet, date de naissance). Un email de confirmation te sera envoyé.'
  },
  {
    category: 'compte',
    question: 'J\'ai oublié mon mot de passe',
    answer: 'Clique sur "Mot de passe oublié" sur la page de connexion. Entre ton email, tu recevras un lien pour réinitialiser ton mot de passe. Le lien est valable 1 heure.'
  },
  {
    category: 'compte',
    question: 'Comment ajouter un enfant à mon compte parent ?',
    answer: 'Dans ton espace parent, va dans "Mes Enfants" puis "Ajouter un enfant". Remplis les informations requises (nom, prénom, date de naissance, école). Tu pourras ensuite gérer ses réservations et autorisations.'
  },
  {
    category: 'evenements',
    question: 'À partir de quel âge peut-on participer ?',
    answer: 'Nos événements sont ouverts aux jeunes de 13 à 17 ans. L\'âge minimum et maximum peut varier selon l\'événement, consulte la fiche de chaque événement pour les détails.'
  },
  {
    category: 'evenements',
    question: 'Comment fonctionne l\'inscription aux clubs ?',
    answer: 'Choisis un club qui t\'intéresse, vérifie les horaires et le tarif mensuel, puis inscris-toi en ligne. Un paiement mensuel récurrent sera mis en place. Tu peux te désinscrire à tout moment avec un préavis d\'un mois.'
  },
  {
    category: 'evenements',
    question: 'Que se passe-t-il en cas d\'annulation d\'événement ?',
    answer: 'En cas d\'annulation d\'un événement, tu seras remboursé intégralement sous 7 jours ouvrés. Tu recevras un email avec les détails du remboursement et un code promo pour un prochain événement.'
  },
  {
    category: 'securite',
    question: 'L\'autorisation parentale est-elle obligatoire ?',
    answer: 'Oui, pour tous les mineurs de moins de 16 ans, une autorisation parentale signée est obligatoire. Les parents de 16-17 ans peuvent donner leur accord en ligne. Le document doit être présenté à l\'entrée.'
  },
  {
    category: 'securite',
    question: 'Quelles mesures de sécurité sont mises en place ?',
    answer: 'Tous nos événements ont un service de sécurité professionnel, des sorties de secours balisées, une équipe d\'encadrement formée aux premiers secours, et un système de bracelet pour le contrôle d\'accès. Aucune alcool ni substance illicite.'
  },
  {
    category: 'securite',
    question: 'Puis-je sortir et rentrer pendant l\'événement ?',
    answer: 'Les sorties définitives sont autorisées avec accord parental préalable. Les mineurs de moins de 16 ans ne peuvent pas sortir et rentrer. Un système de bracelet permet de tracer les entrées/sorties.'
  },
  {
    category: 'autre',
    question: 'Comment devenir ambassadeur ?',
    answer: 'Pour devenir ambassadeur Nivy, remplis le formulaire de candidature dans la section Ambassadeurs. Tu dois avoir entre 16-25 ans, être motivé et avoir une bonne présence sur les réseaux sociaux. Tu recevras une réponse sous 7 jours.'
  },
  {
    category: 'autre',
    question: 'Comment fonctionne la carte VIP ?',
    answer: 'La carte VIP offre des réductions sur tous nos événements, l\'accès prioritaire, des points de fidélité doublés, et des avantages partenaires exclusifs. 3 niveaux: Silver (gratuit), Gold (299dh/an), Platinum (599dh/an).'
  },
]

export default function AidePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !selectedCategory || faq.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-32">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-black text-white mb-6">
            Centre d'Aide
          </h1>
          <p className="text-xl text-primary mb-8">
            On est là pour t'aider
          </p>
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher une question..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 bg-card border-border text-white placeholder:text-muted-foreground rounded-2xl"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
          <Button
            asChild
            variant="outline"
            className="h-auto p-6 bg-card border-border hover:bg-accent flex flex-col items-center gap-3"
          >
            <a href={`mailto:${SUPPORT_EMAIL}`}>
              <Mail className="w-8 h-8 text-primary" />
              <div className="text-center">
                <p className="font-bold text-white">Email</p>
                <p className="text-sm text-muted-foreground">{SUPPORT_EMAIL}</p>
              </div>
            </a>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-auto p-6 bg-card border-border hover:bg-accent flex flex-col items-center gap-3"
          >
            <a href={`tel:+${WHATSAPP_PHONE}`}>
              <Phone className="w-8 h-8 text-primary" />
              <div className="text-center">
                <p className="font-bold text-white">Téléphone</p>
                <p className="text-sm text-muted-foreground">{SUPPORT_PHONE}</p>
              </div>
            </a>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-auto p-6 bg-card border-border hover:bg-accent flex flex-col items-center gap-3"
          >
            <Link href={`https://wa.me/${WHATSAPP_PHONE}`}>
              <MessageCircle className="w-8 h-8 text-primary" />
              <div className="text-center">
                <p className="font-bold text-white">WhatsApp</p>
                <p className="text-sm text-muted-foreground">Chat en direct</p>
              </div>
            </Link>
          </Button>
        </div>

        <div className="flex flex-wrap gap-3 justify-center mb-12">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            onClick={() => setSelectedCategory(null)}
            className={selectedCategory === null 
              ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-0' 
              : 'bg-card border-border text-muted-foreground hover:bg-accent'}
          >
            Toutes les catégories
          </Button>
          {categories.map((cat) => {
            const Icon = cat.icon
            return (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(cat.id)}
                className={selectedCategory === cat.id 
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-0' 
                  : 'bg-card border-border text-muted-foreground hover:bg-accent'}
              >
                <Icon className="w-4 h-4 mr-2" />
                {cat.name}
              </Button>
            )
          })}
        </div>

        <div className="max-w-4xl mx-auto space-y-4">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq, index) => (
              <div
                key={index}
                className="bg-card border border-border rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full p-6 flex items-center justify-between text-left hover:bg-accent/50 transition"
                >
                  <span className="text-white font-semibold pr-4">{faq.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-primary flex-shrink-0 transition-transform ${
                      expandedFaq === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {expandedFaq === index && (
                  <div className="px-6 pb-6">
                    <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <FileQuestion className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
              <p className="text-muted-foreground">Aucune question trouvée pour "{searchQuery}"</p>
            </div>
          )}
        </div>

        <div className="mt-20 max-w-3xl mx-auto text-center bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-3xl p-12">
          <h2 className="text-3xl font-bold text-white mb-4">Tu ne trouves pas ta réponse ?</h2>
          <p className="text-muted-foreground mb-8">
            Notre équipe est disponible pour répondre à toutes tes questions
          </p>
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0"
          >
            <a href={`mailto:${SUPPORT_EMAIL}`}>
              Contacter le support
              <Mail className="w-5 h-5 ml-2" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}
