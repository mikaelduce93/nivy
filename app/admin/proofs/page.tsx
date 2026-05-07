/**
 * Wave C.8 — Admin moderation queue (defi proofs + general content).
 *
 * Server component: queries `moderation_queue` (status='pending').
 * Hydrates the underlying content row when content_type is known
 * (feed_post, marketplace_listing). Generates 15-min signed URLs for
 * media stored in the PRIVATE `defi-proofs` bucket when payload exposes
 * a `file_path` (defi proof submissions) or media_urls.
 *
 * Mutations live in:
 *   - POST /api/admin/moderation/:id/approve
 *   - POST /api/admin/moderation/:id/reject
 */
import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { ModerationReviewRow } from "./moderation-review-row"

export const dynamic = "force-dynamic"

const ADMIN_ROLES = new Set(["admin", "super_admin", "moderator"])
const SIGNED_URL_TTL_SECONDS = 60 * 15

interface FeedPostLite {
  id: string
  user_id: string
  type: string | null
  category: string | null
  content: string | null
  media_urls: unknown
  metadata: unknown
}

interface MarketplaceListingLite {
  id: string
  seller_user_id: string
  title: string
  category: string
  price_coins: number | null
  price_dh: number | null
  images: string[] | null
}

export default async function AdminProofsPage() {
  // 1. Auth + admin gate
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const sr = createServiceRoleClient()
  const { data: role } = await sr
    .from("admin_roles")
    .select("role")
    .eq("profile_id", user.id)
    .maybeSingle()
  if (!role || !ADMIN_ROLES.has(role.role)) {
    return (
      <main className="container mx-auto max-w-3xl px-4 py-12">
        <h1 className="mb-2 text-2xl font-bold text-white">Modération</h1>
        <p className="text-red-400">Accès refusé — rôle administrateur requis.</p>
      </main>
    )
  }

  // 2. Fetch queue
  const { data: queue } = await sr
    .from("moderation_queue")
    .select("id, content_type, content_id, payload, status, reason, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(50)

  // Counters
  const { data: counters } = await sr
    .from("moderation_queue")
    .select("status")
    .returns<Array<{ status: string }>>()
  const stats = {
    pending: counters?.filter((c) => c.status === "pending").length ?? 0,
    approved: counters?.filter((c) => c.status === "approved").length ?? 0,
    rejected: counters?.filter((c) => c.status === "rejected").length ?? 0,
  }

  // 3. Hydrate content rows in batch by type
  const queueRows = queue ?? []
  const feedPostIds = queueRows.filter((q) => q.content_type === "feed_post" && q.content_id).map((q) => q.content_id as string)
  const marketIds = queueRows.filter((q) => q.content_type === "marketplace_listing" && q.content_id).map((q) => q.content_id as string)

  const feedPostsById = new Map<string, FeedPostLite>()
  if (feedPostIds.length) {
    const { data } = await sr
      .from("feed_posts")
      .select("id, user_id, type, category, content, media_urls, metadata")
      .in("id", feedPostIds)
    for (const p of (data ?? []) as FeedPostLite[]) feedPostsById.set(p.id, p)
  }

  const listingsById = new Map<string, MarketplaceListingLite>()
  if (marketIds.length) {
    const { data } = await sr
      .from("marketplace_listings")
      .select("id, seller_user_id, title, category, price_coins, price_dh, images")
      .in("id", marketIds)
    for (const l of (data ?? []) as MarketplaceListingLite[]) listingsById.set(l.id, l)
  }

  // 4. Build rows + sign defi-proof storage URLs (when payload.file_path present)
  const rows = await Promise.all(
    queueRows.map(async (q) => {
      const payload = (q.payload ?? {}) as Record<string, unknown>
      const filePath = typeof payload.file_path === "string" ? payload.file_path : null
      let signedUrl: string | null = null
      if (filePath) {
        const { data: signed } = await sr.storage
          .from("defi-proofs")
          .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS)
        signedUrl = signed?.signedUrl ?? null
      }

      const feedPost = q.content_type === "feed_post" && q.content_id ? feedPostsById.get(q.content_id) ?? null : null
      const listing = q.content_type === "marketplace_listing" && q.content_id ? listingsById.get(q.content_id) ?? null : null

      return {
        id: q.id,
        content_type: q.content_type,
        content_id: q.content_id,
        created_at: q.created_at,
        payload,
        signedUrl,
        feedPost,
        listing,
      }
    }),
  )

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/admin"
          className="text-sm text-zinc-400 underline-offset-4 hover:text-white hover:underline"
        >
          ← Retour
        </Link>
      </div>

      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">Modération · Contenu</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Validez les preuves et contenus signalés. Les médias privés sont signés 15 min.
        </p>
      </header>

      <section className="mb-8 grid grid-cols-3 gap-3">
        <StatCard label="En attente" value={stats.pending} tone="yellow" />
        <StatCard label="Approuvés" value={stats.approved} tone="green" />
        <StatCard label="Rejetés" value={stats.rejected} tone="red" />
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-white">
          File en attente ({rows.length})
        </h2>

        {rows.length === 0 && (
          <p className="rounded border border-zinc-800 bg-zinc-900 p-6 text-center text-sm text-zinc-400">
            Aucun contenu en attente de modération.
          </p>
        )}

        <ul className="space-y-3">
          {rows.map((r) => (
            <ModerationReviewRow key={r.id} row={r} />
          ))}
        </ul>
      </section>
    </main>
  )
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: "yellow" | "green" | "red"
}) {
  const palette: Record<typeof tone, string> = {
    yellow: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
    green: "border-green-500/30 bg-green-500/10 text-green-300",
    red: "border-red-500/30 bg-red-500/10 text-red-300",
  }
  return (
    <div className={`rounded border p-3 ${palette[tone]}`}>
      <div className="text-xs uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  )
}
