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
import Image from "next/image"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { H1 } from "@/components/ui/headings"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/states/empty-state"
import { PullToRefresh } from "@/components/teen/pull-to-refresh"
import { FeedPostLongPress } from "./post-card"

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
        <ul className="space-y-4">
          {posts.map((p) => {
            const title = p.metadata?.title ?? null
            const media = Array.isArray(p.media_urls) ? p.media_urls[0] : null
            return (
              // TICKET-039: long-press / right-click opens a context menu
              // (copy / share / report / block). Tap behaviour (the inner
              // <Link>) is preserved.
              <FeedPostLongPress
                key={p.id}
                postId={p.id}
                postTitle={title}
                postContent={p.content}
                className="rounded-2xl border border-border bg-card/30 p-4 shadow-sm backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-border/80 hover:shadow-md select-none"
              >
                {/* TICKET-024 — View Transitions morph anchor. Pairs with
                    the article hero on /teen/feed/[id]. */}
                <Link
                  href={`/teen/feed/${p.id}`}
                  className="block"
                  style={{ viewTransitionName: `vt-feed-${p.id}` }}
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {p.featured && (
                      <span className="rounded-full bg-warning/15 px-2 py-0.5 text-warning-foreground">
                        ★ Featured
                      </span>
                    )}
                    {p.type && (
                      <span className="rounded-full bg-muted px-2 py-0.5 capitalize text-muted-foreground">
                        {p.type}
                      </span>
                    )}
                    {p.category && (
                      <span className="rounded-full bg-info-soft/15 px-2 py-0.5 text-info">
                        {p.category}
                      </span>
                    )}
                  </div>
                  {title && (
                    <h2 className="text-lg font-medium text-foreground">{title}</h2>
                  )}
                  {p.content && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {p.content}
                    </p>
                  )}
                  {media && (
                    <div className="relative mt-3 aspect-video w-full overflow-hidden rounded-xl">
                      <Image
                        src={media}
                        alt={title ?? ""}
                        fill
                        sizes="(max-width: 768px) 100vw, 672px"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                    <span>♥ {p.likes_count ?? 0}</span>
                    <span>💬 {p.comments_count ?? 0}</span>
                    <span>↗ {p.shares_count ?? 0}</span>
                  </div>
                </Link>
              </FeedPostLongPress>
            )
          })}
        </ul>
      )}
    </div>
    </PullToRefresh>
  )
}
