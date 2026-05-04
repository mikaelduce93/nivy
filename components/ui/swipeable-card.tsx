"use client"

import * as React from "react"
import { motion, useMotionValue, useTransform, animate, PanInfo, AnimatePresence } from "framer-motion"
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

interface SwipeableCardProps {
  children: React.ReactNode
  className?: string
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  /** Threshold in pixels to trigger swipe action */
  threshold?: number
  /** Enable vertical swiping */
  enableVertical?: boolean
  /** Enable horizontal swiping */
  enableHorizontal?: boolean
}

export function SwipeableCard({
  children,
  className,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  threshold = 100,
  enableVertical = false,
  enableHorizontal = true,
}: SwipeableCardProps) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  
  // Opacity based on swipe distance
  const opacity = useTransform(
    x,
    [-threshold * 2, 0, threshold * 2],
    [0.5, 1, 0.5]
  )
  
  // Rotate slightly on horizontal swipe
  const rotate = useTransform(x, [-threshold, 0, threshold], [-5, 0, 5])

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info
    
    // Horizontal swipes
    if (enableHorizontal) {
      if (offset.x > threshold || (offset.x > 50 && velocity.x > 500)) {
        onSwipeRight?.()
      } else if (offset.x < -threshold || (offset.x < -50 && velocity.x < -500)) {
        onSwipeLeft?.()
      }
    }
    
    // Vertical swipes
    if (enableVertical && offset.y < -threshold) {
      onSwipeUp?.()
    }
    
    // Animate back to center
    animate(x, 0, { type: "spring", stiffness: 500, damping: 30 })
    animate(y, 0, { type: "spring", stiffness: 500, damping: 30 })
  }

  return (
    <motion.div
      className={cn("touch-pan-y", className)}
      style={{ x, y, opacity, rotate }}
      drag={enableHorizontal ? "x" : enableVertical ? "y" : false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
    >
      {children}
    </motion.div>
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
          "fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-zinc-900 border-t border-white/10",
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
          className="absolute bottom-0 h-0.5 bg-gradient-to-r from-gen-z-lavender to-gen-z-coral"
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
