"use client"

import { PageError } from "@/components/ui/states/page-error"

export default function EventsError({
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
      title="Impossible de charger les événements"
      description="Une erreur s'est produite lors du chargement des événements."
      suggestion="Vérifiez votre connexion internet et réessayez."
      showHome={true}
      homeHref="/"
    />
  )
}
