'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface BackButtonProps {
  href?: string
  label?: string
  variant?: 'outline' | 'ghost' | 'default'
}

export default function BackButton({ href, label = 'Retour', variant = 'outline' }: BackButtonProps) {
  const router = useRouter()

  if (href) {
    return (
      <Button asChild variant={variant} className="bg-transparent border-zinc-700 text-zinc-300 mb-4">
        <Link href={href}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {label}
        </Link>
      </Button>
    )
  }

  return (
    <Button
      onClick={() => router.back()}
      variant={variant}
      className="bg-transparent border-zinc-700 text-zinc-300 mb-4"
    >
      <ArrowLeft className="w-4 h-4 mr-2" />
      {label}
    </Button>
  )
}
