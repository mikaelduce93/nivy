'use client'

import * as React from 'react'
import { motion, useMotionValue, useTransform, animate, useInView } from 'framer-motion'
import { cn } from '@/lib/utils'

/* ==========================================================================
   TEXT EFFECTS - Silicon Valley Grade
   
   Premium text animation components:
   - GradientText: Animated gradient text
   - GlowText: Glowing text effect
   - ScrambleText: Scrambling number/text effect
   - TypewriterText: Typewriter animation
   - CountUpText: Animated number counting
   - SplitText: Character-by-character animation
   - WaveText: Wavy text animation
   - ShimmerText: Shimmer highlight effect
   ========================================================================== */

/* ==========================================================================
   GRADIENT TEXT - Animated color gradient
   ========================================================================== */

interface GradientTextProps {
  children: string
  colors?: string[]
  speed?: number
  className?: string
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p'
}

export function GradientText({
  children,
  colors = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6'],
  speed = 3,
  className,
  as: Component = 'span',
}: GradientTextProps) {
  const gradientString = colors.join(', ')
  
  return (
    <Component className={cn('relative inline-block', className)}>
      <motion.span
        className="bg-clip-text text-transparent"
        style={{
          backgroundImage: `linear-gradient(90deg, ${gradientString})`,
          backgroundSize: '300% 100%',
        }}
        animate={{
          backgroundPosition: ['0% 0%', '100% 0%', '0% 0%'],
        }}
        transition={{
          duration: speed,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        {children}
      </motion.span>
    </Component>
  )
}

/* ==========================================================================
   GLOW TEXT - Text with animated glow
   ========================================================================== */

interface GlowTextProps {
  children: string
  color?: string
  intensity?: 'subtle' | 'medium' | 'strong'
  pulse?: boolean
  className?: string
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p'
}

export function GlowText({
  children,
  color = '#8b5cf6',
  intensity = 'medium',
  pulse = true,
  className,
  as: Component = 'span',
}: GlowTextProps) {
  const glowSizes = {
    subtle: '10px',
    medium: '20px',
    strong: '30px',
  }

  return (
    <Component className={cn('relative inline-block', className)}>
      <motion.span
        style={{
          textShadow: `0 0 ${glowSizes[intensity]} ${color}`,
        }}
        animate={pulse ? {
          textShadow: [
            `0 0 ${glowSizes[intensity]} ${color}`,
            `0 0 calc(${glowSizes[intensity]} * 1.5) ${color}`,
            `0 0 ${glowSizes[intensity]} ${color}`,
          ],
        } : {}}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {children}
      </motion.span>
    </Component>
  )
}

/* ==========================================================================
   SCRAMBLE TEXT - Text/number scrambling effect
   ========================================================================== */

interface ScrambleTextProps {
  children: string
  trigger?: boolean
  scrambleChars?: string
  duration?: number
  className?: string
  as?: 'span' | 'div' | 'p'
}

export function ScrambleText({
  children,
  trigger = true,
  scrambleChars = '!@#$%^&*()_+-=[]{}|;:,.<>?0123456789',
  duration = 1000,
  className,
  as: Component = 'span',
}: ScrambleTextProps) {
  const [displayText, setDisplayText] = React.useState(children)
  const targetText = children
  const intervalRef = React.useRef<NodeJS.Timeout | undefined>(undefined)

  React.useEffect(() => {
    if (!trigger) {
      setDisplayText(targetText)
      return
    }

    let iteration = 0
    const totalIterations = Math.ceil(duration / 30)
    
    clearInterval(intervalRef.current)
    
    intervalRef.current = setInterval(() => {
      setDisplayText(
        targetText
          .split('')
          .map((char, index) => {
            if (char === ' ') return ' '
            if (index < Math.floor((iteration / totalIterations) * targetText.length)) {
              return targetText[index]
            }
            return scrambleChars[Math.floor(Math.random() * scrambleChars.length)]
          })
          .join('')
      )
      
      iteration++
      
      if (iteration >= totalIterations) {
        clearInterval(intervalRef.current)
        setDisplayText(targetText)
      }
    }, 30)

    return () => clearInterval(intervalRef.current)
  }, [trigger, targetText, scrambleChars, duration])

  return (
    <Component className={cn('font-mono', className)}>
      {displayText}
    </Component>
  )
}

/* ==========================================================================
   TYPEWRITER TEXT - Typewriter effect
   ========================================================================== */

interface TypewriterTextProps {
  children: string
  speed?: number
  delay?: number
  cursor?: boolean
  cursorChar?: string
  onComplete?: () => void
  className?: string
  as?: 'span' | 'div' | 'p'
}

export function TypewriterText({
  children,
  speed = 50,
  delay = 0,
  cursor = true,
  cursorChar = '|',
  onComplete,
  className,
  as: Component = 'span',
}: TypewriterTextProps) {
  const [displayText, setDisplayText] = React.useState('')
  const [showCursor, setShowCursor] = React.useState(cursor)
  
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      let index = 0
      const interval = setInterval(() => {
        setDisplayText(children.slice(0, index + 1))
        index++
        
        if (index >= children.length) {
          clearInterval(interval)
          onComplete?.()
        }
      }, speed)

      return () => clearInterval(interval)
    }, delay)

    return () => clearTimeout(timeout)
  }, [children, speed, delay, onComplete])

  return (
    <Component className={className}>
      {displayText}
      {showCursor && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        >
          {cursorChar}
        </motion.span>
      )}
    </Component>
  )
}

/* ==========================================================================
   COUNT UP TEXT - Animated number counting
   ========================================================================== */

interface CountUpTextProps {
  value: number
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
  separator?: string
  className?: string
  triggerOnView?: boolean
}

export function CountUpText({
  value,
  duration = 2,
  decimals = 0,
  prefix = '',
  suffix = '',
  separator = ',',
  className,
  triggerOnView = true,
}: CountUpTextProps) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const count = useMotionValue(0)
  const rounded = useTransform(count, (latest) => {
    const formatted = latest.toFixed(decimals)
    // Add thousand separators
    const parts = formatted.split('.')
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator)
    return parts.join('.')
  })
  const [displayValue, setDisplayValue] = React.useState('0')

  React.useEffect(() => {
    if (triggerOnView && !isInView) return
    
    const controls = animate(count, value, {
      duration,
      ease: [0.23, 1, 0.32, 1],
    })

    const unsubscribe = rounded.on('change', (v) => setDisplayValue(v))

    return () => {
      controls.stop()
      unsubscribe()
    }
  }, [value, duration, count, rounded, isInView, triggerOnView])

  return (
    <span ref={ref} className={cn('font-mono tabular-nums', className)}>
      {prefix}{displayValue}{suffix}
    </span>
  )
}

/* ==========================================================================
   SPLIT TEXT - Character-by-character animation
   ========================================================================== */

interface SplitTextProps {
  children: string
  delay?: number
  stagger?: number
  className?: string
  charClassName?: string
  animation?: 'fade' | 'slide' | 'scale' | 'rotate'
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p'
}

export function SplitText({
  children,
  delay = 0,
  stagger = 0.03,
  className,
  charClassName,
  animation = 'fade',
  as: Component = 'span',
}: SplitTextProps) {
  const variants = {
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
    },
    slide: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
    },
    scale: {
      initial: { opacity: 0, scale: 0 },
      animate: { opacity: 1, scale: 1 },
    },
    rotate: {
      initial: { opacity: 0, rotate: -90 },
      animate: { opacity: 1, rotate: 0 },
    },
  }

  const chars = children.split('')

  return (
    <Component className={cn('inline-flex flex-wrap', className)}>
      {chars.map((char, index) => (
        <motion.span
          key={index}
          initial={variants[animation].initial}
          animate={variants[animation].animate}
          transition={{
            duration: 0.4,
            delay: delay + index * stagger,
            ease: [0.23, 1, 0.32, 1],
          }}
          className={cn('inline-block', charClassName)}
          style={{ whiteSpace: char === ' ' ? 'pre' : 'normal' }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </Component>
  )
}

/* ==========================================================================
   WAVE TEXT - Wavy text animation
   ========================================================================== */

interface WaveTextProps {
  children: string
  amplitude?: number
  frequency?: number
  speed?: number
  className?: string
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p'
}

export function WaveText({
  children,
  amplitude = 5,
  frequency = 0.5,
  speed = 2,
  className,
  as: Component = 'span',
}: WaveTextProps) {
  const chars = children.split('')

  return (
    <Component className={cn('inline-flex', className)}>
      {chars.map((char, index) => (
        <motion.span
          key={index}
          className="inline-block"
          animate={{
            y: [0, -amplitude, 0, amplitude, 0],
          }}
          transition={{
            duration: speed,
            repeat: Infinity,
            delay: index * frequency * 0.1,
            ease: 'easeInOut',
          }}
          style={{ whiteSpace: char === ' ' ? 'pre' : 'normal' }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </Component>
  )
}

/* ==========================================================================
   SHIMMER TEXT - Shimmer highlight effect
   ========================================================================== */

interface ShimmerTextProps {
  children: string
  color?: string
  speed?: number
  className?: string
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p'
}

export function ShimmerText({
  children,
  color = 'rgba(255, 255, 255, 0.3)',
  speed = 2,
  className,
  as: Component = 'span',
}: ShimmerTextProps) {
  return (
    <Component className={cn('relative inline-block overflow-hidden', className)}>
      <span className="relative z-10">{children}</span>
      <motion.span
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${color} 50%, transparent 100%)`,
          backgroundSize: '200% 100%',
        }}
        animate={{
          backgroundPosition: ['-100% 0%', '200% 0%'],
        }}
        transition={{
          duration: speed,
          repeat: Infinity,
          repeatDelay: 1,
          ease: 'linear',
        }}
      />
    </Component>
  )
}

/* ==========================================================================
   HIGHLIGHT TEXT - Highlighted text with animation
   ========================================================================== */

interface HighlightTextProps {
  children: string
  color?: string
  delay?: number
  className?: string
  as?: 'span' | 'mark'
}

export function HighlightText({
  children,
  color = '#8b5cf620',
  delay = 0,
  className,
  as: Component = 'mark',
}: HighlightTextProps) {
  return (
    <Component
      className={cn('relative inline-block bg-transparent', className)}
    >
      <motion.span
        className="absolute inset-0 -z-10 rounded"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{
          duration: 0.6,
          delay,
          ease: [0.23, 1, 0.32, 1],
        }}
        style={{ transformOrigin: 'left', backgroundColor: color }}
      />
      {children}
    </Component>
  )
}
