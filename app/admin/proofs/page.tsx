"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Video,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  User,
  Calendar,
  Trophy,
  AlertTriangle,
  Eye,
  Flag,
  MessageSquare,
  MoreVertical,
  ArrowLeft,
  Download,
  RefreshCw
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface VideoProof {
  id: string
  teen: {
    id: string
    name: string
    avatar?: string
    age: number
  }
  challenge: {
    id: string
    name: string
    category: "cardio" | "force" | "souplesse" | "equipe"
    xpReward: number
  }
  videoUrl: string
  thumbnailUrl: string
  duration: number
  submittedAt: string
  status: "pending" | "approved" | "rejected" | "flagged"
  rejectionReason?: string
  moderatedBy?: string
  moderatedAt?: string
}

export default function AdminProofsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("pending")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [selectedProof, setSelectedProof] = useState<VideoProof | null>(null)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")

  const stats = {
    pending: 24,
    approvedToday: 156,
    rejectedToday: 12,
    flagged: 3
  }

  const proofs: VideoProof[] = [
    {
      id: "1",
      teen: {
        id: "t1",
        name: "Yasmine El Amrani",
        avatar: "/avatars/yasmine.jpg",
        age: 16
      },
      challenge: {
        id: "c1",
        name: "100 Pompes Challenge",
        category: "force",
        xpReward: 500
      },
      videoUrl: "/videos/proof1.mp4",
      thumbnailUrl: "/thumbnails/proof1.jpg",
      duration: 245,
      submittedAt: "2026-01-20T14:30:00",
      status: "pending"
    },
    {
      id: "2",
      teen: {
        id: "t2",
        name: "Ahmed Benali",
        avatar: "/avatars/ahmed.jpg",
        age: 15
      },
      challenge: {
        id: "c2",
        name: "5km Run",
        category: "cardio",
        xpReward: 750
      },
      videoUrl: "/videos/proof2.mp4",
      thumbnailUrl: "/thumbnails/proof2.jpg",
      duration: 180,
      submittedAt: "2026-01-20T13:15:00",
      status: "pending"
    },
    {
      id: "3",
      teen: {
        id: "t3",
        name: "Sara Idrissi",
        avatar: "/avatars/sara.jpg",
        age: 17
      },
      challenge: {
        id: "c3",
        name: "Yoga Flow 30min",
        category: "souplesse",
        xpReward: 300
      },
      videoUrl: "/videos/proof3.mp4",
      thumbnailUrl: "/thumbnails/proof3.jpg",
      duration: 320,
      submittedAt: "2026-01-20T11:00:00",
      status: "flagged",
      rejectionReason: "Contenu potentiellement inapproprié détecté par l'IA"
    },
    {
      id: "4",
      teen: {
        id: "t4",
        name: "Karim Tazi",
        avatar: "/avatars/karim.jpg",
        age: 14
      },
      challenge: {
        id: "c4",
        name: "Team Dance Challenge",
        category: "equipe",
        xpReward: 1000
      },
      videoUrl: "/videos/proof4.mp4",
      thumbnailUrl: "/thumbnails/proof4.jpg",
      duration: 150,
      submittedAt: "2026-01-20T10:30:00",
      status: "approved",
      moderatedBy: "Admin Sarah",
      moderatedAt: "2026-01-20T10:45:00"
    },
    {
      id: "5",
      teen: {
        id: "t5",
        name: "Lina Chaoui",
        avatar: "/avatars/lina.jpg",
        age: 16
      },
      challenge: {
        id: "c5",
        name: "Planche 3 minutes",
        category: "force",
        xpReward: 400
      },
      videoUrl: "/videos/proof5.mp4",
      thumbnailUrl: "/thumbnails/proof5.jpg",
      duration: 200,
      submittedAt: "2026-01-20T09:00:00",
      status: "rejected",
      rejectionReason: "Défi non complété entièrement",
      moderatedBy: "Admin Mohamed",
      moderatedAt: "2026-01-20T09:30:00"
    }
  ]

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "cardio":
        return <Badge className="bg-red-500/20 text-red-400">Cardio</Badge>
      case "force":
        return <Badge className="bg-orange-500/20 text-orange-400">Force</Badge>
      case "souplesse":
        return <Badge className="bg-purple-500/20 text-purple-400">Souplesse</Badge>
      case "equipe":
        return <Badge className="bg-blue-500/20 text-blue-400">Équipe</Badge>
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-400"><Clock className="w-3 h-3 mr-1" />En attente</Badge>
      case "approved":
        return <Badge className="bg-green-500/20 text-green-400"><CheckCircle2 className="w-3 h-3 mr-1" />Approuvé</Badge>
      case "rejected":
        return <Badge className="bg-red-500/20 text-red-400"><XCircle className="w-3 h-3 mr-1" />Rejeté</Badge>
      case "flagged":
        return <Badge className="bg-orange-500/20 text-orange-400"><Flag className="w-3 h-3 mr-1" />Signalé</Badge>
      default:
        return null
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleApprove = (proof: VideoProof) => {
    toast.success("Preuve approuvée", {
      description: `${proof.challenge.xpReward} XP attribués à ${proof.teen.name}`
    })
    setReviewDialogOpen(false)
  }

  const handleReject = (proof: VideoProof) => {
    if (!rejectionReason.trim()) {
      toast.error("Veuillez indiquer une raison de rejet")
      return
    }
    toast.success("Preuve rejetée", {
      description: "Le teen a été notifié"
    })
    setRejectionReason("")
    setReviewDialogOpen(false)
  }

  const filteredProofs = proofs.filter(proof => {
    const matchesSearch =
      proof.teen.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proof.challenge.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || proof.status === statusFilter
    const matchesCategory = categoryFilter === "all" || proof.challenge.category === categoryFilter
    return matchesSearch && matchesStatus && matchesCategory
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
              <Video className="w-8 h-8 text-purple-400" />
              Modération des Preuves
            </h1>
            <p className="text-zinc-400 mt-1">Validez les preuves vidéo des défis physiques</p>
          </div>
          <Button variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-yellow-400 font-medium">En attente</p>
                  <p className="text-3xl font-black text-white">{stats.pending}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-400 font-medium">Approuvées (24h)</p>
                  <p className="text-3xl font-black text-white">{stats.approvedToday}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500/20 to-pink-500/20 border-red-500/30">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-400 font-medium">Rejetées (24h)</p>
                  <p className="text-3xl font-black text-white">{stats.rejectedToday}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/20 to-amber-500/20 border-orange-500/30">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-orange-400 font-medium">Signalées IA</p>
                  <p className="text-3xl font-black text-white">{stats.flagged}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <Flag className="h-6 w-6 text-orange-400" />
                </div>
              </div>
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
                    placeholder="Rechercher par teen ou défi..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-zinc-800 border-zinc-700"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="approved">Approuvées</SelectItem>
                  <SelectItem value="rejected">Rejetées</SelectItem>
                  <SelectItem value="flagged">Signalées</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="cardio">Cardio</SelectItem>
                  <SelectItem value="force">Force</SelectItem>
                  <SelectItem value="souplesse">Souplesse</SelectItem>
                  <SelectItem value="equipe">Équipe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* AI Alert */}
        {stats.flagged > 0 && (
          <Card className="mb-6 bg-orange-500/10 border-orange-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
                <div>
                  <p className="font-medium text-orange-400">{stats.flagged} vidéo(s) signalée(s) par l'IA</p>
                  <p className="text-sm text-zinc-400">
                    Ces vidéos nécessitent une vérification manuelle prioritaire
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="ml-auto border-orange-500/30 text-orange-400"
                  onClick={() => setStatusFilter("flagged")}
                >
                  Voir les signalements
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Proofs Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProofs.map((proof) => (
            <Card
              key={proof.id}
              className={`bg-zinc-900 border-zinc-800 overflow-hidden hover:border-zinc-700 transition-all ${
                proof.status === "flagged" ? "ring-2 ring-orange-500/50" : ""
              }`}
            >
              {/* Video Thumbnail */}
              <div className="relative aspect-video bg-zinc-800">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-14 w-14 rounded-full bg-white/20 hover:bg-white/30"
                    onClick={() => {
                      setSelectedProof(proof)
                      setReviewDialogOpen(true)
                    }}
                  >
                    <Play className="h-6 w-6 text-white" fill="white" />
                  </Button>
                </div>
                <div className="absolute top-2 right-2">
                  {getStatusBadge(proof.status)}
                </div>
                <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/70 text-xs text-white">
                  {formatDuration(proof.duration)}
                </div>
                {proof.status === "flagged" && (
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-orange-500 text-white">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      IA
                    </Badge>
                  </div>
                )}
              </div>

              <CardContent className="p-4">
                {/* Teen Info */}
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={proof.teen.avatar} />
                    <AvatarFallback>{proof.teen.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate">{proof.teen.name}</p>
                    <p className="text-xs text-zinc-400">{proof.teen.age} ans</p>
                  </div>
                </div>

                {/* Challenge Info */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm text-zinc-400">{proof.challenge.name}</p>
                    {getCategoryBadge(proof.challenge.category)}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-purple-400">+{proof.challenge.xpReward} XP</p>
                  </div>
                </div>

                {/* Submission Time */}
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(proof.submittedAt).toLocaleString('fr-FR')}
                  </span>
                </div>

                {/* Rejection Reason */}
                {proof.rejectionReason && (
                  <div className="mt-3 p-2 rounded bg-red-500/10 border border-red-500/20">
                    <p className="text-xs text-red-400">{proof.rejectionReason}</p>
                  </div>
                )}

                {/* Actions */}
                {proof.status === "pending" || proof.status === "flagged" ? (
                  <div className="flex gap-2 mt-4">
                    <Button
                      className="flex-1 bg-green-500 hover:bg-green-600"
                      onClick={() => handleApprove(proof)}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Approuver
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                      onClick={() => {
                        setSelectedProof(proof)
                        setReviewDialogOpen(true)
                      }}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Rejeter
                    </Button>
                  </div>
                ) : (
                  <div className="mt-4 p-2 rounded bg-zinc-800/50 text-xs text-zinc-500">
                    {proof.moderatedBy && (
                      <p>Modéré par {proof.moderatedBy}</p>
                    )}
                    {proof.moderatedAt && (
                      <p>{new Date(proof.moderatedAt).toLocaleString('fr-FR')}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProofs.length === 0 && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="py-12 text-center">
              <Video className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
              <p className="text-zinc-400">Aucune preuve trouvée</p>
            </CardContent>
          </Card>
        )}

        {/* Review Dialog */}
        <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
          <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">Examiner la preuve</DialogTitle>
              <DialogDescription>
                Vérifiez que la vidéo correspond au défi demandé
              </DialogDescription>
            </DialogHeader>

            {selectedProof && (
              <div className="space-y-4">
                {/* Video Player Placeholder */}
                <div className="aspect-video bg-zinc-800 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Play className="w-16 h-16 mx-auto mb-2 text-zinc-600" />
                    <p className="text-zinc-500">Lecteur vidéo</p>
                  </div>
                </div>

                {/* Details */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-zinc-800/50">
                    <p className="text-xs text-zinc-400 mb-1">Teen</p>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={selectedProof.teen.avatar} />
                        <AvatarFallback>{selectedProof.teen.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-white">{selectedProof.teen.name}</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-zinc-800/50">
                    <p className="text-xs text-zinc-400 mb-1">Défi</p>
                    <p className="font-medium text-white">{selectedProof.challenge.name}</p>
                    <p className="text-sm text-purple-400">+{selectedProof.challenge.xpReward} XP</p>
                  </div>
                </div>

                {/* AI Warning */}
                {selectedProof.status === "flagged" && (
                  <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-orange-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-orange-400">Signalé par l'IA</p>
                        <p className="text-sm text-zinc-400">{selectedProof.rejectionReason}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rejection Reason Input */}
                <div>
                  <p className="text-sm text-zinc-400 mb-2">Raison du rejet (si applicable)</p>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Ex: Défi non complété, vidéo floue, contenu inapproprié..."
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
                Annuler
              </Button>
              <Button
                variant="outline"
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                onClick={() => selectedProof && handleReject(selectedProof)}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Rejeter
              </Button>
              <Button
                className="bg-green-500 hover:bg-green-600"
                onClick={() => selectedProof && handleApprove(selectedProof)}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Approuver
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
