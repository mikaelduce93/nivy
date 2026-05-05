"use client"

import type React from "react"

import { useState } from "react"
import { MessageCircle, Mail, Phone, Send, Loader2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from 'next/navigation'
import { getPublicAppConfig } from "@/lib/config/app-config"

const { supportEmail: SUPPORT_EMAIL, supportPhone: SUPPORT_PHONE } = getPublicAppConfig()

export default function SupportPage() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/auth/login?redirect=/support")
      return
    }

    const { error } = await supabase.from("support_tickets").insert({
      profile_id: user.id,
      subject: formData.get("subject") as string,
      message: formData.get("message") as string,
      category: formData.get("category") as string,
      priority: "normal",
      status: "open",
    })

    setLoading(false)

    if (!error) {
      setSuccess(true)
      setTimeout(() => {
        router.push("/dashboard")
      }, 2000)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />

      <div className="container mx-auto px-6 py-32">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-black text-white mb-4">Support</h1>
            <p className="text-zinc-400 text-lg">Notre équipe est là pour vous aider</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl p-6 border border-cyan-500/30 text-center">
              <Mail className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
              <h3 className="text-white font-bold mb-2">Email</h3>
              <p className="text-cyan-400">{SUPPORT_EMAIL}</p>
            </div>

            <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl p-6 border border-blue-500/30 text-center">
              <Phone className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-white font-bold mb-2">Téléphone</h3>
              <p className="text-blue-400">{SUPPORT_PHONE}</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl p-6 border border-purple-500/30 text-center">
              <MessageCircle className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <h3 className="text-white font-bold mb-2">Chat</h3>
              <p className="text-purple-400">Lun-Ven 9h-18h</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-3xl p-8 border border-zinc-800">
            {success ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Send className="w-10 h-10 text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Ticket envoyé!</h3>
                <p className="text-zinc-400">Nous vous répondrons dans les plus brefs délais.</p>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-white mb-6">Créer un ticket</h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="text-white font-semibold mb-2 block">Catégorie</label>
                    <select
                      name="category"
                      required
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="">Sélectionner une catégorie</option>
                      <option value="reservation">Réservation</option>
                      <option value="payment">Paiement</option>
                      <option value="account">Compte</option>
                      <option value="technical">Problème technique</option>
                      <option value="other">Autre</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-white font-semibold mb-2 block">Sujet</label>
                    <Input
                      name="subject"
                      required
                      placeholder="Décrivez brièvement votre demande"
                      className="bg-zinc-900 border-zinc-800 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-white font-semibold mb-2 block">Message</label>
                    <Textarea
                      name="message"
                      required
                      placeholder="Décrivez votre problème en détail..."
                      className="bg-zinc-900 border-zinc-800 text-white min-h-40"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0 text-lg py-6"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        Envoyer le ticket
                      </>
                    )}
                  </Button>
                </form>
              </>
            )}
          </div>

          <div className="mt-12 bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-3xl p-8 border border-zinc-800">
            <h3 className="text-2xl font-bold text-white mb-6">Questions fréquentes</h3>

            <div className="space-y-4">
              <details className="group">
                <summary className="cursor-pointer text-white font-semibold py-3 border-b border-zinc-800 hover:text-cyan-400 transition-colors">
                  Comment puis-je réserver un événement?
                </summary>
                <p className="text-zinc-400 py-4 leading-relaxed">
                  Parcourez nos événements, sélectionnez celui qui vous intéresse, choisissez vos billets et suivez les
                  étapes de paiement sécurisé.
                </p>
              </details>

              <details className="group">
                <summary className="cursor-pointer text-white font-semibold py-3 border-b border-zinc-800 hover:text-cyan-400 transition-colors">
                  Puis-je annuler ma réservation?
                </summary>
                <p className="text-zinc-400 py-4 leading-relaxed">
                  Les annulations sont possibles jusqu'à 48h avant l'événement. Contactez-nous pour traiter votre
                  demande.
                </p>
              </details>

              <details className="group">
                <summary className="cursor-pointer text-white font-semibold py-3 border-b border-zinc-800 hover:text-cyan-400 transition-colors">
                  Comment fonctionnent les points de fidélité?
                </summary>
                <p className="text-zinc-400 py-4 leading-relaxed">
                  Gagnez des points à chaque réservation et échangez-les contre des récompenses exclusives.
                </p>
              </details>

              <details className="group">
                <summary className="cursor-pointer text-white font-semibold py-3 border-b border-zinc-800 hover:text-cyan-400 transition-colors">
                  Les événements sont-ils sécurisés?
                </summary>
                <p className="text-zinc-400 py-4 leading-relaxed">
                  Tous nos événements sont encadrés par des professionnels. La sécurité de vos enfants est notre
                  priorité absolue.
                </p>
              </details>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
