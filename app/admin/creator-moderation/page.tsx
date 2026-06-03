/**
 * Wave 2.3 — Admin creator moderation queue.
 *
 * Lists pending feed_post submissions and exposes approve / reject / feature.
 * Approve = flip status='published'; Reject = status='rejected'; Feature =
 * call feature_submission RPC (atomic +500 XP +200 coins +audit log).
 */
import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import ModerationActions from "./moderation-actions"
import { StatCard } from "@/components/admin/stat-card"
import { NivEmpty } from "@/components/brand"

export const dynamic = "force-dynamic"

type QueueRow = {
  id: string
  content_id: string
  status: string
  created_at: string
  payload: Record<string, unknown> | null
  post: {
    id: string
    user_id: string
    type: string | null
    category: string | null
    content: string | null
    media_urls: string[] | null
    metadata: { title?: string } | null
    status: string | null
    featured: boolean | null
  } | null
}

export default async function CreatorModerationPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const sr = createServiceRoleClient()

  // admin gate
  const { data: role } = await sr
    .from("admin_roles")
    .select("role")
    .eq("profile_id", user.id)
    .maybeSingle()

  if (!role) {
    return (
      <div className="container mx-auto max-w-xl px-4 py-6">
        <h1 className="mb-2 text-2xl font-semibold">Modération — Créateurs</h1>
        <p className="text-destructive">Accès refusé. Rôle admin requis.</p>
      </div>
    )
  }

  const { data: queue } = await sr
    .from("moderation_queue")
    .select("id, content_id, status, created_at, payload")
    .eq("content_type", "feed_post")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(50)

  const ids = (queue ?? []).map((q) => q.content_id)
  const { data: posts } = ids.length
    ? await sr
        .from("feed_posts")
        .select("id,user_id,type,category,content,media_urls,metadata,status,featured")
        .in("id", ids)
    : { data: [] as QueueRow["post"][] }

  const byId = new Map<string, QueueRow["post"]>()
  for (const p of posts ?? []) byId.set((p as { id: string }).id, p as QueueRow["post"])

  const rows: QueueRow[] = (queue ?? []).map((q) => ({ ...q, post: byId.get(q.content_id) ?? null }))

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <header className="mb-8">
        <p className="eyebrow tracking-[0.16em]">Créateurs · Modération</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink md:text-5xl">
          File des <em className="font-semibold italic text-pink">créateurs</em>
        </h1>
        <p className="mt-2 text-sm text-mute">
          Validez les contributions des créateurs avant publication dans le feed.
        </p>
      </header>

      <section className="mb-8">
        <StatCard label="En attente" value={rows.length} tone="gold" />
      </section>

      {rows.length === 0 ? (
        <NivEmpty
          mood="proud"
          title="La file est clean"
          description="Le crew assure — aucune contribution en attente de modération."
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-col rounded-2xl border-2 border-ink bg-white p-4 text-ink shadow-stkr-md">
              <div className="mb-2 flex items-center gap-2 text-xs text-mute">
                <span className="rounded-md border-2 border-ink bg-paper px-2 py-0.5 font-mono uppercase tracking-[0.16em]">
                  {r.post?.type ?? "?"}
                </span>
                {r.post?.category && (
                  <span className="rounded-md border-2 border-ink bg-teal/20 px-2 py-0.5 font-mono uppercase tracking-[0.12em] text-ink">
                    {r.post.category}
                  </span>
                )}
                <span className="ml-auto">{new Date(r.created_at).toLocaleString("fr-FR")}</span>
              </div>
              {r.post?.metadata?.title && (
                <h2 className="mb-1 font-medium">{r.post.metadata.title}</h2>
              )}
              {r.post?.content && (
                <p className="text-sm text-ink whitespace-pre-wrap">{r.post.content}</p>
              )}
              {r.post?.media_urls && r.post.media_urls[0] && (
                <div className="mt-2 overflow-hidden rounded-xl border-2 border-ink shadow-stkr-sm">
                  <img
                    src={r.post.media_urls[0]}
                    alt=""
                    className="max-h-48 w-full object-cover"
                  />
                </div>
              )}
              <div className="mt-3 flex items-center gap-2 text-xs text-mute">
                <Link href={`/teen/feed/${r.content_id}`} className="text-teal hover:underline">
                  Voir le post →
                </Link>
                <span className="ml-auto rounded-md border-2 border-ink bg-paper px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-2">
                  Créateur {r.post?.user_id.slice(0, 8)}
                </span>
              </div>
              <ModerationActions queueId={r.id} submissionId={r.content_id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
