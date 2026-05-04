'use client'

import { useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { useEffect } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { QrCode, CheckCircle2, AlertTriangle, XCircle, Coins, Ticket } from "lucide-react"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"
import { useSound } from '@/lib/hooks/use-sound'

type ScanResult = 'ticket' | 'payment' | 'challenge' | null

interface ScanData {
  type: ScanResult
  data: any
}

export function UniversalScanner() {
  const [isOpen, setIsOpen] = useState(false)
  const [scanResult, setScanResult] = useState<ScanData | null>(null)
  const { play } = useSound()

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null

    if (isOpen && !scanResult) {
      scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      )

      scanner.render(
        (decodedText) => {
          handleScan(decodedText)
          scanner?.clear()
        },
        (error) => {
          console.warn(error)
        }
      )
    }

    return () => {
      scanner?.clear()
    }
  }, [isOpen, scanResult])

  const handleScan = (text: string) => {
    // Mock logic - in real app, parse text and call API
    play('success')
    
    if (text.startsWith('TICKET:')) {
      setScanResult({
        type: 'ticket',
        data: {
          user: 'Youssef Benali',
          event: 'Soirée Neon',
          status: 'valid'
        }
      })
    } else if (text.startsWith('PAY:')) {
      setScanResult({
        type: 'payment',
        data: {
          user: 'Sarah K.',
          amount: 500,
          balance: 1500
        }
      })
    } else {
      setScanResult({
        type: 'challenge',
        data: {
          user: 'Karim M.',
          challenge: '10 Pompes',
          xp: 50
        }
      })
    }
  }

  const resetScanner = () => {
    setScanResult(null)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full h-24 text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-xl shadow-blue-500/20 rounded-2xl flex flex-col gap-2">
          <QrCode className="w-8 h-8" />
          SCANNER UN CLIENT
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">Scanner Universel</DialogTitle>
        </DialogHeader>
        
        {!scanResult ? (
          <div className="flex flex-col items-center justify-center p-4">
            <div id="reader" className="w-full rounded-xl overflow-hidden border-2 border-dashed border-zinc-700"></div>
            <p className="text-zinc-400 text-sm mt-4 text-center">
              Pointez la caméra vers le QR Code du Teen (Billet, Paiement ou Défi)
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-6">
            <div className="flex flex-col items-center text-center">
              {scanResult.type === 'ticket' && (
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-4 text-green-500">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
              )}
              {scanResult.type === 'payment' && (
                <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mb-4 text-yellow-500">
                  <Coins className="w-10 h-10" />
                </div>
              )}
              {scanResult.type === 'challenge' && (
                <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center mb-4 text-purple-500">
                  <AlertTriangle className="w-10 h-10" />
                </div>
              )}

              <h2 className="text-2xl font-black text-white mb-1">
                {scanResult.type === 'ticket' && 'BILLET VALIDE'}
                {scanResult.type === 'payment' && 'PAIEMENT XP'}
                {scanResult.type === 'challenge' && 'VALIDATION DÉFI'}
              </h2>
              <p className="text-zinc-400">{scanResult.data.user}</p>
            </div>

            <Card className="bg-zinc-900 border-zinc-800 p-4">
              {scanResult.type === 'ticket' && (
                <div className="flex items-center gap-4">
                  <Ticket className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="text-sm text-zinc-400">Événement</p>
                    <p className="font-bold text-white">{scanResult.data.event}</p>
                  </div>
                </div>
              )}
              
              {scanResult.type === 'payment' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
                    <span className="text-zinc-400">Montant à débiter</span>
                    <span className="text-2xl font-black text-yellow-500">-{scanResult.data.amount} XP</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500">Nouveau solde</span>
                    <span className="text-white">{scanResult.data.balance - scanResult.data.amount} XP</span>
                  </div>
                  <Button className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold" onClick={() => {
                    toast.success('Paiement validé !')
                    resetScanner()
                  }}>
                    Confirmer le débit
                  </Button>
                </div>
              )}

              {scanResult.type === 'challenge' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-zinc-400">Défi à valider</p>
                    <p className="text-xl font-bold text-purple-400">{scanResult.data.challenge}</p>
                    <p className="text-xs text-zinc-500 mt-1">Récompense : {scanResult.data.xp} XP</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="border-red-900 text-red-500 hover:bg-red-950" onClick={resetScanner}>
                      Refuser
                    </Button>
                    <Button className="bg-green-600 hover:bg-green-500 text-white" onClick={() => {
                      toast.success('Défi validé ! XP envoyés.')
                      resetScanner()
                    }}>
                      Valider
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            {scanResult.type === 'ticket' && (
              <Button className="w-full bg-zinc-800 hover:bg-zinc-700" onClick={resetScanner}>
                Scanner le suivant
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

