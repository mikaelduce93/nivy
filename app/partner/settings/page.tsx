/**
 * Wave 3B.3 — partner self-service settings (canon D2 fix).
 *
 * Server component shell that loads the canonical partners row, then mounts
 * the client form. The form patches /api/partner/settings — partner_type,
 * status, email, KYC status are NEVER editable from this surface (admin
 * path only).
 */
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { NivEmpty } from "@/components/brand"
import { StickerCard } from "@/components/ui/sticker-card"
import { Lock } from "lucide-react"
import { PartnerSettingsForm, type PartnerSettings } from "./partner-settings-form"

export const dynamic = "force-dynamic"

export default async function PartnerSettingsPage() {
  const userInfo = await getUserRole()
  if (!userInfo) redirect("/auth/login")
  if (userInfo.role !== "partner") redirect("/auth/redirect")

  const supabase = await createClient()
  const { data: partner } = await supabase
    .from("partners")
    .select(
      "id, email, partner_type, status, company_name, sub_category, phone, website, description, business_hours, updated_at",
    )
    .eq("email", userInfo.email)
    .maybeSingle()

  if (!partner) {
    return (
      <div className="max-w-3xl space-y-6 pt-6">
        <header className="space-y-2">
          <p className="eyebrow">Réglages</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">
            Tes <em className="font-semibold italic text-pink">réglages</em>
          </h1>
        </header>
        <NivEmpty
          mood="calm"
          title="Profil partenaire introuvable"
          description="Termine ton inscription puis attends l'activation admin."
        />
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6 pt-6">
      <header className="space-y-2">
        <p className="eyebrow">Réglages</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">
          Tes <em className="font-semibold italic text-pink">réglages</em>
        </h1>
        <p className="text-mute">Mets à jour les infos publiques de ton compte partenaire.</p>
      </header>

      <StickerCard className="gap-4 p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-extrabold">
          <Lock className="h-4 w-4 text-mute" aria-hidden="true" />
          Champs verrouillés
        </h2>
        <div className="space-y-2">
          <LockedRow label="Email" value={partner.email} />
          <LockedRow label="Type" value={partner.partner_type} />
          <LockedRow label="Statut" value={partner.status} />
        </div>
        <p className="text-xs text-mute">
          Pour modifier ces champs, contacte l&apos;équipe Nivy. Ils ne sont pas modifiables depuis
          cet écran.
        </p>
      </StickerCard>

      <PartnerSettingsForm partner={partner as PartnerSettings} />
    </div>
  )
}

function LockedRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-mute">{label}</span>
      <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-paper-2 px-3 py-1 font-mono text-xs font-semibold text-ink">
        <Lock className="h-3 w-3 text-mute" aria-hidden="true" />
        {value}
      </span>
    </div>
  )
}
