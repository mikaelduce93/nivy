"use client"

import * as React from "react"
import { motion, useAnimation } from "framer-motion"
import { cn } from "@/lib/utils"

interface EnergyOrbProps {
  value: number
  max: number
  size?: number
  color?: string
  className?: string
  children?: React.ReactNode
}

/**
 * A futuristic "Energy Orb" progress indicator with liquid-like animations.
 */
export function EnergyOrb({
  value,
  max,
  size = 120,
  color = "var(--gen-z-lavender)",
  className,
  children
}: EnergyOrbProps) {
  const percentage = Math.min((value / max) * 100, 100)
  
  return (
    <div 
      className={cn("relative flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {/* Outer Glow Ring */}
      <motion.div
        className="absolute inset-0 rounded-full border border-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]"
        animate={{ 
          boxShadow: [
            `0 0 20px -10px ${color}`,
            `0 0 40px -5px ${color}`,
            `0 0 20px -10px ${color}`
          ]
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* SVG Container */}
      <svg width={size} height={size} viewBox="0 0 100 100" className="rotate-[-90deg]">
        {/* Background Track */}
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="4"
        />
        
        {/* Liquid Progress Path */}
        <motion.circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: percentage / 100 }}
          transition={{ duration: 1.5, ease: "circOut" }}
          style={{ 
            filter: `drop-shadow(0 0 8px ${color})`
          }}
        />

        {/* Animated Particles along the path */}
        {percentage > 0 && (
          <motion.circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="white"
            strokeWidth="1"
            strokeDasharray="1 20"
            animate={{ strokeDashoffset: [0, -100] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />
        )}
      </svg>

      {/* Inner Fluid Content */}
      <div className="absolute inset-4 rounded-full bg-black/40 backdrop-blur-xl flex flex-col items-center justify-center overflow-hidden border border-white/5 shadow-inner">
        {/* Wave effect */}
        <motion.div
          className="absolute bottom-0 w-[200%] h-[200%] opacity-20"
          style={{ 
            backgroundColor: color,
            left: "-50%",
            y: `${100 - percentage}%`
          }}
          animate={{ 
            rotate: 360,
            borderRadius: ["38%", "42%", "38%"] 
          }}
          transition={{ 
            rotate: { duration: 10, repeat: Infinity, ease: "linear" },
            borderRadius: { duration: 5, repeat: Infinity, ease: "easeInOut" }
          }}
        />
        
        <div className="relative z-10 flex flex-col items-center">
          {children || (
            <>
              <span className="text-2xl font-black text-white leading-none">
                {Math.round(percentage)}%
              </span>
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">
                Power
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
