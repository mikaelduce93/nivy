"use client"

import { motion } from "framer-motion"

export function AnimatedSparkles({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <motion.path
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707"
        animate={{ 
          scale: [1, 1.2, 1],
          rotate: [0, 90, 180, 270, 360],
          opacity: [0.5, 1, 0.5] 
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />
      <motion.path
        d="M12 8l-1 4h-3l4 1-1 4 4-5h-3l1-4z"
        animate={{ 
          fill: ["rgba(255,255,255,0)", "rgba(255,255,255,0.2)", "rgba(255,255,255,0)"]
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </svg>
  )
}

export function AnimatedZap({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <motion.path
        d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1, repeat: Infinity, repeatDelay: 1 }}
      />
      <motion.path
        d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
        animate={{ 
          strokeWidth: [2, 4, 2],
          filter: ["blur(0px)", "blur(2px)", "blur(0px)"]
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
    </svg>
  )
}
