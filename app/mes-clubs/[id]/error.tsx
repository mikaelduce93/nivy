"use client"

import { PageError } from "@/components/ui/states/page-error"

export default function MyClubError({
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
      title="Impossible de charger ce club"
      description="Une erreur s'est produite lors du chargement des détails de ton club."
      suggestion="Essayez de rafraîchir la page ou retournez à la liste de vos clubs."
      showHome={false}
      showBack={true}
      backHref="/mes-clubs"
    />
  )
}
