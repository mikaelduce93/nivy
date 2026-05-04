"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  FileText,
  Upload,
  Download,
  Check,
  Clock,
  AlertTriangle,
  Pen,
  Shield,
  Eye,
  Trash2,
  Plus,
  Calendar,
  User,
  ArrowLeft,
  FileSignature,
  CheckCircle2,
  XCircle
} from "lucide-react"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"

interface Document {
  id: string
  type: "authorization" | "consent" | "medical" | "id_card"
  name: string
  teenName: string
  eventName?: string
  status: "pending" | "signed" | "expired" | "rejected"
  createdAt: string
  expiresAt?: string
  signedAt?: string
  fileUrl?: string
}

export default function ParentDocumentsPage() {
  const [activeTab, setActiveTab] = useState("pending")
  const [signDialogOpen, setSignDialogOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [signature, setSignature] = useState("")
  const [agreements, setAgreements] = useState({
    terms: false,
    data: false,
    photo: false
  })

  const documents: Document[] = [
    {
      id: "1",
      type: "authorization",
      name: "Autorisation parentale",
      teenName: "Yasmine",
      eventName: "Neon Party Casablanca",
      status: "pending",
      createdAt: "2026-01-18",
      expiresAt: "2026-01-25"
    },
    {
      id: "2",
      type: "consent",
      name: "Consentement droit à l'image",
      teenName: "Yasmine",
      status: "pending",
      createdAt: "2026-01-18"
    },
    {
      id: "3",
      type: "authorization",
      name: "Autorisation parentale",
      teenName: "Ahmed",
      eventName: "Teen DJ Battle",
      status: "signed",
      createdAt: "2026-01-10",
      signedAt: "2026-01-12"
    },
    {
      id: "4",
      type: "medical",
      name: "Fiche médicale",
      teenName: "Yasmine",
      status: "signed",
      createdAt: "2026-01-05",
      signedAt: "2026-01-05"
    },
    {
      id: "5",
      type: "authorization",
      name: "Autorisation parentale",
      teenName: "Ahmed",
      eventName: "Soirée Halloween",
      status: "expired",
      createdAt: "2025-10-20",
      expiresAt: "2025-10-31"
    }
  ]

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "authorization": return FileSignature
      case "consent": return Shield
      case "medical": return FileText
      case "id_card": return User
      default: return FileText
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-400"><Clock className="w-3 h-3 mr-1" />En attente</Badge>
      case "signed":
        return <Badge className="bg-green-500/20 text-green-400"><CheckCircle2 className="w-3 h-3 mr-1" />Signé</Badge>
      case "expired":
        return <Badge className="bg-zinc-500/20 text-zinc-400"><XCircle className="w-3 h-3 mr-1" />Expiré</Badge>
      case "rejected":
        return <Badge className="bg-red-500/20 text-red-400"><XCircle className="w-3 h-3 mr-1" />Refusé</Badge>
      default:
        return null
    }
  }

  const pendingDocs = documents.filter(d => d.status === "pending")
  const signedDocs = documents.filter(d => d.status === "signed")
  const expiredDocs = documents.filter(d => d.status === "expired" || d.status === "rejected")

  const handleSign = async () => {
    if (!signature || !agreements.terms || !agreements.data) {
      toast.error("Veuillez remplir tous les champs obligatoires")
      return
    }

    // Simulate signing
    toast.success("Document signé avec succès!", {
      description: "Un email de confirmation vous a été envoyé."
    })
    setSignDialogOpen(false)
    setSignature("")
    setAgreements({ terms: false, data: false, photo: false })
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button asChild variant="ghost" className="text-zinc-400 hover:text-white">
            <Link href="/parent">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Link>
          </Button>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <FileText className="w-8 h-8 text-emerald-400" />
              Documents & Consentements
            </h1>
            <p className="text-zinc-400 mt-1">Gérez les autorisations et documents de vos enfants</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="bg-yellow-500/10 border-yellow-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-yellow-400" />
                <div>
                  <p className="text-2xl font-black text-white">{pendingDocs.length}</p>
                  <p className="text-sm text-yellow-400">En attente</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-2xl font-black text-white">{signedDocs.length}</p>
                  <p className="text-sm text-green-400">Signés</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-500/10 border-zinc-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <XCircle className="w-8 h-8 text-zinc-400" />
                <div>
                  <p className="text-2xl font-black text-white">{expiredDocs.length}</p>
                  <p className="text-sm text-zinc-400">Expirés</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alert for pending documents */}
        {pendingDocs.length > 0 && (
          <Card className="mb-6 bg-yellow-500/10 border-yellow-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-yellow-500" />
                <div>
                  <p className="font-bold text-yellow-400">Action requise</p>
                  <p className="text-sm text-zinc-400">
                    Vous avez {pendingDocs.length} document(s) en attente de signature
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 bg-zinc-900 mb-6">
            <TabsTrigger value="pending">
              En attente ({pendingDocs.length})
            </TabsTrigger>
            <TabsTrigger value="signed">
              Signés ({signedDocs.length})
            </TabsTrigger>
            <TabsTrigger value="expired">
              Expirés ({expiredDocs.length})
            </TabsTrigger>
          </TabsList>

          {/* Pending Tab */}
          <TabsContent value="pending">
            <div className="space-y-4">
              {pendingDocs.map((doc) => {
                const TypeIcon = getTypeIcon(doc.type)
                return (
                  <Card key={doc.id} className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                          <TypeIcon className="w-6 h-6 text-yellow-400" />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-white">{doc.name}</h3>
                            {getStatusBadge(doc.status)}
                          </div>
                          <p className="text-sm text-zinc-400 mb-2">
                            Pour: <span className="text-white">{doc.teenName}</span>
                            {doc.eventName && <> • {doc.eventName}</>}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-zinc-500">
                            <span>Créé le {new Date(doc.createdAt).toLocaleDateString('fr-FR')}</span>
                            {doc.expiresAt && (
                              <span className="text-yellow-400">
                                Expire le {new Date(doc.expiresAt).toLocaleDateString('fr-FR')}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            Voir
                          </Button>
                          <Dialog open={signDialogOpen && selectedDocument?.id === doc.id} onOpenChange={(open) => {
                            setSignDialogOpen(open)
                            if (open) setSelectedDocument(doc)
                          }}>
                            <DialogTrigger asChild>
                              <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600">
                                <Pen className="w-4 h-4 mr-1" />
                                Signer
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
                              <DialogHeader>
                                <DialogTitle className="text-white">Signature électronique</DialogTitle>
                                <DialogDescription>
                                  Signez le document "{doc.name}" pour {doc.teenName}
                                </DialogDescription>
                              </DialogHeader>

                              <div className="space-y-6 py-4">
                                {/* Document Summary */}
                                <div className="p-4 rounded-lg bg-zinc-800/50">
                                  <h4 className="font-bold text-white mb-2">Résumé du document</h4>
                                  <p className="text-sm text-zinc-400">
                                    En signant ce document, vous autorisez votre enfant {doc.teenName} à participer
                                    {doc.eventName ? ` à l'événement "${doc.eventName}"` : " aux activités Teens Party Morocco"}.
                                  </p>
                                </div>

                                {/* Agreements */}
                                <div className="space-y-3">
                                  <div className="flex items-start gap-3">
                                    <Checkbox
                                      id="terms"
                                      checked={agreements.terms}
                                      onCheckedChange={(checked) =>
                                        setAgreements(prev => ({ ...prev, terms: checked as boolean }))
                                      }
                                    />
                                    <Label htmlFor="terms" className="text-sm text-zinc-300">
                                      J'accepte les conditions générales et le règlement intérieur *
                                    </Label>
                                  </div>
                                  <div className="flex items-start gap-3">
                                    <Checkbox
                                      id="data"
                                      checked={agreements.data}
                                      onCheckedChange={(checked) =>
                                        setAgreements(prev => ({ ...prev, data: checked as boolean }))
                                      }
                                    />
                                    <Label htmlFor="data" className="text-sm text-zinc-300">
                                      J'autorise le traitement des données de mon enfant *
                                    </Label>
                                  </div>
                                  <div className="flex items-start gap-3">
                                    <Checkbox
                                      id="photo"
                                      checked={agreements.photo}
                                      onCheckedChange={(checked) =>
                                        setAgreements(prev => ({ ...prev, photo: checked as boolean }))
                                      }
                                    />
                                    <Label htmlFor="photo" className="text-sm text-zinc-300">
                                      J'autorise la prise de photos/vidéos (optionnel)
                                    </Label>
                                  </div>
                                </div>

                                {/* Signature */}
                                <div>
                                  <Label htmlFor="signature" className="text-white">Votre signature (nom complet) *</Label>
                                  <Input
                                    id="signature"
                                    value={signature}
                                    onChange={(e) => setSignature(e.target.value)}
                                    placeholder="Entrez votre nom complet"
                                    className="mt-2 bg-zinc-800 border-zinc-700"
                                  />
                                  <p className="text-xs text-zinc-500 mt-1">
                                    En tapant votre nom, vous certifiez être le parent/tuteur légal
                                  </p>
                                </div>
                              </div>

                              <DialogFooter>
                                <Button variant="outline" onClick={() => setSignDialogOpen(false)}>
                                  Annuler
                                </Button>
                                <Button
                                  onClick={handleSign}
                                  disabled={!signature || !agreements.terms || !agreements.data}
                                  className="bg-emerald-500 hover:bg-emerald-600"
                                >
                                  <FileSignature className="w-4 h-4 mr-2" />
                                  Signer le document
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {pendingDocs.length === 0 && (
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="py-12 text-center">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
                    <p className="text-white font-bold">Tout est à jour!</p>
                    <p className="text-zinc-400">Aucun document en attente de signature</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Signed Tab */}
          <TabsContent value="signed">
            <div className="space-y-4">
              {signedDocs.map((doc) => {
                const TypeIcon = getTypeIcon(doc.type)
                return (
                  <Card key={doc.id} className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                          <TypeIcon className="w-6 h-6 text-green-400" />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-white">{doc.name}</h3>
                            {getStatusBadge(doc.status)}
                          </div>
                          <p className="text-sm text-zinc-400 mb-2">
                            Pour: <span className="text-white">{doc.teenName}</span>
                            {doc.eventName && <> • {doc.eventName}</>}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-zinc-500">
                            <span>Signé le {new Date(doc.signedAt!).toLocaleDateString('fr-FR')}</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            Voir
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="w-4 h-4 mr-1" />
                            PDF
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          {/* Expired Tab */}
          <TabsContent value="expired">
            <div className="space-y-4">
              {expiredDocs.map((doc) => {
                const TypeIcon = getTypeIcon(doc.type)
                return (
                  <Card key={doc.id} className="bg-zinc-900 border-zinc-800 opacity-60">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-zinc-500/20 flex items-center justify-center flex-shrink-0">
                          <TypeIcon className="w-6 h-6 text-zinc-400" />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-white">{doc.name}</h3>
                            {getStatusBadge(doc.status)}
                          </div>
                          <p className="text-sm text-zinc-400 mb-2">
                            Pour: <span className="text-white">{doc.teenName}</span>
                            {doc.eventName && <> • {doc.eventName}</>}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-zinc-500">
                            <span>Expiré le {new Date(doc.expiresAt!).toLocaleDateString('fr-FR')}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {expiredDocs.length === 0 && (
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="py-12 text-center">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
                    <p className="text-zinc-400">Aucun document expiré</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
