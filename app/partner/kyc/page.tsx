"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Shield,
  Upload,
  Check,
  Clock,
  AlertTriangle,
  Building2,
  User,
  FileText,
  CreditCard,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  Camera,
  Info
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface KYCStep {
  id: string
  title: string
  description: string
  status: "pending" | "submitted" | "verified" | "rejected"
  required: boolean
}

export default function PartnerKYCPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [uploading, setUploading] = useState(false)

  const kycSteps: KYCStep[] = [
    {
      id: "business_info",
      title: "Informations entreprise",
      description: "Raison sociale, RC, ICE",
      status: "verified",
      required: true
    },
    {
      id: "legal_docs",
      title: "Documents légaux",
      description: "Statuts, RC, Patente",
      status: "verified",
      required: true
    },
    {
      id: "representative",
      title: "Représentant légal",
      description: "CIN, Pouvoir de signature",
      status: "submitted",
      required: true
    },
    {
      id: "bank_account",
      title: "Coordonnées bancaires",
      description: "RIB pour les paiements",
      status: "pending",
      required: true
    }
  ]

  const completedSteps = kycSteps.filter(s => s.status === "verified").length
  const progress = (completedSteps / kycSteps.length) * 100

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified": return <CheckCircle2 className="w-5 h-5 text-green-500" />
      case "submitted": return <Clock className="w-5 h-5 text-yellow-500" />
      case "rejected": return <XCircle className="w-5 h-5 text-red-500" />
      default: return <div className="w-5 h-5 rounded-full border-2 border-zinc-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified": return <Badge className="bg-green-500/20 text-green-400">Vérifié</Badge>
      case "submitted": return <Badge className="bg-yellow-500/20 text-yellow-400">En cours</Badge>
      case "rejected": return <Badge className="bg-red-500/20 text-red-400">Refusé</Badge>
      default: return <Badge variant="outline">À compléter</Badge>
    }
  }

  const handleFileUpload = async (field: string) => {
    setUploading(true)
    // Simulate upload
    await new Promise(resolve => setTimeout(resolve, 2000))
    setUploading(false)
    toast.success("Document uploadé avec succès")
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-32">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button asChild variant="ghost" className="text-zinc-400 hover:text-white">
            <Link href="/partner/dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Link>
          </Button>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-400" />
              Vérification KYC
            </h1>
            <p className="text-zinc-400 mt-1">Complétez votre vérification pour débloquer toutes les fonctionnalités</p>
          </div>
        </div>

        {/* Progress */}
        <Card className="mb-8 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-white">Progression de la vérification</h3>
                <p className="text-sm text-zinc-400">{completedSteps} sur {kycSteps.length} étapes complétées</p>
              </div>
              <span className="text-2xl font-black text-blue-400">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-3" />
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Steps List */}
          <div className="lg:col-span-1">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Étapes de vérification</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {kycSteps.map((step, index) => (
                    <div
                      key={step.id}
                      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                        currentStep === index + 1
                          ? "bg-blue-500/10 border border-blue-500/30"
                          : "hover:bg-zinc-800"
                      }`}
                      onClick={() => setCurrentStep(index + 1)}
                    >
                      {getStatusIcon(step.status)}
                      <div className="flex-1">
                        <p className="font-medium text-white">{step.title}</p>
                        <p className="text-xs text-zinc-400">{step.description}</p>
                      </div>
                      {getStatusBadge(step.status)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Step Details */}
          <div className="lg:col-span-2">
            {currentStep === 1 && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-400" />
                    Informations entreprise
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <span className="text-green-400 font-medium">Informations vérifiées</span>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <div>
                      <Label className="text-zinc-400">Raison sociale</Label>
                      <Input value="Cool Events SARL" disabled className="bg-zinc-800 border-zinc-700" />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-zinc-400">Numéro RC</Label>
                        <Input value="123456" disabled className="bg-zinc-800 border-zinc-700" />
                      </div>
                      <div>
                        <Label className="text-zinc-400">ICE</Label>
                        <Input value="001234567890123" disabled className="bg-zinc-800 border-zinc-700" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-zinc-400">Adresse</Label>
                      <Input value="123 Rue Example, Casablanca" disabled className="bg-zinc-800 border-zinc-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 2 && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-400" />
                    Documents légaux
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <span className="text-green-400 font-medium">Documents vérifiés</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {[
                      { name: "Statuts de la société", status: "verified" },
                      { name: "Extrait du RC", status: "verified" },
                      { name: "Attestation de patente", status: "verified" }
                    ].map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-zinc-400" />
                          <span className="text-white">{doc.name}</span>
                        </div>
                        <Badge className="bg-green-500/20 text-green-400">
                          <Check className="w-3 h-3 mr-1" />
                          Vérifié
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 3 && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-400" />
                    Représentant légal
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-yellow-500" />
                      <span className="text-yellow-400 font-medium">En cours de vérification</span>
                    </div>
                    <p className="text-sm text-zinc-400 mt-1">
                      Nos équipes vérifient actuellement vos documents. Délai estimé: 24-48h.
                    </p>
                  </div>

                  <div className="grid gap-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-zinc-400">Nom complet</Label>
                        <Input value="Mohamed Alami" disabled className="bg-zinc-800 border-zinc-700" />
                      </div>
                      <div>
                        <Label className="text-zinc-400">Fonction</Label>
                        <Input value="Gérant" disabled className="bg-zinc-800 border-zinc-700" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-zinc-400" />
                        <span className="text-white">Carte d'identité (recto/verso)</span>
                      </div>
                      <Badge className="bg-yellow-500/20 text-yellow-400">
                        <Clock className="w-3 h-3 mr-1" />
                        En vérification
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-zinc-400" />
                        <span className="text-white">Pouvoir de signature</span>
                      </div>
                      <Badge className="bg-yellow-500/20 text-yellow-400">
                        <Clock className="w-3 h-3 mr-1" />
                        En vérification
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 4 && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-blue-400" />
                    Coordonnées bancaires
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-center gap-2">
                      <Info className="w-5 h-5 text-blue-400" />
                      <span className="text-blue-400 font-medium">Action requise</span>
                    </div>
                    <p className="text-sm text-zinc-400 mt-1">
                      Ajoutez vos coordonnées bancaires pour recevoir vos paiements.
                    </p>
                  </div>

                  <div className="grid gap-4">
                    <div>
                      <Label>Nom du titulaire *</Label>
                      <Input placeholder="COOL EVENTS SARL" className="bg-zinc-800 border-zinc-700" />
                    </div>
                    <div>
                      <Label>Banque *</Label>
                      <Input placeholder="Attijariwafa Bank" className="bg-zinc-800 border-zinc-700" />
                    </div>
                    <div>
                      <Label>RIB *</Label>
                      <Input placeholder="007 000 0000000000000000 00" className="bg-zinc-800 border-zinc-700" />
                    </div>
                  </div>

                  <div>
                    <Label className="mb-2 block">RIB (document)</Label>
                    <div className="border-2 border-dashed border-zinc-700 rounded-lg p-8 text-center">
                      <Upload className="w-12 h-12 mx-auto mb-4 text-zinc-500" />
                      <p className="text-sm text-zinc-400 mb-2">
                        Glissez votre RIB ici ou cliquez pour sélectionner
                      </p>
                      <Button variant="outline" onClick={() => handleFileUpload('rib')} disabled={uploading}>
                        {uploading ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Upload...</>
                        ) : (
                          <>Choisir un fichier</>
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button className="w-full bg-blue-500 hover:bg-blue-600">
                    Soumettre pour vérification
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
