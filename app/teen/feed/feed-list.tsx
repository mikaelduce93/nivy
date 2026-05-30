'use client'

/**
 * Wave 2A — Feed list with FLIP animations + cursor pagination + real
 * report/block wired to canonical APIs.
 *
 * Each row carries `user_liked / user_saved / user_reported` from the server
 * (RPC get_feed_cursor_page). Long-press menu: Copier, Partager, Signaler,
 * Bloquer — all wired to /api/teen/report or /api/teen/block.
 *
 * Sonner toast() only on server confirmation/failure (no window-level alerts).
 */

import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { Copy, Flag, Share2, UserX } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useLongPress } from '@/lib/hooks/use-long-press'
import { useHaptic } from '@/lib/hooks/use-haptic'
import { usePrefersReducedMotion } from '@/lib/hooks/use-reduced-motion'
import { EASE_STANDARD, DURATION_NORMAL } from '@/lib/motion/easing'

export type FeedRow = {
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
  user_liked: boolean
  user_saved: boolean
  user_reported: boolean
}

interface FeedListProps {
  posts: FeedRow[]
  initialNextCursor?: string | null
  currentUserId?: string
}

export function FeedList({
  posts: initialPosts,
  initialNextCursor = null,
  currentUserId,
}: FeedListProps) {
  const [posts, setPosts] = React.useState<FeedRow[]>(initialPosts)
  const [nextCursor, setNextCursor] = React.useState<string | null>(initialNextCursor)
  const [loadingMore, setLoadingMore] = React.useState(false)
  const [hiddenAuthors, setHiddenAuthors] = React.useState<Set<string>>(new Set())

  const visiblePosts = posts.filter((p) => !hiddenAuthors.has(p.user_id))

  async function loadMore() {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/teen/feed?cursor=${encodeURIComponent(nextCursor)}&limit=20`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const newPosts = (json.posts ?? []) as FeedRow[]
      // Dedupe by id (defensive against any race).
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id))
        return [...prev, ...newPosts.filter((p) => !seen.has(p.id))]
      })
      setNextCursor(json.nextCursor ?? null)
    } catch {
      toast.error('Impossible de charger plus de posts')
    } finally {
      setLoadingMore(false)
    }
  }

  function markReported(postId: string) {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, user_reported: true } : p))
    )
  }

  function hideAuthor(userId: string) {
    setHiddenAuthors((prev) => new Set(prev).add(userId))
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-4">
        <AnimatePresence mode="popLayout" initial={false}>
          {visiblePosts.map((p) => (
            <FeedListRow
              key={p.id}
              post={p}
              currentUserId={currentUserId}
              onReported={() => markReported(p.id)}
              onAuthorBlocked={() => hideAuthor(p.user_id)}
            />
          ))}
        </AnimatePresence>
      </ul>

      {nextCursor && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={loadingMore}
            aria-label="Charger plus de posts"
          >
            {loadingMore ? 'Chargement…' : 'Charger plus'}
          </Button>
        </div>
      )}
    </div>
  )
}

function FeedListRow({
  post: p,
  currentUserId,
  onReported,
  onAuthorBlocked,
}: {
  post: FeedRow
  currentUserId?: string
  onReported: () => void
  onAuthorBlocked: () => void
}) {
  const reduced = usePrefersReducedMotion()
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [reporting, setReporting] = React.useState(false)
  const [blocking, setBlocking] = React.useState(false)
  const { trigger: triggerHaptic } = useHaptic()
  const longPress = useLongPress(
    () => {
      triggerHaptic('medium')
      setMenuOpen(true)
    },
    { threshold: 500 },
  )

  const title = p.metadata?.title ?? null
  const media = Array.isArray(p.media_urls) ? p.media_urls[0] : null
  const postUrl = `/teen/feed/${p.id}`
  const isOwnPost = currentUserId && p.user_id === currentUserId

  async function copyLink() {
    try {
      const absolute =
        typeof window !== 'undefined'
          ? `${window.location.origin}${postUrl}`
          : postUrl
      await navigator.clipboard?.writeText(absolute)
      toast.success('Lien copié')
    } catch {
      toast.error('Impossible de copier le lien')
    }
    setMenuOpen(false)
  }

  async function sharePost() {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: title ?? 'Post Nivy',
          text: p.content ?? undefined,
          url: postUrl,
        })
      } catch {
        /* user cancelled */
      }
    } else {
      await copyLink()
    }
    setMenuOpen(false)
  }

  async function reportPost() {
    if (p.user_reported) {
      toast.message('Tu as déjà signalé ce post')
      setMenuOpen(false)
      return
    }
    setReporting(true)
    try {
      const res = await fetch('/api/teen/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource_type: 'feed_post',
          resource_id: p.id,
          reason: 'inappropriate',
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      onReported()
      toast.success('Signalement envoyé. Notre équipe va examiner ce post.')
    } catch {
      toast.error('Échec du signalement, réessaie')
    } finally {
      setReporting(false)
      setMenuOpen(false)
    }
  }

  async function blockAuthor() {
    if (isOwnPost) {
      toast.error('Tu ne peux pas te bloquer toi-même')
      setMenuOpen(false)
      return
    }
    setBlocking(true)
    try {
      const res = await fetch('/api/teen/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked_id: p.user_id }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      onAuthorBlocked()
      toast.success("L'auteur a été bloqué")
    } catch {
      toast.error('Échec du blocage, réessaie')
    } finally {
      setBlocking(false)
      setMenuOpen(false)
    }
  }

  return (
    <motion.li
      {...longPress.bind}
      layout={reduced ? false : true}
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
      transition={{
        duration: reduced ? 0 : DURATION_NORMAL,
        ease: EASE_STANDARD,
      }}
      className="rounded-2xl border border-border bg-card/30 p-4 shadow-sm  transition-all hover:-translate-y-0.5 hover:border-border/80 hover:shadow-md select-none"
    >
      <Link
        href={postUrl}
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
              alt={title ?? ''}
              fill
              sizes="(max-width: 768px) 100vw, 672px"
              className="object-cover"
            />
          </div>
        )}
        <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
          <span aria-label={p.user_liked ? 'Aimé' : 'Likes'}>
            {p.user_liked ? '♥' : '♡'} {p.likes_count ?? 0}
          </span>
          <span>💬 {p.comments_count ?? 0}</span>
          <span>↗ {p.shares_count ?? 0}</span>
          {p.user_saved && <span aria-label="Sauvegardé">🔖</span>}
        </div>
      </Link>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Actions</SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex flex-col gap-1">
            <button
              type="button"
              onClick={copyLink}
              className="flex items-center gap-3 rounded-lg p-3 text-left hover:bg-muted"
            >
              <Copy className="h-5 w-5 text-muted-foreground" />
              <span>Copier le lien</span>
            </button>
            <button
              type="button"
              onClick={sharePost}
              className="flex items-center gap-3 rounded-lg p-3 text-left hover:bg-muted"
            >
              <Share2 className="h-5 w-5 text-muted-foreground" />
              <span>Partager</span>
            </button>
            <button
              type="button"
              onClick={reportPost}
              disabled={reporting || p.user_reported}
              aria-disabled={reporting || p.user_reported}
              className="flex items-center gap-3 rounded-lg p-3 text-left hover:bg-muted disabled:opacity-50"
            >
              <Flag className="h-5 w-5 text-coral" />
              <span>{p.user_reported ? 'Déjà signalé' : reporting ? 'Signalement…' : 'Signaler'}</span>
            </button>
            {!isOwnPost && (
              <button
                type="button"
                onClick={blockAuthor}
                disabled={blocking}
                aria-disabled={blocking}
                className="flex items-center gap-3 rounded-lg p-3 text-left hover:bg-muted disabled:opacity-50"
              >
                <UserX className="h-5 w-5 text-destructive" />
                <span>{blocking ? 'Blocage…' : "Bloquer l'auteur"}</span>
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </motion.li>
  )
}
