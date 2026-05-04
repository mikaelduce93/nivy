"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Download, QrCode } from "lucide-react"
import { toast } from "sonner"

interface QRCodeGeneratorProps {
  referralLink: string
  referralCode: string
}

export function QRCodeGenerator({ referralLink, referralCode }: QRCodeGeneratorProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    generateQRCode()
  }, [referralLink])

  const generateQRCode = async () => {
    // Simple QR code generation using canvas
    // In production, you would use a library like qrcode.js
    try {
      // Create a simple placeholder for the QR code
      // In production, use a proper QR code library
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const size = 200
      canvas.width = size
      canvas.height = size

      // Background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, size, size)

      // Create a simple visual pattern (placeholder)
      ctx.fillStyle = '#10b981'

      // Border
      ctx.strokeStyle = '#10b981'
      ctx.lineWidth = 8
      ctx.strokeRect(4, 4, size - 8, size - 8)

      // Center logo area
      ctx.fillStyle = '#10b981'
      ctx.beginPath()
      ctx.arc(size / 2, size / 2, 30, 0, 2 * Math.PI)
      ctx.fill()

      // TC text
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 20px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('TC', size / 2, size / 2)

      // Add corner markers (QR code style)
      const cornerSize = 30
      ctx.fillStyle = '#10b981'

      // Top-left
      ctx.fillRect(15, 15, cornerSize, cornerSize)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(20, 20, cornerSize - 10, cornerSize - 10)
      ctx.fillStyle = '#10b981'
      ctx.fillRect(25, 25, cornerSize - 20, cornerSize - 20)

      // Top-right
      ctx.fillStyle = '#10b981'
      ctx.fillRect(size - 15 - cornerSize, 15, cornerSize, cornerSize)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(size - 10 - cornerSize, 20, cornerSize - 10, cornerSize - 10)
      ctx.fillStyle = '#10b981'
      ctx.fillRect(size - 5 - cornerSize, 25, cornerSize - 20, cornerSize - 20)

      // Bottom-left
      ctx.fillStyle = '#10b981'
      ctx.fillRect(15, size - 15 - cornerSize, cornerSize, cornerSize)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(20, size - 10 - cornerSize, cornerSize - 10, cornerSize - 10)
      ctx.fillStyle = '#10b981'
      ctx.fillRect(25, size - 5 - cornerSize, cornerSize - 20, cornerSize - 20)

      // Add code text at bottom
      ctx.fillStyle = '#18181b'
      ctx.font = 'bold 14px Arial'
      ctx.fillText(referralCode, size / 2, size - 60)

      // Generate data URL
      const dataUrl = canvas.toDataURL('image/png')
      setQrDataUrl(dataUrl)
    } catch (error) {
      console.error('QR generation error:', error)
    }
  }

  const handleDownload = () => {
    if (!qrDataUrl) {
      toast.error("QR Code non généré")
      return
    }

    const link = document.createElement('a')
    link.download = `teenclub-qr-${referralCode}.png`
    link.href = qrDataUrl
    link.click()
    toast.success("QR Code téléchargé !")
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="bg-white rounded-xl p-4">
        <canvas
          ref={canvasRef}
          width={200}
          height={200}
          className="w-[200px] h-[200px]"
        />
      </div>
      <p className="text-xs text-zinc-400 text-center">
        Scannez ce QR code pour accéder à votre lien de parrainage
      </p>
      <Button
        onClick={handleDownload}
        className="bg-emerald-500 hover:bg-emerald-600 text-white"
      >
        <Download className="h-4 w-4 mr-2" />
        Télécharger le QR Code
      </Button>
    </div>
  )
}
