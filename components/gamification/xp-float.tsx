'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface FloatingText {
  id: number
  x: number
  y: number
  text: string
  color: string
}

export const useXPFloat = () => {
  const [floats, setFloats] = useState<FloatingText[]>([])

  const showFloat = useCallback((x: number, y: number, amount: number, type: 'xp' | 'coins' = 'xp') => {
    const id = Date.now()
    const text = type === 'xp' ? `+${amount} XP` : `+${amount} 💰`
    const color = type === 'xp' ? 'text-emerald-400' : 'text-yellow-400'
    
    setFloats(prev => [...prev, { id, x, y, text, color }])

    // Cleanup after animation
    setTimeout(() => {
      setFloats(prev => prev.filter(f => f.id !== id))
    }, 1000)
  }, [])

  return { floats, showFloat }
}

export function XPFloatContainer({ floats }: { floats: FloatingText[] }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      <AnimatePresence>
        {floats.map((float) => (
          <motion.div
            key={float.id}
            initial={{ opacity: 0, y: float.y, x: float.x, scale: 0.5 }}
            animate={{ 
              opacity: [0, 1, 1, 0], 
              y: float.y - 100, 
              scale: [0.5, 1.2, 1],
              rotate: [0, -5, 5, 0]
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`absolute font-black text-2xl ${float.color} drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]`}
            style={{ textShadow: '0 0 10px currentColor' }}
          >
            {float.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

