/**
 * Wave 2.3 — Submission detail with engagement actions.
 */
import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import EngageButtons from "./engage-buttons"

export const dynamic = "force-dynamic"

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: post } = await supabase
    .from("feed_posts")
    .select(
      "id,user_id,type,category,content,media_urls,metadata,visibility,status,featured,xp_earned,likes_count,comments_count,shares_count,created_at"
    )
    .eq("id", id)
    .maybeSingle()

  if (!post) notFound()

  const title = (post.metadata as { title?: string } | null)?.title
  const media = Array.isArray(post.media_urls) ? post.media_urls[0] : null

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
          {post.featured && (
            <span className="rounded bg-yellow-100 px-2 py-0.5 text-yellow-800">★ Featured</span>
          )}
          {post.type && (
            <span className="rounded bg-gray-100 px-2 py-0.5 capitalize">{post.type}</span>
          )}
          {post.category && (
            <span className="rounded bg-blue-50 px-2 py-0.5 text-blue-700">{post.category}</span>
          )}
          <span>· {post.status}</span>
        </div>
        {title && <h1 className="mb-2 text-2xl font-semibold">{title}</h1>}
        {post.content && <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>}
        {media && (
          <img src={media} alt={title ?? ""} className="mt-4 w-full rounded object-cover" />
        )}
        <div className="mt-4 flex gap-4 text-sm text-gray-600">
          <span>♥ {post.likes_count ?? 0}</span>
          <span>💬 {post.comments_count ?? 0}</span>
          <span>↗ {post.shares_count ?? 0}</span>
          <span className="ml-auto text-xs text-gray-400">XP: {post.xp_earned ?? 0}</span>
        </div>
        {post.user_id !== user.id && (
          <div className="mt-4 border-t pt-4">
            <EngageButtons submissionId={post.id} />
          </div>
        )}
      </div>
    </div>
  )
}
