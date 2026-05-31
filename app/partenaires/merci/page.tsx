'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Clock, Mail, Home, ArrowRight } from 'lucide-react'
import Link from 'next/link'

// Wave 3B.1 / canon §2.1, D3 — the reference is the persisted partners.id
// passed by the wizard via ?ref=<uuid>. The previous implementation
// generated a client-side random ID that was a placebo (canon §2.1 explicit
// FORBIDDEN: "/devenir-{archetype}/merci is a real persisted reference, not
// a crypto.randomUUID() UI affordance").
function PartnerThankYouInner() {
  const searchParams = useSearchParams()
  const ref = searchParams.get('ref') ?? ''
  const reference = ref ? ref.slice(0, 8).toUpperCase() : ''

  return (
    <div className="min-h-screen bg-background text-ink flex items-center justify-center p-4">
      <div className="container max-w-3xl">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >

          {/* Success Icon */}
          <div className="flex justify-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-24 h-24 rounded-full bg-gradient-to-br from-lime to-lime flex items-center justify-center"
            >
              <CheckCircle2 className="w-12 h-12 text-ink" />
            </motion.div>
          </div>

          {/* Main Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-lime via-lime to-teal bg-clip-text text-transparent">
              Demande envoyée avec succès !
            </h1>
            <p className="text-xl text-mute max-w-2xl mx-auto">
              Merci pour votre intérêt à devenir partenaire. Nous avons bien reçu votre demande d'inscription.
            </p>
          </motion.div>

          {/* Info Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-4 mb-8"
          >

            {/* Next Steps */}
            <Card className="bg-card border-ink">
              <CardHeader>
                <CardTitle className="text-ink flex items-center gap-2">
                  <Clock className="w-5 h-5 text-teal" />
                  Prochaines étapes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal/20 border border-teal/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-teal font-semibold text-sm">1</span>
                  </div>
                  <div>
                    <h4 className="text-ink font-medium mb-1">Examen de votre demande</h4>
                    <p className="text-sm text-mute">
                      Notre équipe va examiner votre demande dans les <span className="text-ink font-semibold">48 heures</span> suivantes.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-pink/20 border border-pink/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-pink font-semibold text-sm">2</span>
                  </div>
                  <div>
                    <h4 className="text-ink font-medium mb-1">Vérification des informations</h4>
                    <p className="text-sm text-mute">
                      Nous vérifierons les informations fournies et pourrons vous contacter pour plus de détails.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-lime/20 border border-lime/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-lime font-semibold text-sm">3</span>
                  </div>
                  <div>
                    <h4 className="text-ink font-medium mb-1">Activation de votre compte</h4>
                    <p className="text-sm text-mute">
                      Une fois approuvé, vous recevrez vos identifiants pour accéder à votre dashboard partenaire.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card className="bg-gradient-to-br from-teal/10 to-pink/10 border-teal/30">
              <CardHeader>
                <CardTitle className="text-ink flex items-center gap-2">
                  <Mail className="w-5 h-5 text-teal" />
                  Un email de confirmation vous a été envoyé
                </CardTitle>
                <CardDescription className="text-mute">
                  Vérifiez votre boîte de réception pour plus de détails
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Support */}
            <Card className="bg-card border-ink">
              <CardContent className="pt-6">
                <h4 className="text-ink font-medium mb-3">Des questions ?</h4>
                <p className="text-sm text-mute mb-4">
                  Notre équipe est disponible pour répondre à toutes vos questions sur le programme de partenariat.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    className="border-teal/50 text-teal hover:bg-teal/10"
                    asChild
                  >
                    <a href="mailto:partners@example.com">
                      <Mail className="w-4 h-4 mr-2" />
                      partners@example.com
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button
              asChild
              className="bg-gradient-to-r from-teal to-teal hover:from-teal hover:to-teal text-ink"
            >
              <Link href="/">
                <Home className="w-4 h-4 mr-2" />
                Retour à l'accueil
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-ink text-ink-2 hover:bg-card"
            >
              <Link href="/devenir-partenaire">
                En savoir plus sur le programme
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </motion.div>

          {/* Additional Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-12 text-center"
          >
            {reference ? (
              <>
                <p className="text-sm text-mute">
                  Référence dossier : <span className="text-mute font-mono">#{reference}</span>
                </p>
                <p className="text-xs text-mute mt-2">
                  Conservez cette référence pour toute correspondance avec l&apos;équipe Nivy.
                </p>
              </>
            ) : (
              <p className="text-xs text-mute">
                Vérifie ton email pour le lien de suivi de ton dossier.
              </p>
            )}
          </motion.div>

        </motion.div>

      </div>
    </div>
  )
}

export default function PartnerThankYouPage() {
  return (
    <Suspense fallback={null}>
      <PartnerThankYouInner />
    </Suspense>
  )
}
