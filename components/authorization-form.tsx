"use client"

import { useState } from "react"
import { useRouter } from 'next/navigation'
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { SignaturePad } from "@/components/signature-pad"
import { PhotoUpload } from "@/components/photo-upload"
import { Loader2, AlertCircle, Upload } from 'lucide-react'
import { toast } from "sonner"

interface AuthorizationFormProps {
  children: any[]
  events: any[]
  parentId: string
}

export function AuthorizationForm({ children, events, parentId }: AuthorizationFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    childId: "",
    eventId: "",
    authorizationType: "event" as const,
    authorizedPersonName: "",
    authorizedPersonPhone: "",
    authorizedPersonRelation: "",
    photoConsent: false,
    medicalConsent: false,
    pickupConsent: false,
    parentSignature: "",
    cinFrontUrl: "",
    cinBackUrl: "",
  })

  const handleSignatureSave = async (signatureDataUrl: string) => {
    setFormData(prev => ({ ...prev, parentSignature: signatureDataUrl }))
    toast.success("Signature enregistrée")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.childId || !formData.eventId) {
      toast.error("Veuillez sélectionner un enfant et un événement")
      return
    }

    if (!formData.parentSignature) {
      toast.error("La signature parentale est obligatoire")
      return
    }

    if (!formData.cinFrontUrl || !formData.cinBackUrl) {
      toast.error("Les photos de la CIN (recto et verso) sont obligatoires")
      return
    }

    if (!formData.photoConsent || !formData.medicalConsent) {
      toast.error("Vous devez accepter les consentements obligatoires")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/authorizations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          parentId,
          ipAddress: window.location.hostname,
          userAgent: navigator.userAgent,
        }),
      })

      if (!response.ok) {
        throw new Error("Erreur lors de la création de l'autorisation")
      }

      toast.success("Autorisation créée avec succès")
      router.push("/authorisations")
      router.refresh()
    } catch (error) {
      console.error("[v0] Authorization creation error:", error)
      toast.error("Erreur lors de la création de l'autorisation")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-6 bg-zinc-900 border-zinc-800">
        <h2 className="text-xl font-bold text-white mb-4">Informations de base</h2>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="childId">Enfant concerné *</Label>
            <Select
              value={formData.childId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, childId: value }))}
              required
            >
              <SelectTrigger id="childId" className="bg-zinc-950 border-zinc-800">
                <SelectValue placeholder="Sélectionner un enfant" />
              </SelectTrigger>
              <SelectContent>
                {children.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.prenom} {child.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="eventId">Événement *</Label>
            <Select
              value={formData.eventId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, eventId: value }))}
              required
            >
              <SelectTrigger id="eventId" className="bg-zinc-950 border-zinc-800">
                <SelectValue placeholder="Sélectionner un événement" />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.title} - {new Date(event.event_date).toLocaleDateString("fr-FR")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-zinc-900 border-zinc-800">
        <h2 className="text-xl font-bold text-white mb-4">Personne autorisée à récupérer l'enfant</h2>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="authorizedPersonName">Nom complet</Label>
            <Input
              id="authorizedPersonName"
              value={formData.authorizedPersonName}
              onChange={(e) => setFormData(prev => ({ ...prev, authorizedPersonName: e.target.value }))}
              className="bg-zinc-950 border-zinc-800"
              placeholder="Si différent du parent"
            />
          </div>

          <div>
            <Label htmlFor="authorizedPersonPhone">Téléphone</Label>
            <Input
              id="authorizedPersonPhone"
              type="tel"
              value={formData.authorizedPersonPhone}
              onChange={(e) => setFormData(prev => ({ ...prev, authorizedPersonPhone: e.target.value }))}
              className="bg-zinc-950 border-zinc-800"
            />
          </div>

          <div>
            <Label htmlFor="authorizedPersonRelation">Lien avec l'enfant</Label>
            <Input
              id="authorizedPersonRelation"
              value={formData.authorizedPersonRelation}
              onChange={(e) => setFormData(prev => ({ ...prev, authorizedPersonRelation: e.target.value }))}
              className="bg-zinc-950 border-zinc-800"
              placeholder="Ex: Grand-mère, Oncle, Ami de la famille"
            />
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-zinc-900 border-zinc-800">
        <h2 className="text-xl font-bold text-white mb-4">Consentements *</h2>
        
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="photoConsent"
              checked={formData.photoConsent}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, photoConsent: checked as boolean }))
              }
              className="mt-1"
            />
            <Label htmlFor="photoConsent" className="text-sm leading-relaxed cursor-pointer">
              J'autorise la prise de photos et vidéos de mon enfant lors de l'événement, et leur utilisation 
              à des fins promotionnelles par Teens Party Morocco, conformément à la loi 09-08 et la CNDP.
            </Label>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="medicalConsent"
              checked={formData.medicalConsent}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, medicalConsent: checked as boolean }))
              }
              className="mt-1"
            />
            <Label htmlFor="medicalConsent" className="text-sm leading-relaxed cursor-pointer">
              J'autorise l'équipe Teens Party Morocco à prendre les mesures nécessaires en cas d'urgence 
              médicale concernant mon enfant, et à contacter les services d'urgence si nécessaire.
            </Label>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="pickupConsent"
              checked={formData.pickupConsent}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, pickupConsent: checked as boolean }))
              }
              className="mt-1"
            />
            <Label htmlFor="pickupConsent" className="text-sm leading-relaxed cursor-pointer">
              J'autorise la personne mentionnée ci-dessus à récupérer mon enfant à la fin de l'événement.
              Une pièce d'identité sera demandée lors de la récupération.
            </Label>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-zinc-900 border-zinc-800">
        <h2 className="text-xl font-bold text-white mb-4">Copie de la CIN du parent *</h2>
        <p className="text-sm text-zinc-400 mb-4">
          Pour des raisons de sécurité, nous devons vérifier votre identité. Ces documents seront 
          automatiquement supprimés après 30 jours conformément au RGPD/CNDP.
        </p>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <PhotoUpload
              currentPhotoUrl={formData.cinFrontUrl}
              onPhotoChange={(url) => setFormData(prev => ({ ...prev, cinFrontUrl: url }))}
              userId={parentId}
              label="CIN Recto *"
            />
          </div>
          <div>
            <PhotoUpload
              currentPhotoUrl={formData.cinBackUrl}
              onPhotoChange={(url) => setFormData(prev => ({ ...prev, cinBackUrl: url }))}
              userId={parentId}
              label="CIN Verso *"
            />
          </div>
        </div>
      </Card>

      <SignaturePad onSave={handleSignatureSave} />

      {!formData.parentSignature && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-yellow-400 text-sm">
            Vous devez signer électroniquement l'autorisation avant de pouvoir la soumettre.
          </p>
        </div>
      )}

      <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
        <p className="text-cyan-400 text-sm">
          En soumettant ce formulaire, je certifie que les informations fournies sont exactes et 
          j'accepte les conditions générales de Teens Party Morocco. Cette autorisation est valable 
          uniquement pour l'événement sélectionné.
        </p>
      </div>

      <Button
        type="submit"
        disabled={loading || !formData.parentSignature || !formData.photoConsent || !formData.medicalConsent}
        className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0 py-6 text-lg"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Création en cours...
          </>
        ) : (
          <>
            <Upload className="w-5 h-5 mr-2" />
            Soumettre l'autorisation
          </>
        )}
      </Button>
    </form>
  )
}
