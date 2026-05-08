'use client'

/**
 * Wave 3 / TICKET-026 — Feed list with FLIP animations.
 *
 * Lifted out of app/teen/feed/page.tsx so the post rows can live inside an
 * <AnimatePresence> + motion-layout tree. The server page still does the
 * Supabase query and hands us a serialized list of `FeedRow`s.
 *
 * Each row is a `<motion.li>` that owns the long-press / right-click
 * context-menu behaviour previously housed in <FeedPostLongPress>. The li
 * itself drives FLIP via framer-motion's `layout` prop and animates in /
 * out via AnimatePresence above. We re-implement the menu inline here
 * instead of nesting another <li>, which would be invalid HTML.
 *
 * Reduced-motion: layout animation skipped, items snap into place.
 */

import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { Copy, Flag, Share2, UserX } from 'lucide-react'
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
}

interface FeedListProps {
  posts: FeedRow[]
}

export function FeedList({ posts }: FeedListProps) {
  return (
    <ul className="space-y-4">
      <AnimatePresence mode="popLayout" initial={false}>
        {posts.map((p) => (
          <FeedListRow key={p.id} post={p} />
        ))}
      </AnimatePresence>
    </ul>
  )
}

/**
 * Single feed row: motion.li with FLIP + enter/exit, plus long-press
 * context menu (kept colocated rather than splitting into yet another
 * wrapper component).
 */
function FeedListRow({ post: p }: { post: FeedRow }) {
  const reduced = usePrefersReducedMotion()
  const [menuOpen, setMenuOpen] = React.useState(false)
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

  async function copyLink() {
    try {
      const absolute =
        typeof window !== 'undefined'
          ? `${window.location.origin}${postUrl}`
          : postUrl
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
      className="rounded-2xl border border-border bg-card/30 p-4 shadow-sm backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-border/80 hover:shadow-md select-none"
    >
      {/* TICKET-024 — View Transitions morph anchor. */}
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
          <span>♥ {p.likes_count ?? 0}</span>
          <span>💬 {p.comments_count ?? 0}</span>
          <span>↗ {p.shares_count ?? 0}</span>
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
    </motion.li>
  )
}
