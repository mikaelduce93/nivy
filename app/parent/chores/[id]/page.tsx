import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32 max-w-4xl">
        <Button variant="ghost" asChild className="mb-6 text-zinc-400 hover:text-white">
          <Link href="/parent/chores">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Link>
        </Button>

        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 mb-8">
          <CardHeader>
            <CardTitle className="text-white text-2xl">{chore.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {chore.description && (
              <p className="text-zinc-300">{chore.description}</p>
            )}
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 flex items-center gap-1">
                <Coins className="h-3 w-3" /> {chore.reward_dh} DH
              </span>
              <span className="px-2 py-1 rounded bg-purple-500/10 text-purple-400 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> {chore.reward_xp} XP
              </span>
              <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-300">
                {chore.recurrence}
              </span>
              <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-300">
                {verifiedCount}/{chore.required_completions} validées
              </span>
              {!chore.is_active && (
                <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-400">
                  Archivée
                </span>
              )}
              {chore.evidence_required && (
                <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-400">
                  Preuve photo requise
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <CompletionSection
          title="En attente de vérification"
          icon={<Clock className="h-5 w-5 text-amber-400" />}
          items={pending}
          emptyText="Aucune complétion en attente."
          formatDate={formatDate}
          evidenceSignedUrls={evidenceSignedUrls}
          showActions
          choreId={chore.id}
        />

        <CompletionSection
          title="Validées"
          icon={<CheckCircle className="h-5 w-5 text-emerald-400" />}
          items={verified}
          emptyText="Aucune complétion validée."
          formatDate={formatDate}
          evidenceSignedUrls={evidenceSignedUrls}
        />

        <CompletionSection
          title="Refusées"
          icon={<XCircle className="h-5 w-5 text-red-400" />}
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
}) {
  return (
    <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 mb-6">
      <CardHeader>
        <CardTitle className="text-white text-lg flex items-center gap-2">
          {icon}
          {title}
          <span className="text-sm font-normal text-zinc-500">({items.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-zinc-500">{emptyText}</p>
        ) : (
          <div className="space-y-3">
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
                  className="p-3 rounded-lg bg-zinc-800 border border-zinc-700"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200">
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
                                className="max-w-xs max-h-64 rounded-lg border border-zinc-700"
                              />
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
                                  alt="Preuve photo de la corvée"
                                  className="max-w-xs max-h-64 rounded-lg border border-zinc-700 object-cover"
                                />
                              </a>
                            )
                          ) : (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-500">
                              <ImageOff className="h-4 w-4" />
                              <span>Preuve indisponible (lien expiré ou supprimé).</span>
                            </div>
                          )}
                          <p className="mt-1 text-[10px] text-zinc-600">
                            Lien privé — expire dans 15 min.
                          </p>
                        </div>
                      )}
                      {c.rejection_reason && (
                        <p className="text-xs text-red-400 mt-2">
                          Motif refus: {c.rejection_reason}
                        </p>
                      )}
                      {c.paid_at && (
                        <p className="text-xs text-emerald-400 mt-2">
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
      </CardContent>
    </Card>
  )
}
