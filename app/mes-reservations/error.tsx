"use client"

import { PageError } from "@/components/ui/states/page-error"

export default function ReservationsError({
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
      type="network"
      title="Impossible de charger vos réservations"
      description="Une erreur s'est produite lors du chargement de vos réservations."
      suggestion="Vérifiez votre connexion internet et réessayez."
      showHome={true}
      homeHref="/evenements"
    />
  )
}
