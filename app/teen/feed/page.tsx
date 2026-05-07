/**
 * Wave 2.3 — Creator feed (discover).
 *
 * Server-rendered paginated by created_at DESC for now. When recommend_for_teen
 * gets a 'feed_post' content_type wired (§19.5), swap the query.
 */
import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

type FeedRow = {
  id: string
  user_id: string
  type: string | null
  category: string | null
  content: string | null
  media_urls: string[] | null
  metadata: { title?: string | null } | null
  visibility: string | null
  status: string | null
  featured: boolean | null
  likes_count: number | null
  comments_count: number | null
  shares_count: number | null
  created_at: string
}

export default async function TeenFeedPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data, error } = await supabase
    .from("feed_posts")
    .select(
      "id,user_id,type,category,content,media_urls,metadata,visibility,status,featured,likes_count,comments_count,shares_count,created_at"
    )
    .eq("status", "published")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(30)

  const posts = (error ? [] : (data ?? [])) as FeedRow[]

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Feed Créateurs</h1>
        <div className="flex gap-2">
          <Link href="/teen/leaderboard" className="text-sm text-blue-600 hover:underline">
            Classement
          </Link>
          <Link
            href="/teen/create"
            className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
          >
            + Créer
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">
          Erreur de chargement: {error.message}
        </div>
      )}

      {posts.length === 0 ? (
        <p className="text-gray-500">Aucun post pour l&apos;instant. Sois le premier !</p>
      ) : (
        <ul className="space-y-4">
          {posts.map((p) => {
            const title = p.metadata?.title ?? null
            const media = Array.isArray(p.media_urls) ? p.media_urls[0] : null
            return (
              <li
                key={p.id}
                className="rounded-lg border bg-white p-4 shadow-sm hover:shadow-md transition"
              >
                <Link href={`/teen/feed/${p.id}`} className="block">
                  <div className="mb-2 flex items-center gap-2 text-xs text-gray-500">
                    {p.featured && (
                      <span className="rounded bg-yellow-100 px-2 py-0.5 text-yellow-800">
                        ★ Featured
                      </span>
                    )}
                    {p.type && (
                      <span className="rounded bg-gray-100 px-2 py-0.5 capitalize">{p.type}</span>
                    )}
                    {p.category && (
                      <span className="rounded bg-blue-50 px-2 py-0.5 text-blue-700">
                        {p.category}
                      </span>
                    )}
                  </div>
                  {title && <h2 className="text-lg font-medium">{title}</h2>}
                  {p.content && <p className="text-sm text-gray-700 line-clamp-3">{p.content}</p>}
                  {media && (
                    <img
                      src={media}
                      alt={title ?? ""}
                      className="mt-3 max-h-64 w-full rounded object-cover"
                    />
                  )}
                  <div className="mt-3 flex gap-4 text-xs text-gray-500">
                    <span>♥ {p.likes_count ?? 0}</span>
                    <span>💬 {p.comments_count ?? 0}</span>
                    <span>↗ {p.shares_count ?? 0}</span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
