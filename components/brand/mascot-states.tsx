/**
 * NIVY - PandaMascot
 * ==================
 *
 * The expressive variant of the panda — used in empty states, error
 * dialogs, onboarding screens, and confirmation flows. Sits on top of
 * `PandaIcon` and adds size + decorative props (sparkles, sweat, Z's).
 *
 * Pair with one line of microcopy in the active locale, never with a
 * full paragraph. The mascot carries the emotion; the copy carries the
 * action.
 */

import { cn } from '@/lib/utils'
import { PandaIcon } from './panda-logo'

export type MascotState = 'happy' | 'celebrating' | 'confused' | 'sad' | 'sleeping'

const sizeMap = {
  sm: 64,
  md: 96,
  lg: 144,
  xl: 200,
} as const

type MascotSize = keyof typeof sizeMap

interface PandaMascotProps {
  state?: MascotState
  size?: MascotSize
  className?: string
  /** Animation defaults to on, but defers to motion-reduce. */
  animated?: boolean
  /** Optional accessible label that replaces the silent decorative default. */
  label?: string
}

export function PandaMascot({
  state = 'happy',
  size = 'md',
  className,
  animated = true,
  label,
}: PandaMascotProps) {
  const px = sizeMap[size]
  const decorations = decorationsFor(state)

  return (
    <span
      className={cn('relative inline-block', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ width: px, height: px }}
    >
      <PandaIcon
        size={px}
        expression={state}
        animated={animated && (state === 'celebrating' || state === 'happy')}
      />

      {decorations.map((d, i) => (
        <span
          key={i}
          className={cn(
            'absolute select-none pointer-events-none',
            animated && 'motion-safe:animate-pulse',
            d.className,
          )}
          style={{
            top: d.top,
            left: d.left,
            right: d.right,
            fontSize: px * 0.28,
          }}
          aria-hidden="true"
        >
          {d.symbol}
        </span>
      ))}
    </span>
  )
}

function decorationsFor(state: MascotState) {
  switch (state) {
    case 'celebrating':
      return [
        { symbol: '🎉', top: '-8%', left: '-10%', className: 'motion-safe:animate-bounce' },
        { symbol: '✨', top: '0%', right: '-8%', className: '' },
        { symbol: '🔥', top: '70%', right: '-6%', className: '' },
      ]
    case 'sleeping':
      return [
        { symbol: 'z', top: '-2%', right: '-2%', className: 'opacity-60' },
        { symbol: 'Z', top: '-15%', right: '-14%', className: 'opacity-80' },
      ]
    case 'sad':
      return [{ symbol: '💧', top: '40%', left: '14%', className: 'opacity-80' }]
    case 'confused':
      return [{ symbol: '?', top: '-12%', right: '-2%', className: 'font-black opacity-90' }]
    case 'happy':
    default:
      return []
  }
}
