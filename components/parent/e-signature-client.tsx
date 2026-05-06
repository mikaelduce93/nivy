"use client"

import { useRouter } from "next/navigation"
import { ESignatureForm } from "@/components/e-signature-form"

interface ParentSignatureClientProps {
  childId?: string
  redirectTo: string
}

/**
 * Wrapper used on the parent e-signature page (/parent/e-signature).
 *
 * Routes the multipart POST to the parent-scoped endpoint
 * (/api/parent/e-signature/create) which:
 *  - Validates the parent role from the session (no CSRF header needed
 *    for multipart uploads).
 *  - Inserts into e_signatures with terms_accepted: true.
 *  - Handles duplicate signatures gracefully (returns ok: true with
 *    the existing id so the redirect still fires).
 *
 * After a successful submission the user is forwarded to `redirectTo`
 * (defaults to /parent/topup) so the top-up gate check passes.
 */
export function ParentSignatureClient({ childId, redirectTo }: ParentSignatureClientProps) {
  const router = useRouter()

  return (
    <ESignatureForm
      childId={childId}
      apiEndpoint="/api/parent/e-signature/create"
      onComplete={() => {
        // Allow the success toast to render before navigating away.
        setTimeout(() => {
          router.push(redirectTo)
          router.refresh()
        }, 600)
      }}
    />
  )
}
