'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, ShoppingBag, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { captureError } from '@/lib/monitoring/sentry'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function TeenShopCheckoutError({ error, reset }: ErrorProps) {
  useEffect(() => {
    captureError(error, {
      tags: { feature: 'teen-shop-checkout' },
      extra: { digest: error.digest },
      level: 'error',
    })
  }, [error])

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="relative z-10 max-w-lg w-full text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-red-400" aria-hidden="true" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-black mb-3 tracking-tight">
          Une erreur est survenue lors du paiement
        </h1>

        <p className="text-muted-foreground mb-3">
          Aucun montant n'a été débité et aucun XP n'a été utilisé. Vous pouvez réessayer ou retourner au shop.
        </p>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-6">
          <ShieldCheck className="w-4 h-4 text-emerald-500" aria-hidden="true" />
          <span>Paiement sécurisé — aucune transaction validée</span>
        </div>

        {error.digest && (
          <p className="text-xs text-muted-foreground/70 mb-6">
            Code erreur : <span className="font-mono">{error.digest}</span>
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </Button>
          <Link href="/teen/shop">
            <Button variant="outline" className="gap-2 w-full sm:w-auto">
              <ShoppingBag className="w-4 h-4" />
              Retour au shop
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
