// V1.2 TODO: Wire to `partners` row + a future `partner_notification_prefs`
// table. Inputs are currently uncontrolled with hardcoded defaultValues; the
// "Sauvegarder" button is a no-op. See FRONTEND_REDO §4 — KEEP P2.
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Building2, Mail, Phone, MapPin, Globe, Bell, Shield, CreditCard } from "lucide-react"

export default function PartnerSettingsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white">Paramètres</h1>
        <p className="text-zinc-400">Configurez votre compte partenaire</p>
      </div>

      {/* Company Info */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-emerald-400" />
            Informations entreprise
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Ces informations seront visibles par les familles Nivy
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">Nom de l'entreprise</Label>
              <Input
                defaultValue="Ma Boutique"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">Type d'activité</Label>
              <Input
                defaultValue="Commerce de détail"
                className="bg-zinc-800 border-zinc-700 text-white"
                disabled
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">Description</Label>
            <Textarea
              defaultValue="Boutique de vêtements et accessoires tendance pour adolescents."
              className="bg-zinc-800 border-zinc-700 text-white min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-300 flex items-center gap-2">
                <Mail className="h-4 w-4" /> Email
              </Label>
              <Input
                type="email"
                defaultValue="contact@maboutique.ma"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300 flex items-center gap-2">
                <Phone className="h-4 w-4" /> Téléphone
              </Label>
              <Input
                defaultValue="+212 522 123 456"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300 flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Adresse
            </Label>
            <Input
              defaultValue="123 Boulevard Mohammed V, Casablanca"
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300 flex items-center gap-2">
              <Globe className="h-4 w-4" /> Site web
            </Label>
            <Input
              type="url"
              defaultValue="https://maboutique.ma"
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
            Sauvegarder les modifications
          </Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Bell className="h-5 w-5 text-amber-400" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: "Nouvelles transactions", desc: "Recevoir une notification à chaque transaction", enabled: true },
            { label: "Rapport hebdomadaire", desc: "Recevoir un résumé de vos performances chaque semaine", enabled: true },
            { label: "Nouveaux événements", desc: "Être notifié des prochains événements Nivy", enabled: false },
            { label: "Mises à jour du programme", desc: "Informations sur les changements du programme partenaire", enabled: true },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-zinc-800 border border-zinc-700">
              <div>
                <p className="font-semibold text-white">{item.label}</p>
                <p className="text-sm text-zinc-400">{item.desc}</p>
              </div>
              <Switch defaultChecked={item.enabled} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-400" />
            Sécurité
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-800 border border-zinc-700">
            <div>
              <p className="font-semibold text-white">Mot de passe</p>
              <p className="text-sm text-zinc-400">Dernière modification il y a 3 mois</p>
            </div>
            <Button variant="outline" className="border-zinc-600 text-zinc-300">
              Modifier
            </Button>
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-800 border border-zinc-700">
            <div>
              <p className="font-semibold text-white">Authentification à deux facteurs</p>
              <p className="text-sm text-zinc-400">Ajoutez une couche de sécurité supplémentaire</p>
            </div>
            <Button variant="outline" className="border-zinc-600 text-zinc-300">
              Activer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Billing */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-purple-400" />
            Facturation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-800 border border-zinc-700">
            <div>
              <p className="font-semibold text-white">Plan actuel</p>
              <p className="text-sm text-emerald-400">Partenaire Premium</p>
            </div>
            <Button variant="outline" className="border-zinc-600 text-zinc-300">
              Gérer l'abonnement
            </Button>
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-800 border border-zinc-700">
            <div>
              <p className="font-semibold text-white">Factures</p>
              <p className="text-sm text-zinc-400">Téléchargez vos factures</p>
            </div>
            <Button variant="outline" className="border-zinc-600 text-zinc-300">
              Voir les factures
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
