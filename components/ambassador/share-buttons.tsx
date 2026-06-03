"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Share2, Check } from "lucide-react"
import { toast } from "sonner"
import { getSocialBaseUrl } from "@/lib/config/app-config"

interface ShareButtonsProps {
  referralCode: string
  referralLink?: string
}

export function ShareButtons({ referralCode, referralLink }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false)

  const link = referralLink || `${getSocialBaseUrl()}/join?ref=${referralCode}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      toast.success("Lien copié dans le presse-papier !")
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error("Impossible de copier le lien")
    }
  }

  const handleShare = async () => {
    const shareData = {
      title: "Nivy — Rejoins-nous !",
      text: `Rejoins Nivy avec mon code ${referralCode} et profite d'avantages exclusifs !`,
      url: link,
    }

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData)
        toast.success("Merci d'avoir partagé !")
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(
          `Rejoins Nivy avec mon code ${referralCode} ! ${link}`
        )
        toast.success("Lien copié ! Partagez-le sur vos réseaux.")
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast.error("Impossible de partager")
      }
    }
  }

  return (
    <>
      <Button
        variant="pink"
        className="font-semibold"
        onClick={handleCopy}
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 mr-2" />
            Copié !
          </>
        ) : (
          <>
            <Copy className="h-4 w-4 mr-2" />
            Copier le lien
          </>
        )}
      </Button>
      <Button
        variant="outline"
        onClick={handleShare}
      >
        <Share2 className="h-4 w-4 mr-2" />
        Partager
      </Button>
    </>
  )
}
