"use client"

import * as React from "react"
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion"
import { cn } from "@/lib/utils"

interface ParallaxContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
  /** Disable parallax effects (for mobile/reduced-motion) */
  disabled?: boolean
}

/**
 * A container that provides scroll context for child parallax layers.
 */
export function ParallaxContainer({ children, className, disabled, ...props }: ParallaxContainerProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  
  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      data-parallax-disabled={disabled ? "true" : undefined}
      {...props}
    >
      {children}
    </div>
  )
}

interface ParallaxLayerProps {
  children: React.ReactNode
  className?: string
  /** 
   * Parallax speed factor. 
   * Positive moves with scroll, negative moves against scroll.
   * Typical values: -0.2 to 0.2
   */
  speed?: number
  /** Initial vertical offset */
  offset?: number
}

/**
 * A layer that moves at a different speed relative to scroll.
 */
export function ParallaxLayer({ 
  children, 
  className, 
  speed = 0.1, 
  offset = 0 
}: ParallaxLayerProps) {
  const { scrollY } = useScroll()
  
  // Transform scroll position into vertical movement
  const y = useTransform(scrollY, [0, 1000], [offset, offset + (1000 * speed)])

  return (
    <motion.div
      style={{ y }}
      className={cn("absolute inset-0 pointer-events-none", className)}
    >
      {children}
    </motion.div>
  )
}

interface MouseParallaxProps {
  children: React.ReactNode
  className?: string
  /** Movement intensity (multiplier) */
  intensity?: number
}

/**
 * A component that reacts to mouse movement for depth effects.
 */
export function MouseParallax({ children, className, intensity = 20 }: MouseParallaxProps) {
  const [position, setPosition] = React.useState({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY, currentTarget } = e
    const { left, top, width, height } = currentTarget.getBoundingClientRect()
    
    const x = (clientX - left - width / 2) / (width / 2)
    const y = (clientY - top - height / 2) / (height / 2)
    
    setPosition({ x: x * intensity, y: y * intensity })
  }

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 })
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn("relative", className)}
    >
      <motion.div
        animate={{ x: position.x, y: position.y }}
        transition={{ type: "spring", stiffness: 150, damping: 25 }}
      >
        {children}
      </motion.div>
    </div>
  )
}
