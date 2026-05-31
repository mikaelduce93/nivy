'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Store, Building2, Dumbbell, GraduationCap, ArrowRight, CheckCircle2, Info } from 'lucide-react'
import RetailPartnerForm from '@/components/partners/RetailPartnerForm'
import VenuePartnerForm from '@/components/partners/VenuePartnerForm'
import ClubPartnerForm from '@/components/partners/ClubPartnerForm'
import EducationPartnerForm from '@/components/partners/EducationPartnerForm'

type PartnerType = 'retail' | 'venue' | 'club' | 'education' | null

interface PartnerTypeOption {
  type: PartnerType
  title: string
  description: string
  Icon: any
  benefits: string[]
  examples: string[]
  color: string
  bgColor: string
  borderColor: string
}

const PARTNER_TYPES: PartnerTypeOption[] = [
  {
    type: 'retail',
    title: 'Commerce & Retail',
    description: 'Magasins, boutiques, et commerces de détail',
    Icon: Store,
    benefits: [
      'Accès à notre base de jeunes clients VIP',
      'Système de réductions automatisé',
      'Tableau de bord analytique',
      'Support multi-magasins'
    ],
    examples: ['Vêtements', 'Électronique', 'Cosmétiques', 'Librairies', 'Sport'],
    color: 'text-teal',
    bgColor: 'bg-teal/10',
    borderColor: 'border-teal/30'
  },
  {
    type: 'venue',
    title: 'Restaurants & Lieux',
    description: 'Restaurants, cafés, espaces événementiels',
    Icon: Building2,
    benefits: [
      'Système de réservation intégré',
      'Gestion de menus avec OCR',
      'Packages événements personnalisés',
      'Visibilité maximale'
    ],
    examples: ['Restaurants', 'Cafés', 'Salles de fête', 'Lounges', 'Terrasses'],
    color: 'text-pink',
    bgColor: 'bg-pink/10',
    borderColor: 'border-pink/30'
  },
  {
    type: 'club',
    title: 'Clubs & Fitness',
    description: 'Clubs sportifs, fitness, et activités',
    Icon: Dumbbell,
    benefits: [
      'Gestion d\'adhésions automatisée',
      'Calendrier de cours intégré',
      'Suivi de la présence',
      'Paiements récurrents'
    ],
    examples: ['Fitness', 'Sports', 'Danse', 'Arts martiaux', 'Yoga'],
    color: 'text-lime',
    bgColor: 'bg-lime/10',
    borderColor: 'border-lime/30'
  },
  {
    type: 'education',
    title: 'Éducation & Formation',
    description: 'Centres de formation et cours',
    Icon: GraduationCap,
    benefits: [
      'Gestion de cours et sessions',
      'Inscriptions en ligne',
      'Suivi des progrès',
      'Certificats automatiques'
    ],
    examples: ['Langues', 'Musique', 'Arts', 'Informatique', 'Soutien scolaire'],
    color: 'text-gold',
    bgColor: 'bg-gold/10',
    borderColor: 'border-gold/30'
  }
]

export default function PartnerRegistrationPage() {
  const [selectedType, setSelectedType] = useState<PartnerType>(null)
  const [step, setStep] = useState<'selection' | 'registration'>('selection')

  const handleTypeSelect = (type: PartnerType) => {
    setSelectedType(type)
    setStep('registration')
  }

  const handleBackToSelection = () => {
    setStep('selection')
    setSelectedType(null)
  }

  const renderForm = () => {
    switch (selectedType) {
      case 'retail':
        return <RetailPartnerForm onBack={handleBackToSelection} />
      case 'venue':
        return <VenuePartnerForm onBack={handleBackToSelection} />
      case 'club':
        return <ClubPartnerForm onBack={handleBackToSelection} />
      case 'education':
        return <EducationPartnerForm onBack={handleBackToSelection} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-background text-ink">
      <div className="container mx-auto px-4 py-12 max-w-7xl">

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-teal via-pink to-pink bg-clip-text text-transparent">
            Devenez Partenaire
          </h1>
          <p className="text-xl text-mute max-w-2xl mx-auto">
            Rejoignez notre réseau de partenaires et accédez à une communauté dynamique de jeunes avec des cartes VIP
          </p>
        </div>

        {step === 'selection' ? (
          <div>
            {/* Info Banner */}
            <Card className="mb-8 bg-gradient-to-r from-teal/10 to-pink/10 border-teal/30">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Info className="w-6 h-6 text-teal flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-ink mb-2">
                      Comment ça marche ?
                    </h3>
                    <ul className="space-y-2 text-ink-2">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-lime" />
                        Choisissez votre type de partenariat
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-lime" />
                        Complétez le formulaire d'inscription
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-lime" />
                        Notre équipe valide votre demande sous 48h
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-lime" />
                        Configurez vos offres et commencez à attirer des clients
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Partner Type Selection */}
            <div className="grid md:grid-cols-2 gap-6">
              {PARTNER_TYPES.map((partnerType) => (
                <Card
                  key={partnerType.type}
                  className={`bg-card border-ink hover:border-ink transition-all cursor-pointer group h-full ${partnerType.bgColor} hover:scale-[1.02]`}
                  onClick={() => handleTypeSelect(partnerType.type as PartnerType)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-lg ${partnerType.bgColor} border ${partnerType.borderColor}`}>
                        <div className={partnerType.color}>
                          <partnerType.Icon className="w-8 h-8" />
                        </div>
                      </div>
                      <ArrowRight className={`w-6 h-6 ${partnerType.color} group-hover:translate-x-1 transition-transform`} />
                    </div>
                    <CardTitle className="text-ink text-2xl">
                      {partnerType.title}
                    </CardTitle>
                    <CardDescription className="text-mute text-base">
                      {partnerType.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">

                    {/* Benefits */}
                    <div>
                      <h4 className="text-sm font-semibold text-ink-2 mb-2">
                        Avantages :
                      </h4>
                      <ul className="space-y-1">
                        {partnerType.benefits.map((benefit, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-mute">
                            <CheckCircle2 className={`w-4 h-4 flex-shrink-0 mt-0.5 ${partnerType.color}`} />
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Examples */}
                    <div>
                      <h4 className="text-sm font-semibold text-ink-2 mb-2">
                        Exemples :
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {partnerType.examples.map((example, i) => (
                          <span
                            key={i}
                            className={`px-2 py-1 rounded text-xs ${partnerType.bgColor} border ${partnerType.borderColor} ${partnerType.color}`}
                          >
                            {example}
                          </span>
                        ))}
                      </div>
                    </div>

                    <Button
                      className={`w-full mt-4 bg-gradient-to-r ${
                        partnerType.type === 'retail' ? 'from-teal to-teal' :
                        partnerType.type === 'venue' ? 'from-pink to-pink' :
                        partnerType.type === 'club' ? 'from-lime to-lime' :
                        'from-gold to-gold'
                      } hover:opacity-90 transition-opacity`}
                    >
                      Commencer l'inscription
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Contact Support */}
            <div className="mt-12 text-center">
              <Card className="bg-card border-ink inline-block">
                <CardContent className="p-6">
                  <p className="text-mute mb-2">
                    Vous avez des questions sur le programme de partenariat ?
                  </p>
                  <Button asChild variant="outline" className="border-teal/50 text-teal hover:bg-teal/10">
                    <Link href="/aide">Contactez notre équipe</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div>
            {renderForm()}
          </div>
        )}

      </div>
    </div>
  )
}
