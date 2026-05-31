"use client"

import { useState } from "react"
import { Lock, ShieldCheck } from "lucide-react"
import { StickerCard } from "@/components/ui/sticker-card"
import { CheckRound } from "@/components/ui/check-round"
import { NivCoach } from "@/components/brand"
import { toast } from "sonner"
import { updatePrivacySettings } from "@/gamification-system/features/pillars/actions"

const PRIVACY_TOGGLES: { key: string; label: string }[] = [
  { key: "show_profile_to_other_teens", label: "Profil visible aux autres teens" },
  { key: "show_activity_to_parents", label: "Partager l'activité aux parents" },
  { key: "allow_friend_requests", label: "Demandes d'amis" },
  { key: "show_on_leaderboard", label: "Visible sur le leaderboard" },
]

const PARENTAL_PERMISSIONS: { key: string; label: string }[] = [
  { key: "can_view_activity", label: "Voir l'activité" },
  { key: "can_approve_events", label: "Valider les events" },
  { key: "can_topup_credits", label: "Recharger des crédits" },
  { key: "can_set_spending_limit", label: "Fixer un budget" },
  { key: "can_view_location", label: "Voir la localisation" },
]

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
    <div className="space-y-8">
      {/* Header éditorial */}
      <header className="space-y-4">
        <span className="eyebrow tracking-[0.16em] text-pink">Réglages</span>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
          Mes <em className="font-semibold italic text-pink">réglages</em>
        </h1>
        <NivCoach
          mood="calm"
          message="Gère ta confidentialité et garde un œil sur ce que tes parents peuvent voir."
        />
      </header>

      {/* Confidentialité */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Lock className="size-4 text-ink" aria-hidden="true" />
          <span className="eyebrow tracking-[0.16em]">Confidentialité</span>
        </div>
        <div className="space-y-2">
          {PRIVACY_TOGGLES.map(({ key, label }) => (
            <StickerCard key={key} variant="hover" className="p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-ink">{label}</span>
                <CheckRound
                  checked={settings[key]}
                  onCheckedChange={() => handleToggle(key)}
                  disabled={!!updating}
                  aria-label={label}
                />
              </div>
            </StickerCard>
          ))}
        </div>
      </section>

      {/* Permissions parentales — lecture seule */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-ink" aria-hidden="true" />
          <span className="eyebrow tracking-[0.16em]">Permissions parentales (lecture seule)</span>
        </div>
        <div className="space-y-2">
          {PARENTAL_PERMISSIONS.map(({ key, label }) => {
            const granted = !!permissions[key]
            return (
              <StickerCard key={key} variant="default" className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-ink">{label}</span>
                  <span
                    className={
                      "inline-flex items-center rounded-full border-2 border-ink px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] " +
                      (granted ? "bg-lime text-ink" : "bg-coral text-ink")
                    }
                  >
                    {granted ? "Autorisé" : "Bloqué"}
                  </span>
                </div>
              </StickerCard>
            )
          })}
        </div>
      </section>
    </div>
  )
}
