"use client"

import { useRef, useState, useEffect } from "react"
import SignatureCanvas from "react-signature-canvas"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { RotateCcw, Check, Loader2 } from 'lucide-react'

interface SignaturePadProps {
  onSave: (signatureDataUrl: string) => Promise<void>
  label?: string
}

export function SignaturePad({ onSave, label = "Signature du parent" }: SignaturePadProps) {
  const sigPadRef = useRef<SignatureCanvas>(null)
  const [isEmpty, setIsEmpty] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const clear = () => {
    sigPadRef.current?.clear()
    setIsEmpty(true)
  }

  const save = async () => {
    if (sigPadRef.current?.isEmpty()) {
      return
    }

    setIsSaving(true)
    try {
      const dataUrl = sigPadRef.current?.toDataURL("image/png")
      if (dataUrl) {
        await onSave(dataUrl)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleEnd = () => {
    setIsEmpty(sigPadRef.current?.isEmpty() ?? true)
  }

  return (
    <Card className="p-6 bg-zinc-900 border-zinc-800">
      <label className="block text-sm font-semibold text-white mb-3">{label}</label>
      
      <div className="border-2 border-dashed border-zinc-700 rounded-lg overflow-hidden bg-white mb-4">
        <SignatureCanvas
          ref={sigPadRef}
          onEnd={handleEnd}
          canvasProps={{
            className: "w-full h-40 touch-none",
          }}
          penColor="black"
          backgroundColor="white"
        />
      </div>

      <p className="text-xs text-zinc-400 mb-4">
        Signez avec votre doigt ou souris dans le cadre ci-dessus
      </p>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={clear}
          disabled={isEmpty || isSaving}
          className="flex-1 border-zinc-700 hover:bg-zinc-800"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Effacer
        </Button>
        <Button
          type="button"
          onClick={save}
          disabled={isEmpty || isSaving}
          className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Valider
            </>
          )}
        </Button>
      </div>
    </Card>
  )
}
