/**
 * Wave 2A — Creator feed (discover) with canonical cursor pagination.
 *
 * Server-rendered first page (20 posts, no waterfall) via
 * RPC get_feed_cursor_page. Client-side load-more uses
 * /api/teen/feed?cursor=…&limit=20.
 *
 * Each card carries `user_liked / user_saved / user_reported` joined server-side.
 */
import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { H1 } from "@/components/ui/headings"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/states/empty-state"
import { PullToRefresh } from "@/components/teen/pull-to-refresh"
import { FeedList, type FeedRow } from "./feed-list"

export const dynamic = "force-dynamic"

const CANONICAL_PAGE_SIZE = 20

function encodeCursor(c: { f: boolean; t: string; i: string }): string {
  return Buffer.from(JSON.stringify(c), "utf-8").toString("base64")
}

export default async function TeenFeedPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data, error } = await supabase.rpc("get_feed_cursor_page", {
    p_user_id: user.id,
    p_limit: CANONICAL_PAGE_SIZE,
    p_cursor_featured: null,
    p_cursor_created_at: null,
    p_cursor_id: null,
  })

  const rawPosts = (error ? [] : (data ?? [])) as FeedRow[]
  const posts: FeedRow[] = rawPosts
  const initialNextCursor =
    posts.length === CANONICAL_PAGE_SIZE
      ? encodeCursor({
          f: posts[posts.length - 1].featured ?? false,
          t: posts[posts.length - 1].created_at,
          i: posts[posts.length - 1].id,
        })
      : null

  return (
    <PullToRefresh>
      <div className="container mx-auto max-w-2xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <H1 className="text-4xl font-black tracking-tighter uppercase italic leading-none">
            Feed Créateurs
          </H1>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/teen/leaderboard">Classement</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/teen/create">+ Créer</Link>
            </Button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            Erreur de chargement: {error.message}
          </div>
        )}

        {posts.length === 0 ? (
          <EmptyState
            preset="feed"
            size="default"
            title="Aucun post pour l'instant"
            description="Sois le premier à publier !"
            action={{ label: "Créer un post", href: "/teen/create" }}
          />
        ) : (
          <FeedList
            posts={posts}
            initialNextCursor={initialNextCursor}
            currentUserId={user.id}
          />
        )}
      </div>
    </PullToRefresh>
  )
}
