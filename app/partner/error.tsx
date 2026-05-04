"use client"

import { PageError } from "@/components/ui/states/page-error"

export default function PartnerError({
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
      title="Erreur Partenaire"
      description="Une erreur est survenue dans votre espace partenaire."
      suggestion="Essayez de rafraîchir la page. Si le problème persiste, contactez le support."
      showHome={true}
      homeHref="/partner"
    />
  )
}
