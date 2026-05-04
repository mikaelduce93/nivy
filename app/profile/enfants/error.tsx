"use client"

import { PageError } from "@/components/ui/states/page-error"

export default function ChildrenError({
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
      title="Impossible de charger les enfants"
      description="Une erreur s'est produite lors du chargement de la liste de tes enfants."
      suggestion="Essayez de rafraîchir la page ou retournez à votre profil."
      showHome={false}
      showBack={true}
      backHref="/profile"
    />
  )
}
