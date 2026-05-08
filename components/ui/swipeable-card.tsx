"use client"

import * as React from "react"
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  useReducedMotion,
  PanInfo,
  AnimatePresence,
} from "framer-motion"
import { cn } from "@/lib/utils"

/* ==========================================================================
   SWIPEABLE COMPONENTS - Silicon Valley Grade Mobile Experience
   
   Premium touch interactions:
   - SwipeableCard: Swipe gestures on cards
   - SwipeTabs: Swipeable tab navigation
   - HorizontalScroll: Momentum scrolling
   - PullToRefresh: Custom refresh animation
   - BottomSheet: iOS-style bottom sheets
   - SwipeableList: Swipe actions on list items
   ========================================================================== */

/* ==========================================================================
   SWIPEABLE CARD
   ========================================================================== */

/**
 * SwipeableCard — TICKET-038 (Wave 2)
 * ===================================
 *
 * Drag-to-dismiss horizontal gesture primitive.
 *
 * - `dismissThreshold` is a ratio of container width that triggers dismiss
 *   (default 0.3 — 30 %, per TICKET-038 acceptance).
 * - `onSwipeDelete` fires when the threshold is crossed in any allowed
 *   direction. `onSwipeLeft` / `onSwipeRight` fire instead/also if you need
 *   per-side actions (e.g. accept-on-left, dismiss-on-right for friend
 *   requests).
 * - `direction` restricts which way the user can swipe.
 * - Reveal layers (`leftAction`, `rightAction`) render behind the card and
 *   fade in proportional to drag distance.
 * - `prefers-reduced-motion: reduce` disables the spring — the card snaps
 *   to its rest or exit position with no easing.
 *
 * Backward-compat: `threshold` (number in px) is still accepted as a soft
 * trigger for `onSwipeLeft` / `onSwipeRight` when no `onSwipeDelete` is
 * provided (legacy SwipeTabs / list-item usages).
 */
interface SwipeableCardProps {
  children: React.ReactNode
  className?: string
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  /** Fires when the swipe crosses dismissThreshold in any allowed direction. */
  onSwipeDelete?: (direction: "left" | "right") => void
  /** Pixel threshold used by legacy onSwipeLeft / onSwipeRight detection. */
  threshold?: number
  /** Ratio of container width (0–1) that triggers dismiss. Default: 0.3. */
  dismissThreshold?: number
  /** Allowed swipe direction for dismiss. Default: "both". */
  direction?: "left" | "right" | "both"
  /** Optional reveal layer rendered behind the card on left swipe. */
  leftAction?: React.ReactNode
  /** Optional reveal layer rendered behind the card on right swipe. */
  rightAction?: React.ReactNode
  /** Enable vertical swiping (legacy). */
  enableVertical?: boolean
  /** Enable horizontal swiping. Default true. */
  enableHorizontal?: boolean
  /** Disable gesture entirely (e.g. while an action is mid-flight). */
  disabled?: boolean
}

export function SwipeableCard({
  children,
  className,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDelete,
  threshold = 100,
  dismissThreshold = 0.3,
  direction = "both",
  leftAction,
  rightAction,
  enableVertical = false,
  enableHorizontal = true,
  disabled = false,
}: SwipeableCardProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const prefersReducedMotion = useReducedMotion()
  const [isExiting, setIsExiting] = React.useState(false)

  // Fade slightly past 60 % of width so partial drags stay fully visible.
  const opacity = useTransform(x, (v) => {
    const w = containerRef.current?.clientWidth ?? 320
    return Math.max(0.4, 1 - Math.max(0, Math.abs(v) / w - 0.6))
  })

  // Reveal-layer opacities track drag distance against the dismiss threshold.
  const leftRevealOpacity = useTransform(x, (v) => {
    if (v >= 0) return 0
    const w = containerRef.current?.clientWidth ?? 320
    return Math.min(1, Math.abs(v) / Math.max(1, w * dismissThreshold))
  })
  const rightRevealOpacity = useTransform(x, (v) => {
    if (v <= 0) return 0
    const w = containerRef.current?.clientWidth ?? 320
    return Math.min(1, v / Math.max(1, w * dismissThreshold))
  })

  // Legacy "tinder-like" rotation only when no dismiss/reveal is configured.
  const legacyMode = !onSwipeDelete && !leftAction && !rightAction
  const rotate = useTransform(x, [-threshold, 0, threshold], [-5, 0, 5])

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (disabled) return
    const { offset, velocity } = info
    const w = containerRef.current?.clientWidth ?? 320
    const ratio = Math.abs(offset.x) / Math.max(1, w)

    // ----- Dismiss when ratio crosses dismissThreshold or velocity is high.
    const dismissTriggered =
      enableHorizontal && (ratio >= dismissThreshold || Math.abs(velocity.x) > 800)

    if (dismissTriggered && onSwipeDelete) {
      const dir: "left" | "right" = offset.x < 0 ? "left" : "right"
      const allowed =
        direction === "both" ||
        (direction === "left" && dir === "left") ||
        (direction === "right" && dir === "right")

      if (allowed) {
        if (dir === "left") onSwipeLeft?.()
        else onSwipeRight?.()
        onSwipeDelete(dir)

        const target = dir === "left" ? -w * 1.2 : w * 1.2
        if (prefersReducedMotion) {
          x.set(target)
        } else {
          animate(x, target, { type: "spring", stiffness: 500, damping: 40 })
        }
        setIsExiting(true)
        return
      }
    }

    // ----- Legacy px-threshold callbacks (kept for back-compat) -----
    if (enableHorizontal && !onSwipeDelete) {
      if (offset.x > threshold || (offset.x > 50 && velocity.x > 500)) {
        onSwipeRight?.()
      } else if (offset.x < -threshold || (offset.x < -50 && velocity.x < -500)) {
        onSwipeLeft?.()
      }
    }

    if (enableVertical && offset.y < -threshold) {
      onSwipeUp?.()
    }

    // Spring back to rest (or snap if reduced-motion).
    if (prefersReducedMotion) {
      x.set(0)
      y.set(0)
    } else {
      animate(x, 0, { type: "spring", stiffness: 500, damping: 30 })
      animate(y, 0, { type: "spring", stiffness: 500, damping: 30 })
    }
  }

  if (disabled) {
    return (
      <div ref={containerRef} className={className}>
        {children}
      </div>
    )
  }

  // dragConstraints lock the swipe to allowed direction(s) when dismiss is on.
  const dragConstraints =
    onSwipeDelete && direction === "left"
      ? { left: -10000, right: 0, top: 0, bottom: 0 }
      : onSwipeDelete && direction === "right"
        ? { left: 0, right: 10000, top: 0, bottom: 0 }
        : { left: 0, right: 0, top: 0, bottom: 0 }

  return (
    <div ref={containerRef} className={cn("relative isolate", className)}>
      {/* Reveal layers */}
      {leftAction && (
        <motion.div
          aria-hidden="true"
          style={{ opacity: leftRevealOpacity }}
          className="absolute inset-0 flex items-center justify-end pr-6 pointer-events-none rounded-2xl"
        >
          {leftAction}
        </motion.div>
      )}
      {rightAction && (
        <motion.div
          aria-hidden="true"
          style={{ opacity: rightRevealOpacity }}
          className="absolute inset-0 flex items-center justify-start pl-6 pointer-events-none rounded-2xl"
        >
          {rightAction}
        </motion.div>
      )}

      <motion.div
        className={cn("touch-pan-y will-change-transform", isExiting && "pointer-events-none")}
        style={{ x, y, opacity, rotate: legacyMode ? rotate : 0 }}
        drag={enableHorizontal ? "x" : enableVertical ? "y" : false}
        dragConstraints={dragConstraints}
        dragElastic={legacyMode ? 0.7 : 0.2}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        animate={isExiting ? { opacity: 0 } : undefined}
        transition={prefersReducedMotion ? { duration: 0 } : undefined}
      >
        {children}
      </motion.div>
    </div>
  )
}

/* ==========================================================================
   HORIZONTAL SCROLL CONTAINER
   ========================================================================== */

interface HorizontalScrollProps {
  children: React.ReactNode
  className?: string
  /** Gap between items */
  gap?: number
  /** Padding on sides */
  padding?: number
  /** Show scroll indicators */
  showIndicators?: boolean
}

export function HorizontalScroll({
  children,
  className,
  gap = 16,
  padding = 16,
  showIndicators = false,
}: HorizontalScrollProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = React.useState(false)
  const [canScrollRight, setCanScrollRight] = React.useState(false)

  const checkScroll = React.useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    
    setCanScrollLeft(el.scrollLeft > 0)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1)
  }, [])

  React.useEffect(() => {
    checkScroll()
    const el = scrollRef.current
    if (!el) return
    
    el.addEventListener("scroll", checkScroll)
    window.addEventListener("resize", checkScroll)
    
    return () => {
      el.removeEventListener("scroll", checkScroll)
      window.removeEventListener("resize", checkScroll)
    }
  }, [checkScroll])

  return (
    <div className={cn("relative", className)}>
      <div
        ref={scrollRef}
        className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory"
        style={{ 
          gap: `${gap}px`,
          paddingLeft: `${padding}px`,
          paddingRight: `${padding}px`,
        }}
      >
        {React.Children.map(children, (child, index) => (
          <div className="flex-shrink-0 snap-start" key={index}>
            {child}
          </div>
        ))}
      </div>
      
      {showIndicators && (
        <>
          {/* Left fade indicator */}
          <div
            className={cn(
              "absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black/50 to-transparent pointer-events-none transition-opacity",
              canScrollLeft ? "opacity-100" : "opacity-0"
            )}
          />
          {/* Right fade indicator */}
          <div
            className={cn(
              "absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/50 to-transparent pointer-events-none transition-opacity",
              canScrollRight ? "opacity-100" : "opacity-0"
            )}
          />
        </>
      )}
    </div>
  )
}

/* ==========================================================================
   PULL TO REFRESH
   ========================================================================== */

interface PullToRefreshProps {
  children: React.ReactNode
  className?: string
  onRefresh: () => Promise<void>
  /** Pull distance to trigger refresh */
  threshold?: number
  /** Enable/disable the feature */
  enabled?: boolean
}

export function PullToRefresh({
  children,
  className,
  onRefresh,
  threshold = 80,
  enabled = true,
}: PullToRefreshProps) {
  const [, setIsPulling] = React.useState(false)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const pullY = useMotionValue(0)
  const pullProgress = useTransform(pullY, [0, threshold], [0, 1])
  const rotate = useTransform(pullY, [0, threshold], [0, 180])
  
  const handleDragEnd = async (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!enabled || isRefreshing) return
    
    if (info.offset.y > threshold) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }
    
    animate(pullY, 0, { type: "spring", stiffness: 400, damping: 30 })
    setIsPulling(false)
  }

  if (!enabled) {
    return <div className={className}>{children}</div>
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Pull indicator */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 top-4 z-50 flex flex-col items-center gap-2"
        style={{ opacity: pullProgress }}
      >
        <motion.div
          className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-lg border border-white/20 flex items-center justify-center"
          style={{ rotate }}
        >
          {isRefreshing ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          )}
        </motion.div>
        <span className="text-xs text-white/60 font-medium">
          {isRefreshing ? "Refreshing..." : "Pull to refresh"}
        </span>
      </motion.div>
      
      {/* Content */}
      <motion.div
        drag={enabled && !isRefreshing ? "y" : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.5, bottom: 0 }}
        onDragStart={() => setIsPulling(true)}
        onDragEnd={handleDragEnd}
        style={{ y: pullY }}
        className="touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  )
}

/* ==========================================================================
   BOTTOM SHEET
   ========================================================================== */

interface BottomSheetProps {
  children: React.ReactNode
  isOpen: boolean
  onClose: () => void
  className?: string
  /** Height when partially open (vh) */
  snapPoints?: number[]
  /** Enable drag to close */
  dragToClose?: boolean
}

export function BottomSheet({
  children,
  isOpen,
  onClose,
  className,
  snapPoints = [50, 90],
  dragToClose = true,
}: BottomSheetProps) {
  const [currentSnap, setCurrentSnap] = React.useState(0)
  const y = useMotionValue(0)
  
  const currentHeight = snapPoints[currentSnap]
  
  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!dragToClose) return
    
    const { offset, velocity } = info
    
    // Swipe down to close
    if (offset.y > 100 || velocity.y > 500) {
      if (currentSnap > 0) {
        setCurrentSnap(currentSnap - 1)
      } else {
        onClose()
      }
      return
    }
    
    // Swipe up to expand
    if (offset.y < -50 && currentSnap < snapPoints.length - 1) {
      setCurrentSnap(currentSnap + 1)
    }
    
    animate(y, 0, { type: "spring", stiffness: 400, damping: 30 })
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Sheet */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        drag={dragToClose ? "y" : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={handleDragEnd}
        style={{ y, height: `${currentHeight}vh` }}
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-zinc-900 border-t border-white/10 pb-[env(safe-area-inset-bottom)]",
          className
        )}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 rounded-full bg-white/20" />
        </div>
        
        {/* Content */}
        <div className="overflow-y-auto h-full pb-safe">
          {children}
        </div>
      </motion.div>
    </>
  )
}

/* ==========================================================================
   SWIPE TABS - Swipeable tab navigation for mobile
   ========================================================================== */

interface SwipeTabsProps {
  tabs: { id: string; label: string; icon?: React.ReactNode }[]
  activeTab: string
  onTabChange: (tabId: string) => void
  children: React.ReactNode[]
  className?: string
  tabsClassName?: string
  contentClassName?: string
  /** Enable haptic feedback */
  haptic?: boolean
  /** Animation duration */
  animationDuration?: number
}

export function SwipeTabs({
  tabs,
  activeTab,
  onTabChange,
  children,
  className,
  tabsClassName,
  contentClassName,
  haptic = true,
  animationDuration = 0.3,
}: SwipeTabsProps) {
  const activeIndex = tabs.findIndex(t => t.id === activeTab)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const [containerWidth, setContainerWidth] = React.useState(0)

  React.useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth)
      }
    }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info
    const swipeThreshold = containerWidth * 0.2
    const velocityThreshold = 500

    let newIndex = activeIndex

    if (offset.x > swipeThreshold || velocity.x > velocityThreshold) {
      // Swipe right - go to previous tab
      newIndex = Math.max(0, activeIndex - 1)
    } else if (offset.x < -swipeThreshold || velocity.x < -velocityThreshold) {
      // Swipe left - go to next tab
      newIndex = Math.min(tabs.length - 1, activeIndex + 1)
    }

    if (newIndex !== activeIndex) {
      if (haptic && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(10)
      }
      onTabChange(tabs[newIndex].id)
    }

    animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 })
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Tab bar */}
      <div 
        className={cn(
          'flex border-b border-white/10 relative overflow-x-auto scrollbar-hide',
          tabsClassName
        )}
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            onClick={() => {
              if (haptic && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                navigator.vibrate(5)
              }
              onTabChange(tab.id)
            }}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors min-w-[80px]',
              activeTab === tab.id
                ? 'text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            {tab.icon}
            <span className="truncate">{tab.label}</span>
          </button>
        ))}
        {/* Active indicator */}
        <motion.div
          className="absolute bottom-0 h-0.5 bg-gradient-to-r from-brand-soft to-accent-soft"
          initial={false}
          animate={{
            left: `${(activeIndex / tabs.length) * 100}%`,
            width: `${100 / tabs.length}%`,
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      </div>

      {/* Content area */}
      <div
        ref={containerRef}
        className={cn('relative overflow-hidden flex-1', contentClassName)}
      >
        <motion.div
          className="flex"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragEnd={handleDragEnd}
          style={{ x }}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {children.map((child, index) => (
              <motion.div
                key={tabs[index]?.id || index}
                className="w-full flex-shrink-0"
                style={{ width: containerWidth || '100%' }}
                initial={{ opacity: 0, x: index > activeIndex ? 50 : -50 }}
                animate={{ 
                  opacity: index === activeIndex ? 1 : 0.5, 
                  x: (index - activeIndex) * (containerWidth || 0),
                  scale: index === activeIndex ? 1 : 0.95,
                }}
                transition={{ duration: animationDuration, ease: [0.23, 1, 0.32, 1] }}
              >
                {child}
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}

/* ==========================================================================
   SWIPEABLE LIST ITEM - List item with swipe actions
   ========================================================================== */

interface SwipeAction {
  id: string
  label: string
  icon?: React.ReactNode
  color: string
  onClick: () => void
}

interface SwipeableListItemProps {
  children: React.ReactNode
  className?: string
  leftActions?: SwipeAction[]
  rightActions?: SwipeAction[]
  /** Threshold to show actions */
  actionThreshold?: number
  /** Auto-close after action */
  autoClose?: boolean
}

export function SwipeableListItem({
  children,
  className,
  leftActions = [],
  rightActions = [],
  actionThreshold = 80,
  autoClose = true,
}: SwipeableListItemProps) {
  const x = useMotionValue(0)
  const [isOpen, setIsOpen] = React.useState<'left' | 'right' | null>(null)

  const leftActionsWidth = leftActions.length * actionThreshold
  const rightActionsWidth = rightActions.length * actionThreshold

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info

    // Swipe right to show left actions
    if (leftActions.length > 0 && (offset.x > actionThreshold || velocity.x > 500)) {
      animate(x, leftActionsWidth, { type: 'spring', stiffness: 400, damping: 30 })
      setIsOpen('left')
      return
    }

    // Swipe left to show right actions
    if (rightActions.length > 0 && (offset.x < -actionThreshold || velocity.x < -500)) {
      animate(x, -rightActionsWidth, { type: 'spring', stiffness: 400, damping: 30 })
      setIsOpen('right')
      return
    }

    // Reset
    animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 })
    setIsOpen(null)
  }

  const handleActionClick = (action: SwipeAction) => {
    action.onClick()
    if (autoClose) {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 })
      setIsOpen(null)
    }
  }

  const close = () => {
    animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 })
    setIsOpen(null)
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Left actions */}
      {leftActions.length > 0 && (
        <div className="absolute left-0 top-0 bottom-0 flex">
          {leftActions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleActionClick(action)}
              className="flex items-center justify-center px-4 h-full"
              style={{ backgroundColor: action.color, width: actionThreshold }}
            >
              <div className="flex flex-col items-center gap-1">
                {action.icon}
                <span className="text-xs font-medium text-white">{action.label}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Right actions */}
      {rightActions.length > 0 && (
        <div className="absolute right-0 top-0 bottom-0 flex">
          {rightActions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleActionClick(action)}
              className="flex items-center justify-center px-4 h-full"
              style={{ backgroundColor: action.color, width: actionThreshold }}
            >
              <div className="flex flex-col items-center gap-1">
                {action.icon}
                <span className="text-xs font-medium text-white">{action.label}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <motion.div
        className="relative bg-zinc-900 z-10"
        drag="x"
        dragConstraints={{
          left: rightActions.length > 0 ? -rightActionsWidth : 0,
          right: leftActions.length > 0 ? leftActionsWidth : 0,
        }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x }}
        onClick={isOpen ? close : undefined}
      >
        {children}
      </motion.div>
    </div>
  )
}

/* ==========================================================================
   useSwipeGesture - Custom hook for swipe detection
   ========================================================================== */

interface SwipeGestureOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  threshold?: number
  enabled?: boolean
}

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  enabled = true,
}: SwipeGestureOptions) {
  const startPos = React.useRef<{ x: number; y: number } | null>(null)

  const handleTouchStart = React.useCallback((e: TouchEvent) => {
    if (!enabled) return
    const touch = e.touches[0]
    startPos.current = { x: touch.clientX, y: touch.clientY }
  }, [enabled])

  const handleTouchEnd = React.useCallback((e: TouchEvent) => {
    if (!enabled || !startPos.current) return
    
    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - startPos.current.x
    const deltaY = touch.clientY - startPos.current.y
    
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)

    // Determine if horizontal or vertical swipe
    if (absX > absY && absX > threshold) {
      if (deltaX > 0) {
        onSwipeRight?.()
      } else {
        onSwipeLeft?.()
      }
    } else if (absY > absX && absY > threshold) {
      if (deltaY > 0) {
        onSwipeDown?.()
      } else {
        onSwipeUp?.()
      }
    }

    startPos.current = null
  }, [enabled, threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown])

  React.useEffect(() => {
    if (!enabled) return
    
    document.addEventListener('touchstart', handleTouchStart)
    document.addEventListener('touchend', handleTouchEnd)
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [enabled, handleTouchStart, handleTouchEnd])

  return { startPos }
}
