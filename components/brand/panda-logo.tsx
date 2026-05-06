/**
 * NIVY - PandaLogo
 * ================
 *
 * The official NIVY mark. A geometric, joyful panda — meant to feel
 * Gen-Z (think Snapchat ghost / Discord wumpus), not WWF mascot.
 *
 * - SVG inline (no asset request, theme-aware via currentColor / CSS vars)
 * - Three variants: `icon` (panda head only), `wordmark` (NIVY type only),
 *   `full` (panda + wordmark). Default = `full`.
 * - Sizes map to a fluid scale; consumers override via `className` if needed.
 *
 * Colour decisions:
 *   - Black ink uses `currentColor` so it inherits text colour (works on
 *     dark + light themes without a fork).
 *   - Cheek/accent uses the brand purple from CSS vars.
 *   - White face stays literal white — pandas are white. Pin a token if
 *     a future mode needs to invert.
 */

import { cn } from '@/lib/utils'

type LogoSize = 'sm' | 'md' | 'lg' | 'xl'
type LogoVariant = 'full' | 'icon' | 'wordmark'

const sizeMap: Record<LogoSize, { wrapper: string; iconBox: number; text: string }> = {
  sm: { wrapper: 'gap-1.5', iconBox: 24, text: 'text-base' },
  md: { wrapper: 'gap-2', iconBox: 36, text: 'text-xl' },
  lg: { wrapper: 'gap-2.5', iconBox: 48, text: 'text-2xl' },
  xl: { wrapper: 'gap-3', iconBox: 72, text: 'text-4xl' },
}

interface PandaLogoProps {
  size?: LogoSize
  variant?: LogoVariant
  /** Add a subtle bounce animation. Disabled by default to respect reduced-motion. */
  animated?: boolean
  className?: string
  /** Accessible label. Defaults to "NIVY". */
  title?: string
}

export function PandaLogo({
  size = 'md',
  variant = 'full',
  animated = false,
  className,
  title = 'NIVY',
}: PandaLogoProps) {
  const s = sizeMap[size]

  return (
    <span
      className={cn('inline-flex items-center', s.wrapper, className)}
      role="img"
      aria-label={title}
    >
      {variant !== 'wordmark' && (
        <PandaIcon size={s.iconBox} animated={animated} />
      )}
      {variant !== 'icon' && (
        <span
          className={cn(
            'font-black tracking-tight leading-none',
            s.text,
            'bg-clip-text text-transparent bg-gradient-to-r from-purple-500 via-fuchsia-500 to-cyan-400',
          )}
        >
          NIVY
        </span>
      )}
    </span>
  )
}

interface PandaIconProps {
  size: number
  animated?: boolean
  className?: string
  /** Override the panda's expression. */
  expression?: 'happy' | 'celebrating' | 'confused' | 'sad' | 'sleeping'
}

/**
 * The naked panda head — useful as an avatar, favicon proxy or empty-state
 * accent without the wordmark. Geometric circles + arcs only, no gradients
 * baked into the path so it stays crisp at any size.
 */
export function PandaIcon({
  size,
  animated = false,
  className,
  expression = 'happy',
}: PandaIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn(animated && 'motion-safe:animate-bounce', className)}
    >
      {/* Ears */}
      <circle cx="14" cy="14" r="8" fill="currentColor" />
      <circle cx="50" cy="14" r="8" fill="currentColor" />
      <circle cx="14" cy="14" r="3.5" fill="#ffd6f5" opacity="0.85" />
      <circle cx="50" cy="14" r="3.5" fill="#ffd6f5" opacity="0.85" />

      {/* Face base — soft white circle */}
      <circle cx="32" cy="34" r="22" fill="#fdfdff" />
      <circle cx="32" cy="34" r="22" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1.5" />

      {/* Cheek blush — brand purple accent */}
      <circle cx="18" cy="40" r="3" fill="#c084fc" opacity="0.55" />
      <circle cx="46" cy="40" r="3" fill="#c084fc" opacity="0.55" />

      {/* Eye patches — the iconic panda smudges, tilted up for joy */}
      <ExpressionEyes expression={expression} />

      {/* Nose */}
      <ellipse cx="32" cy="36" rx="2.4" ry="1.8" fill="currentColor" />

      {/* Mouth */}
      <ExpressionMouth expression={expression} />
    </svg>
  )
}

function ExpressionEyes({ expression }: { expression: PandaIconProps['expression'] }) {
  switch (expression) {
    case 'sleeping':
      return (
        <>
          <path d="M18 28 Q23 31 28 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M36 28 Q41 31 46 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
        </>
      )
    case 'sad':
      return (
        <>
          <ellipse cx="23" cy="30" rx="4.5" ry="6" fill="currentColor" transform="rotate(-25 23 30)" />
          <ellipse cx="41" cy="30" rx="4.5" ry="6" fill="currentColor" transform="rotate(25 41 30)" />
          <circle cx="23" cy="29" r="1.4" fill="#fff" />
          <circle cx="41" cy="29" r="1.4" fill="#fff" />
        </>
      )
    case 'confused':
      return (
        <>
          <ellipse cx="23" cy="29" rx="4.5" ry="5" fill="currentColor" transform="rotate(-15 23 29)" />
          <ellipse cx="41" cy="30" rx="4.5" ry="6" fill="currentColor" transform="rotate(20 41 30)" />
          <circle cx="23" cy="28" r="1.4" fill="#fff" />
          <circle cx="41" cy="29" r="1.4" fill="#fff" />
        </>
      )
    case 'celebrating':
      return (
        <>
          <path d="M19 30 Q23 26 27 30" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M37 30 Q41 26 45 30" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
        </>
      )
    case 'happy':
    default:
      return (
        <>
          <ellipse cx="23" cy="30" rx="5" ry="6" fill="currentColor" transform="rotate(-18 23 30)" />
          <ellipse cx="41" cy="30" rx="5" ry="6" fill="currentColor" transform="rotate(18 41 30)" />
          <circle cx="23.5" cy="29" r="1.6" fill="#fff" />
          <circle cx="41.5" cy="29" r="1.6" fill="#fff" />
        </>
      )
  }
}

function ExpressionMouth({ expression }: { expression: PandaIconProps['expression'] }) {
  switch (expression) {
    case 'sad':
      return (
        <path
          d="M27 44 Q32 41 37 44"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      )
    case 'confused':
      return (
        <path
          d="M27 43 Q32 44 37 41"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      )
    case 'sleeping':
      return (
        <path
          d="M28 43 Q32 45 36 43"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      )
    case 'celebrating':
      return (
        <>
          <path
            d="M26 41 Q32 49 38 41"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="#ff6b9d"
            fillOpacity="0.6"
          />
        </>
      )
    case 'happy':
    default:
      return (
        <path
          d="M27 41 Q32 46 37 41"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      )
  }
}
