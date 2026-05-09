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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldAlert } from "lucide-react"
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
      <div className="space-y-6 max-w-3xl">
        <h1 className="text-3xl font-black text-white">Paramètres</h1>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-10 text-center">
            <ShieldAlert className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <p className="text-zinc-300 font-semibold">Profil partenaire introuvable</p>
            <p className="text-sm text-zinc-500 mt-2">
              Termine ton inscription puis attends l&apos;activation admin.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-3xl font-black text-white">Paramètres</h1>
        <p className="text-zinc-400">Mets à jour les infos publiques de ton compte partenaire.</p>
      </header>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white text-base">Champs verrouillés</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-zinc-300 space-y-1">
          <p>
            <span className="text-zinc-500">Email :</span> {partner.email}
          </p>
          <p>
            <span className="text-zinc-500">Type :</span> {partner.partner_type}
          </p>
          <p>
            <span className="text-zinc-500">Statut :</span> {partner.status}
          </p>
          <p className="text-xs text-zinc-500 mt-2">
            Pour modifier ces champs, contacte l&apos;équipe Nivy. Ils ne sont pas modifiables
            depuis cet écran (canon §6 partner-side mass-assignment guard).
          </p>
        </CardContent>
      </Card>

      <PartnerSettingsForm partner={partner as PartnerSettings} />
    </div>
  )
}
