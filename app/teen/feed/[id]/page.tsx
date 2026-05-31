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
import EngageButtons from "./engage-buttons"
import { CommentsThread } from "./comments-thread"

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
        className="flex flex-col rounded-2xl border-2 border-ink bg-white p-6 text-ink shadow-stkr-md"
        style={{ viewTransitionName: `vt-feed-${post.id}` }}
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {post.featured && (
            <span className="rounded-full border-2 border-ink bg-gold px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-ink">
              ★ À la une
            </span>
          )}
          {post.type && (
            <span className="rounded-full border-2 border-ink bg-paper px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-ink">
              {post.type}
            </span>
          )}
          {post.category && (
            <span className="rounded-full border-2 border-ink bg-teal px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-paper">
              {post.category}
            </span>
          )}
          {post.status && (
            <span className="font-mono text-[10px] uppercase tracking-wide text-mute">
              {post.status}
            </span>
          )}
        </div>
        {title && (
          <h1 className="mb-2 font-display text-3xl font-extrabold leading-tight tracking-tight text-ink">
            {title}
          </h1>
        )}
        {post.content && (
          <p className="whitespace-pre-wrap text-ink/90">{post.content}</p>
        )}
        {media && (
          <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-xl border-2 border-ink">
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
        <div className="mt-4 flex items-center gap-4 font-mono text-sm">
          <span className="text-pink" aria-label="J'aime">♥ {post.likes_count ?? 0}</span>
          <span className="text-teal" aria-label="Commentaires">💬 {post.comments_count ?? 0}</span>
          <span className="text-mute" aria-label="Partages">↗ {post.shares_count ?? 0}</span>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full border-2 border-ink bg-gold px-3 py-1 font-bold text-ink">
            ⚡ {post.xp_earned ?? 0} XP
          </span>
        </div>
        {post.user_id !== user.id && (
          <div className="mt-4 border-t-2 border-ink pt-4">
            <EngageButtons submissionId={post.id} />
          </div>
        )}
      </article>

      <div className="mt-6">
        <CommentsThread postId={post.id} currentUserId={user.id} />
      </div>
    </div>
  )
}
