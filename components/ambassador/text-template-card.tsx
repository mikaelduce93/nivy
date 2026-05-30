"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"
import { toast } from "sonner"

interface TextTemplateCardProps {
  title: string
  content: string
}

/**
 * TextTemplateCard — carte template texte copiable (charte sticker).
 * Le copier-coller est réellement fonctionnel (clipboard + toast « Copié »).
 */
export function TextTemplateCard({ title, content }: TextTemplateCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      toast.success("Copié !")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Impossible de copier")
    }
  }

  return (
    <div className="rounded-xl border-2 border-line bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display font-extrabold text-ink">{title}</h3>
        <Button size="sm" variant="outline" onClick={handleCopy}>
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Copié !
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              Copier
            </>
          )}
        </Button>
      </div>
      <p className="text-sm leading-relaxed text-ink-2">{content}</p>
    </div>
  )
}
