"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Building2,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Calendar,
  AlertTriangle,
  Eye,
  FileText,
  MoreVertical,
  ArrowLeft,
  Download,
  RefreshCw,
  Shield,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  ExternalLink
} from "lucide-react"
import Link from "next/link"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"

interface Partner {
  id: string
  companyName: string
  legalName: string
  type: "venue" | "organizer" | "service"
  contact: {
    name: string
    email: string
    phone: string
  }
  address: string
  city: string
  rc: string
  ice: string
  kycStatus: "pending" | "in_review" | "approved" | "rejected" | "incomplete"
  kycProgress: number
  documents: {
    name: string
    status: "pending" | "verified" | "rejected"
    url?: string
  }[]
  bankAccount?: {
    bank: string
    rib: string
  }
  createdAt: string
  lastActivity: string
  totalRevenue?: number
  eventsCount?: number
}

export default function AdminPartnersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("pending")
  const [typeFilter, setTypeFilter] = useState("all")
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")

  const stats = {
    total: 156,
    pending: 12,
    inReview: 5,
    approved: 134,
    rejected: 5
  }

  const partners: Partner[] = [
    {
      id: "1",
      companyName: "Neon Club Casablanca",
      legalName: "NEON EVENTS SARL",
      type: "venue",
      contact: {
        name: "Karim Bennani",
        email: "karim@neonclub.ma",
        phone: "+212 6 12 34 56 78"
      },
      address: "123 Boulevard Zerktouni",
      city: "Casablanca",
      rc: "456789",
      ice: "001234567890123",
      kycStatus: "pending",
      kycProgress: 75,
      documents: [
        { name: "Statuts de la société", status: "verified" },
        { name: "Extrait RC", status: "verified" },
        { name: "CIN Gérant", status: "pending" },
        { name: "RIB", status: "pending" }
      ],
      createdAt: "2026-01-15",
      lastActivity: "2026-01-20"
    },
    {
      id: "2",
      companyName: "Teen Events Morocco",
      legalName: "TEM PRODUCTION SARL",
      type: "organizer",
      contact: {
        name: "Sara Alaoui",
        email: "sara@teenevents.ma",
        phone: "+212 6 98 76 54 32"
      },
      address: "45 Rue Moulay Ismail",
      city: "Rabat",
      rc: "789012",
      ice: "002345678901234",
      kycStatus: "in_review",
      kycProgress: 100,
      documents: [
        { name: "Statuts de la société", status: "verified" },
        { name: "Extrait RC", status: "verified" },
        { name: "CIN Gérant", status: "verified" },
        { name: "RIB", status: "verified" }
      ],
      bankAccount: {
        bank: "Attijariwafa Bank",
        rib: "007 *** **** 4521"
      },
      createdAt: "2026-01-10",
      lastActivity: "2026-01-19"
    },
    {
      id: "3",
      companyName: "Cool DJ Academy",
      legalName: "COOL ACADEMY SARL",
      type: "service",
      contact: {
        name: "Ahmed Tazi",
        email: "ahmed@cooldj.ma",
        phone: "+212 6 55 44 33 22"
      },
      address: "78 Avenue Hassan II",
      city: "Marrakech",
      rc: "345678",
      ice: "003456789012345",
      kycStatus: "approved",
      kycProgress: 100,
      documents: [
        { name: "Statuts de la société", status: "verified" },
        { name: "Extrait RC", status: "verified" },
        { name: "CIN Gérant", status: "verified" },
        { name: "RIB", status: "verified" }
      ],
      bankAccount: {
        bank: "BMCE Bank",
        rib: "011 *** **** 7890"
      },
      createdAt: "2025-12-01",
      lastActivity: "2026-01-18",
      totalRevenue: 125000,
      eventsCount: 15
    },
    {
      id: "4",
      companyName: "Party Land Tanger",
      legalName: "PARTYLAND EVENTS SARL",
      type: "venue",
      contact: {
        name: "Mehdi Chraibi",
        email: "mehdi@partyland.ma",
        phone: "+212 6 11 22 33 44"
      },
      address: "12 Avenue Mohammed V",
      city: "Tanger",
      rc: "567890",
      ice: "004567890123456",
      kycStatus: "rejected",
      kycProgress: 50,
      documents: [
        { name: "Statuts de la société", status: "verified" },
        { name: "Extrait RC", status: "rejected" },
        { name: "CIN Gérant", status: "pending" },
        { name: "RIB", status: "pending" }
      ],
      createdAt: "2026-01-05",
      lastActivity: "2026-01-12"
    },
    {
      id: "5",
      companyName: "Wave Events",
      legalName: "WAVE PRODUCTION SA",
      type: "organizer",
      contact: {
        name: "Lina Fassi",
        email: "lina@waveevents.ma",
        phone: "+212 6 77 88 99 00"
      },
      address: "90 Boulevard Anfa",
      city: "Casablanca",
      rc: "901234",
      ice: "005678901234567",
      kycStatus: "incomplete",
      kycProgress: 25,
      documents: [
        { name: "Statuts de la société", status: "pending" },
        { name: "Extrait RC", status: "pending" },
        { name: "CIN Gérant", status: "pending" },
        { name: "RIB", status: "pending" }
      ],
      createdAt: "2026-01-18",
      lastActivity: "2026-01-18"
    }
  ]

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "venue":
        return <Badge className="bg-purple-500/20 text-purple-400">Lieu</Badge>
      case "organizer":
        return <Badge className="bg-blue-500/20 text-blue-400">Organisateur</Badge>
      case "service":
        return <Badge className="bg-cyan-500/20 text-cyan-400">Service</Badge>
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-400"><Clock className="w-3 h-3 mr-1" />En attente</Badge>
      case "in_review":
        return <Badge className="bg-blue-500/20 text-blue-400"><Eye className="w-3 h-3 mr-1" />En révision</Badge>
      case "approved":
        return <Badge className="bg-green-500/20 text-green-400"><CheckCircle2 className="w-3 h-3 mr-1" />Approuvé</Badge>
      case "rejected":
        return <Badge className="bg-red-500/20 text-red-400"><XCircle className="w-3 h-3 mr-1" />Rejeté</Badge>
      case "incomplete":
        return <Badge className="bg-zinc-500/20 text-zinc-400"><AlertTriangle className="w-3 h-3 mr-1" />Incomplet</Badge>
      default:
        return null
    }
  }

  const getDocStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />
    }
  }

  const handleApprove = (partner: Partner) => {
    toast.success("Partenaire approuvé", {
      description: `${partner.companyName} peut maintenant publier des événements`
    })
    setReviewDialogOpen(false)
  }

  const handleReject = (partner: Partner) => {
    if (!rejectionReason.trim()) {
      toast.error("Veuillez indiquer une raison de rejet")
      return
    }
    toast.success("Partenaire rejeté", {
      description: "Un email a été envoyé au partenaire"
    })
    setRejectionReason("")
    setReviewDialogOpen(false)
  }

  const handleRequestInfo = (partner: Partner) => {
    toast.success("Demande envoyée", {
      description: `Un email a été envoyé à ${partner.contact.name}`
    })
  }

  const filteredPartners = partners.filter(partner => {
    const matchesSearch =
      partner.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      partner.legalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      partner.contact.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || partner.kycStatus === statusFilter
    const matchesType = typeFilter === "all" || partner.type === typeFilter
    return matchesSearch && matchesStatus && matchesType
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-32">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button asChild variant="ghost" className="text-zinc-400 hover:text-white">
            <Link href="/admin">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Link>
          </Button>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <Building2 className="w-8 h-8 text-emerald-400" />
              Gestion des Partenaires
            </h1>
            <p className="text-zinc-400 mt-1">Validation KYC et gestion des partenaires</p>
          </div>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-zinc-500/20 to-zinc-600/20 border-zinc-500/30">
            <CardContent className="p-5">
              <p className="text-xs text-zinc-400 font-medium">Total partenaires</p>
              <p className="text-3xl font-black text-white">{stats.total}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
            <CardContent className="p-5">
              <p className="text-xs text-yellow-400 font-medium">En attente</p>
              <p className="text-3xl font-black text-white">{stats.pending}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30">
            <CardContent className="p-5">
              <p className="text-xs text-blue-400 font-medium">En révision</p>
              <p className="text-3xl font-black text-white">{stats.inReview}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
            <CardContent className="p-5">
              <p className="text-xs text-green-400 font-medium">Approuvés</p>
              <p className="text-3xl font-black text-white">{stats.approved}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500/20 to-pink-500/20 border-red-500/30">
            <CardContent className="p-5">
              <p className="text-xs text-red-400 font-medium">Rejetés</p>
              <p className="text-3xl font-black text-white">{stats.rejected}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6 bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    placeholder="Rechercher par nom ou contact..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-zinc-800 border-zinc-700"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Statut KYC" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="in_review">En révision</SelectItem>
                  <SelectItem value="approved">Approuvés</SelectItem>
                  <SelectItem value="rejected">Rejetés</SelectItem>
                  <SelectItem value="incomplete">Incomplets</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous types</SelectItem>
                  <SelectItem value="venue">Lieux</SelectItem>
                  <SelectItem value="organizer">Organisateurs</SelectItem>
                  <SelectItem value="service">Services</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Partners Table */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-400">Partenaire</TableHead>
                  <TableHead className="text-zinc-400">Type</TableHead>
                  <TableHead className="text-zinc-400">Contact</TableHead>
                  <TableHead className="text-zinc-400">Ville</TableHead>
                  <TableHead className="text-zinc-400">KYC</TableHead>
                  <TableHead className="text-zinc-400">Statut</TableHead>
                  <TableHead className="text-zinc-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPartners.map((partner) => (
                  <TableRow key={partner.id} className="border-zinc-800 hover:bg-zinc-800/50">
                    <TableCell>
                      <div>
                        <p className="font-bold text-white">{partner.companyName}</p>
                        <p className="text-xs text-zinc-500">{partner.legalName}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getTypeBadge(partner.type)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-white">{partner.contact.name}</p>
                        <p className="text-xs text-zinc-500">{partner.contact.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-400">{partner.city}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={partner.kycProgress} className="w-16 h-2" />
                        <span className="text-xs text-zinc-400">{partner.kycProgress}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(partner.kycStatus)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setSelectedPartner(partner)
                            setReviewDialogOpen(true)
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                            <DropdownMenuItem onClick={() => {
                              setSelectedPartner(partner)
                              setReviewDialogOpen(true)
                            }}>
                              <Eye className="w-4 h-4 mr-2" />
                              Voir détails
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRequestInfo(partner)}>
                              <Mail className="w-4 h-4 mr-2" />
                              Demander infos
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-zinc-800" />
                            {partner.kycStatus !== "approved" && (
                              <DropdownMenuItem onClick={() => handleApprove(partner)} className="text-green-400">
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Approuver
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => {
                              setSelectedPartner(partner)
                              setReviewDialogOpen(true)
                            }} className="text-red-400">
                              <XCircle className="w-4 h-4 mr-2" />
                              Rejeter
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {filteredPartners.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <Building2 className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
                      <p className="text-zinc-500">Aucun partenaire trouvé</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Review Dialog */}
        <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
          <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Détails du partenaire</DialogTitle>
              <DialogDescription>
                Vérifiez les informations KYC et prenez une décision
              </DialogDescription>
            </DialogHeader>

            {selectedPartner && (
              <div className="space-y-6">
                {/* Company Info */}
                <div className="p-4 rounded-lg bg-zinc-800/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-white text-lg">{selectedPartner.companyName}</h3>
                      <p className="text-sm text-zinc-400">{selectedPartner.legalName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getTypeBadge(selectedPartner.type)}
                      {getStatusBadge(selectedPartner.kycStatus)}
                    </div>
                  </div>
                </div>

                {/* Contact & Location */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-zinc-800/50">
                    <h4 className="text-sm font-bold text-zinc-400 mb-3">Contact</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-zinc-500" />
                        <span className="text-white">{selectedPartner.contact.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-zinc-500" />
                        <span className="text-white">{selectedPartner.contact.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-zinc-500" />
                        <span className="text-white">{selectedPartner.contact.phone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-zinc-800/50">
                    <h4 className="text-sm font-bold text-zinc-400 mb-3">Localisation</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-zinc-500" />
                        <span className="text-white">{selectedPartner.address}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-zinc-500" />
                        <span className="text-white">{selectedPartner.city}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Legal Info */}
                <div className="p-4 rounded-lg bg-zinc-800/50">
                  <h4 className="text-sm font-bold text-zinc-400 mb-3">Informations légales</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-zinc-500">Numéro RC</Label>
                      <p className="text-white font-mono">{selectedPartner.rc}</p>
                    </div>
                    <div>
                      <Label className="text-zinc-500">ICE</Label>
                      <p className="text-white font-mono">{selectedPartner.ice}</p>
                    </div>
                  </div>
                </div>

                {/* Documents */}
                <div className="p-4 rounded-lg bg-zinc-800/50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-zinc-400">Documents KYC</h4>
                    <span className="text-xs text-zinc-500">
                      {selectedPartner.documents.filter(d => d.status === "verified").length}/{selectedPartner.documents.length} vérifiés
                    </span>
                  </div>
                  <div className="space-y-2">
                    {selectedPartner.documents.map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded bg-zinc-900"
                      >
                        <div className="flex items-center gap-3">
                          {getDocStatusIcon(doc.status)}
                          <span className="text-white">{doc.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={
                            doc.status === "verified" ? "text-green-400 border-green-500/30" :
                            doc.status === "rejected" ? "text-red-400 border-red-500/30" :
                            "text-yellow-400 border-yellow-500/30"
                          }>
                            {doc.status === "verified" ? "Vérifié" :
                             doc.status === "rejected" ? "Rejeté" : "En attente"}
                          </Badge>
                          {doc.status !== "pending" && (
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bank Account */}
                {selectedPartner.bankAccount && (
                  <div className="p-4 rounded-lg bg-zinc-800/50">
                    <h4 className="text-sm font-bold text-zinc-400 mb-3">Coordonnées bancaires</h4>
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-zinc-500" />
                      <div>
                        <p className="text-white">{selectedPartner.bankAccount.bank}</p>
                        <p className="text-sm text-zinc-400 font-mono">{selectedPartner.bankAccount.rib}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Stats (for approved partners) */}
                {selectedPartner.kycStatus === "approved" && selectedPartner.totalRevenue && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                      <p className="text-xs text-green-400 font-medium">Chiffre d'affaires</p>
                      <p className="text-2xl font-black text-white">{selectedPartner.totalRevenue.toLocaleString()} DH</p>
                    </div>
                    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <p className="text-xs text-blue-400 font-medium">Événements</p>
                      <p className="text-2xl font-black text-white">{selectedPartner.eventsCount}</p>
                    </div>
                  </div>
                )}

                {/* Rejection Reason */}
                {selectedPartner.kycStatus !== "approved" && (
                  <div>
                    <Label className="text-zinc-400">Raison du rejet (si applicable)</Label>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Ex: Documents expirés, informations incohérentes..."
                      className="bg-zinc-800 border-zinc-700 mt-2"
                    />
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
                Fermer
              </Button>
              {selectedPartner && selectedPartner.kycStatus !== "approved" && (
                <>
                  <Button
                    variant="outline"
                    className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                    onClick={() => selectedPartner && handleRequestInfo(selectedPartner)}
                  >
                    <Mail className="w-4 h-4 mr-1" />
                    Demander infos
                  </Button>
                  <Button
                    variant="outline"
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    onClick={() => selectedPartner && handleReject(selectedPartner)}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Rejeter
                  </Button>
                  <Button
                    className="bg-green-500 hover:bg-green-600"
                    onClick={() => selectedPartner && handleApprove(selectedPartner)}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Approuver
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
