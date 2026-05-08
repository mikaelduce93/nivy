'use client'

/**
 * NIVY — FLIP list primitives (TICKET-026, Wave 3 / W3-A9)
 * ========================================================
 *
 * Thin framer-motion wrappers that give any reorderable / filterable list
 * smooth FLIP transitions when items are added, removed, sorted or filtered.
 *
 *   - <FlipList>  — container. Pick a tag (`ul`, `ol`, `div`). Internally
 *                    wraps children in <AnimatePresence mode="popLayout">.
 *   - <FlipItem>  — child. motion.* element with `layout`, default enter /
 *                   exit transitions wired to EASE_STANDARD. Honours
 *                   prefers-reduced-motion (instant snap, no layout anim).
 *
 * Usage:
 *
 *   import { FlipList, FlipItem } from '@/lib/motion/flip-list'
 *
 *   <FlipList as="ul" className="space-y-4">
 *     {items.map((it) => (
 *       <FlipItem as="li" key={it.id}>
 *         {renderRow(it)}
 *       </FlipItem>
 *     ))}
 *   </FlipList>
 *
 * The `key` prop is the load-bearing piece — framer-motion uses it to track
 * which DOM node corresponds to which item across renders. Always use a
 * stable id, never the array index.
 */

import * as React from 'react'
import { AnimatePresence, motion, type HTMLMotionProps } from 'framer-motion'
import { usePrefersReducedMotion } from '@/lib/hooks/use-reduced-motion'
import { EASE_STANDARD, DURATION_NORMAL } from './easing'

/* -------------------------------------------------------------------------- */
/* FlipList — container                                                       */
/* -------------------------------------------------------------------------- */

type FlipListTag = 'ul' | 'ol' | 'div'

export interface FlipListProps extends React.HTMLAttributes<HTMLElement> {
  /** HTML element to render. Defaults to "div". */
  as?: FlipListTag
  children?: React.ReactNode
}

/**
 * List container. Wraps children in `<AnimatePresence mode="popLayout">` so
 * exiting items are pulled out of layout flow while remaining items reflow
 * via FLIP. Children should be `<FlipItem>` (or any motion.* element with
 * a stable `key` and the `layout` prop).
 */
export function FlipList({
  as = 'div',
  children,
  ...rest
}: FlipListProps) {
  const Tag = as as React.ElementType
  return (
    <Tag {...rest}>
      <AnimatePresence mode="popLayout" initial={false}>
        {children}
      </AnimatePresence>
    </Tag>
  )
}

/* -------------------------------------------------------------------------- */
/* FlipItem — animated child                                                  */
/* -------------------------------------------------------------------------- */

type FlipItemTag = 'li' | 'div'

export type FlipItemProps = {
  /** HTML element to render. Defaults to "div". Use "li" inside ul/ol. */
  as?: FlipItemTag
} & Omit<HTMLMotionProps<'div'>, 'layout' | 'initial' | 'animate' | 'exit' | 'transition'> & {
  /** Override the layout animation (default true). */
  layout?: HTMLMotionProps<'div'>['layout']
  /** Override default enter/animate/exit if needed. */
  initial?: HTMLMotionProps<'div'>['initial']
  animate?: HTMLMotionProps<'div'>['animate']
  exit?: HTMLMotionProps<'div'>['exit']
  transition?: HTMLMotionProps<'div'>['transition']
}

/**
 * Animated list item. Performs FLIP via `layout`, fades+slides on enter,
 * fades+scales on exit. Always pass a stable `key` from the parent.
 *
 * Reduced-motion: skips layout animation and initial fade — items snap into
 * place instantly so users with vestibular sensitivities aren't disrupted.
 */
export function FlipItem({
  as = 'div',
  children,
  layout: layoutProp,
  initial: initialProp,
  animate: animateProp,
  exit: exitProp,
  transition: transitionProp,
  ...rest
}: FlipItemProps) {
  const reduced = usePrefersReducedMotion()

  const Component = (as === 'li' ? motion.li : motion.div) as React.ElementType

  const layout = reduced ? false : (layoutProp ?? true)
  const initial = reduced ? false : (initialProp ?? { opacity: 0, y: 8 })
  const animate = animateProp ?? { opacity: 1, y: 0 }
  const exit = reduced
    ? { opacity: 0 }
    : (exitProp ?? { opacity: 0, scale: 0.96 })
  const transition =
    transitionProp ?? {
      duration: reduced ? 0 : DURATION_NORMAL,
      ease: EASE_STANDARD,
    }

  return (
    <Component
      layout={layout}
      initial={initial}
      animate={animate}
      exit={exit}
      transition={transition}
      {...rest}
    >
      {children}
    </Component>
  )
}
