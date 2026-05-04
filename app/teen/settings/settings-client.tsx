"use client"

import { useState } from "react"
import Link from "next/link"
import { Settings, ShieldCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { updatePrivacySettings } from "@/gamification-system/features/pillars/actions"

export function TeenSettingsClient({ privacy, permissions, teenId }: { privacy: any, permissions: any, teenId: string }) {
  const [settings, setSettings] = useState(privacy)
  const [updating, setUpdating] = useState<string | null>(null)

  const handleToggle = async (key: string) => {
    setUpdating(key)
    const newValue = !settings[key]

    setSettings((prev: any) => ({ ...prev, [key]: newValue }))

    try {
      const result = await updatePrivacySettings(teenId, { [key]: newValue })
      if (!result.success) {
        throw new Error(result.error)
      }
      toast.success("Paramètre mis à jour")
    } catch (error) {
      toast.error("Erreur lors de la mise à jour")
      setSettings((prev: any) => ({ ...prev, [key]: !newValue }))
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-purple-700">Paramètres</h1>
        <p className="text-sm text-gray-500">Gère ta confidentialité et consulte tes permissions.</p>
      </div>

      <Card className="bg-white/80 border-purple-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-700">
            <Settings className="h-5 w-5" />
            Préférences de confidentialité
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-gray-600">
          <div className="flex items-center justify-between">
            <span>Profil visible aux autres teens</span>
            <Switch
                checked={settings.show_profile_to_other_teens}
                onCheckedChange={() => handleToggle('show_profile_to_other_teens')}
                disabled={!!updating}
            />
          </div>
          <div className="flex items-center justify-between">
            <span>Partager l'activité aux parents</span>
            <Switch
                checked={settings.show_activity_to_parents}
                onCheckedChange={() => handleToggle('show_activity_to_parents')}
                disabled={!!updating}
            />
          </div>
          <div className="flex items-center justify-between">
            <span>Demandes d'amis</span>
            <Switch
                checked={settings.allow_friend_requests}
                onCheckedChange={() => handleToggle('allow_friend_requests')}
                disabled={!!updating}
            />
          </div>
          <div className="flex items-center justify-between">
            <span>Visible sur le leaderboard</span>
            <Switch
                checked={settings.show_on_leaderboard}
                onCheckedChange={() => handleToggle('show_on_leaderboard')}
                disabled={!!updating}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/80 border-purple-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-700">
            <ShieldCheck className="h-5 w-5" />
            Permissions parentales (Lecture seule)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center justify-between">
            <span>Voir l'activité</span>
            <span className={permissions.can_view_activity ? "text-emerald-600" : "text-red-500"}>
              {permissions.can_view_activity ? "Autorisé" : "Bloqué"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Valider les events</span>
            <span className={permissions.can_approve_events ? "text-emerald-600" : "text-red-500"}>
              {permissions.can_approve_events ? "Autorisé" : "Bloqué"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Recharger des crédits</span>
            <span className={permissions.can_topup_credits ? "text-emerald-600" : "text-red-500"}>
              {permissions.can_topup_credits ? "Autorisé" : "Bloqué"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Fixer un budget</span>
            <span className={permissions.can_set_spending_limit ? "text-emerald-600" : "text-red-500"}>
              {permissions.can_set_spending_limit ? "Autorisé" : "Bloqué"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Voir la localisation</span>
            <span className={permissions.can_view_location ? "text-emerald-600" : "text-red-500"}>
              {permissions.can_view_location ? "Autorisé" : "Bloqué"}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="secondary" className="bg-purple-50">
          <Link href="/notifications/preferences">Notifications</Link>
        </Button>
        <Button asChild variant="ghost" className="text-purple-600">
          <Link href="/teen/profile">Mon profil</Link>
        </Button>
      </div>
    </div>
  )
}
