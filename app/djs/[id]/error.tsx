"use client"

import { PageError } from "@/components/ui/states/page-error"

export default function DJError({
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
      title="Impossible de charger ce DJ"
      description="Une erreur s'est produite lors du chargement du profil DJ."
      suggestion="Essayez de rafraîchir la page ou retournez à la liste des DJs."
      showHome={false}
      showBack={true}
      backHref="/djs"
    />
  )
}
