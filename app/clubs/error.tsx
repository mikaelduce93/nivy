"use client"

import { PageError } from "@/components/ui/states/page-error"

export default function ClubsError({
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
      title="Impossible de charger les clubs"
      description="Une erreur s'est produite lors du chargement des clubs."
      suggestion="Vérifiez votre connexion internet et réessayez."
      showHome={true}
      homeHref="/"
    />
  )
}
