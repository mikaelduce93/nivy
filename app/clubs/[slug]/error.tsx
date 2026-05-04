"use client"

import { PageError } from "@/components/ui/states/page-error"

export default function ClubError({
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
      description="Une erreur s'est produite lors du chargement des détails du club."
      suggestion="Essayez de rafraîchir la page ou retournez à la liste des clubs."
      showHome={false}
      showBack={true}
      backHref="/clubs"
    />
  )
}
