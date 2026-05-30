import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivCoach, NivEmpty } from "@/components/brand"
import Link from "next/link"
import { ArrowLeft, Plus, CalendarDays } from "lucide-react"
import { AllowanceRowActions } from "@/components/parent/allowance-row-actions"

export const dynamic = "force-dynamic"

interface AllowanceRow {
  id: string
  teen_id: string
  amount_dh: number
  cadence: string
  is_active: boolean
  paused_until: string | null
  next_disbursement_at: string
  conditional: boolean
}

const CADENCE_LABELS: Record<string, string> = {
  weekly: "Hebdomadaire",
  biweekly: "Bimensuelle",
  monthly: "Mensuelle",
}

const cadenceLabel = (c: string) => CADENCE_LABELS[c] ?? c

export default async function ParentAllowancesPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "parent") redirect("/login")

  const supabase = await createClient()

  // Polish-F: surface RLS / network failures rather than masking them as
  // "Aucune allowance configurée".
  let allowances: AllowanceRow[] = []
  let teens: Array<{ teen_id: string; profiles?: { full_name?: string } | null }> = []
  let loadError: string | null = null
  try {
    const [rowsRes, teensRes] = await Promise.all([
      supabase
        .from("parent_allowances")
        .select("*")
        .eq("parent_id", userInfo.profileId)
        .order("created_at", { ascending: false }),
      supabase
        .from("parent_teen_links")
        .select("teen_id, profiles:teen_id (full_name)")
        .eq("parent_id", userInfo.profileId),
    ])
    if (rowsRes.error) {
      console.error("[parent/allowances] parent_allowances error:", rowsRes.error)
      loadError = "Impossible de charger les allowances pour le moment."
    } else {
      allowances = (rowsRes.data ?? []) as AllowanceRow[]
    }
    if (teensRes.error) {
      console.error("[parent/allowances] parent_teen_links error:", teensRes.error)
    } else {
      teens = (teensRes.data ?? []) as typeof teens
    }
  } catch (err) {
    console.error("[parent/allowances] queries threw:", err)
    loadError = "Impossible de charger les allowances pour le moment."
  }

  const teenName = (id: string): string => {
    const row = teens.find((t) => t.teen_id === id)
    return row?.profiles?.full_name ?? id.slice(0, 8)
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="container mx-auto px-6 py-32">
        <Button variant="ghost" asChild className="mb-6 text-mute hover:text-ink">
          <Link href="/parent">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="eyebrow text-pink">Argent de poche</p>
            <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink">
              Allowance <em className="font-semibold italic text-pink">auto</em>
            </h1>
            <p className="mt-2 text-mute">
              Programme un top-up récurrent pour ton ado.
            </p>
          </div>
          <Button asChild>
            <Link href="/parent/allowances/new">
              <Plus className="w-4 h-4 mr-2" /> Nouvelle allowance
            </Link>
          </Button>
        </div>

        {loadError && (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {loadError}
          </div>
        )}

        <NivCoach
          mood="hype"
          className="mb-8"
          message="Programme une fois — je verse l'argent de poche tout seul, à la bonne date."
        />

        {allowances.length === 0 ? (
          <NivEmpty
            mood="calm"
            title="Aucune allowance configurée"
            description="Crée la première pour automatiser l'argent de poche de ton ado."
            action={
              <Button asChild>
                <Link href="/parent/allowances/new">
                  <Plus className="w-4 h-4 mr-2" /> Nouvelle allowance
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {allowances.map((a) => {
              const isPaused =
                a.paused_until && new Date(a.paused_until) > new Date()
              return (
                <StickerCard key={a.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-lg font-extrabold text-ink">
                      {teenName(a.teen_id)}
                    </h3>
                    {a.is_active && !isPaused ? (
                      <span className="px-2 py-1 rounded-md border-2 border-ink text-lime font-mono text-[11px] uppercase tracking-wide">
                        Actif
                      </span>
                    ) : isPaused ? (
                      <span className="px-2 py-1 rounded-md border-2 border-ink text-gold font-mono text-[11px] uppercase tracking-wide">
                        Pause
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-md border-2 border-ink text-mute font-mono text-[11px] uppercase tracking-wide">
                        Inactif
                      </span>
                    )}
                  </div>
                  <div className="mt-3 space-y-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-1 rounded-md border-2 border-ink text-coral font-mono text-xs">
                        ⊙ {a.amount_dh} DH
                      </span>
                      <span className="px-2 py-1 rounded-md border-2 border-ink text-ink font-mono text-xs uppercase tracking-wide">
                        {cadenceLabel(a.cadence)}
                      </span>
                      {a.conditional ? (
                        <span className="px-2 py-1 rounded-md border-2 border-ink text-gold font-mono text-xs uppercase tracking-wide">
                          Conditionnel
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 text-mute">
                      <CalendarDays className="w-4 h-4" />
                      <span className="font-mono text-xs">
                        Prochain : {new Date(a.next_disbursement_at).toLocaleString("fr-MA")}
                      </span>
                    </div>
                    <AllowanceRowActions allowanceId={a.id} isPaused={!!isPaused} />
                  </div>
                </StickerCard>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
