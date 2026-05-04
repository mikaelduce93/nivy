"use client"

import { PageError } from "@/components/ui/states/page-error"

export default function ProfileError({
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
      title="Impossible de charger ton profil"
      description="Une erreur s'est produite lors du chargement de ton profil."
      suggestion="Essayez de rafraîchir la page. Si le problème persiste, contacte le support."
      showHome={true}
      homeHref="/"
    />
  )
}
