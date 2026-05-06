'use client'

import { useState, useEffect, useRef } from 'react'
import { Clock } from 'lucide-react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'

interface SessionTimerProps {
  expiresAt: Date
  onExpire?: () => void
  /**
   * Seconds before expiry at which the urgency warning toast fires.
   * Defaults to 90s (so 8m30 into a 10min session).
   */
  warningAtSeconds?: number
  /** Booking ref shown in the toast to make the warning concrete. */
  bookingReference?: string
}

export function SessionTimer({
  expiresAt,
  onExpire,
  warningAtSeconds = 90,
  bookingReference,
}: SessionTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const warnedRef = useRef(false)

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const expiry = new Date(expiresAt).getTime()
      const difference = expiry - now
      return Math.max(0, Math.floor(difference / 1000))
    }

    setTimeLeft(calculateTimeLeft())

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft()
      setTimeLeft(remaining)

      // One-shot warning toast as we cross the threshold
      if (
        !warnedRef.current &&
        remaining > 0 &&
        remaining <= warningAtSeconds
      ) {
        warnedRef.current = true
        const minutes = Math.floor(remaining / 60)
        const seconds = remaining % 60
        const formatted = `${minutes}m${seconds.toString().padStart(2, '0')}s`
        toast.warning('Ta session expire bientôt', {
          description: `Plus que ${formatted} pour finaliser${
            bookingReference ? ` la réservation ${bookingReference}` : ''
          }. Tes infos panier sont sauvegardées — tu pourras reprendre.`,
          duration: 8000,
        })
      }

      if (remaining === 0 && onExpire) {
        onExpire()
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [expiresAt, onExpire, warningAtSeconds, bookingReference])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  const isUrgent = timeLeft < 120 // Less than 2 minutes

  return (
    <Card className={`p-4 ${isUrgent ? 'bg-red-500/10 border-red-500/30 animate-pulse' : 'bg-orange-500/10 border-orange-500/30'}`}>
      <div className="flex items-center gap-3">
        <Clock className={`w-5 h-5 ${isUrgent ? 'text-red-500' : 'text-orange-500'}`} />
        <div className="flex-1">
          <p className="font-semibold text-sm">
            {timeLeft > 0 ? 'Places réservées pour' : 'Réservation expirée'}
          </p>
          <div className="flex items-center gap-2">
            <p className={`text-2xl font-black font-mono ${isUrgent ? 'text-red-500' : 'text-orange-500'}`}>
              {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
            </p>
            {timeLeft > 0 && (
              <p className="text-xs text-muted-foreground">restantes</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
