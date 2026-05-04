"use client"

import { PageError } from "@/components/ui/states/page-error"

export default function ParentError({
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
      title="Erreur"
      description="Une erreur est survenue dans votre espace parent."
      suggestion="Essayez de rafraîchir la page. Si le problème persiste, contactez le support."
      showHome={true}
      homeHref="/parent"
    />
  )
}
