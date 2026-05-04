'use client'

import * as React from 'react'
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

/* ==========================================================================
   ELITE CURSOR SYSTEM - Silicon Valley Grade
   
   World-class cursor effects inspired by Linear, Stripe, and Vercel:
   - Custom cursor with context-aware shapes
   - Physics-based cursor trails
   - Spotlight effect that follows cursor
   - Magnetic attraction zones
   - Click ripples with depth
   - Glow aura effect
   - Touch device fallbacks
   ========================================================================== */

// Cursor context for global state
interface CursorState {
  x: number
  y: number
  isPointer: boolean
  isHidden: boolean
  isClicking: boolean
  variant: 'default' | 'pointer' | 'text' | 'grab' | 'grabbing' | 'hidden'
  text?: string
  color?: string
}

interface CursorContextType {
  cursorState: CursorState
  setCursorVariant: (variant: CursorState['variant'], options?: { text?: string; color?: string }) => void
  resetCursor: () => void
}

const CursorContext = React.createContext<CursorContextType | null>(null)

export function useCursor() {
  const context = React.useContext(CursorContext)
  if (!context) {
    return {
      cursorState: { x: 0, y: 0, isPointer: false, isHidden: false, isClicking: false, variant: 'default' as const },
      setCursorVariant: () => {},
      resetCursor: () => {},
    }
  }
  return context
}

/* ==========================================================================
   ELITE CURSOR PROVIDER - Wrap your app with this
   ========================================================================== */

interface EliteCursorProviderProps {
  children: React.ReactNode
  /** Enable custom cursor (disabled on touch devices) */
  enabled?: boolean
  /** Enable cursor trails */
  trails?: boolean
  trailCount?: number
  /** Enable spotlight effect */
  spotlight?: boolean
  spotlightSize?: number
  spotlightColor?: string
  /** Enable glow aura */
  glow?: boolean
  glowColor?: string
  glowSize?: number
  /** Cursor colors */
  cursorColor?: string
  cursorSize?: number
}

export function EliteCursorProvider({
  children,
  enabled = true,
  trails = true,
  trailCount = 8,
  spotlight = true,
  spotlightSize = 400,
  spotlightColor = 'rgba(139, 92, 246, 0.08)',
  glow = true,
  glowColor = 'rgba(139, 92, 246, 0.4)',
  glowSize = 60,
  cursorColor = '#8b5cf6',
  cursorSize = 12,
}: EliteCursorProviderProps) {
  const [isTouchDevice, setIsTouchDevice] = React.useState(false)
  const [cursorState, setCursorState] = React.useState<CursorState>({
    x: 0,
    y: 0,
    isPointer: false,
    isHidden: true,
    isClicking: false,
    variant: 'default',
  })

  // Motion values for smooth cursor movement
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  
  // Spring physics for natural feel
  const springConfig = { damping: 25, stiffness: 300, mass: 0.5 }
  const cursorX = useSpring(mouseX, springConfig)
  const cursorY = useSpring(mouseY, springConfig)
  const spotlightBackground = useTransform(
    [cursorX, cursorY],
    ([x, y]) => `radial-gradient(${spotlightSize}px circle at ${x}px ${y}px, ${spotlightColor}, transparent 60%)`
  )

  // Trail motion values (each with different damping for cascade effect)
  const trailConfigs = React.useMemo(() => 
    Array.from({ length: trailCount }, (_, i) => ({
      damping: 30 + i * 5,
      stiffness: 250 - i * 15,
      mass: 0.3 + i * 0.1,
    })),
    [trailCount]
  )

  // Check for touch device
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    setIsTouchDevice(isTouch)
  }, [])

  // Mouse move handler
  React.useEffect(() => {
    if (isTouchDevice || !enabled) return

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
      setCursorState(prev => ({ ...prev, x: e.clientX, y: e.clientY, isHidden: false }))
    }

    const handleMouseDown = () => {
      setCursorState(prev => ({ ...prev, isClicking: true }))
    }

    const handleMouseUp = () => {
      setCursorState(prev => ({ ...prev, isClicking: false }))
    }

    const handleMouseLeave = () => {
      setCursorState(prev => ({ ...prev, isHidden: true }))
    }

    const handleMouseEnter = () => {
      setCursorState(prev => ({ ...prev, isHidden: false }))
    }

    document.addEventListener('mousemove', handleMouseMove, { passive: true })
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('mouseleave', handleMouseLeave)
    document.addEventListener('mouseenter', handleMouseEnter)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('mouseleave', handleMouseLeave)
      document.removeEventListener('mouseenter', handleMouseEnter)
    }
  }, [isTouchDevice, enabled, mouseX, mouseY])

  // Cursor variant control
  const setCursorVariant = React.useCallback((
    variant: CursorState['variant'],
    options?: { text?: string; color?: string }
  ) => {
    setCursorState(prev => ({
      ...prev,
      variant,
      text: options?.text,
      color: options?.color,
    }))
  }, [])

  const resetCursor = React.useCallback(() => {
    setCursorState(prev => ({
      ...prev,
      variant: 'default',
      text: undefined,
      color: undefined,
    }))
  }, [])

  const contextValue = React.useMemo(() => ({
    cursorState,
    setCursorVariant,
    resetCursor,
  }), [cursorState, setCursorVariant, resetCursor])

  if (isTouchDevice || !enabled) {
    return (
      <CursorContext.Provider value={contextValue}>
        {children}
      </CursorContext.Provider>
    )
  }

  // Cursor size variants
  const sizeVariants = {
    default: cursorSize,
    pointer: cursorSize * 2.5,
    text: 3,
    grab: cursorSize * 1.5,
    grabbing: cursorSize * 1.2,
    hidden: 0,
  }

  return (
    <CursorContext.Provider value={contextValue}>
      {/* Hide default cursor */}
      <style jsx global>{`
        * {
          cursor: none !important;
        }
      `}</style>

      {children}

      {/* Spotlight layer */}
      {spotlight && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-[9997]"
          style={{
            background: spotlightBackground,
          }}
        />
      )}

      {/* Cursor trails */}
      {trails && !cursorState.isHidden && (
        <>
          {trailConfigs.map((config, i) => (
            <CursorTrail
              key={i}
              mouseX={mouseX}
              mouseY={mouseY}
              config={config}
              index={i}
              cursorSize={cursorSize}
              color={cursorState.color || cursorColor}
            />
          ))}
        </>
      )}

      {/* Glow aura */}
      {glow && !cursorState.isHidden && (
        <motion.div
          className="fixed pointer-events-none z-[9998] rounded-full"
          style={{
            x: cursorX,
            y: cursorY,
            width: glowSize,
            height: glowSize,
            background: `radial-gradient(circle, ${cursorState.color || glowColor}, transparent 60%)`,
            translateX: '-50%',
            translateY: '-50%',
          }}
          animate={{
            scale: cursorState.isClicking ? 0.8 : 1,
            opacity: cursorState.isClicking ? 0.6 : 0.4,
          }}
          transition={{ duration: 0.15 }}
        />
      )}

      {/* Main cursor */}
      <AnimatePresence>
        {!cursorState.isHidden && cursorState.variant !== 'hidden' && (
          <motion.div
            className="fixed pointer-events-none z-[9999] flex items-center justify-center"
            style={{
              x: cursorX,
              y: cursorY,
              translateX: '-50%',
              translateY: '-50%',
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: cursorState.isClicking ? 0.85 : 1,
              opacity: 1,
              width: sizeVariants[cursorState.variant],
              height: sizeVariants[cursorState.variant],
            }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 400 }}
          >
            {/* Cursor dot */}
            <motion.div
              className="rounded-full"
              style={{
                backgroundColor: cursorState.color || cursorColor,
                width: '100%',
                height: '100%',
              }}
              animate={{
                boxShadow: cursorState.isClicking 
                  ? `0 0 30px 10px ${cursorState.color || cursorColor}40`
                  : `0 0 15px 5px ${cursorState.color || cursorColor}20`,
              }}
            />

            {/* Cursor ring (for pointer variant) */}
            {cursorState.variant === 'pointer' && (
              <motion.div
                className="absolute inset-0 rounded-full border-2"
                style={{
                  borderColor: cursorState.color || cursorColor,
                }}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
              />
            )}

            {/* Text label */}
            {cursorState.text && (
              <motion.span
                className="absolute left-full ml-3 whitespace-nowrap text-xs font-bold px-2 py-1 rounded-lg"
                style={{
                  backgroundColor: cursorState.color || cursorColor,
                  color: 'white',
                }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                {cursorState.text}
              </motion.span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click ripple effect */}
      <ClickRipple cursorX={cursorX} cursorY={cursorY} isClicking={cursorState.isClicking} color={cursorState.color || cursorColor} />
    </CursorContext.Provider>
  )
}

/* ==========================================================================
   CLICK RIPPLE - Expanding circle on click
   ========================================================================== */

interface ClickRippleProps {
  cursorX: ReturnType<typeof useMotionValue<number>>
  cursorY: ReturnType<typeof useMotionValue<number>>
  isClicking: boolean
  color: string
}

function CursorTrail({
  mouseX,
  mouseY,
  config,
  index,
  cursorSize,
  color,
}: {
  mouseX: ReturnType<typeof useMotionValue<number>>
  mouseY: ReturnType<typeof useMotionValue<number>>
  config: { damping: number; stiffness: number; mass: number }
  index: number
  cursorSize: number
  color: string
}) {
  const x = useSpring(mouseX, config)
  const y = useSpring(mouseY, config)

  return (
    <motion.div
      className="fixed pointer-events-none z-[9998] rounded-full"
      style={{
        x,
        y,
        width: cursorSize * (1 - index * 0.08),
        height: cursorSize * (1 - index * 0.08),
        backgroundColor: color,
        opacity: 0.3 - index * 0.03,
        translateX: '-50%',
        translateY: '-50%',
      }}
    />
  )
}

function ClickRipple({ cursorX, cursorY, isClicking, color }: ClickRippleProps) {
  const [ripples, setRipples] = React.useState<Array<{ id: number; x: number; y: number }>>([])
  const rippleId = React.useRef(0)

  React.useEffect(() => {
    if (isClicking) {
      const x = cursorX.get()
      const y = cursorY.get()
      const newRipple = { id: rippleId.current++, x, y }
      setRipples(prev => [...prev, newRipple])
      
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id))
      }, 600)
    }
  }, [isClicking, cursorX, cursorY])

  return (
    <AnimatePresence>
      {ripples.map(ripple => (
        <motion.div
          key={ripple.id}
          className="fixed pointer-events-none z-[9996] rounded-full"
          style={{
            left: ripple.x,
            top: ripple.y,
            translateX: '-50%',
            translateY: '-50%',
            border: `2px solid ${color}`,
          }}
          initial={{ width: 0, height: 0, opacity: 1 }}
          animate={{ width: 80, height: 80, opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      ))}
    </AnimatePresence>
  )
}

/* ==========================================================================
   CURSOR HOVER AREA - Wrapper that changes cursor on hover
   ========================================================================== */

interface CursorHoverAreaProps {
  children: React.ReactNode
  variant?: CursorState['variant']
  text?: string
  color?: string
  className?: string
  /** Magnetic attraction strength (0-1) */
  magnetic?: number
  /** Magnetic distance in pixels */
  magneticDistance?: number
}

export function CursorHoverArea({
  children,
  variant = 'pointer',
  text,
  color,
  className,
  magnetic = 0,
  magneticDistance = 100,
}: CursorHoverAreaProps) {
  const { setCursorVariant, resetCursor, cursorState } = useCursor()
  const ref = React.useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = React.useState(false)

  // Magnetic effect
  const magnetX = useMotionValue(0)
  const magnetY = useMotionValue(0)
  const springX = useSpring(magnetX, { stiffness: 200, damping: 20 })
  const springY = useSpring(magnetY, { stiffness: 200, damping: 20 })

  const handleMouseMove = React.useCallback((e: React.MouseEvent) => {
    if (!ref.current || magnetic <= 0) return
    
    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const distX = e.clientX - centerX
    const distY = e.clientY - centerY
    const dist = Math.sqrt(distX * distX + distY * distY)

    if (dist < magneticDistance) {
      const factor = (1 - dist / magneticDistance) * magnetic * 20
      magnetX.set(distX * factor * 0.1)
      magnetY.set(distY * factor * 0.1)
    }
  }, [magnetic, magneticDistance, magnetX, magnetY])

  const handleMouseEnter = () => {
    setIsHovered(true)
    setCursorVariant(variant, { text, color })
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    resetCursor()
    magnetX.set(0)
    magnetY.set(0)
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      style={{
        x: magnetic > 0 ? springX : 0,
        y: magnetic > 0 ? springY : 0,
      }}
    >
      {children}
    </motion.div>
  )
}

/* ==========================================================================
   SPOTLIGHT CARD - Card with cursor-following spotlight
   ========================================================================== */

interface SpotlightCardProps {
  children: React.ReactNode
  className?: string
  spotlightColor?: string
  spotlightSize?: number
  borderGlow?: boolean
}

export function SpotlightCard({
  children,
  className,
  spotlightColor = 'rgba(139, 92, 246, 0.15)',
  spotlightSize = 300,
  borderGlow = true,
}: SpotlightCardProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const [isHovered, setIsHovered] = React.useState(false)
  const spotlightBackground = useTransform(
    [mouseX, mouseY],
    ([x, y]) => `radial-gradient(${spotlightSize}px circle at ${x}px ${y}px, ${spotlightColor}, transparent 60%)`
  )
  const borderGlowBackground = useTransform(
    [mouseX, mouseY],
    ([x, y]) => `radial-gradient(${spotlightSize / 2}px circle at ${x}px ${y}px, ${spotlightColor.replace('0.15', '0.4')}, transparent 50%)`
  )

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    mouseX.set(e.clientX - rect.left)
    mouseY.set(e.clientY - rect.top)
  }

  return (
    <motion.div
      ref={ref}
      className={cn('relative overflow-hidden', className)}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Spotlight gradient */}
      <motion.div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background: spotlightBackground,
        }}
      />

      {/* Border glow effect */}
      {borderGlow && (
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-[inherit]"
        style={{
          opacity: isHovered ? 1 : 0,
          background: borderGlowBackground,
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
            padding: '1px',
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}

/* ==========================================================================
   EXPORTS
   ========================================================================== */

export { CursorContext }
