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
      title="Une erreur est survenue"
      description="Impossible de charger cette section. Veuillez réessayer."
      suggestion="Essayez de rafraîchir la page. Si le problème persiste, contactez le support."
      showHome={true}
      homeHref="/dashboard"
    />
  )
}
