import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Coins, Sparkles, Clock, CheckCircle, XCircle } from "lucide-react"
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
          showActions
          choreId={chore.id}
        />

        <CompletionSection
          title="Validées"
          icon={<CheckCircle className="h-5 w-5 text-emerald-400" />}
          items={verified}
          emptyText="Aucune complétion validée."
          formatDate={formatDate}
        />

        <CompletionSection
          title="Refusées"
          icon={<XCircle className="h-5 w-5 text-red-400" />}
          items={rejected}
          emptyText="Aucun refus."
          formatDate={formatDate}
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
  showActions,
  choreId,
}: {
  title: string
  icon: React.ReactNode
  items: Completion[]
  emptyText: string
  formatDate: (s: string | null) => string
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
            {items.map((c) => (
              <div
                key={c.id}
                className="p-3 rounded-lg bg-zinc-800 border border-zinc-700"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <p className="text-sm text-zinc-200">
                      Complétion · {formatDate(c.completed_at)}
                    </p>
                    {c.evidence_url && (
                      <p className="text-xs text-zinc-500 mt-1">
                        Preuve: {c.evidence_url}
                      </p>
                    )}
                    {c.rejection_reason && (
                      <p className="text-xs text-red-400 mt-1">
                        Motif refus: {c.rejection_reason}
                      </p>
                    )}
                    {c.paid_at && (
                      <p className="text-xs text-emerald-400 mt-1">
                        Récompense versée le {formatDate(c.paid_at)}
                      </p>
                    )}
                  </div>
                  {showActions && choreId && (
                    <ChoreVerifyButtons choreId={choreId} completionId={c.id} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
