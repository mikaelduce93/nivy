import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { CalendarDays } from "lucide-react"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivCoach, NivEmpty, StatHero } from "@/components/brand"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

/** Libellés + couleur de pastille mono pour les statuts de versement. */
const DISBURSEMENT_STATUS: Record<string, { label: string; className: string }> = {
  succeeded: { label: "Versé", className: "bg-lime text-on-bright" },
  pending: { label: "En attente", className: "bg-gold text-ink" },
  failed: { label: "Échoué", className: "bg-coral text-ink" },
  skipped: { label: "Sauté", className: "bg-ink text-paper" },
}

export default async function TeenAllowancePage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") redirect("/login")

  const supabase = await createClient()

  const { data: allowances } = await supabase
    .from("parent_allowances")
    .select("*")
    .eq("teen_id", userInfo.profileId)
    .eq("is_active", true)
    .order("next_disbursement_at", { ascending: true })

  const { data: history } = await supabase
    .from("allowance_disbursements")
    .select("*, parent_allowances!inner(teen_id)")
    .eq("parent_allowances.teen_id", userInfo.profileId)
    .order("created_at", { ascending: false })
    .limit(10)

  const next = allowances?.[0]
  const nextDate = next ? new Date(next.next_disbursement_at) : null
  const daysUntil = nextDate
    ? Math.max(0, Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-8 space-y-8">
      <header className="space-y-1">
        <span className="eyebrow tracking-[0.16em] text-mute">Argent de poche</span>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
          Ton <em className="font-semibold italic text-pink">allowance</em>
        </h1>
        <p className="text-sm text-mute">Tes versements automatiques de coins, suivis ici.</p>
      </header>

      {next ? (
        <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
          <StatHero
            eyebrow="Prochaine allowance"
            tone="coral"
            size="lg"
            value={Math.round(Number(next.amount_dh) * 100).toLocaleString()}
            unit="⊙ coins"
            icon={<CalendarDays className="w-5 h-5" />}
            meta={
              <span className="font-mono tabular-nums">
                {next.amount_dh} DH ·{" "}
                {nextDate?.toLocaleDateString("fr-MA", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
                {daysUntil !== null
                  ? ` (dans ${daysUntil} jour${daysUntil > 1 ? "s" : ""})`
                  : ""}
              </span>
            }
          />
          <NivCoach
            mood="proud"
            message="Ton argent de poche arrive ! Pense à mettre une partie de côté."
          />
        </div>
      ) : (
        <NivEmpty
          mood="calm"
          title="Aucune allowance active"
          description="Demande à ton parent d'en configurer une depuis son espace pour recevoir tes coins automatiquement."
        />
      )}

      <section className="space-y-4">
        <span className="eyebrow tracking-[0.16em] text-mute">Historique</span>
        {(history ?? []).length === 0 ? (
          <NivEmpty
            mood="calm"
            title="Pas encore de versement"
            description="Tes versements d'argent de poche apparaîtront ici dès le premier."
          />
        ) : (
          <div className="space-y-3">
            {(history ?? []).map((h) => {
              const status = DISBURSEMENT_STATUS[h.status] ?? {
                label: h.status,
                className: "bg-ink text-paper",
              }
              return (
                <StickerCard key={h.id} variant="panel" className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-display font-bold tabular-nums text-ink">
                        {Math.round(Number(h.amount_dh) * 100).toLocaleString()}{" "}
                        <span className="text-coral">⊙</span>
                      </p>
                      <p className="font-mono text-xs tabular-nums text-mute">
                        {new Date(h.scheduled_at).toLocaleDateString("fr-MA")} · {h.amount_dh} DH
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full border-2 border-ink px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.12em]",
                        status.className,
                      )}
                    >
                      {status.label}
                    </span>
                  </div>
                </StickerCard>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
