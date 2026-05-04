"use client"

import * as React from "react"
import { motion, type HTMLMotionProps } from "framer-motion"
import { Button, type buttonVariants } from "@/components/ui/button"
import { type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

interface MagneticButtonProps 
  extends React.ComponentProps<typeof Button> {
  intensity?: number
}

/**
 * A button that physically pulls towards the cursor.
 */
export function MagneticButton({
  children,
  className,
  intensity = 0.35,
  ...props
}: MagneticButtonProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [position, setPosition] = React.useState({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return
    const { clientX, clientY } = e
    const { left, top, width, height } = ref.current.getBoundingClientRect()
    
    // Calculate distance from center
    const x = (clientX - (left + width / 2)) * intensity
    const y = (clientY - (top + height / 2)) * intensity
    
    setPosition({ x, y })
  }

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 })
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-fit"
    >
      <motion.div
        animate={{ x: position.x, y: position.y }}
        transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
      >
        <Button className={className} {...props}>
          {children}
        </Button>
      </motion.div>
    </div>
  )
}
