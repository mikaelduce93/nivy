'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Clock, Mail, Phone, Home, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function PartnerThankYouPage() {
  // Reference must be cryptographically random and stable across re-renders.
  // Generated client-side post-mount to avoid SSR/CSR hydration drift.
  const [reference, setReference] = useState<string>('')
  useEffect(() => {
    let raw = ''
    if (typeof window !== 'undefined' && window.crypto) {
      const c = window.crypto
      if (typeof c.randomUUID === 'function') {
        raw = c.randomUUID()
      } else {
        const bytes = new Uint8Array(8)
        c.getRandomValues(bytes)
        raw = Array.from(bytes)
          .map((b: number) => b.toString(16).padStart(2, '0'))
          .join('')
      }
    }
    setReference(raw.replace(/-/g, '').slice(0, 8).toUpperCase())
  }, [])

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
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
              className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center"
            >
              <CheckCircle2 className="w-12 h-12 text-white" />
            </motion.div>
          </div>

          {/* Main Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-green-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Demande envoyée avec succès !
            </h1>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
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
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-cyan-400" />
                  Prochaines étapes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-cyan-400 font-semibold text-sm">1</span>
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">Examen de votre demande</h4>
                    <p className="text-sm text-zinc-400">
                      Notre équipe va examiner votre demande dans les <span className="text-white font-semibold">48 heures</span> suivantes.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-400 font-semibold text-sm">2</span>
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">Vérification des informations</h4>
                    <p className="text-sm text-zinc-400">
                      Nous vérifierons les informations fournies et pourrons vous contacter pour plus de détails.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-green-400 font-semibold text-sm">3</span>
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">Activation de votre compte</h4>
                    <p className="text-sm text-zinc-400">
                      Une fois approuvé, vous recevrez vos identifiants pour accéder à votre dashboard partenaire.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border-cyan-500/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Mail className="w-5 h-5 text-cyan-400" />
                  Un email de confirmation vous a été envoyé
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Vérifiez votre boîte de réception pour plus de détails
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Support */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6">
                <h4 className="text-white font-medium mb-3">Des questions ?</h4>
                <p className="text-sm text-zinc-400 mb-4">
                  Notre équipe est disponible pour répondre à toutes vos questions sur le programme de partenariat.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
                    asChild
                  >
                    <a href="mailto:partners@example.com">
                      <Mail className="w-4 h-4 mr-2" />
                      partners@example.com
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                    asChild
                  >
                    <a href="tel:+212XXXXXXXXX">
                      <Phone className="w-4 h-4 mr-2" />
                      +212 XXX-XXXXXX
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
              className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-700 hover:to-cyan-600 text-white"
            >
              <Link href="/">
                <Home className="w-4 h-4 mr-2" />
                Retour à l'accueil
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
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
            <p className="text-sm text-zinc-500">
              Numéro de référence : <span className="text-zinc-400 font-mono">{reference ? `#${reference}` : '#…'}</span>
            </p>
            <p className="text-xs text-zinc-600 mt-2">
              Conservez ce numéro pour toute correspondance future
            </p>
          </motion.div>

        </motion.div>

      </div>
    </div>
  )
}
