"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { ArrowLeft, Bell } from "lucide-react"
import Link from "next/link"

export default function NotificationPreferencesPage() {
  const [preferences, setPreferences] = useState({
    booking_confirmation: true,
    payment_received: true,
    event_reminder: true,
    event_update: true,
    club_reminder: true,
    new_event: false,
    ambassador_update: false,
    loyalty_points: true,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase.from("notification_preferences").select("*").eq("user_id", user.id).single()

    if (data) {
      setPreferences({
        booking_confirmation: data.booking_confirmation ?? true,
        payment_received: data.payment_received ?? true,
        event_reminder: data.event_reminder ?? true,
        event_update: data.event_update ?? true,
        club_reminder: data.club_reminder ?? true,
        new_event: data.new_event ?? false,
        ambassador_update: data.ambassador_update ?? false,
        loyalty_points: data.loyalty_points ?? true,
      })
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    setIsSaved(false)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Non authentifié")

      const { error } = await supabase.from("notification_preferences").upsert({
        user_id: user.id,
        ...preferences,
      })

      if (error) throw error

      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 3000)
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const updatePreference = (key: string, value: boolean) => {
    setPreferences((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="min-h-screen bg-zinc-950 py-32">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto">
          <Button asChild variant="ghost" className="mb-6 text-cyan-400 hover:text-cyan-300">
            <Link href="/notifications">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Link>
          </Button>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Bell className="w-6 h-6 text-cyan-400" />
                <CardTitle className="text-2xl text-white">Préférences de notifications</CardTitle>
              </div>
              <CardDescription>Choisissez les notifications que vous souhaitez recevoir</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Réservations</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="booking_confirmation" className="text-white cursor-pointer">
                        Confirmation de réservation
                      </Label>
                      <p className="text-sm text-zinc-500">Recevoir un email de confirmation</p>
                    </div>
                    <Switch
                      id="booking_confirmation"
                      checked={preferences.booking_confirmation}
                      onCheckedChange={(checked) => updatePreference("booking_confirmation", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="payment_received" className="text-white cursor-pointer">
                        Paiement reçu
                      </Label>
                      <p className="text-sm text-zinc-500">Confirmation de paiement</p>
                    </div>
                    <Switch
                      id="payment_received"
                      checked={preferences.payment_received}
                      onCheckedChange={(checked) => updatePreference("payment_received", checked)}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Événements</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="event_reminder" className="text-white cursor-pointer">
                        Rappel d'événement
                      </Label>
                      <p className="text-sm text-zinc-500">24h avant l'événement</p>
                    </div>
                    <Switch
                      id="event_reminder"
                      checked={preferences.event_reminder}
                      onCheckedChange={(checked) => updatePreference("event_reminder", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="event_update" className="text-white cursor-pointer">
                        Mises à jour d'événement
                      </Label>
                      <p className="text-sm text-zinc-500">Changements d'horaire ou lieu</p>
                    </div>
                    <Switch
                      id="event_update"
                      checked={preferences.event_update}
                      onCheckedChange={(checked) => updatePreference("event_update", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="new_event" className="text-white cursor-pointer">
                        Nouveaux événements
                      </Label>
                      <p className="text-sm text-zinc-500">Alertes pour chaque nouvel événement</p>
                    </div>
                    <Switch
                      id="new_event"
                      checked={preferences.new_event}
                      onCheckedChange={(checked) => updatePreference("new_event", checked)}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Clubs</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="club_reminder" className="text-white cursor-pointer">
                        Rappel de séance
                      </Label>
                      <p className="text-sm text-zinc-500">La veille de chaque séance</p>
                    </div>
                    <Switch
                      id="club_reminder"
                      checked={preferences.club_reminder}
                      onCheckedChange={(checked) => updatePreference("club_reminder", checked)}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Autres</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="loyalty_points" className="text-white cursor-pointer">
                        Points de fidélité
                      </Label>
                      <p className="text-sm text-zinc-500">Gagner ou utiliser des points</p>
                    </div>
                    <Switch
                      id="loyalty_points"
                      checked={preferences.loyalty_points}
                      onCheckedChange={(checked) => updatePreference("loyalty_points", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="ambassador_update" className="text-white cursor-pointer">
                        Mises à jour ambassadeur
                      </Label>
                      <p className="text-sm text-zinc-500">Si vous êtes ambassadeur</p>
                    </div>
                    <Switch
                      id="ambassador_update"
                      checked={preferences.ambassador_update}
                      onCheckedChange={(checked) => updatePreference("ambassador_update", checked)}
                    />
                  </div>
                </div>
              </div>

              {isSaved && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <p className="text-green-400 text-sm">Préférences enregistrées avec succès</p>
                </div>
              )}

              <Button
                onClick={handleSave}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
              >
                {isLoading ? "Enregistrement..." : "Enregistrer les préférences"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
