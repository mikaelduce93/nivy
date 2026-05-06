"use client"

import { useRouter } from "next/navigation"
import { ESignatureForm } from "@/components/e-signature-form"

interface ParentSignatureClientProps {
  childId?: string
  redirectTo: string
}

export function ParentSignatureClient({ childId, redirectTo }: ParentSignatureClientProps) {
  const router = useRouter()

  return (
    <ESignatureForm
      childId={childId}
      onComplete={() => {
        // Allow toast to render before navigation.
        setTimeout(() => {
          router.push(redirectTo)
          router.refresh()
        }, 600)
      }}
    />
  )
}
