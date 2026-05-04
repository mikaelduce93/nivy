"use client"

import { PageError } from "@/components/ui/states/page-error"

export default function Error({
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
      title="Oups, quelque chose s'est mal passé"
      description="Une erreur inattendue s'est produite. Pas de panique, on va résoudre ça !"
      suggestion="Essayez de rafraîchir la page. Si le problème persiste, notre équipe a été automatiquement notifiée et travaille sur la résolution."
      showHome={true}
      homeHref="/"
    />
  )
}
