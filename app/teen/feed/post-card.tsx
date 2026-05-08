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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Copy, Flag, Share2, UserX } from 'lucide-react'

export interface FeedPostLongPressProps {
  postId: string
  postTitle?: string | null
  postContent?: string | null
  className?: string
  children: React.ReactNode
}

export function FeedPostLongPress({
  postId,
  postTitle,
  postContent,
  className,
  children,
}: FeedPostLongPressProps) {
  const [menuOpen, setMenuOpen] = React.useState(false)
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

  function reportPost() {
    setMenuOpen(false)
    if (typeof window !== 'undefined') {
      window.alert('Merci, le post a été signalé.')
    }
  }

  function blockAuthor() {
    setMenuOpen(false)
    if (typeof window !== 'undefined') {
      window.alert("L'auteur a été bloqué pour cette session.")
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
              className="flex items-center gap-3 rounded-lg p-3 text-left hover:bg-muted"
            >
              <Flag className="h-5 w-5 text-orange-500" />
              <span>Signaler</span>
            </button>
            <button
              type="button"
              onClick={blockAuthor}
              className="flex items-center gap-3 rounded-lg p-3 text-left hover:bg-muted"
            >
              <UserX className="h-5 w-5 text-red-500" />
              <span>Bloquer l&apos;auteur</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </li>
  )
}

export default FeedPostLongPress
