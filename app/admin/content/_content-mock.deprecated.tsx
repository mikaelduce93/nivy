/**
 * @deprecated #58 — Fake content-moderation UI (hardcoded fake minors,
 * toast-only handlers, no DB writes). The real, canonical moderation inbox is
 * `/admin/moderation` (source of truth: `moderation_queue`). This file is NOT a
 * route (renamed from page.tsx → `_content-mock.deprecated.tsx`; the underscore
 * prefix is ignored by Next routing) and is no longer imported anywhere. Kept
 * per the milestone's no-deletion rule — do not reintroduce or wire it.
 */
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  MessageSquare,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Calendar,
  AlertTriangle,
  Eye,
  Flag,
  Trash2,
  MoreVertical,
  ArrowLeft,
  Image as ImageIcon,
  FileText,
  Shield,
  Bot,
  RefreshCw,
  ThumbsDown,
  Ban
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
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"

interface ContentItem {
  id: string
  type: "post" | "comment" | "image" | "bio"
  author: {
    id: string
    name: string
    avatar?: string
    age: number
  }
  content: string
  imageUrl?: string
  createdAt: string
  status: "pending" | "approved" | "rejected" | "flagged"
  aiScore: number
  aiFlags: string[]
  context?: string
}

export default function AdminContentPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("flagged")
  const [typeFilter, setTypeFilter] = useState("all")
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [moderationNote, setModerationNote] = useState("")

  const stats = {
    pendingReview: 45,
    flaggedByAi: 12,
    approvedToday: 892,
    removedToday: 8,
    aiAccuracy: 94
  }

  const contentItems: ContentItem[] = [
    {
      id: "1",
      type: "post",
      author: {
        id: "t1",
        name: "Yasmine El Amrani",
        avatar: "/avatars/yasmine.jpg",
        age: 16
      },
      content: "Trop hâte pour la soirée de ce weekend! Ca va être incroyable avec toute la bande! 🎉🎶",
      createdAt: "2026-01-20T14:30:00",
      status: "approved",
      aiScore: 98,
      aiFlags: []
    },
    {
      id: "2",
      type: "comment",
      author: {
        id: "t2",
        name: "Ahmed Benali",
        avatar: "/avatars/ahmed.jpg",
        age: 15
      },
      content: "T'es vraiment nul comme mec, retourne jouer aux legos",
      context: "Commentaire sur un post de défi physique",
      createdAt: "2026-01-20T13:15:00",
      status: "flagged",
      aiScore: 32,
      aiFlags: ["harassment", "negative_sentiment"]
    },
    {
      id: "3",
      type: "image",
      author: {
        id: "t3",
        name: "Sara Idrissi",
        avatar: "/avatars/sara.jpg",
        age: 17
      },
      content: "Ma photo de profil",
      imageUrl: "/uploads/profile-sara.jpg",
      createdAt: "2026-01-20T11:00:00",
      status: "flagged",
      aiScore: 45,
      aiFlags: ["inappropriate_content", "needs_review"]
    },
    {
      id: "4",
      type: "bio",
      author: {
        id: "t4",
        name: "Karim Tazi",
        avatar: "/avatars/karim.jpg",
        age: 14
      },
      content: "🔥 Le boss des soirées | Snap: karim_tazi | Insta: @karimtazi",
      createdAt: "2026-01-20T10:30:00",
      status: "flagged",
      aiScore: 55,
      aiFlags: ["external_links", "contact_info"]
    },
    {
      id: "5",
      type: "post",
      author: {
        id: "t5",
        name: "Lina Chaoui",
        avatar: "/avatars/lina.jpg",
        age: 16
      },
      content: "Je vends des tickets pour la prochaine soirée, MP moi vite! Prix spéciaux 💰",
      createdAt: "2026-01-20T09:00:00",
      status: "flagged",
      aiScore: 28,
      aiFlags: ["spam", "unauthorized_sales"]
    },
    {
      id: "6",
      type: "comment",
      author: {
        id: "t6",
        name: "Mehdi Alaoui",
        avatar: "/avatars/mehdi.jpg",
        age: 17
      },
      content: "Super performance! Continue comme ça, tu vas devenir pro!",
      context: "Commentaire sur une vidéo de défi",
      createdAt: "2026-01-20T08:30:00",
      status: "approved",
      aiScore: 95,
      aiFlags: []
    }
  ]

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "post":
        return <Badge className="bg-teal/20 text-teal"><FileText className="w-3 h-3 mr-1" />Post</Badge>
      case "comment":
        return <Badge className="bg-pink/20 text-pink"><MessageSquare className="w-3 h-3 mr-1" />Commentaire</Badge>
      case "image":
        return <Badge className="bg-pink/20 text-pink"><ImageIcon className="w-3 h-3 mr-1" />Image</Badge>
      case "bio":
        return <Badge className="bg-teal/20 text-teal"><User className="w-3 h-3 mr-1" />Bio</Badge>
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-gold/20 text-gold"><Clock className="w-3 h-3 mr-1" />En attente</Badge>
      case "approved":
        return <Badge className="bg-lime/20 text-lime"><CheckCircle2 className="w-3 h-3 mr-1" />Approuvé</Badge>
      case "rejected":
        return <Badge className="bg-destructive/20 text-destructive"><XCircle className="w-3 h-3 mr-1" />Supprimé</Badge>
      case "flagged":
        return <Badge className="bg-coral/20 text-coral"><Flag className="w-3 h-3 mr-1" />Signalé</Badge>
      default:
        return null
    }
  }

  const getAiFlagLabel = (flag: string) => {
    const labels: Record<string, string> = {
      harassment: "Harcèlement",
      negative_sentiment: "Sentiment négatif",
      inappropriate_content: "Contenu inapproprié",
      needs_review: "Vérification requise",
      external_links: "Liens externes",
      contact_info: "Coordonnées personnelles",
      spam: "Spam",
      unauthorized_sales: "Vente non autorisée"
    }
    return labels[flag] || flag
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-lime"
    if (score >= 50) return "text-gold"
    return "text-destructive"
  }

  const handleApprove = (content: ContentItem) => {
    toast.success("Contenu approuvé")
    setReviewDialogOpen(false)
  }

  const handleReject = (content: ContentItem) => {
    toast.success("Contenu supprimé", {
      description: "L'utilisateur a été notifié"
    })
    setReviewDialogOpen(false)
  }

  const handleWarn = (content: ContentItem) => {
    toast.success("Avertissement envoyé", {
      description: `Un avertissement a été envoyé à ${content.author.name}`
    })
  }

  const handleBan = (content: ContentItem) => {
    toast.success("Utilisateur suspendu", {
      description: `${content.author.name} a été suspendu temporairement`
    })
  }

  const filteredContent = contentItems.filter(item => {
    const matchesSearch =
      item.author.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || item.status === statusFilter
    const matchesType = typeFilter === "all" || item.type === typeFilter
    return matchesSearch && matchesStatus && matchesType
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-32">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button asChild variant="ghost" className="text-mute hover:text-ink">
            <Link href="/admin">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Link>
          </Button>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-ink flex items-center gap-3">
              <Shield className="w-8 h-8 text-teal" />
              Modération du Contenu
            </h1>
            <p className="text-mute mt-1">IA + Modération humaine pour un contenu sûr</p>
          </div>
          <Button variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-gold/20 to-coral/20 border-gold/30">
            <CardContent className="p-5">
              <p className="text-xs text-gold font-medium">À vérifier</p>
              <p className="text-3xl font-black text-ink">{stats.pendingReview}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-coral/20 to-destructive/20 border-coral/30">
            <CardContent className="p-5">
              <p className="text-xs text-coral font-medium">Signalés IA</p>
              <p className="text-3xl font-black text-ink">{stats.flaggedByAi}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-lime/20 to-lime/20 border-lime/30">
            <CardContent className="p-5">
              <p className="text-xs text-lime font-medium">Approuvés (24h)</p>
              <p className="text-3xl font-black text-ink">{stats.approvedToday}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-destructive/20 to-pink/20 border-destructive/30">
            <CardContent className="p-5">
              <p className="text-xs text-destructive font-medium">Supprimés (24h)</p>
              <p className="text-3xl font-black text-ink">{stats.removedToday}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-teal/20 to-teal/20 border-teal/30">
            <CardContent className="p-5">
              <p className="text-xs text-teal font-medium">Précision IA</p>
              <p className="text-3xl font-black text-ink">{stats.aiAccuracy}%</p>
            </CardContent>
          </Card>
        </div>

        {/* AI Info */}
        <Card className="mb-6 bg-teal/10 border-teal/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Bot className="w-6 h-6 text-teal" />
              <div className="flex-1">
                <p className="font-medium text-teal">Modération IA Active</p>
                <p className="text-sm text-mute">
                  L'IA analyse automatiquement le contenu et signale les éléments potentiellement problématiques.
                  Score de confiance: plus le score est bas, plus le contenu est suspect.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="mb-6 bg-card border-ink">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mute" />
                  <Input
                    placeholder="Rechercher par auteur ou contenu..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-card border-ink"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 bg-card border-ink">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="flagged">Signalés</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="approved">Approuvés</SelectItem>
                  <SelectItem value="rejected">Supprimés</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40 bg-card border-ink">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous types</SelectItem>
                  <SelectItem value="post">Posts</SelectItem>
                  <SelectItem value="comment">Commentaires</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="bio">Bios</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Content List */}
        <div className="space-y-4">
          {filteredContent.map((item) => (
            <Card
              key={item.id}
              className={`bg-card border-ink ${
                item.status === "flagged" ? "border-l-4 border-l-orange-500" : ""
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Author */}
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={item.author.avatar} />
                    <AvatarFallback>{item.author.name.charAt(0)}</AvatarFallback>
                  </Avatar>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-ink">{item.author.name}</span>
                      <span className="text-xs text-mute">{item.author.age} ans</span>
                      {getTypeBadge(item.type)}
                    </div>

                    {item.context && (
                      <p className="text-xs text-mute mb-2">{item.context}</p>
                    )}

                    <p className="text-ink-2 mb-3">{item.content}</p>

                    {item.imageUrl && (
                      <div className="w-32 h-32 rounded-lg bg-card mb-3 flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-mute" />
                      </div>
                    )}

                    {/* AI Flags */}
                    {item.aiFlags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {item.aiFlags.map((flag, idx) => (
                          <Badge key={idx} variant="outline" className="text-coral border-coral/30">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {getAiFlagLabel(flag)}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-mute flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(item.createdAt).toLocaleString('fr-FR')}
                        </span>
                        {getStatusBadge(item.status)}
                      </div>

                      {/* AI Score */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-mute">Score IA:</span>
                        <span className={`text-sm font-bold ${getScoreColor(item.aiScore)}`}>
                          {item.aiScore}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {(item.status === "flagged" || item.status === "pending") && (
                      <>
                        <Button
                          size="sm"
                          className="bg-lime hover:bg-lime"
                          onClick={() => handleApprove(item)}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-destructive/30 text-destructive hover:bg-destructive/10"
                          onClick={() => handleReject(item)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card border-ink">
                        <DropdownMenuItem onClick={() => {
                          setSelectedContent(item)
                          setReviewDialogOpen(true)
                        }}>
                          <Eye className="w-4 h-4 mr-2" />
                          Examiner
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-card" />
                        <DropdownMenuItem onClick={() => handleWarn(item)} className="text-gold">
                          <ThumbsDown className="w-4 h-4 mr-2" />
                          Avertir l'utilisateur
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBan(item)} className="text-destructive">
                          <Ban className="w-4 h-4 mr-2" />
                          Suspendre l'utilisateur
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredContent.length === 0 && (
          <Card className="bg-card border-ink">
            <CardContent className="py-12 text-center">
              <Shield className="w-12 h-12 mx-auto mb-4 text-mute" />
              <p className="text-mute">Aucun contenu à modérer</p>
            </CardContent>
          </Card>
        )}

        {/* Review Dialog */}
        <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
          <DialogContent className="bg-card border-ink max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-ink">Examiner le contenu</DialogTitle>
              <DialogDescription>
                Analysez le contenu et prenez une décision de modération
              </DialogDescription>
            </DialogHeader>

            {selectedContent && (
              <div className="space-y-4">
                {/* Author Info */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-card">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedContent.author.avatar} />
                    <AvatarFallback>{selectedContent.author.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-ink">{selectedContent.author.name}</p>
                    <p className="text-xs text-mute">{selectedContent.author.age} ans</p>
                  </div>
                  {getTypeBadge(selectedContent.type)}
                </div>

                {/* Content */}
                <div className="p-4 rounded-lg bg-card">
                  <p className="text-ink">{selectedContent.content}</p>
                </div>

                {/* AI Analysis */}
                <div className="p-4 rounded-lg bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-mute">Score de confiance IA</span>
                    <span className={`font-bold ${getScoreColor(selectedContent.aiScore)}`}>
                      {selectedContent.aiScore}%
                    </span>
                  </div>
                  <Progress value={selectedContent.aiScore} className="h-2" />

                  {selectedContent.aiFlags.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-mute mb-2">Problèmes détectés:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedContent.aiFlags.map((flag, idx) => (
                          <Badge key={idx} variant="outline" className="text-coral border-coral/30">
                            {getAiFlagLabel(flag)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Moderation Note */}
                <div>
                  <p className="text-sm text-mute mb-2">Note de modération (optionnel)</p>
                  <Textarea
                    value={moderationNote}
                    onChange={(e) => setModerationNote(e.target.value)}
                    placeholder="Ajoutez une note pour le dossier..."
                    className="bg-card border-ink"
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
                className="border-gold/30 text-gold hover:bg-gold/10"
                onClick={() => selectedContent && handleWarn(selectedContent)}
              >
                <ThumbsDown className="w-4 h-4 mr-1" />
                Avertir
              </Button>
              <Button
                variant="outline"
                className="border-destructive/30 text-destructive hover:bg-destructive/10"
                onClick={() => selectedContent && handleReject(selectedContent)}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Supprimer
              </Button>
              <Button
                className="bg-lime hover:bg-lime"
                onClick={() => selectedContent && handleApprove(selectedContent)}
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
