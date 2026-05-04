'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'

interface AnimatedCounterProps {
  value: number
  className?: string
  prefix?: string
  suffix?: string
}

export function AnimatedCounter({ value, className, prefix = '', suffix = '' }: AnimatedCounterProps) {
  const spring = useSpring(value, { mass: 0.8, stiffness: 75, damping: 15 })
  const displayValue = useTransform(spring, (current) => Math.round(current).toLocaleString())
  
  useEffect(() => {
    spring.set(value)
  }, [value, spring])

  return (
    <motion.span className={className}>
      {prefix}<motion.span>{displayValue}</motion.span>{suffix}
    </motion.span>
  )
}

