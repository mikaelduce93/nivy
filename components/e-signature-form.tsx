"use client"

import { useState, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertCircle, FileText, Upload, Check } from 'lucide-react'
import { toast } from "sonner"
import SignatureCanvas from "react-signature-canvas"

interface ESignatureFormProps {
  childId?: string
  eventId?: string
  bookingId?: string
  /**
   * API endpoint to POST the multipart form to.
   * Defaults to "/api/e-signature/create" (generic, event/booking flow).
   * Pass "/api/parent/e-signature/create" for the parent top-up gate flow,
   * which enforces the parent role server-side and skips CSRF so that the
   * multipart upload works without a custom header.
   */
  apiEndpoint?: string
  onComplete: (signatureData: any) => void
}

export function ESignatureForm({ childId, eventId, bookingId, apiEndpoint = "/api/e-signature/create", onComplete }: ESignatureFormProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    parentFullName: "",
    parentCin: "",
    photoConsent: true,
    medicalConsent: true,
    termsAccepted: false,
  })
  const [cinFrontFile, setCinFrontFile] = useState<File | null>(null)
  const [cinBackFile, setCinBackFile] = useState<File | null>(null)
  const signatureRef = useRef<SignatureCanvas>(null)

  const handleFileUpload = async (file: File, type: "front" | "back") => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Le fichier doit faire moins de 5 Mo")
      return
    }

    if (type === "front") {
      setCinFrontFile(file)
    } else {
      setCinBackFile(file)
    }
  }

  const clearSignature = () => {
    signatureRef.current?.clear()
  }

  const handleSubmit = async () => {
    if (!formData.parentFullName || !formData.parentCin) {
      toast.error("Veuillez remplir tous les champs obligatoires")
      return
    }

    if (!formData.termsAccepted) {
      toast.error("Veuillez accepter les conditions")
      return
    }

    if (!cinFrontFile || !cinBackFile) {
      toast.error("Veuillez télécharger les deux côtés de votre CIN")
      return
    }

    if (signatureRef.current?.isEmpty()) {
      toast.error("Veuillez signer le document")
      return
    }

    setLoading(true)

    try {
      const signatureData = signatureRef.current?.toDataURL("image/png")
      
      const encoder = new TextEncoder()
      const data = encoder.encode(signatureData + formData.parentFullName + formData.parentCin)
      const hashBuffer = await crypto.subtle.digest("SHA-256", data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const signatureHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")

      const formDataToSend = new FormData()
      formDataToSend.append("childId", childId || "")
      formDataToSend.append("eventId", eventId || "")
      formDataToSend.append("bookingId", bookingId || "")
      formDataToSend.append("signatureData", signatureData!)
      formDataToSend.append("signatureHash", signatureHash)
      formDataToSend.append("parentFullName", formData.parentFullName)
      formDataToSend.append("parentCin", formData.parentCin)
      formDataToSend.append("photoConsent", formData.photoConsent.toString())
      formDataToSend.append("medicalConsent", formData.medicalConsent.toString())
      formDataToSend.append("cinFront", cinFrontFile)
      formDataToSend.append("cinBack", cinBackFile)

      const response = await fetch(apiEndpoint, {
        method: "POST",
        body: formDataToSend,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Erreur lors de la signature")
      }

      toast.success("Signature enregistrée avec succès")
      onComplete(result)
    } catch (error) {
      console.error("[v0] E-signature error:", error)
      toast.error("Erreur lors de l'enregistrement de la signature")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                step >= s
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                  : "bg-zinc-800 text-zinc-500"
              }`}
            >
              {step > s ? <Check className="w-5 h-5" /> : s}
            </div>
            {s < 3 && (
              <div
                className={`h-1 flex-1 mx-2 ${
                  step > s ? "bg-gradient-to-r from-cyan-500 to-blue-500" : "bg-zinc-800"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card className="p-6 bg-zinc-900 border-zinc-800">
          <h3 className="text-xl font-bold text-white mb-6">Informations parentales</h3>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="parentName" className="text-white">Nom complet du parent *</Label>
              <Input
                id="parentName"
                value={formData.parentFullName}
                onChange={(e) => setFormData({ ...formData, parentFullName: e.target.value })}
                placeholder="Prénom et nom comme sur la CIN"
                className="bg-zinc-950 border-zinc-800 mt-2"
              />
            </div>

            <div>
              <Label htmlFor="cin" className="text-white">Numéro CIN *</Label>
              <Input
                id="cin"
                value={formData.parentCin}
                onChange={(e) => setFormData({ ...formData, parentCin: e.target.value })}
                placeholder="AB123456"
                className="bg-zinc-950 border-zinc-800 mt-2"
              />
            </div>

            <div className="space-y-3 mt-6">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="photoConsent"
                  checked={formData.photoConsent}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, photoConsent: checked as boolean })
                  }
                />
                <label htmlFor="photoConsent" className="text-sm text-zinc-300 cursor-pointer">
                  J'autorise la prise de photos de mon enfant lors de l'événement
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox
                  id="medicalConsent"
                  checked={formData.medicalConsent}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, medicalConsent: checked as boolean })
                  }
                />
                <label htmlFor="medicalConsent" className="text-sm text-zinc-300 cursor-pointer">
                  J'autorise les premiers soins d'urgence si nécessaire
                </label>
              </div>
            </div>
          </div>

          <Button
            onClick={() => setStep(2)}
            className="w-full mt-6 bg-gradient-to-r from-cyan-500 to-blue-500"
            disabled={!formData.parentFullName || !formData.parentCin}
          >
            Suivant
          </Button>
        </Card>
      )}

      {step === 2 && (
        <Card className="p-6 bg-zinc-900 border-zinc-800">
          <h3 className="text-xl font-bold text-white mb-6">Upload CIN</h3>
          
          <div className="space-y-6">
            <div>
              <Label className="text-white mb-3 block">CIN Recto *</Label>
              <div className="border-2 border-dashed border-zinc-700 rounded-lg p-6 hover:border-cyan-500/50 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "front")}
                  className="hidden"
                  id="cin-front"
                />
                <label htmlFor="cin-front" className="cursor-pointer flex flex-col items-center">
                  <Upload className="w-12 h-12 text-zinc-500 mb-3" />
                  <p className="text-white font-semibold mb-1">
                    {cinFrontFile ? cinFrontFile.name : "Cliquez pour télécharger"}
                  </p>
                  <p className="text-zinc-500 text-sm">JPEG, PNG - Max 5 Mo</p>
                </label>
              </div>
            </div>

            <div>
              <Label className="text-white mb-3 block">CIN Verso *</Label>
              <div className="border-2 border-dashed border-zinc-700 rounded-lg p-6 hover:border-cyan-500/50 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "back")}
                  className="hidden"
                  id="cin-back"
                />
                <label htmlFor="cin-back" className="cursor-pointer flex flex-col items-center">
                  <Upload className="w-12 h-12 text-zinc-500 mb-3" />
                  <p className="text-white font-semibold mb-1">
                    {cinBackFile ? cinBackFile.name : "Cliquez pour télécharger"}
                  </p>
                  <p className="text-zinc-500 text-sm">JPEG, PNG - Max 5 Mo</p>
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-4 mt-6">
            <Button
              onClick={() => setStep(1)}
              variant="outline"
              className="flex-1 border-zinc-700"
            >
              Retour
            </Button>
            <Button
              onClick={() => setStep(3)}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500"
              disabled={!cinFrontFile || !cinBackFile}
            >
              Suivant
            </Button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card className="p-6 bg-zinc-900 border-zinc-800">
          <h3 className="text-xl font-bold text-white mb-6">Signature électronique</h3>
          
          <div className="bg-zinc-950 rounded-lg p-4 mb-4">
            <SignatureCanvas
              ref={signatureRef}
              canvasProps={{
                className: "w-full h-48 rounded-lg",
                style: { touchAction: "none" },
              }}
              backgroundColor="rgb(24, 24, 27)"
              penColor="#06b6d4"
            />
          </div>

          <Button
            onClick={clearSignature}
            variant="outline"
            size="sm"
            className="mb-6 border-zinc-700"
          >
            Effacer
          </Button>

          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-zinc-300 space-y-2">
                <p>Je soussigné(e) <strong className="text-white">{formData.parentFullName}</strong>, titulaire de la CIN n° <strong className="text-white">{formData.parentCin}</strong>, autorise mon enfant à participer à l'événement organisé par Teens Party Morocco.</p>
                <p>Je certifie l'exactitude des informations fournies et accepte les conditions générales.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 mb-6">
            <Checkbox
              id="terms"
              checked={formData.termsAccepted}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, termsAccepted: checked as boolean })
              }
            />
            <label htmlFor="terms" className="text-sm text-zinc-300 cursor-pointer">
              J'accepte les <a href="/legal/conditions" className="text-cyan-400 hover:underline">conditions générales</a> et la <a href="/legal/confidentialite" className="text-cyan-400 hover:underline">politique de confidentialité</a> *
            </label>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-300">
              Cette signature électronique a la même valeur juridique qu'une signature manuscrite. Les documents seront automatiquement supprimés après 30 jours conformément au RGPD/CNDP.
            </p>
          </div>

          <div className="flex gap-4">
            <Button
              onClick={() => setStep(2)}
              variant="outline"
              className="flex-1 border-zinc-700"
            >
              Retour
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500"
              disabled={loading || !formData.termsAccepted}
            >
              {loading ? "Enregistrement..." : "Valider et signer"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
