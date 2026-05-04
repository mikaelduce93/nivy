"use client"

import { useState, useEffect } from "react"

interface CountdownClientProps {
  targetDate: string
}

export function CountdownClient({ targetDate }: CountdownClientProps) {
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

  useEffect(() => {
    const target = new Date(targetDate)

    const updateCountdown = () => {
      const now = new Date().getTime()
      const distance = target.getTime() - now

      if (distance > 0) {
        setCountdown({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
        })
      }
    }

    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [targetDate])

  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 backdrop-blur-sm">
      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
      <span className="text-sm font-medium text-primary">
        Prochaine soirée dans {countdown.days} jours
      </span>
    </div>
  )
}
