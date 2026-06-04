"use client"

import { useState, useRef } from "react"
import { StickerCard } from "@/components/ui/sticker-card"
import { Button } from "@/components/ui/button"
import { FieldInput } from "@/components/ui/field-input"
import { CheckRound } from "@/components/ui/check-round"
import { SegmentedProgress } from "@/components/ui/progress"
import { AlertCircle, FileText, Upload } from 'lucide-react'
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
    // Geolocation of a minor is more sensitive (loi 09-08/CNDP) → opt-in,
    // default off. Grants the parent the right to locate the teen at
    // events/trips; revocable later.
    locationConsent: false,
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
      formDataToSend.append("locationConsent", formData.locationConsent.toString())
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
    } catch {
      toast.error("Erreur lors de l'enregistrement de la signature")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <SegmentedProgress steps={3} current={step - 1} showLabel className="mb-2" />

      {step === 1 && (
        <StickerCard variant="panel" className="p-6">
          <h3 className="font-display text-xl font-extrabold text-ink mb-6">Informations parentales</h3>

          <div className="space-y-4">
            <FieldInput
              id="parentName"
              label="Nom complet du parent *"
              value={formData.parentFullName}
              onChange={(e) => setFormData({ ...formData, parentFullName: e.target.value })}
              placeholder="Prénom et nom comme sur la CIN"
            />

            <FieldInput
              id="cin"
              label="Numéro CIN *"
              value={formData.parentCin}
              onChange={(e) => setFormData({ ...formData, parentCin: e.target.value })}
              placeholder="AB123456"
            />

            <div className="space-y-3 mt-6">
              <CheckRound
                id="photoConsent"
                checked={formData.photoConsent}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, photoConsent: checked as boolean })
                }
                label="J'autorise la prise de photos de mon enfant lors de l'événement"
              />

              <CheckRound
                id="medicalConsent"
                checked={formData.medicalConsent}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, medicalConsent: checked as boolean })
                }
                label="J'autorise les premiers soins d'urgence si nécessaire"
              />

              <CheckRound
                id="locationConsent"
                checked={formData.locationConsent}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, locationConsent: checked as boolean })
                }
                label="J'autorise la géolocalisation de mon enfant lors des événements et trajets (révocable à tout moment)"
              />
            </div>
          </div>

          <Button
            onClick={() => setStep(2)}
            variant="pink"
            className="w-full mt-6"
            disabled={!formData.parentFullName || !formData.parentCin}
          >
            Suivant
          </Button>
        </StickerCard>
      )}

      {step === 2 && (
        <StickerCard variant="panel" className="p-6">
          <h3 className="font-display text-xl font-extrabold text-ink mb-6">Upload CIN</h3>

          <div className="space-y-6">
            <div>
              <p className="eyebrow mb-3">CIN Recto *</p>
              <label
                htmlFor="cin-front"
                className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-ink bg-white p-6 shadow-stkr-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-pink"
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "front")}
                  className="hidden"
                  id="cin-front"
                />
                <Upload className="w-10 h-10 text-ink-2 mb-3" />
                <p className="text-ink font-semibold mb-1">
                  {cinFrontFile ? cinFrontFile.name : "Clique pour télécharger"}
                </p>
                <p className="font-mono text-xs text-mute">JPEG, PNG · Max 5 Mo</p>
              </label>
            </div>

            <div>
              <p className="eyebrow mb-3">CIN Verso *</p>
              <label
                htmlFor="cin-back"
                className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-ink bg-white p-6 shadow-stkr-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-pink"
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "back")}
                  className="hidden"
                  id="cin-back"
                />
                <Upload className="w-10 h-10 text-ink-2 mb-3" />
                <p className="text-ink font-semibold mb-1">
                  {cinBackFile ? cinBackFile.name : "Clique pour télécharger"}
                </p>
                <p className="font-mono text-xs text-mute">JPEG, PNG · Max 5 Mo</p>
              </label>
            </div>
          </div>

          <div className="flex gap-4 mt-6">
            <Button
              onClick={() => setStep(1)}
              variant="outline"
              className="flex-1"
            >
              Retour
            </Button>
            <Button
              onClick={() => setStep(3)}
              variant="pink"
              className="flex-1"
              disabled={!cinFrontFile || !cinBackFile}
            >
              Suivant
            </Button>
          </div>
        </StickerCard>
      )}

      {step === 3 && (
        <StickerCard variant="panel" className="p-6">
          <h3 className="font-display text-xl font-extrabold text-ink mb-6">Signature électronique</h3>

          <div className="rounded-2xl border-2 border-ink bg-paper p-4 mb-4">
            <SignatureCanvas
              ref={signatureRef}
              canvasProps={{
                className: "w-full h-48 rounded-xl",
                style: { touchAction: "none" },
              }}
              backgroundColor="#f4ede0"
              penColor="#0e0c1a"
            />
          </div>

          <Button
            onClick={clearSignature}
            variant="outline"
            size="sm"
            className="mb-6"
          >
            Effacer
          </Button>

          <StickerCard variant="panel" className="p-4 mb-6 bg-teal/10">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-teal flex-shrink-0 mt-0.5" />
              <div className="text-sm text-ink-2 space-y-2">
                <p>Je soussigné(e) <strong className="text-ink">{formData.parentFullName}</strong>, titulaire de la CIN n° <strong className="text-ink">{formData.parentCin}</strong>, autorise mon enfant à utiliser Nivy et à participer aux événements partenaires.</p>
                <p>Je certifie l'exactitude des informations fournies et accepte les conditions générales.</p>
              </div>
            </div>
          </StickerCard>

          <div className="mb-6">
            <CheckRound
              id="terms"
              checked={formData.termsAccepted}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, termsAccepted: checked as boolean })
              }
              label={
                <>
                  J'accepte les <a href="/legal/cgu" className="text-pink hover:underline">conditions générales</a> et la <a href="/legal/confidentialite" className="text-pink hover:underline">politique de confidentialité</a> *
                </>
              }
            />
          </div>

          <StickerCard variant="panel" className="p-4 mb-6 bg-gold/10">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
              <p className="text-sm text-ink-2">
                Cette signature électronique a la même valeur juridique qu'une signature manuscrite. Les documents seront automatiquement supprimés après 30 jours conformément au RGPD/CNDP.
              </p>
            </div>
          </StickerCard>

          <div className="flex gap-4">
            <Button
              onClick={() => setStep(2)}
              variant="outline"
              className="flex-1"
            >
              Retour
            </Button>
            <Button
              onClick={handleSubmit}
              variant="pink"
              className="flex-1"
              disabled={loading || !formData.termsAccepted}
            >
              {loading ? "Enregistrement..." : "Valider et signer"}
            </Button>
          </div>
        </StickerCard>
      )}
    </div>
  )
}
