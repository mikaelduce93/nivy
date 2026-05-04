"use client"

import { PageError } from "@/components/ui/states/page-error"

export default function EventError({
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
      type="notFound"
      title="Impossible de charger cet événement"
      description="Une erreur s'est produite lors du chargement des détails de l'événement."
      suggestion="Essayez de rafraîchir la page ou retournez à la liste des événements."
      showHome={false}
      showBack={true}
      backHref="/evenements"
    />
  )
}
