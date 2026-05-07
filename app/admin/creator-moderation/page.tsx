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
        <p className="text-red-600">Accès refusé. Rôle admin requis.</p>
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
      <h1 className="mb-4 text-2xl font-semibold">Modération — Créateurs</h1>
      {rows.length === 0 ? (
        <p className="text-gray-500">Rien dans la file.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded border bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-xs text-gray-500">
                <span className="rounded bg-gray-100 px-2 py-0.5 capitalize">
                  {r.post?.type ?? "?"}
                </span>
                {r.post?.category && (
                  <span className="rounded bg-blue-50 px-2 py-0.5 text-blue-700">
                    {r.post.category}
                  </span>
                )}
                <span className="ml-auto">{new Date(r.created_at).toLocaleString()}</span>
              </div>
              {r.post?.metadata?.title && (
                <h2 className="mb-1 font-medium">{r.post.metadata.title}</h2>
              )}
              {r.post?.content && (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.post.content}</p>
              )}
              {r.post?.media_urls && r.post.media_urls[0] && (
                <img
                  src={r.post.media_urls[0]}
                  alt=""
                  className="mt-2 max-h-48 w-full rounded object-cover"
                />
              )}
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                <Link href={`/teen/feed/${r.content_id}`} className="text-blue-600 hover:underline">
                  Voir le post →
                </Link>
                <span className="ml-auto">creator: {r.post?.user_id.slice(0, 8)}…</span>
              </div>
              <ModerationActions queueId={r.id} submissionId={r.content_id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
