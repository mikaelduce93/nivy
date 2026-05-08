'use client'

/**
 * TabsAnimated — Animated tabs primitive on top of Radix Tabs.
 *
 * Implements TICKET-013 (Wave 1 / W1-A6).
 *
 * Design language inspired by Linear / Arc (sliding indicator) + Wave β
 * <DefiCard> (rounded-2xl, semantic tokens, gradient accents).
 *
 * Variants:
 *   - "pill"   : rounded-full container, active tab gets a filled pill that
 *                slides between positions via shared `layoutId="tab-pill"`.
 *   - "line"   : minimal underline that morphs between active triggers.
 *   - "card"   : raised active card with shadow (Arc-style).
 *
 * Sizes: sm / md / lg.
 *
 * Accessibility:
 *   - Built on Radix Tabs: full keyboard nav, ARIA, focus management.
 *   - prefers-reduced-motion → indicator snaps instantly (no spring), content
 *     fade is removed; behaviour still 100% functional.
 *
 * Usage:
 *   <TabsAnimated.Root defaultValue="quizzes" variant="pill" size="md">
 *     <TabsAnimated.List>
 *       <TabsAnimated.Trigger value="quizzes">Quiz</TabsAnimated.Trigger>
 *       <TabsAnimated.Trigger value="missions">Missions</TabsAnimated.Trigger>
 *     </TabsAnimated.List>
 *     <TabsAnimated.Content value="quizzes">…</TabsAnimated.Content>
 *     <TabsAnimated.Content value="missions">…</TabsAnimated.Content>
 *   </TabsAnimated.Root>
 *
 * NOTE: W1-A5 is building a unified <Motion> wrapper that respects
 * reduced-motion centrally. Until it lands we import framer-motion directly
 * and consult `usePrefersReducedMotion()` from `components/ui/motion`.
 * TODO(W1-A5): swap `motion` import → `Motion as motion` from
 * `@/components/ui/motion` once the wrapper API is finalised.
 */

import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { motion, MotionConfig } from 'framer-motion'

import { cn } from '@/lib/utils'
import { usePrefersReducedMotion } from '@/components/ui/motion'

/* ==========================================================================
   TYPES
   ========================================================================== */

export type TabsAnimatedVariant = 'pill' | 'line' | 'card'
export type TabsAnimatedSize = 'sm' | 'md' | 'lg'

interface TabsAnimatedContextValue {
  variant: TabsAnimatedVariant
  size: TabsAnimatedSize
  /** Stable id used by `layoutId` so multiple TabsAnimated coexist on a page. */
  layoutGroupId: string
  reducedMotion: boolean
}

const TabsAnimatedContext = React.createContext<TabsAnimatedContextValue | null>(null)

function useTabsAnimatedContext(component: string): TabsAnimatedContextValue {
  const ctx = React.useContext(TabsAnimatedContext)
  if (!ctx) {
    throw new Error(
      `<TabsAnimated.${component}> must be used inside <TabsAnimated.Root>.`,
    )
  }
  return ctx
}

/* ==========================================================================
   STYLE TABLES (semantic tokens only)
   ========================================================================== */

const LIST_BASE =
  'relative inline-flex items-center w-fit max-w-full overflow-x-auto no-scrollbar'

const LIST_VARIANT: Record<TabsAnimatedVariant, string> = {
  pill: 'gap-1 rounded-full bg-muted/60 backdrop-blur-sm border border-border/40',
  line: 'gap-2 border-b border-border/60 rounded-none',
  card: 'gap-1 rounded-2xl bg-muted/40 border border-border/40 backdrop-blur-sm',
}

const LIST_SIZE: Record<TabsAnimatedSize, string> = {
  sm: 'p-0.5',
  md: 'p-1',
  lg: 'p-1.5',
}

const TRIGGER_BASE =
  'relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold ' +
  'transition-colors focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-primary focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-background disabled:pointer-events-none ' +
  'disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 ' +
  '[&_svg:not([class*=size-])]:size-4'

const TRIGGER_VARIANT: Record<TabsAnimatedVariant, string> = {
  pill:
    'rounded-full text-muted-foreground hover:text-foreground ' +
    'data-[state=active]:text-primary-foreground',
  line:
    'rounded-none text-muted-foreground hover:text-foreground ' +
    'data-[state=active]:text-foreground',
  card:
    'rounded-xl text-muted-foreground hover:text-foreground ' +
    'data-[state=active]:text-foreground',
}

const TRIGGER_SIZE: Record<TabsAnimatedSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
}

/* ==========================================================================
   ROOT
   ========================================================================== */

interface RootProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> {
  variant?: TabsAnimatedVariant
  size?: TabsAnimatedSize
  /** Override the auto-generated layoutId namespace for the indicator. */
  layoutGroupId?: string
}

function Root({
  className,
  variant = 'pill',
  size = 'md',
  layoutGroupId,
  ...props
}: RootProps) {
  const generatedId = React.useId()
  const reducedMotion = usePrefersReducedMotion()

  const ctx = React.useMemo<TabsAnimatedContextValue>(
    () => ({
      variant,
      size,
      layoutGroupId: layoutGroupId ?? `tabs-animated-${generatedId}`,
      reducedMotion,
    }),
    [variant, size, layoutGroupId, generatedId, reducedMotion],
  )

  return (
    <TabsAnimatedContext.Provider value={ctx}>
      <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'}>
        <TabsPrimitive.Root
          data-slot="tabs-animated"
          data-variant={variant}
          data-size={size}
          className={cn('flex flex-col gap-3', className)}
          {...props}
        />
      </MotionConfig>
    </TabsAnimatedContext.Provider>
  )
}

/* ==========================================================================
   LIST
   ========================================================================== */

function List({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  const { variant, size } = useTabsAnimatedContext('List')

  return (
    <TabsPrimitive.List
      data-slot="tabs-animated-list"
      className={cn(LIST_BASE, LIST_VARIANT[variant], LIST_SIZE[variant === 'line' ? 'sm' : size], className)}
      {...props}
    />
  )
}

/* ==========================================================================
   TRIGGER (with sliding indicator)
   ========================================================================== */

interface TriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  /** Optional badge rendered after the label. */
  badge?: React.ReactNode
}

const SPRING = { type: 'spring' as const, stiffness: 380, damping: 32, mass: 0.8 }

function Trigger({ className, value, children, badge, ...props }: TriggerProps) {
  const { variant, size, layoutGroupId, reducedMotion } =
    useTabsAnimatedContext('Trigger')

  // We use `data-state` reflection from Radix via a small subscriber pattern:
  // the indicator is rendered conditionally inside the active trigger only.
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const [isActive, setIsActive] = React.useState(false)

  React.useEffect(() => {
    const node = triggerRef.current
    if (!node) return

    const sync = () => setIsActive(node.getAttribute('data-state') === 'active')
    sync()

    const observer = new MutationObserver(sync)
    observer.observe(node, { attributes: true, attributeFilter: ['data-state'] })
    return () => observer.disconnect()
  }, [])

  return (
    <TabsPrimitive.Trigger
      ref={triggerRef}
      value={value}
      data-slot="tabs-animated-trigger"
      className={cn(TRIGGER_BASE, TRIGGER_VARIANT[variant], TRIGGER_SIZE[size], className)}
      {...props}
    >
      {isActive ? (
        <Indicator variant={variant} layoutGroupId={layoutGroupId} reducedMotion={reducedMotion} />
      ) : null}
      <span className="relative z-10 inline-flex items-center gap-2">
        {children}
        {badge != null && (
          <span className="relative z-10 inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-accent-soft px-1.5 text-[10px] font-black leading-none text-foreground">
            {badge}
          </span>
        )}
      </span>
    </TabsPrimitive.Trigger>
  )
}

/* ==========================================================================
   INDICATOR (sliding via shared layoutId)
   ========================================================================== */

interface IndicatorProps {
  variant: TabsAnimatedVariant
  layoutGroupId: string
  reducedMotion: boolean
}

const INDICATOR_VARIANT: Record<TabsAnimatedVariant, string> = {
  pill:
    'absolute inset-0 z-0 rounded-full bg-gradient-to-r from-primary to-primary/85 ' +
    'shadow-[0_4px_14px_-4px_var(--primary,theme(colors.primary.DEFAULT))]',
  line:
    'absolute inset-x-1 -bottom-px z-0 h-0.5 rounded-full bg-gradient-to-r from-primary to-accent-soft',
  card:
    'absolute inset-0 z-0 rounded-xl bg-background border border-border/60 ' +
    'shadow-[0_2px_10px_-2px_rgba(0,0,0,0.08)]',
}

function Indicator({ variant, layoutGroupId, reducedMotion }: IndicatorProps) {
  // Reduced motion: render plain div — no FLIP animation, just a snap.
  if (reducedMotion) {
    return <span aria-hidden className={INDICATOR_VARIANT[variant]} />
  }

  return (
    <motion.span
      aria-hidden
      layoutId={`${layoutGroupId}-indicator`}
      className={INDICATOR_VARIANT[variant]}
      transition={SPRING}
    />
  )
}

/* ==========================================================================
   CONTENT
   ========================================================================== */

function Content({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-animated-content"
      className={cn(
        'flex-1 outline-none focus-visible:ring-2 focus-visible:ring-primary ' +
          'focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg',
        className,
      )}
      {...props}
    />
  )
}

/* ==========================================================================
   PUBLIC API
   ========================================================================== */

export const TabsAnimated = {
  Root,
  List,
  Trigger,
  Content,
}

export type { RootProps as TabsAnimatedRootProps, TriggerProps as TabsAnimatedTriggerProps }
