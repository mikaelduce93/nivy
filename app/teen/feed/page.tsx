/**
 * Wave 2.3 — Creator feed (discover).
 *
 * Server-rendered paginated by created_at DESC for now. When recommend_for_teen
 * gets a 'feed_post' content_type wired (§19.5), swap the query.
 *
 * Wave 2 / TICKET-002 — design-system token sweep:
 *  - Heading routed through <H1> (teen 4xl + italic + uppercase pattern).
 *  - Raw bg-blue-600 / text-blue-600 / text-gray-* removed → tokens.
 *  - List card uses semantic surface tokens.
 *  - <img> → next/image (TICKET-008 list view).
 *  - Empty state routed through <EmptyState preset="feed" />.
 */
import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { H1 } from "@/components/ui/headings"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/states/empty-state"
import { PullToRefresh } from "@/components/teen/pull-to-refresh"
// TICKET-026 (Wave 3 / W3-A9) — FLIP animations on the feed list. The
// row-rendering logic moved to ./feed-list.tsx (client component) so the
// list can sit inside an <AnimatePresence mode="popLayout"> tree.
import { FeedList, type FeedRow } from "./feed-list"

export const dynamic = "force-dynamic"

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
        <FeedList posts={posts} />
      )}
    </div>
    </PullToRefresh>
  )
}
