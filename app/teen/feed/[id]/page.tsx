/**
 * Wave 2.3 — Submission detail with engagement actions.
 *
 * Wave 2 / TICKET-002 — design-system token sweep:
 *  - Heading routed through <H1> (teen pattern).
 *  - Raw text-gray-* / bg-blue-* / bg-yellow-* removed → semantic tokens
 *    (muted-foreground, info-soft, warning).
 */
import { redirect, notFound } from "next/navigation"
import Image from "next/image"
import { createClient } from "@/lib/supabase/server"
import { recordSignalAsync } from "@/lib/analytics/signals"
import { H1 } from "@/components/ui/headings"
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

  // TICKET-033 — best-effort feed_viewed signal on detail-page open.
  //
  // We deliberately skip self-views (creators inspecting their own posts)
  // because the recommender treats every view as an interest signal, and
  // a creator's own posts shouldn't reinforce affinity.
  //
  // Tags come from post.category — feed_posts doesn't carry a tags array
  // today (per Wave 2.3 schema), so the category is the canonical bucket
  // the recommender keys off. Weight 0.5 (the floor) since a passive view
  // is the weakest engagement signal in the spec.
  if (post.user_id !== user.id) {
    const feedTags: string[] = []
    if (typeof post.category === "string" && post.category.length > 0) {
      feedTags.push(post.category.toLowerCase())
    }
    if (typeof post.type === "string" && post.type.length > 0) {
      feedTags.push(post.type.toLowerCase())
    }
    recordSignalAsync({
      teenId: user.id,
      signalType: "view",
      targetType: "feed_post",
      targetId: post.id,
      weight: 0.5,
      metadata: {
        signal_subtype: "feed_viewed",
        creator_user_id: post.user_id,
        category: post.category ?? null,
        type: post.type ?? null,
        tags: feedTags,
        featured: Boolean(post.featured),
      },
    })
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      {/* TICKET-024 — destination half of the View Transitions morph.
          Pairs with the feed card on /teen/feed. */}
      <article
        className="rounded-2xl border border-border bg-card/30 p-6 shadow-sm backdrop-blur-md"
        style={{ viewTransitionName: `vt-feed-${post.id}` }}
      >
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {post.featured && (
            <span className="rounded-full bg-warning/15 px-2 py-0.5 text-warning-foreground">
              ★ Featured
            </span>
          )}
          {post.type && (
            <span className="rounded-full bg-muted px-2 py-0.5 capitalize text-muted-foreground">
              {post.type}
            </span>
          )}
          {post.category && (
            <span className="rounded-full bg-info-soft/15 px-2 py-0.5 text-info">
              {post.category}
            </span>
          )}
          <span>· {post.status}</span>
        </div>
        {title && (
          <H1 className="mb-2 text-4xl font-black tracking-tighter uppercase italic leading-none">
            {title}
          </H1>
        )}
        {post.content && (
          <p className="text-foreground/90 whitespace-pre-wrap">{post.content}</p>
        )}
        {media && (
          <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-xl">
            <Image
              src={media}
              alt={title ?? "Image de la publication"}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 672px"
              className="object-cover"
            />
          </div>
        )}
        <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
          <span>♥ {post.likes_count ?? 0}</span>
          <span>💬 {post.comments_count ?? 0}</span>
          <span>↗ {post.shares_count ?? 0}</span>
          <span className="ml-auto text-xs text-muted-foreground/70">
            XP: {post.xp_earned ?? 0}
          </span>
        </div>
        {post.user_id !== user.id && (
          <div className="mt-4 border-t border-border pt-4">
            <EngageButtons submissionId={post.id} />
          </div>
        )}
      </article>
    </div>
  )
}
