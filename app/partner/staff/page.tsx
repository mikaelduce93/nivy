import type { Metadata } from "next"
import { Niv } from "@/components/brand/niv"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { UserPlus, Shield } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"

export const metadata: Metadata = { title: "Mon équipe" }

const ROLE_LABEL: Record<string, string> = { owner: "Propriétaire", manager: "Manager", staff: "Staff", coach: "Coach", teacher: "Prof" }

// Refonte V1.5 (#100) — gestion du staff partenaire (owner/staff/coach/teacher).
// Lit partner_staff ; invitation via /api/partner/staff/invite (à venir).
export default async function PartnerStaffPage() {
  let staff: { id: string; display_name?: string; role?: string; is_active?: boolean }[] = []
  try {
    const supabase = await createClient()
    const info = await getUserRole()
    const partnerId = (info as any)?.partnerData?.id
    if (partnerId) {
      const { data } = await supabase
        .from("partner_staff")
        .select("id, display_name, role, is_active")
        .eq("partner_id", partnerId)
      staff = data ?? []
    }
  } catch {
    staff = []
  }

  return (
    <div className="space-y-8 pt-6">
      <header className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="eyebrow">Équipe</p>
          <h1 className="text-4xl font-extrabold tracking-tight">Mon <span className="text-pink italic">staff</span></h1>
        </div>
        <Button variant="pink"><UserPlus className="w-4 h-4 mr-2" />Inviter</Button>
      </header>

      {staff.length > 0 ? (
        <div className="space-y-2">
          {staff.map((s) => (
            <Card key={s.id} padding="sm" className="px-5 flex-row items-center justify-between">
              <span className="flex items-center gap-3 font-bold text-ink">
                <span className="w-9 h-9 rounded-xl border-2 border-ink bg-accent-soft grid place-items-center"><Shield className="w-4 h-4 text-ink" /></span>
                {s.display_name || "Membre"}
              </span>
              <span className="flex items-center gap-2">
                <Badge variant="outline">{ROLE_LABEL[s.role || "staff"] || s.role}</Badge>
                <Badge variant={s.is_active ? "success" : "secondary"}>{s.is_active ? "Actif" : "Inactif"}</Badge>
              </span>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="items-center text-center py-16">
          <Niv size={88} mood="happy" />
          <h3 className="text-xl font-black text-ink mt-4 mb-2">Invite ton équipe</h3>
          <p className="text-mute max-w-sm mb-6">Ajoute des managers, coachs ou profs à ton espace partenaire.</p>
          <Button variant="pink"><UserPlus className="w-4 h-4 mr-2" />Inviter un membre</Button>
        </Card>
      )}
    </div>
  )
}
