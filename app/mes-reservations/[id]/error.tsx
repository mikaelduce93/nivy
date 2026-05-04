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
      type="notFound"
      title="Impossible de charger cette réservation"
      description="Une erreur s'est produite lors du chargement des détails de ta réservation."
      suggestion="Essayez de rafraîchir la page ou retournez à la liste de vos réservations."
      showHome={false}
      showBack={true}
      backHref="/mes-reservations"
    />
  )
}
