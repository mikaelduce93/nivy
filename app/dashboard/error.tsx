"use client"

import { PageError } from "@/components/ui/states/page-error"

export default function DashboardError({
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
      title="Impossible de charger le tableau de bord"
      description="Une erreur s'est produite lors du chargement de ton tableau de bord."
      suggestion="Essayez de rafraîchir la page. Si le problème persiste, contacte le support."
      showHome={true}
      homeHref="/"
    />
  )
}
