"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

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

interface ReviewRow {
  id: string
  content_type: string
  content_id: string | null
  created_at: string
  payload: Record<string, unknown>
  signedUrl: string | null
  feedPost: FeedPostLite | null
  listing: MarketplaceListingLite | null
}

export function ModerationReviewRow({ row }: { row: ReviewRow }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function approve() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/moderation/${row.id}/approve`, { method: "POST" })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof j.error === "string" ? j.error : "Erreur d'approbation")
        return
      }
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function reject() {
    if (!reason.trim()) {
      setError("Indiquez un motif de rejet.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/moderation/${row.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof j.error === "string" ? j.error : "Erreur de rejet")
        return
      }
      setShowReject(false)
      setReason("")
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  // Compute media preview list (storage signed URL + feed_post media + listing images)
  const mediaUrls: string[] = []
  if (row.signedUrl) mediaUrls.push(row.signedUrl)
  if (row.feedPost?.media_urls && Array.isArray(row.feedPost.media_urls)) {
    for (const m of row.feedPost.media_urls as unknown[]) {
      if (typeof m === "string") mediaUrls.push(m)
    }
  }
  if (row.listing?.images) for (const m of row.listing.images) mediaUrls.push(m)

  return (
    <li className="rounded border border-zinc-800 bg-zinc-900 p-4">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-xs uppercase tracking-wide text-zinc-500">{row.content_type}</div>
          <div className="font-semibold text-white">
            {row.feedPost
              ? ((row.feedPost.metadata as { title?: string } | null)?.title ?? "Publication")
              : row.listing
                ? row.listing.title
                : (row.payload.title as string | undefined) ?? "(sans titre)"}
          </div>
          <div className="text-xs text-zinc-600">
            Soumis le {new Date(row.created_at).toLocaleString("fr-FR")}
          </div>
        </div>
        <span className="rounded bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-300">
          En attente
        </span>
      </header>

      {row.feedPost?.content && (
        <p className="mb-3 whitespace-pre-wrap rounded bg-zinc-950 p-3 text-sm text-zinc-200">
          {row.feedPost.content}
        </p>
      )}

      {row.listing && (
        <div className="mb-3 rounded bg-zinc-950 p-3 text-sm text-zinc-300">
          <div>{row.listing.category}</div>
          <div className="text-xs text-zinc-500">
            {row.listing.price_coins ? `${row.listing.price_coins} coins` : null}
            {row.listing.price_dh ? ` · ${row.listing.price_dh} DH` : null}
          </div>
        </div>
      )}

      {mediaUrls.length > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {mediaUrls.slice(0, 6).map((url, i) => {
            const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(url)
            return isVideo ? (
              <video
                key={i}
                src={url}
                controls
                className="aspect-video w-full rounded bg-black object-contain"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt=""
                className="aspect-video w-full rounded bg-zinc-950 object-cover"
              />
            )
          })}
        </div>
      )}

      {!row.feedPost && !row.listing && Object.keys(row.payload).length > 0 && (
        <pre className="mb-3 max-h-40 overflow-auto rounded bg-zinc-950 p-3 text-xs text-zinc-400">
          {JSON.stringify(row.payload, null, 2)}
        </pre>
      )}

      {showReject && (
        <div className="mb-3">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motif de rejet (obligatoire)"
            rows={2}
            maxLength={1000}
            className="w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm text-white"
          />
        </div>
      )}

      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={approve}
          className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700 disabled:opacity-50"
        >
          Approuver
        </button>
        {!showReject ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => setShowReject(true)}
            className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50"
          >
            Rejeter
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={reject}
              className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50"
            >
              Confirmer le rejet
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setShowReject(false)
                setReason("")
                setError(null)
              }}
              className="rounded bg-zinc-700 px-3 py-1 text-sm text-white hover:bg-zinc-600 disabled:opacity-50"
            >
              Annuler
            </button>
          </>
        )}
      </div>
    </li>
  )
}
