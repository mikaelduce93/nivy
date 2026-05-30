'use client'

/**
 * FeedPostLongPress — TICKET-039 (Wave 2)
 * =======================================
 *
 * Lightweight client wrapper that adds long-press / right-click context-menu
 * behaviour to a feed post. Renders an `<li>` with the same classNames /
 * children as the previous server-only markup, plus a bottom-sheet menu
 * (copy / share / report / block).
 *
 * Touch: 500 ms hold opens the menu (with light haptic).
 * Mouse: right-click opens the menu (native context menu suppressed).
 * Tap / left-click: falls through to the wrapped <Link> as before.
 */

import * as React from 'react'
import { useLongPress } from '@/lib/hooks/use-long-press'
import { useHaptic } from '@/lib/hooks/use-haptic'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Copy, Flag, Share2, UserX } from 'lucide-react'

export interface FeedPostLongPressProps {
  postId: string
  postAuthorId?: string
  postTitle?: string | null
  postContent?: string | null
  className?: string
  children: React.ReactNode
}

export function FeedPostLongPress({
  postId,
  postAuthorId,
  postTitle,
  postContent,
  className,
  children,
}: FeedPostLongPressProps) {
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [reporting, setReporting] = React.useState(false)
  const [blocking, setBlocking] = React.useState(false)
  const [reported, setReported] = React.useState(false)
  const { trigger: triggerHaptic } = useHaptic()

  const longPress = useLongPress(
    () => {
      triggerHaptic('medium')
      setMenuOpen(true)
    },
    { threshold: 500 },
  )

  const postUrl = `/teen/feed/${postId}`

  async function copyLink() {
    try {
      const absolute =
        typeof window !== 'undefined' ? `${window.location.origin}${postUrl}` : postUrl
      await navigator.clipboard?.writeText(absolute)
    } catch {
      /* clipboard may be blocked — silently ignore */
    }
    setMenuOpen(false)
  }

  async function sharePost() {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: postTitle ?? 'Post Nivy',
          text: postContent ?? undefined,
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
    if (reported) {
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
          resource_id: postId,
          reason: 'inappropriate',
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setReported(true)
      toast.success('Signalement envoyé.')
    } catch {
      toast.error('Échec du signalement, réessaie')
    } finally {
      setReporting(false)
      setMenuOpen(false)
    }
  }

  async function blockAuthor() {
    if (!postAuthorId) {
      toast.error("Impossible d'identifier l'auteur")
      setMenuOpen(false)
      return
    }
    setBlocking(true)
    try {
      const res = await fetch('/api/teen/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked_id: postAuthorId }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success("L'auteur a été bloqué")
    } catch {
      toast.error('Échec du blocage, réessaie')
    } finally {
      setBlocking(false)
      setMenuOpen(false)
    }
  }

  return (
    <li {...longPress.bind} className={className}>
      {children}

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
              disabled={reporting || reported}
              aria-disabled={reporting || reported}
              className="flex items-center gap-3 rounded-lg p-3 text-left hover:bg-muted disabled:opacity-50"
            >
              <Flag className="h-5 w-5 text-coral" />
              <span>{reported ? 'Déjà signalé' : reporting ? 'Signalement…' : 'Signaler'}</span>
            </button>
            <button
              type="button"
              onClick={blockAuthor}
              disabled={blocking || !postAuthorId}
              aria-disabled={blocking || !postAuthorId}
              className="flex items-center gap-3 rounded-lg p-3 text-left hover:bg-muted disabled:opacity-50"
            >
              <UserX className="h-5 w-5 text-destructive" />
              <span>{blocking ? 'Blocage…' : "Bloquer l'auteur"}</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </li>
  )
}

export default FeedPostLongPress
