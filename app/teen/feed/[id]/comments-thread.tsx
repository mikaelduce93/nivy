"use client"

/**
 * Wave 2A — Comments composer + thread for /teen/feed/[id].
 *
 * Canon §2:
 *   - Composer maxLength 500.
 *   - Depth: root + 1 reply level only. Server flattens deeper to depth 1.
 *   - Optimistic insert with tempId; on POST success replace with server id;
 *     on failure remove + toast.error (no fake success).
 *   - Soft-delete: row stays with is_deleted=true, renders [supprimé].
 */

import * as React from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { NivEmpty } from "@/components/brand"
import { Flag, Trash2 } from "lucide-react"

type Comment = {
  id: string
  user_id: string
  parent_id: string | null
  content: string
  likes_count: number | null
  replies_count: number | null
  is_deleted?: boolean
  is_hidden?: boolean
  created_at: string
  user_liked?: boolean
}

type CommentsResponse = {
  comments?: Comment[]
  has_more?: boolean
}

interface Props {
  postId: string
  currentUserId: string
}

export function CommentsThread({ postId, currentUserId }: Props) {
  const [comments, setComments] = React.useState<Comment[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [composer, setComposer] = React.useState("")
  const [replyTo, setReplyTo] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/teen/feed/comments?post_id=${postId}&limit=50`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as CommentsResponse
        if (!cancelled) {
          setComments(json.comments ?? [])
          setError(null)
        }
      } catch {
        if (!cancelled) setError("Impossible de charger les commentaires")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [postId])

  async function submitComment() {
    const text = composer.trim()
    if (!text) return
    if (text.length > 500) {
      toast.error("Commentaire trop long (max 500 caractères)")
      return
    }
    if (submitting) return
    setSubmitting(true)

    const tempId = `temp-${Date.now()}`
    const optimistic: Comment = {
      id: tempId,
      user_id: currentUserId,
      // Depth 2 cap: replies-to-replies are flattened by the server
      // trigger; on the client we set parent to the root if user clicked
      // reply-to-reply.
      parent_id: replyTo
        ? comments.find((c) => c.id === replyTo)?.parent_id ?? replyTo
        : null,
      content: text,
      likes_count: 0,
      replies_count: 0,
      created_at: new Date().toISOString(),
    }
    setComments((prev) => [...prev, optimistic])
    setComposer("")
    const oldReplyTo = replyTo
    setReplyTo(null)

    try {
      const res = await fetch("/api/teen/feed/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          post_id: postId,
          content: text,
          parent_id: optimistic.parent_id,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const real: Comment | null = json?.comment ?? null
      if (real) {
        setComments((prev) =>
          prev.map((c) => (c.id === tempId ? { ...real, user_liked: false } : c))
        )
      } else {
        // Roll back the optimistic if server returns no row.
        setComments((prev) => prev.filter((c) => c.id !== tempId))
        toast.error("Commentaire non envoyé")
      }
    } catch {
      setComments((prev) => prev.filter((c) => c.id !== tempId))
      setComposer(text)
      setReplyTo(oldReplyTo)
      toast.error("Commentaire non envoyé, réessaie")
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteComment(id: string) {
    try {
      const res = await fetch("/api/teen/feed/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", comment_id: id }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setComments((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, is_deleted: true, content: "[supprimé]" } : c
        )
      )
      toast.success("Commentaire supprimé")
    } catch {
      toast.error("Échec de la suppression")
    }
  }

  async function reportComment(id: string) {
    try {
      const res = await fetch("/api/teen/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource_type: "feed_comment",
          resource_id: id,
          reason: "inappropriate",
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success("Commentaire signalé")
    } catch {
      toast.error("Échec du signalement")
    }
  }

  const roots = comments.filter((c) => c.parent_id === null)
  const repliesByRoot = new Map<string, Comment[]>()
  for (const c of comments) {
    if (c.parent_id) {
      const arr = repliesByRoot.get(c.parent_id) ?? []
      arr.push(c)
      repliesByRoot.set(c.parent_id, arr)
    }
  }

  return (
    <section className="space-y-4" aria-label="Commentaires">
      <h2 className="font-display text-lg font-extrabold tracking-tight text-ink">Commentaires</h2>

      {loading && <p className="text-sm text-mute">Chargement…</p>}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {!loading && !error && roots.length === 0 && (
        <NivEmpty
          mood="calm"
          title="Pas encore de commentaire"
          description="Sois le premier à réagir."
        />
      )}

      <ul className="space-y-3">
        {roots.map((c) => (
          <li key={c.id} className="flex flex-col rounded-2xl border-2 border-ink bg-white p-3 text-ink shadow-stkr-sm">
            <CommentRow
              comment={c}
              currentUserId={currentUserId}
              onReply={() => setReplyTo(c.id)}
              onDelete={() => deleteComment(c.id)}
              onReport={() => reportComment(c.id)}
            />
            {(repliesByRoot.get(c.id) ?? []).map((r) => (
              <div key={r.id} className="mt-3 ml-4 border-l-2 border-ink pl-3">
                <CommentRow
                  comment={r}
                  currentUserId={currentUserId}
                  onReply={() => setReplyTo(c.id) /* depth 2 cap: reply to root */}
                  onDelete={() => deleteComment(r.id)}
                  onReport={() => reportComment(r.id)}
                />
              </div>
            ))}
          </li>
        ))}
      </ul>

      {/* Composer */}
      <div className="flex flex-col gap-2 rounded-2xl border-2 border-ink bg-white p-3 text-ink shadow-stkr-sm">
        {replyTo && (
          <div className="flex items-center justify-between text-xs text-mute">
            <span>Réponse à un commentaire</span>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="underline"
            >
              Annuler
            </button>
          </div>
        )}
        <textarea
          value={composer}
          onChange={(e) => setComposer(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Écris un commentaire…"
          aria-label="Composer un commentaire"
          className="w-full resize-none rounded-xl border-2 border-ink bg-paper p-2 text-sm text-ink placeholder:text-mute focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-pink/40"
        />
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-mute">{composer.length}/500</span>
          <Button
            variant="pink"
            size="sm"
            onClick={submitComment}
            disabled={submitting || composer.trim().length === 0}
          >
            {submitting ? "Envoi…" : replyTo ? "Répondre" : "Publier"}
          </Button>
        </div>
      </div>
    </section>
  )
}

function CommentRow({
  comment,
  currentUserId,
  onReply,
  onDelete,
  onReport,
}: {
  comment: Comment
  currentUserId: string
  onReply: () => void
  onDelete: () => void
  onReport: () => void
}) {
  const isOwn = comment.user_id === currentUserId
  const text = comment.is_deleted ? "[supprimé]" : comment.content

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm text-foreground whitespace-pre-wrap">{text}</p>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <button
          type="button"
          onClick={onReply}
          disabled={comment.is_deleted}
          className="underline disabled:opacity-50"
        >
          Répondre
        </button>
        {!comment.is_deleted && !isOwn && (
          <button
            type="button"
            onClick={onReport}
            className="inline-flex items-center gap-1 hover:text-coral"
            aria-label="Signaler ce commentaire"
          >
            <Flag className="h-3 w-3" />
            Signaler
          </button>
        )}
        {!comment.is_deleted && isOwn && (
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1 hover:text-destructive"
            aria-label="Supprimer ce commentaire"
          >
            <Trash2 className="h-3 w-3" />
            Supprimer
          </button>
        )}
      </div>
    </div>
  )
}
