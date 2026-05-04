"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { HelpCircle, MessageSquare, Phone, Mail, FileText, ExternalLink, ChevronRight } from "lucide-react"

export default function PartnerSupportPage() {
  const faqs = [
    { q: "Comment scanner un QR code membre ?", a: "Accédez à la page Scanner, activez la caméra et pointez vers le QR code de la carte membre." },
    { q: "Comment créer une nouvelle offre ?", a: "Rendez-vous dans Mes Offres > Nouvelle offre et remplissez le formulaire." },
    { q: "Quand sont versées les commissions ?", a: "Les commissions sont calculées mensuellement et versées le 5 du mois suivant." },
    { q: "Comment modifier mes informations entreprise ?", a: "Allez dans Paramètres > Informations entreprise pour mettre à jour vos données." },
  ]

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white">Support</h1>
        <p className="text-zinc-400">Besoin d'aide ? Nous sommes là pour vous</p>
      </div>

      {/* Contact Options */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-zinc-800 hover:border-emerald-500/30 transition-all cursor-pointer">
          <CardContent className="p-6 text-center">
            <div className="h-14 w-14 mx-auto rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
              <MessageSquare className="h-7 w-7 text-emerald-400" />
            </div>
            <h3 className="font-bold text-white mb-1">Chat en direct</h3>
            <p className="text-sm text-zinc-400 mb-4">Réponse en moins de 5 min</p>
            <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white">
              Démarrer le chat
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800 hover:border-blue-500/30 transition-all cursor-pointer">
          <CardContent className="p-6 text-center">
            <div className="h-14 w-14 mx-auto rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
              <Phone className="h-7 w-7 text-blue-400" />
            </div>
            <h3 className="font-bold text-white mb-1">Téléphone</h3>
            <p className="text-sm text-zinc-400 mb-4">Lun-Ven, 9h-18h</p>
            <Button variant="outline" className="w-full border-zinc-700 text-zinc-300">
              +212 522 123 456
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800 hover:border-purple-500/30 transition-all cursor-pointer">
          <CardContent className="p-6 text-center">
            <div className="h-14 w-14 mx-auto rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
              <Mail className="h-7 w-7 text-purple-400" />
            </div>
            <h3 className="font-bold text-white mb-1">Email</h3>
            <p className="text-sm text-zinc-400 mb-4">Réponse sous 24h</p>
            <Button variant="outline" className="w-full border-zinc-700 text-zinc-300">
              partners@teenclub.ma
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* FAQ */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-amber-400" />
            Questions fréquentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {faqs.map((faq, i) => (
            <details key={i} className="group">
              <summary className="flex items-center justify-between p-4 rounded-xl bg-zinc-800 border border-zinc-700 cursor-pointer list-none hover:border-zinc-600 transition-all">
                <span className="font-semibold text-white">{faq.q}</span>
                <ChevronRight className="h-5 w-5 text-zinc-400 group-open:rotate-90 transition-transform" />
              </summary>
              <div className="p-4 text-zinc-400 text-sm">
                {faq.a}
              </div>
            </details>
          ))}
        </CardContent>
      </Card>

      {/* Contact Form */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Envoyer un message</CardTitle>
          <CardDescription className="text-zinc-400">
            Notre équipe vous répondra dans les plus brefs délais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">Sujet</Label>
              <Input
                placeholder="Ex: Problème de scanner"
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">Catégorie</Label>
              <select className="w-full h-10 px-3 rounded-md bg-zinc-800 border border-zinc-700 text-white">
                <option>Technique</option>
                <option>Facturation</option>
                <option>Offres</option>
                <option>Autre</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">Message</Label>
            <Textarea
              placeholder="Décrivez votre problème ou question..."
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 min-h-[150px]"
            />
          </div>

          <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white">
            Envoyer le message
          </Button>
        </CardContent>
      </Card>

      {/* Resources */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-400" />
            Ressources
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-3">
          {[
            { name: "Guide du partenaire", desc: "Documentation complète" },
            { name: "Tutoriels vidéo", desc: "Apprendre en images" },
            { name: "Kit marketing", desc: "Logos et visuels" },
            { name: "Conditions générales", desc: "Contrat partenaire" },
          ].map((resource, i) => (
            <Button
              key={i}
              variant="outline"
              className="h-auto py-4 justify-start border-zinc-700 text-left hover:border-emerald-500/30"
            >
              <div className="flex-1">
                <p className="font-semibold text-white">{resource.name}</p>
                <p className="text-xs text-zinc-400">{resource.desc}</p>
              </div>
              <ExternalLink className="h-4 w-4 text-zinc-500" />
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
