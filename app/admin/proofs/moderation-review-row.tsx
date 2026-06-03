"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"

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
    <li className="flex flex-col rounded-2xl border-2 border-ink bg-white text-ink shadow-stkr-md p-4">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-mono text-xs uppercase tracking-[0.16em] text-mute">{row.content_type}</div>
          <div className="font-semibold text-ink">
            {row.feedPost
              ? ((row.feedPost.metadata as { title?: string } | null)?.title ?? "Publication")
              : row.listing
                ? row.listing.title
                : (row.payload.title as string | undefined) ?? "(sans titre)"}
          </div>
          <div className="text-xs text-mute">
            Soumis le {new Date(row.created_at).toLocaleString("fr-FR")}
          </div>
        </div>
        <StatusBadge
          variant="pending"
          label="En attente"
          size="sm"
          className="font-mono uppercase tracking-[0.16em]"
        />
      </header>

      {row.feedPost?.content && (
        <p className="mb-3 whitespace-pre-wrap rounded-lg border-2 border-ink bg-paper p-3 text-sm text-ink-2">
          {row.feedPost.content}
        </p>
      )}

      {row.listing && (
        <div className="mb-3 rounded-lg border-2 border-ink bg-paper p-3 text-sm text-ink-2">
          <div>{row.listing.category}</div>
          <div className="font-mono text-xs text-mute">
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
                className="aspect-video w-full rounded bg-ink object-contain"
              >
                <track kind="captions" />
              </video>
            ) : (
              <div
                key={i}
                className="relative aspect-video w-full overflow-hidden rounded bg-background"
              >
                <Image
                  src={url}
                  alt=""
                  aria-hidden
                  fill
                  sizes="(max-width: 640px) 50vw, 33vw"
                  className="object-cover"
                />
              </div>
            )
          })}
        </div>
      )}

      {!row.feedPost && !row.listing && Object.keys(row.payload).length > 0 && (
        <details className="mb-3">
          <summary className="cursor-pointer font-mono text-xs uppercase tracking-[0.16em] text-mute">
            Payload
          </summary>
          <pre className="mt-2 max-h-40 overflow-auto rounded-lg border-2 border-ink bg-paper p-3 text-xs text-mute font-mono">
            {JSON.stringify(row.payload, null, 2)}
          </pre>
        </details>
      )}

      {showReject && (
        <div className="mb-3">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motif de rejet (obligatoire)"
            rows={2}
            maxLength={1000}
            className="w-full rounded-lg border-2 border-ink bg-paper p-2 text-sm text-ink"
          />
        </div>
      )}

      {error && <p className="mb-2 text-xs text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="lime"
          disabled={busy}
          onClick={approve}
        >
          Approuver
        </Button>
        {!showReject ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-destructive"
            disabled={busy}
            onClick={() => setShowReject(true)}
          >
            Rejeter
          </Button>
        ) : (
          <>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={reject}
            >
              Confirmer le rejet
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setShowReject(false)
                setReason("")
                setError(null)
              }}
            >
              Annuler
            </Button>
          </>
        )}
      </div>
    </li>
  )
}
