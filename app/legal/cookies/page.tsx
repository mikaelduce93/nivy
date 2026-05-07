"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Cookie, Settings, Shield, BarChart3, Target, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { getPublicAppConfig } from "@/lib/config/app-config"

const { privacyEmail: PRIVACY_EMAIL } = getPublicAppConfig()

export default function CookiesPage() {
  const [preferences, setPreferences] = useState({
    necessary: true, // Always true, cannot be disabled
    functional: true,
    analytics: false,
    marketing: false,
  })

  const handleSavePreferences = () => {
    // Save to localStorage
    localStorage.setItem('cookie-preferences', JSON.stringify(preferences))
    toast.success("Préférences enregistrées", {
      description: "Vos préférences de cookies ont été mises à jour."
    })
  }

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    }
    setPreferences(allAccepted)
    localStorage.setItem('cookie-preferences', JSON.stringify(allAccepted))
    toast.success("Tous les cookies acceptés")
  }

  const handleRejectAll = () => {
    const onlyNecessary = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    }
    setPreferences(onlyNecessary)
    localStorage.setItem('cookie-preferences', JSON.stringify(onlyNecessary))
    toast.success("Cookies non essentiels refusés")
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-32 max-w-4xl">
        <Button asChild variant="ghost" className="mb-8 text-muted-foreground hover:text-foreground">
          <Link href="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à l'accueil
          </Link>
        </Button>

        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Cookie className="w-10 h-10 text-primary" />
            <h1 className="text-4xl font-black">Politique de Cookies</h1>
          </div>
          <p className="text-muted-foreground">
            Dernière mise à jour : Janvier 2026
          </p>
        </div>

        {/* Introduction */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Qu'est-ce qu'un cookie ?</h2>
          <div className="text-muted-foreground space-y-3">
            <p>
              Un cookie est un petit fichier texte stocké sur votre appareil (ordinateur, tablette,
              smartphone) lorsque vous visitez un site web. Les cookies permettent au site de
              mémoriser vos actions et préférences pendant une période déterminée.
            </p>
            <p>
              Nivy utilise des cookies pour améliorer votre expérience de navigation,
              analyser le trafic et personnaliser le contenu.
            </p>
          </div>
        </Card>

        {/* Cookie Categories */}
        <div className="space-y-6 mb-8">
          <h2 className="text-2xl font-bold">Types de cookies utilisés</h2>

          {/* Necessary Cookies */}
          <Card className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-bold">Cookies essentiels</h3>
                    <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full">
                      Toujours actifs
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm mb-3">
                    Ces cookies sont indispensables au fonctionnement du site. Ils permettent
                    d'utiliser les fonctionnalités principales comme la navigation, l'accès
                    aux zones sécurisées et la mémorisation de votre panier.
                  </p>
                  <div className="text-xs text-muted-foreground">
                    <strong>Cookies utilisés :</strong> session_id, csrf_token, auth_token
                  </div>
                </div>
              </div>
              <Switch checked={true} disabled />
            </div>
          </Card>

          {/* Functional Cookies */}
          <Card className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Settings className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-2">Cookies fonctionnels</h3>
                  <p className="text-muted-foreground text-sm mb-3">
                    Ces cookies permettent d'améliorer les fonctionnalités du site en mémorisant
                    vos préférences (langue, thème, région). Ils peuvent être définis par nous
                    ou par des fournisseurs tiers.
                  </p>
                  <div className="text-xs text-muted-foreground">
                    <strong>Cookies utilisés :</strong> theme_preference, language, city_preference
                  </div>
                </div>
              </div>
              <Switch
                checked={preferences.functional}
                onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, functional: checked }))}
              />
            </div>
          </Card>

          {/* Analytics Cookies */}
          <Card className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-2">Cookies analytiques</h3>
                  <p className="text-muted-foreground text-sm mb-3">
                    Ces cookies nous aident à comprendre comment les visiteurs interagissent avec
                    le site en collectant des informations de manière anonyme. Ces données nous
                    permettent d'améliorer nos services.
                  </p>
                  <div className="text-xs text-muted-foreground">
                    <strong>Services utilisés :</strong> Google Analytics, Mixpanel, Hotjar
                  </div>
                </div>
              </div>
              <Switch
                checked={preferences.analytics}
                onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, analytics: checked }))}
              />
            </div>
          </Card>

          {/* Marketing Cookies */}
          <Card className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                  <Target className="w-5 h-5 text-orange-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-2">Cookies marketing</h3>
                  <p className="text-muted-foreground text-sm mb-3">
                    Ces cookies sont utilisés pour suivre les visiteurs sur les sites web.
                    L'objectif est d'afficher des publicités pertinentes et engageantes pour
                    l'utilisateur.
                  </p>
                  <div className="text-xs text-muted-foreground">
                    <strong>Services utilisés :</strong> Facebook Pixel, Google Ads, TikTok Pixel
                  </div>
                </div>
              </div>
              <Switch
                checked={preferences.marketing}
                onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, marketing: checked }))}
              />
            </div>
          </Card>
        </div>

        {/* Action Buttons */}
        <Card className="p-6 mb-8 bg-primary/5 border-primary/20">
          <h3 className="font-bold mb-4">Gérer vos préférences</h3>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleAcceptAll} className="bg-primary">
              <Check className="w-4 h-4 mr-2" />
              Accepter tout
            </Button>
            <Button onClick={handleRejectAll} variant="outline">
              Refuser tout
            </Button>
            <Button onClick={handleSavePreferences} variant="secondary">
              Enregistrer mes choix
            </Button>
          </div>
        </Card>

        {/* Additional Info */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Comment supprimer les cookies ?</h2>
            <div className="text-muted-foreground space-y-3">
              <p>
                Vous pouvez supprimer les cookies existants et configurer votre navigateur pour
                bloquer les cookies. Voici comment procéder selon votre navigateur :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Chrome :</strong> Paramètres → Confidentialité et sécurité → Cookies</li>
                <li><strong>Firefox :</strong> Options → Vie privée et sécurité → Cookies</li>
                <li><strong>Safari :</strong> Préférences → Confidentialité → Cookies</li>
                <li><strong>Edge :</strong> Paramètres → Cookies et autorisations de site</li>
              </ul>
              <p className="text-sm mt-4">
                <strong>Note :</strong> La suppression des cookies peut affecter votre expérience
                de navigation et certaines fonctionnalités du site pourraient ne plus fonctionner
                correctement.
              </p>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Durée de conservation</h2>
            <div className="text-muted-foreground">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Type de cookie</th>
                    <th className="text-left py-2">Durée</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2">Cookies de session</td>
                    <td className="py-2">Jusqu'à fermeture du navigateur</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">Cookies de préférences</td>
                    <td className="py-2">1 an</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">Cookies analytiques</td>
                    <td className="py-2">2 ans</td>
                  </tr>
                  <tr>
                    <td className="py-2">Cookies marketing</td>
                    <td className="py-2">90 jours</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Contact</h2>
            <div className="text-muted-foreground">
              <p>
                Pour toute question concernant notre politique de cookies, contactez-nous :
              </p>
              <p className="mt-2">
                Email : <a href={`mailto:${PRIVACY_EMAIL}`} className="text-primary hover:underline">{PRIVACY_EMAIL}</a>
              </p>
            </div>
          </Card>
        </div>

        {/* Navigation */}
        <div className="mt-12 pt-8 border-t flex flex-wrap gap-4">
          <Button asChild variant="outline">
            <Link href="/legal/cgu">CGU</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/legal/cgv">CGV</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/legal/confidentialite">Confidentialité</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/legal/mentions-legales">Mentions légales</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
