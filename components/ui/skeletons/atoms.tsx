/**
 * Skeleton atoms — TICKET-005 (W1-A4)
 * ====================================
 *
 * Smallest composable building blocks for loading states. All atoms share a
 * single shimmer animation (Tailwind's built-in `animate-pulse`) that is
 * automatically replaced with a static muted surface under
 * `prefers-reduced-motion: reduce` via the `motion-reduce:animate-none`
 * variant.
 *
 * Tokens:
 *   - Background: `bg-muted` (semantic — adapts to light/dark theme)
 *   - Animation: `animate-pulse` (motion-safe), falls back to a flat
 *     `bg-muted/80` static surface when reduced-motion is requested.
 *
 * Tailwind-only. Server-component compatible (no `'use client'`).
 *
 * See `components/ui/skeletons/presets.tsx` for the composed shapes that
 * consume these atoms (cards, lists, hero, DefiCard silhouette, …).
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

/* -------------------------------------------------------------------------- */
/*  SHARED BASE                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Shared base classes for every skeleton atom. Centralised so that turning
 * off shimmer or swapping the muted token is a one-line change.
 *
 * - `bg-muted`             → semantic muted token (light/dark aware)
 * - `animate-pulse`        → unified shimmer
 * - `motion-reduce:animate-none`        → respect prefers-reduced-motion
 * - `motion-reduce:bg-muted/80`         → keep a visible static surface
 */
export const SKELETON_BASE =
  'bg-muted animate-pulse rounded-md ' +
  'motion-reduce:animate-none motion-reduce:bg-muted/80'

/* -------------------------------------------------------------------------- */
/*  <SkeletonBar>                                                              */
/* -------------------------------------------------------------------------- */

export interface SkeletonBarProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Width — Tailwind class (`w-24`) or raw CSS value (`'180px'`, `'70%'`). */
  width?: string | number
  /** Height — Tailwind class (`h-4`) or raw CSS value. Defaults to `h-4`. */
  height?: string | number
  /** Override border-radius. Defaults to `rounded-md`. */
  rounded?: string
}

function isTailwindToken(v: string): boolean {
  // crude but enough: Tailwind tokens never contain digits-then-px / % / em / rem.
  return !/[\d.](px|%|em|rem|vh|vw)$/i.test(v) && !/^\d+$/.test(v)
}

function dim(v: string | number | undefined): {
  className?: string
  style?: React.CSSProperties
} {
  if (v == null) return {}
  if (typeof v === 'number') return { style: { width: `${v}px` } }
  if (isTailwindToken(v)) return { className: v }
  return { style: { width: v } }
}

/** Single rounded bar — the most basic skeleton primitive. */
export function SkeletonBar({
  width,
  height = 'h-4',
  rounded,
  className,
  style,
  ...rest
}: SkeletonBarProps) {
  // width
  const w = dim(width)
  // height — same logic but the `style` key needs to be `height`.
  const hRaw = typeof height === 'number' ? `${height}px` : height
  const hIsClass = typeof hRaw === 'string' && isTailwindToken(hRaw)
  const hClass = hIsClass ? hRaw : undefined
  const hStyle: React.CSSProperties | undefined = hIsClass
    ? undefined
    : { height: hRaw as string }

  return (
    <div
      data-slot="skeleton-bar"
      className={cn(
        SKELETON_BASE,
        rounded,
        w.className,
        hClass,
        // when width is a class but no width given, default to full
        !width && 'w-full',
        className,
      )}
      style={{ ...w.style, ...hStyle, ...style }}
      {...rest}
    />
  )
}

/* -------------------------------------------------------------------------- */
/*  <SkeletonCircle>                                                           */
/* -------------------------------------------------------------------------- */

export interface SkeletonCircleProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Size in px (number) or any CSS length. Defaults to 40 (avatar). */
  size?: number | string
}

/** Avatar / icon-disc placeholder. */
export function SkeletonCircle({
  size = 40,
  className,
  style,
  ...rest
}: SkeletonCircleProps) {
  const cssSize = typeof size === 'number' ? `${size}px` : size
  return (
    <div
      data-slot="skeleton-circle"
      aria-hidden
      className={cn(SKELETON_BASE, 'rounded-full shrink-0', className)}
      style={{ width: cssSize, height: cssSize, ...style }}
      {...rest}
    />
  )
}

/* -------------------------------------------------------------------------- */
/*  <SkeletonImage>                                                            */
/* -------------------------------------------------------------------------- */

export interface SkeletonImageProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Aspect ratio: 'video' (16:9), 'square' (1:1), 'photo' (4:3), or any CSS ratio. */
  aspectRatio?: 'video' | 'square' | 'photo' | 'wide' | string
  /** Override border-radius. Defaults to `rounded-xl`. */
  rounded?: string
}

const ASPECT_MAP: Record<string, string> = {
  video: 'aspect-video',
  square: 'aspect-square',
  photo: 'aspect-[4/3]',
  wide: 'aspect-[21/9]',
}

/** Image placeholder — reserves height so we never CLS. */
export function SkeletonImage({
  aspectRatio = 'video',
  rounded = 'rounded-xl',
  className,
  ...rest
}: SkeletonImageProps) {
  const aspectClass =
    ASPECT_MAP[aspectRatio] ?? `aspect-[${aspectRatio}]`
  return (
    <div
      data-slot="skeleton-image"
      aria-hidden
      className={cn(SKELETON_BASE, rounded, aspectClass, 'w-full', className)}
      {...rest}
    />
  )
}

/* -------------------------------------------------------------------------- */
/*  <SkeletonText>                                                             */
/* -------------------------------------------------------------------------- */

export interface SkeletonTextProps {
  /** Number of text lines. Defaults to 3. */
  lines?: number
  /** Width of the LAST line as a Tailwind class. Defaults to `w-2/3`. */
  lastLineWidth?: string
  /** Width applied to every full line. Defaults to `w-full`. */
  width?: string
  /** Per-line height — Tailwind class. Defaults to `h-3`. */
  lineHeight?: string
  /** Gap between lines — Tailwind class. Defaults to `space-y-2`. */
  gap?: string
  className?: string
}

/** Paragraph placeholder — N lines with a shorter trailing line. */
export function SkeletonText({
  lines = 3,
  lastLineWidth = 'w-2/3',
  width = 'w-full',
  lineHeight = 'h-3',
  gap = 'space-y-2',
  className,
}: SkeletonTextProps) {
  const safeLines = Math.max(1, lines)
  return (
    <div
      data-slot="skeleton-text"
      aria-hidden
      className={cn(gap, className)}
    >
      {Array.from({ length: safeLines }).map((_, i) => {
        const isLast = i === safeLines - 1 && safeLines > 1
        return (
          <div
            key={i}
            className={cn(
              SKELETON_BASE,
              lineHeight,
              isLast ? lastLineWidth : width,
            )}
          />
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Aggregated namespace export — `<Skeleton.Bar/Circle/…>`                    */
/* -------------------------------------------------------------------------- */

/**
 * Namespace alias so consumers can write
 *   `import { SkeletonAtoms as S } from '@/components/ui/skeletons/atoms'`
 *   `<S.Bar />` `<S.Circle />` `<S.Image />` `<S.Text />`
 */
export const SkeletonAtoms = {
  Bar: SkeletonBar,
  Circle: SkeletonCircle,
  Image: SkeletonImage,
  Text: SkeletonText,
}
