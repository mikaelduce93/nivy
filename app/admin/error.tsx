"use client"

import { PageError } from "@/components/ui/states/page-error"

export default function AdminError({
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
      title="Erreur Administration"
      description="Une erreur s'est produite dans l'interface d'administration."
      suggestion="Essayez de rafraîchir la page. Si le problème persiste, contactez l'équipe technique."
      showHome={true}
      homeHref="/admin"
      showBack={true}
      backHref="/admin"
    />
  )
}
