'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Sparkles, Check, Gift, Star, Users, Ticket, ShoppingBag, Calendar, Calculator, ArrowRight } from 'lucide-react'

export default function CarteVIPPage() {
  const [eventsPerMonth, setEventsPerMonth] = useState(2)
  const [clubsPerMonth, setClubsPerMonth] = useState(1)
  const [selectedTier, setSelectedTier] = useState<'silver' | 'gold' | 'platinum'>('gold')

  const calculateSavings = () => {
    const eventPrice = 150
    const clubPrice = 200
    
    const monthlySpending = (eventsPerMonth * eventPrice) + (clubsPerMonth * clubPrice)
    
    const savings = {
      silver: monthlySpending * 0.1,
      gold: monthlySpending * 0.2 + 50, // 20% + 1 invité gratuit/mois
      platinum: monthlySpending * 0.3 + 150 // 30% + avantages
    }
    
    const yearlySpending = monthlySpending * 12
    const yearlySavings = {
      silver: yearlySpending * 0.1,
      gold: (yearlySpending * 0.2 + 600) - 299, // minus annual fee
      platinum: (yearlySpending * 0.3 + 1800) - 599 // minus annual fee
    }
    
    return { monthly: savings, yearly: yearlySavings }
  }

  const savings = calculateSavings()

  const tiers = [
    {
      id: 'silver',
      name: 'SILVER',
      icon: '🥉',
      price: 'Gratuit',
      priceAmount: 0,
      color: 'from-gray-400 to-gray-600',
      borderColor: 'border-gray-400',
      benefits: [
        '1 point par 10dh dépensés',
        '-10% sur anniversaires',
        'Accès préventes 24h avant',
        'Badge profil Silver',
        'Newsletter exclusive'
      ]
    },
    {
      id: 'gold',
      name: 'GOLD',
      icon: '🥇',
      price: '299dh',
      priceAmount: 299,
      popular: true,
      color: 'from-yellow-400 to-yellow-600',
      borderColor: 'border-yellow-500',
      benefits: [
        '2 points par 10dh dépensés',
        '-20% sur tous événements',
        '-15% sur clubs',
        '-10% chez partenaires',
        '1 invité gratuit par mois',
        'Accès préventes 48h avant',
        'Badge profil Gold',
        'Cadeaux d\'anniversaire'
      ]
    },
    {
      id: 'platinum',
      name: 'PLATINUM',
      icon: '💎',
      price: '599dh',
      priceAmount: 599,
      color: 'from-purple-500 to-pink-500',
      borderColor: 'border-purple-500',
      benefits: [
        '3 points par 10dh dépensés',
        '-30% sur tous événements',
        '-25% sur clubs',
        '-20% chez partenaires',
        'Accès VIP systématique',
        '5 invités offerts anniversaire',
        'Conciergerie dédiée 24/7',
        'Accès préventes 72h avant',
        'Badge profil Platinum',
        'Expériences VIP exclusives',
        'Meet & Greet artistes',
        'Merch exclusif'
      ]
    }
  ]

  const pointsRewards = [
    { points: 50, reward: '1 invité offert', icon: Users },
    { points: 100, reward: '1 entrée gratuite', icon: Ticket },
    { points: 200, reward: 'Merch exclusif', icon: ShoppingBag },
    { points: 500, reward: 'Expérience VIP', icon: Star }
  ]

  const partners = [
    { name: 'Pizza Hut', discount: '15%', category: 'Restaurant' },
    { name: 'KFC', discount: '10%', category: 'Restaurant' },
    { name: 'Megarama', discount: '20%', category: 'Cinéma' },
    { name: 'Tamaris Aquaparc', discount: '25%', category: 'Loisirs' },
    { name: 'Decathlon', discount: '10%', category: 'Sport' },
    { name: 'Zara', discount: '15%', category: 'Mode' }
  ]

  return (
    <div className="min-h-screen bg-background pt-20">
      {/* Hero Section */}
      <section className="relative py-16 px-4 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500">
        <div className="absolute inset-0 bg-black/20" />
        <div className="container mx-auto relative z-10 text-center text-white">
          <Badge className="mb-4 bg-white/20 text-white border-white/40">
            <Sparkles className="w-3 h-3 mr-1" />
            Programme Fidélité
          </Badge>
          <h1 className="text-5xl font-bold mb-6">Carte TEEN PARTY VIP</h1>
          <p className="text-xl max-w-2xl mx-auto mb-8 text-white/90">
            Profite de réductions exclusives, accumule des points à chaque événement et débloque des avantages incroyables
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" className="bg-white text-purple-600 hover:bg-white/90">
              Devenir membre VIP
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
              <Calculator className="mr-2 w-4 h-4" />
              Calculer mes économies
            </Button>
          </div>
        </div>
      </section>

      {/* Tiers Comparison */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Choisis ton niveau VIP</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Trois niveaux d'adhésion pour s'adapter à ton rythme de sorties
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {tiers.map((tier) => (
              <Card 
                key={tier.id}
                className={`relative ${tier.popular ? 'ring-2 ring-yellow-500 shadow-lg' : ''} ${tier.borderColor} border-2 hover:shadow-xl transition-shadow cursor-pointer`}
                onClick={() => setSelectedTier(tier.id as any)}
              >
                {tier.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-black">
                    Plus populaire
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <div className={`text-6xl mb-4 bg-gradient-to-br ${tier.color} bg-clip-text text-transparent`}>
                    {tier.icon}
                  </div>
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                  <CardDescription className="text-3xl font-bold text-foreground mt-2">
                    {tier.price}
                    {tier.priceAmount > 0 && <span className="text-sm font-normal text-muted-foreground">/an</span>}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {tier.benefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-sm">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full mt-6" variant={tier.popular ? 'default' : 'outline'}>
                    Choisir {tier.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Savings Calculator */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-6 h-6" />
                Calculateur d'économies
              </CardTitle>
              <CardDescription>
                Découvre combien tu peux économiser avec la carte VIP
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label>Événements par mois : {eventsPerMonth}</Label>
                  <Slider
                    value={[eventsPerMonth]}
                    onValueChange={(v) => setEventsPerMonth(v[0])}
                    min={0}
                    max={10}
                    step={1}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Séances clubs par mois : {clubsPerMonth}</Label>
                  <Slider
                    value={[clubsPerMonth]}
                    onValueChange={(v) => setClubsPerMonth(v[0])}
                    min={0}
                    max={8}
                    step={1}
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
                {tiers.map((tier) => (
                  <div key={tier.id} className="text-center p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground mb-1">{tier.name}</p>
                    <p className="text-2xl font-bold text-green-600">
                      +{Math.round(savings.yearly[tier.id as keyof typeof savings.yearly])}dh
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">économisés par an</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Points System */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Système de Points Fidélité</h2>
            <p className="text-muted-foreground">
              Accumule des points à chaque dépense et échange-les contre des récompenses
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {pointsRewards.map((reward, idx) => (
              <Card key={idx} className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <reward.icon className="w-8 h-8 text-primary" />
                  </div>
                  <div className="text-3xl font-bold text-primary mb-2">{reward.points}</div>
                  <p className="text-sm text-muted-foreground">points</p>
                  <p className="font-semibold mt-2">{reward.reward}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Partners */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Partenaires Exclusifs</h2>
            <p className="text-muted-foreground">
              Profite de réductions chez nos partenaires avec ta carte VIP
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {partners.map((partner, idx) => (
              <Card key={idx} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{partner.name}</h3>
                    <Badge variant="secondary">{partner.discount}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{partner.category}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-8">
            <Button variant="outline" asChild>
              <Link href="/partenaires">
                Voir tous les partenaires
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-gradient-to-r from-purple-600 to-pink-600">
        <div className="container mx-auto text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Prêt à devenir VIP ?</h2>
          <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
            Rejoins le programme fidélité Teen Party et profite d'avantages exclusifs dès maintenant
          </p>
          <Button size="lg" className="bg-white text-purple-600 hover:bg-white/90" asChild>
            <Link href="/carte-vip/souscrire">
              Souscrire maintenant
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
