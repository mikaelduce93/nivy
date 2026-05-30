'use client'

import { useState } from 'react'
import { Search, MessageCircle, Mail, Phone, FileQuestion, CreditCard, Calendar, Shield, Users, ChevronDown } from 'lucide-react'
import Link from 'next/link'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { StickerCard } from '@/components/ui/sticker-card'
import { Niv, NivEmpty, DarkSurface } from '@/components/brand'
import { MeshBackground } from '@/components/ui/effects/mesh-background'
import { cn } from '@/lib/utils'
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
  { category: 'reservations', question: 'Comment réserver un événement ?', answer: 'Pour réserver un événement, connecte-toi à ton compte, sélectionne l\'événement qui t\'intéresse dans l\'agenda, choisis le nombre de places et procède au paiement. Tu recevras ta confirmation par email avec ton QR code.' },
  { category: 'reservations', question: 'Quels moyens de paiement acceptez-vous ?', answer: 'Nous acceptons les paiements par carte bancaire (Visa, Mastercard), CMI, et Mobile Money (Orange Money, Maroc Telecom Cash). Le paiement en espèces est possible pour certains événements.' },
  { category: 'reservations', question: 'Puis-je annuler ma réservation ?', answer: 'Les annulations sont possibles jusqu\'à 48h avant l\'événement avec remboursement complet. Après ce délai, aucun remboursement ne sera effectué, sauf circonstances exceptionnelles.' },
  { category: 'compte', question: 'Comment créer mon compte ?', answer: 'Clique sur "Mon Compte" dans le menu, puis sur "S\'inscrire". Remplis le formulaire avec tes informations (email, mot de passe, nom complet, date de naissance). Un email de confirmation te sera envoyé.' },
  { category: 'compte', question: 'J\'ai oublié mon mot de passe', answer: 'Clique sur "Mot de passe oublié" sur la page de connexion. Entre ton email, tu recevras un lien pour réinitialiser ton mot de passe. Le lien est valable 1 heure.' },
  { category: 'compte', question: 'Comment ajouter un enfant à mon compte parent ?', answer: 'Dans ton espace parent, va dans "Mes Enfants" puis "Ajouter un enfant". Remplis les informations requises (nom, prénom, date de naissance, école). Tu pourras ensuite gérer ses réservations et autorisations.' },
  { category: 'evenements', question: 'À partir de quel âge peut-on participer ?', answer: 'Nos événements sont ouverts aux jeunes de 13 à 17 ans. L\'âge minimum et maximum peut varier selon l\'événement, consulte la fiche de chaque événement pour les détails.' },
  { category: 'evenements', question: 'Comment fonctionne l\'inscription aux clubs ?', answer: 'Choisis un club qui t\'intéresse, vérifie les horaires et le tarif mensuel, puis inscris-toi en ligne. Un paiement mensuel récurrent sera mis en place. Tu peux te désinscrire à tout moment avec un préavis d\'un mois.' },
  { category: 'evenements', question: 'Que se passe-t-il en cas d\'annulation d\'événement ?', answer: 'En cas d\'annulation d\'un événement, tu seras remboursé intégralement sous 7 jours ouvrés. Tu recevras un email avec les détails du remboursement et un code promo pour un prochain événement.' },
  { category: 'securite', question: 'L\'autorisation parentale est-elle obligatoire ?', answer: 'Oui, pour tous les mineurs de moins de 16 ans, une autorisation parentale signée est obligatoire. Les parents de 16-17 ans peuvent donner leur accord en ligne. Le document doit être présenté à l\'entrée.' },
  { category: 'securite', question: 'Quelles mesures de sécurité sont mises en place ?', answer: 'Tous nos événements ont un service de sécurité professionnel, des sorties de secours balisées, une équipe d\'encadrement formée aux premiers secours, et un système de bracelet pour le contrôle d\'accès. Aucune alcool ni substance illicite.' },
  { category: 'securite', question: 'Puis-je sortir et rentrer pendant l\'événement ?', answer: 'Les sorties définitives sont autorisées avec accord parental préalable. Les mineurs de moins de 16 ans ne peuvent pas sortir et rentrer. Un système de bracelet permet de tracer les entrées/sorties.' },
  { category: 'autre', question: 'Comment devenir ambassadeur ?', answer: 'Pour devenir ambassadeur Nivy, remplis le formulaire de candidature dans la section Ambassadeurs. Tu dois avoir entre 16-25 ans, être motivé et avoir une bonne présence sur les réseaux sociaux. Tu recevras une réponse sous 7 jours.' },
  { category: 'autre', question: 'Comment fonctionne la carte VIP ?', answer: 'La carte VIP offre des réductions sur tous nos événements, l\'accès prioritaire, des points de fidélité doublés, et des avantages partenaires exclusifs. 3 niveaux: Silver (gratuit), Gold (299dh/an), Platinum (599dh/an).' },
]

const CONTACTS = [
  { icon: Mail, title: 'Email', sub: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` },
  { icon: Phone, title: 'Téléphone', sub: SUPPORT_PHONE, href: `tel:+${WHATSAPP_PHONE}` },
  { icon: MessageCircle, title: 'WhatsApp', sub: 'Chat en direct', href: `https://wa.me/${WHATSAPP_PHONE}` },
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

  const pill = (active: boolean) =>
    cn(
      'font-mono text-[12px] font-bold uppercase tracking-[0.12em]',
      active
        ? '-translate-x-0.5 -translate-y-0.5 bg-ink text-paper shadow-stkr-pink motion-reduce:translate-x-0 motion-reduce:translate-y-0'
        : 'bg-white text-mute hover:text-ink',
    )

  return (
    <div className="relative min-h-screen overflow-hidden bg-paper">
      <MeshBackground />
      <div className="relative z-10 container mx-auto px-6 py-28">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <Niv mood="calm" size={100} float className="mx-auto" />
          <p className="mt-4 eyebrow tracking-[0.16em]">Centre d'aide</p>
          <h1 className="mt-2 font-display text-5xl font-extrabold tracking-tight md:text-6xl">
            On est là pour t'<em className="font-semibold italic text-pink">aider</em>
          </h1>

          <div className="relative mt-8">
            <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-mute" aria-hidden="true" />
            <Input
              type="text"
              placeholder="Rechercher une question…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-14 border-2 border-ink pl-12 focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="mx-auto mb-14 grid max-w-5xl gap-6 md:grid-cols-3">
          {CONTACTS.map((c) => (
            <a key={c.title} href={c.href} className="group">
              <StickerCard variant="hover" className="items-center gap-3 p-6 text-center">
                <c.icon className="size-8 text-pink" aria-hidden="true" />
                <div>
                  <p className="font-display font-bold text-ink">{c.title}</p>
                  <p className="break-all text-sm text-mute">{c.sub}</p>
                </div>
              </StickerCard>
            </a>
          ))}
        </div>

        <div className="mb-10 flex flex-wrap justify-center gap-2 rounded-2xl border-2 border-ink bg-white p-2">
          <Button variant="ghost" onClick={() => setSelectedCategory(null)} className={pill(selectedCategory === null)}>
            Toutes
          </Button>
          {categories.map((cat) => {
            const Icon = cat.icon
            return (
              <Button key={cat.id} variant="ghost" onClick={() => setSelectedCategory(cat.id)} className={pill(selectedCategory === cat.id)}>
                <Icon className="mr-2 size-4" aria-hidden="true" />
                {cat.name}
              </Button>
            )
          })}
        </div>

        <div className="mx-auto max-w-4xl space-y-4">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq, index) => (
              <StickerCard key={index} className="overflow-hidden p-0">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="flex w-full items-center justify-between p-6 text-left"
                >
                  <span className="pr-4 font-display font-bold text-ink">{faq.question}</span>
                  <ChevronDown
                    className={cn('size-5 shrink-0 text-ink transition-transform', expandedFaq === index && 'rotate-180')}
                    aria-hidden="true"
                  />
                </button>
                {expandedFaq === index && (
                  <div className="px-6 pb-6">
                    <p className="leading-relaxed text-mute">{faq.answer}</p>
                  </div>
                )}
              </StickerCard>
            ))
          ) : (
            <NivEmpty
              mood="calm"
              title="Aucune question trouvée"
              description={`Rien ne correspond à « ${searchQuery} ». Essaie d'autres mots ou contacte-nous.`}
            />
          )}
        </div>

        <DarkSurface tone="pink" shadow className="mx-auto mt-16 max-w-3xl p-10 text-center">
          <h2 className="font-display text-3xl font-extrabold text-paper">Tu ne trouves pas ta réponse ?</h2>
          <p className="mb-8 mt-3 text-paper/70">Notre équipe répond à toutes tes questions.</p>
          <Button asChild size="lg" variant="pink">
            <a href={`mailto:${SUPPORT_EMAIL}`}>
              Contacter le support
              <Mail className="ml-2 size-5" aria-hidden="true" />
            </a>
          </Button>
        </DarkSurface>
      </div>
    </div>
  )
}
