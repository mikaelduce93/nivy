"use client"

import { useEffect, useRef, useState } from "react"
import { Html5Qrcode, Html5QrcodeScanType } from "html5-qrcode"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Camera,
  X,
  AlertCircle,
  Loader2,
  FlipHorizontal,
  ZoomIn,
  Flashlight
} from "lucide-react"
import { cn } from "@/lib/utils"

interface QRScannerProps {
  onScan: (data: string) => void
  onError?: (error: string) => void
  onClose?: () => void
  continuous?: boolean
  showControls?: boolean
}

export function QRScanner({
  onScan,
  onError,
  onClose,
  continuous = false,
  showControls = true
}: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([])
  const [currentCamera, setCurrentCamera] = useState<number>(0)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const elementId = "qr-reader"
  const lastScanRef = useRef<string>("")
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Get available cameras on mount
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices.map((d) => ({ id: d.id, label: d.label || `Camera ${d.id}` })))
        }
      })
      .catch((err) => {
        console.warn("Could not get cameras:", err)
      })

    return () => {
      stopScanner()
    }
  }, [])

  const stopScanner = async () => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current)
    }
    if (scannerRef.current?.isScanning) {
      try {
        await scannerRef.current.stop()
      } catch (e) {
        // Ignore stop errors
      }
    }
    setIsScanning(false)
  }

  const startScanning = async () => {
    try {
      setError(null)
      setIsLoading(true)

      const scanner = new Html5Qrcode(elementId)
      scannerRef.current = scanner

      // Calculate optimal QR box size based on viewport
      const viewportWidth = Math.min(window.innerWidth - 48, 400)
      const qrboxSize = Math.min(viewportWidth * 0.8, 280)

      const config = {
        fps: 15,
        qrbox: { width: qrboxSize, height: qrboxSize },
        aspectRatio: 1,
        disableFlip: false,
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
      }

      // Use back camera by default on mobile
      const cameraId = cameras.length > 0
        ? cameras[currentCamera].id
        : { facingMode: "environment" }

      await scanner.start(
        cameraId,
        config,
        (decodedText) => {
          // Prevent duplicate scans within 2 seconds
          if (decodedText === lastScanRef.current) {
            return
          }
          lastScanRef.current = decodedText

          // Clear after 2 seconds to allow rescanning same code
          if (scanTimeoutRef.current) {
            clearTimeout(scanTimeoutRef.current)
          }
          scanTimeoutRef.current = setTimeout(() => {
            lastScanRef.current = ""
          }, 2000)

          // Handle scan
          if (!continuous) {
            stopScanner()
          }
          onScan(decodedText)
        },
        () => {
          // Ignore scan errors (e.g., no QR code in frame)
        }
      )

      setIsScanning(true)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erreur camera"
      setError(getErrorMessage(errorMsg))
      onError?.(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  const switchCamera = async () => {
    if (cameras.length <= 1) return

    await stopScanner()
    setCurrentCamera((prev) => (prev + 1) % cameras.length)
    // Auto-restart with new camera after state update
    setTimeout(startScanning, 100)
  }

  const getErrorMessage = (error: string): string => {
    if (error.includes("Permission denied") || error.includes("NotAllowedError")) {
      return "Acces a la camera refuse. Veuillez autoriser l'acces dans les parametres de votre navigateur."
    }
    if (error.includes("NotFoundError") || error.includes("DevicesNotFoundError")) {
      return "Aucune camera trouvee. Verifiez que votre appareil dispose d'une camera."
    }
    if (error.includes("NotReadableError") || error.includes("TrackStartError")) {
      return "La camera est deja utilisee par une autre application."
    }
    if (error.includes("OverconstrainedError")) {
      return "La camera ne supporte pas les parametres demandes."
    }
    return error
  }

  return (
    <Card className="p-4 bg-zinc-900 border-zinc-800 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Camera className="h-5 w-5 text-emerald-400" />
          Scanner QR Code
        </h3>
        <div className="flex items-center gap-2">
          {showControls && cameras.length > 1 && isScanning && (
            <Button
              variant="ghost"
              size="icon"
              onClick={switchCamera}
              className="h-8 w-8 text-zinc-400 hover:text-white"
            >
              <FlipHorizontal className="w-4 h-4" />
            </Button>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                stopScanner()
                onClose()
              }}
              className="h-8 w-8"
            >
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-semibold text-sm">Erreur d'acces camera</p>
            <p className="text-red-300 text-xs mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Scanner viewport */}
      <div className="relative">
        <div
          id={elementId}
          className={cn(
            "rounded-lg overflow-hidden bg-zinc-950 min-h-[300px]",
            isScanning && "border-2 border-emerald-500/50"
          )}
        />

        {/* Scanning overlay */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Corner markers */}
            <div className="absolute top-[10%] left-[10%] w-8 h-8 border-t-2 border-l-2 border-emerald-400" />
            <div className="absolute top-[10%] right-[10%] w-8 h-8 border-t-2 border-r-2 border-emerald-400" />
            <div className="absolute bottom-[10%] left-[10%] w-8 h-8 border-b-2 border-l-2 border-emerald-400" />
            <div className="absolute bottom-[10%] right-[10%] w-8 h-8 border-b-2 border-r-2 border-emerald-400" />

            {/* Scanning line animation */}
            <div className="absolute top-[10%] left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-scan" />
          </div>
        )}

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
        )}
      </div>

      {/* Start button */}
      {!isScanning && !isLoading && (
        <Button
          onClick={startScanning}
          className="w-full mt-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
        >
          <Camera className="w-4 h-4 mr-2" />
          Activer la camera
        </Button>
      )}

      {/* Status indicator */}
      {isScanning && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-zinc-400">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Camera active - Placez le QR code dans le cadre</span>
        </div>
      )}

      {/* Scanning controls */}
      {isScanning && (
        <Button
          variant="outline"
          onClick={stopScanner}
          className="w-full mt-4 border-zinc-700"
        >
          Arreter le scan
        </Button>
      )}

      <style jsx global>{`
        @keyframes scan {
          0% {
            transform: translateY(0);
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            transform: translateY(250px);
            opacity: 1;
          }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </Card>
  )
}
