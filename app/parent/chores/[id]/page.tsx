import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { SegmentedProgress } from "@/components/ui/progress"
import { Niv } from "@/components/brand"
import { ArrowLeft, Coins, Sparkles, Clock, CheckCircle, XCircle, ImageOff } from "lucide-react"
import Link from "next/link"
import { ChoreVerifyButtons } from "@/components/parent/chore-verify-buttons"

interface Completion {
  id: string
  chore_id: string
  teen_id: string
  completed_at: string
  evidence_url: string | null
  parent_verified: boolean | null
  verified_at: string | null
  rejection_reason: string | null
  paid_at: string | null
  payout_payment_id: string | null
  payout_xp: number | null
}

const RECURRENCE_LABELS: Record<string, string> = {
  one_shot: "Une fois",
  daily: "Quotidienne",
  weekly: "Hebdomadaire",
  monthly: "Mensuelle",
  custom_days: "Jours perso",
}

const recurrenceLabel = (r: string) => RECURRENCE_LABELS[r] ?? r

/** TTL for signed-read URLs surfaced in the parent UI (TICKET-014). */
const EVIDENCE_SIGNED_URL_TTL_SECONDS = 15 * 60 // 15 min

export default async function ChoreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "parent") {
    redirect("/auth/redirect")
  }
  const supabase = await createClient()

  const { data: chore } = await supabase
    .from("parent_chores")
    .select("*")
    .eq("id", id)
    .eq("parent_id", userInfo.profileId)
    .maybeSingle()

  if (!chore) notFound()

  const { data: completions } = await supabase
    .from("parent_chore_completions")
    .select("*")
    .eq("chore_id", id)
    .order("completed_at", { ascending: false })

  const list = (completions ?? []) as Completion[]
  const pending = list.filter((c) => !c.parent_verified && !c.rejection_reason)
  const verified = list.filter((c) => c.parent_verified)
  const rejected = list.filter((c) => !c.parent_verified && c.rejection_reason)
  const verifiedCount = verified.length

  // ---- TICKET-014: re-sign each evidence path server-side ---------------
  // `evidence_url` stores a bucket-relative path inside the PRIVATE
  // `chore-evidence` bucket. We surface the photo to the parent via a
  // short-TTL signed URL (15 min) so the link auto-expires if shared.
  // Any failure is non-fatal — the UI falls back to a "preuve indisponible"
  // placeholder rather than blocking the verification flow.
  const evidenceSignedUrls = new Map<string, string>()
  const pathsToSign = Array.from(
    new Set(
      list
        .map((c) => c.evidence_url)
        .filter((p): p is string => typeof p === "string" && p.length > 0)
    )
  )
  if (pathsToSign.length > 0) {
    const { data: signed } = await supabase.storage
      .from("chore-evidence")
      .createSignedUrls(pathsToSign, EVIDENCE_SIGNED_URL_TTL_SECONDS)
    if (Array.isArray(signed)) {
      for (const row of signed) {
        if (row?.path && row.signedUrl && !row.error) {
          evidenceSignedUrls.set(row.path, row.signedUrl)
        }
      }
    }
  }

  const formatDate = (s: string | null) =>
    s
      ? new Date(s).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—"

  return (
    <div className="min-h-screen bg-paper">
      <div className="container mx-auto px-6 py-32 max-w-4xl">
        <Button variant="ghost" asChild className="mb-6 text-mute hover:text-ink">
          <Link href="/parent/chores">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Link>
        </Button>

        <div className="mb-8">
          <p className="eyebrow text-pink">Corvée</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink">
            {chore.title}
          </h1>
        </div>

        <StickerCard className="mb-8 p-6">
          <div className="space-y-4">
            {chore.description && (
              <p className="text-ink-2">{chore.description}</p>
            )}
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 rounded-md border-2 border-ink text-coral font-mono flex items-center gap-1">
                <Coins className="h-3 w-3" /> ⊙ {chore.reward_dh} DH
              </span>
              <span className="px-2 py-1 rounded-md border-2 border-ink text-gold font-mono flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> {chore.reward_xp} XP
              </span>
              <span className="px-2 py-1 rounded-md border-2 border-ink text-ink font-mono uppercase tracking-wide">
                {recurrenceLabel(chore.recurrence)}
              </span>
              {!chore.is_active && (
                <span className="px-2 py-1 rounded-md border-2 border-ink text-mute font-mono uppercase tracking-wide">
                  Archivée
                </span>
              )}
              {chore.evidence_required && (
                <span className="px-2 py-1 rounded-md border-2 border-ink text-gold font-mono uppercase tracking-wide">
                  Preuve photo requise
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-mute uppercase tracking-wide">Validations</span>
                <span className="text-ink">{verifiedCount}/{chore.required_completions}</span>
              </div>
              <SegmentedProgress steps={chore.required_completions} current={verifiedCount} />
            </div>
          </div>
        </StickerCard>

        <CompletionSection
          title="En attente de vérification"
          icon={<Clock className="h-5 w-5 text-gold" />}
          items={pending}
          emptyText="Aucune complétion en attente."
          formatDate={formatDate}
          evidenceSignedUrls={evidenceSignedUrls}
          showActions
          choreId={chore.id}
        />

        <CompletionSection
          title="Validées"
          icon={<CheckCircle className="h-5 w-5 text-lime" />}
          items={verified}
          emptyText="Aucune complétion validée."
          formatDate={formatDate}
          evidenceSignedUrls={evidenceSignedUrls}
          niv={
            verified.length > 0 ? (
              <div className="flex items-center gap-3 rounded-xl border-2 border-ink bg-lime/10 p-3">
                <Niv mood="proud" size={48} className="shrink-0" />
                <p className="text-sm text-ink-2">
                  Bien joué — chaque validation motive ton ado à continuer.
                </p>
              </div>
            ) : undefined
          }
        />

        <CompletionSection
          title="Refusées"
          icon={<XCircle className="h-5 w-5 text-destructive" />}
          items={rejected}
          emptyText="Aucun refus."
          formatDate={formatDate}
          evidenceSignedUrls={evidenceSignedUrls}
        />
      </div>
    </div>
  )
}

function CompletionSection({
  title,
  icon,
  items,
  emptyText,
  formatDate,
  evidenceSignedUrls,
  showActions,
  choreId,
  niv,
}: {
  title: string
  icon: React.ReactNode
  items: Completion[]
  emptyText: string
  formatDate: (s: string | null) => string
  /** Map of evidence_url (path) → 15-min signed-read URL (TICKET-014). */
  evidenceSignedUrls: Map<string, string>
  showActions?: boolean
  choreId?: string
  niv?: React.ReactNode
}) {
  return (
    <StickerCard className="mb-6 p-6">
      <h2 className="font-display text-lg font-extrabold text-ink flex items-center gap-2">
        {icon}
        {title}
        <span className="text-sm font-normal text-mute">({items.length})</span>
      </h2>
      <div className="mt-4">
        {niv}
        {items.length === 0 ? (
          <p className="text-sm text-mute">{emptyText}</p>
        ) : (
          <div className={`space-y-3 ${niv ? "mt-3" : ""}`}>
            {items.map((c) => {
              const signedUrl = c.evidence_url
                ? evidenceSignedUrls.get(c.evidence_url) ?? null
                : null
              const isVideo =
                typeof c.evidence_url === "string" &&
                /\.(mp4|webm|mov)$/i.test(c.evidence_url)
              return (
                <div
                  key={c.id}
                  className="p-3 rounded-xl border-2 border-ink bg-white"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-ink-2">
                        Complétion · {formatDate(c.completed_at)}
                      </p>
                      {c.evidence_url && (
                        <div className="mt-2">
                          {signedUrl ? (
                            isVideo ? (
                              <video
                                src={signedUrl}
                                controls
                                preload="metadata"
                                className="max-w-xs max-h-64 rounded-xl border-2 border-ink"
                              >
                                <track kind="captions" />
                              </video>
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <a
                                href={signedUrl}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="inline-block"
                              >
                                <img
                                  src={signedUrl}
                                  alt="Preuve de la corvée"
                                  className="max-w-xs max-h-64 rounded-xl border-2 border-ink object-cover"
                                />
                              </a>
                            )
                          ) : (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-ink text-xs text-mute">
                              <ImageOff className="h-4 w-4" />
                              <span>Preuve indisponible (lien expiré ou supprimé).</span>
                            </div>
                          )}
                          <p className="mt-1 text-[10px] text-mute">
                            Lien privé — expire dans 15 min.
                          </p>
                        </div>
                      )}
                      {c.rejection_reason && (
                        <p className="text-xs text-destructive mt-2">
                          Motif refus: {c.rejection_reason}
                        </p>
                      )}
                      {c.paid_at && (
                        <p className="text-xs text-lime mt-2 font-mono">
                          Récompense versée le {formatDate(c.paid_at)}
                        </p>
                      )}
                    </div>
                    {showActions && choreId && (
                      <ChoreVerifyButtons choreId={choreId} completionId={c.id} />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </StickerCard>
  )
}
