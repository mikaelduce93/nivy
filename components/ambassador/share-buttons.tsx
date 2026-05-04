"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Share2, Check } from "lucide-react"
import { toast } from "sonner"

interface ShareButtonsProps {
  referralCode: string
  referralLink?: string
}

export function ShareButtons({ referralCode, referralLink }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false)

  const link = referralLink || `https://teenclub.ma/join?ref=${referralCode}`

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
      title: "Teen Club - Rejoins-nous !",
      text: `Rejoins Teen Club avec mon code ${referralCode} et profite d'avantages exclusifs !`,
      url: link,
    }

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData)
        toast.success("Merci d'avoir partagé !")
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(
          `Rejoins Teen Club avec mon code ${referralCode} ! ${link}`
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
        className="bg-white text-amber-600 hover:bg-white/90 font-semibold"
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
        className="border-white/30 text-white hover:bg-white/20"
        onClick={handleShare}
      >
        <Share2 className="h-4 w-4 mr-2" />
        Partager
      </Button>
    </>
  )
}
