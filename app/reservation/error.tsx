"use client"

import { PageError } from "@/components/ui/states/page-error"

export default function ReservationError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
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
