"use client"

import { PageError } from "@/components/ui/states/page-error"

export default function AmbassadorError({
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
      title="Erreur Ambassadeur"
      description="Une erreur est survenue dans votre espace ambassadeur."
      suggestion="Essayez de rafraîchir la page. Si le problème persiste, contactez le support."
      showHome={true}
      homeHref="/ambassador"
    />
  )
}
