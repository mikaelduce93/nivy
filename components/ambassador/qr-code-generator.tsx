"use client"

import { useState, useEffect } from "react"
import { toDataURL } from "qrcode"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { toast } from "sonner"
import { StickerCard } from "@/components/ui/sticker-card"

interface QRCodeGeneratorProps {
  referralLink: string
  referralCode: string
}

export function QRCodeGenerator({ referralLink, referralCode }: QRCodeGeneratorProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    // Real, scannable QR encoding the referral link (qrcode dep, also used in
    // features/anniversaires + api/bookings). Replaces the old decorative
    // canvas pattern that was not a valid QR.
    toDataURL(referralLink, {
      width: 200,
      margin: 1,
      color: { dark: "#0e0c1a", light: "#ffffff" },
    })
      .then((url) => {
        if (active) setQrDataUrl(url)
      })
      .catch(() => {
        if (active) setQrDataUrl(null)
      })
    return () => {
      active = false
    }
  }, [referralLink])

  const handleDownload = () => {
    if (!qrDataUrl) {
      toast.error("QR Code non généré")
      return
    }
    const link = document.createElement("a")
    link.download = `nivy-qr-${referralCode}.png`
    link.href = qrDataUrl
    link.click()
    toast.success("QR Code téléchargé !")
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      <StickerCard className="items-center p-4">
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URL, no Next optimization
          <img
            src={qrDataUrl}
            alt={`QR code de parrainage ${referralCode}`}
            width={200}
            height={200}
            className="h-[200px] w-[200px] rounded-lg"
          />
        ) : (
          <div className="grid h-[200px] w-[200px] place-items-center rounded-lg text-sm text-mute">
            Génération…
          </div>
        )}
      </StickerCard>
      <p className="text-xs text-mute text-center">Scanne pour rejoindre Nivy avec ton code parrain</p>
      <Button variant="lime" onClick={handleDownload} disabled={!qrDataUrl}>
        <Download className="h-4 w-4 mr-2" />
        Télécharger le QR Code
      </Button>
    </div>
  )
}
