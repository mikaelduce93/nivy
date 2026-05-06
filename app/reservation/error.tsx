"use client"

import { useEffect } from "react"
import { PageError } from "@/components/ui/states/page-error"
import { captureError } from "@/lib/monitoring/sentry"

export default function ReservationError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    captureError(error, {
      tags: { feature: 'reservation' },
      extra: { digest: error.digest },
      level: 'error',
    })
  }, [error])

  return (
    <PageError
      error={error}
      reset={reset}
      type="generic"
      title="Erreur lors de la réservation"
      description="Une erreur s'est produite. Veuillez réessayer."
      suggestion="Vérifiez votre connexion et réessayez. Si le problème persiste, contactez le support."
      showHome={false}
      showBack={true}
      backHref="/agenda"
    />
  )
}
