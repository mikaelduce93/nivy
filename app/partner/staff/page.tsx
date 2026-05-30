import type { Metadata } from "next"
import Link from "next/link"
import { NivEmpty } from "@/components/brand"
import { StickerCard } from "@/components/ui/sticker-card"
import { Button } from "@/components/ui/button"
import { CheckRound } from "@/components/ui/check-round"
import { UserPlus, Shield, ArrowRight } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"

export const metadata: Metadata = { title: "Mon équipe" }

const ROLE_LABEL: Record<string, string> = { owner: "Propriétaire", manager: "Manager", staff: "Staff", coach: "Coach", teacher: "Prof" }
const XP_ROLES = new Set(["coach", "teacher"])

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

  const activeCount = staff.filter((s) => s.is_active).length

  return (
    <div className="space-y-8 pt-6">
      <header className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="eyebrow">Équipe</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">
            Mon <em className="font-semibold italic text-pink">staff</em>
          </h1>
          {staff.length > 0 && (
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-mute">
              {staff.length} membre{staff.length > 1 ? "s" : ""} · {activeCount} actif{activeCount > 1 ? "s" : ""}
            </p>
          )}
        </div>
        {/* Invitation non câblée (API à venir) — un seul CTA, marqué « bientôt ». */}
        <Button variant="outline" disabled title="Invitation bientôt disponible">
          <UserPlus className="mr-2 h-4 w-4" />
          Inviter
          <span className="ml-2 rounded-full border-2 border-ink bg-paper-2 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-mute">
            bientôt
          </span>
        </Button>
      </header>

      {staff.length > 0 ? (
        <div className="space-y-3">
          {staff.map((s) => {
            const isXp = XP_ROLES.has(s.role || "")
            return (
              <StickerCard key={s.id} className="gap-3 p-5">
                <div className="flex items-center justify-between gap-4">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 border-ink bg-paper-2">
                      <Shield className="h-4 w-4 text-ink" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-sm font-bold text-ink">
                        {s.display_name || "Membre"}
                      </span>
                      <span className="mt-1 inline-flex items-center rounded-full border-2 border-ink bg-white px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink">
                        {ROLE_LABEL[s.role || "staff"] || s.role}
                      </span>
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    {s.is_active ? (
                      <span className="flex items-center gap-1.5">
                        <CheckRound checked disabled aria-label="Actif" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-mute">Actif</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border-2 border-line px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-mute">
                        Inactif
                      </span>
                    )}
                  </span>
                </div>
                {/* Rôles habilités XP — lien direct vers l'attribution. */}
                {isXp && (
                  <Button asChild variant="ghost" size="sm" className="-mx-2 self-start text-pink">
                    <Link href="/partner/awards">
                      Attribuer de l'XP
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </StickerCard>
            )
          })}
        </div>
      ) : (
        <NivEmpty
          mood="happy"
          title="Invite ton équipe"
          description="Ajoute des managers, coachs ou profs à ton espace partenaire."
        />
      )}
    </div>
  )
}
