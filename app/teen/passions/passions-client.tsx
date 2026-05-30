"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Sparkles,
  Music,
  Palette,
  Camera,
  Code,
  Mic2,
  BookOpen,
  Gamepad2,
  Heart,
  Play,
  CheckCircle2,
  Star,
  Upload,
  Image as ImageIcon,
  Video,
  Trophy,
  ChevronRight,
  Lock,
  Loader2,
  Plus,
  Eye,
  Calendar
} from "lucide-react"
import { toast } from "sonner"
import { uploadCreation } from "@/gamification-system/features/pillars/actions"
import { EmptyState } from "@/components/ui/states/empty-state"

interface PassionPath {
  id: string
  name: string
  description: string
  icon: React.ComponentType<any> | null
  color: string
  progress: number
  totalLessons: number
  completedLessons: number
  xpReward: number
  unlocked: boolean
}

interface Tutorial {
  id: string
  pathId: string
  title: string
  description: string
  duration: string
  difficulty: "beginner" | "intermediate" | "advanced"
  completed: boolean
  xpReward: number
  order: number
}

interface Creation {
  id: string
  pathId: string
  title: string
  description: string
  type: "image" | "video" | "audio" | "code" | "text"
  thumbnail?: string
  createdAt: string
  likes: number
  views: number
}

const defaultPassionPaths: PassionPath[] = [
  { id: "music", name: "Musique", description: "Apprends à jouer, composer et produire", icon: Music, color: "from-pink to-pink", progress: 0, totalLessons: 20, completedLessons: 0, xpReward: 500, unlocked: true },
  { id: "art", name: "Arts Visuels", description: "Dessin, peinture, illustration digitale", icon: Palette, color: "from-pink to-pink", progress: 0, totalLessons: 25, completedLessons: 0, xpReward: 600, unlocked: true },
  { id: "photo", name: "Photographie", description: "Techniques de photo et retouche", icon: Camera, color: "from-teal to-teal", progress: 0, totalLessons: 15, completedLessons: 0, xpReward: 400, unlocked: true },
  { id: "coding", name: "Programmation", description: "Apprends à coder", icon: Code, color: "from-lime to-teal", progress: 0, totalLessons: 30, completedLessons: 0, xpReward: 800, unlocked: true },
  { id: "podcast", name: "Podcast & Radio", description: "Animation et production audio", icon: Mic2, color: "from-gold to-coral", progress: 0, totalLessons: 12, completedLessons: 0, xpReward: 350, unlocked: false },
  { id: "writing", name: "Écriture Créative", description: "Histoires, poésie, blog", icon: BookOpen, color: "from-pink to-pink", progress: 0, totalLessons: 18, completedLessons: 0, xpReward: 450, unlocked: false },
  { id: "gaming", name: "Game Design", description: "Crée tes propres jeux", icon: Gamepad2, color: "from-destructive to-pink", progress: 0, totalLessons: 22, completedLessons: 0, xpReward: 700, unlocked: false }
]

export function TeenPassionsClient({ initialData, teenId }: { initialData: any, teenId: string }) {
  const [activeTab, setActiveTab] = useState("paths")
  const [selectedPath, setSelectedPath] = useState<PassionPath | null>(null)

  const passionPaths: PassionPath[] = initialData.paths?.length > 0
    ? initialData.paths.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        icon: defaultPassionPaths.find(dp => dp.id === p.id)?.icon || Sparkles,
        color: defaultPassionPaths.find(dp => dp.id === p.id)?.color || "from-pink to-pink",
        progress: p.progress || 0,
        totalLessons: p.total_levels || 10,
        completedLessons: (p.currentLevel || 1) - 1,
        xpReward: p.xp_per_level || 50,
        unlocked: p.unlocked !== false
      }))
    : defaultPassionPaths

  const [tutorials, setTutorials] = useState<Tutorial[]>(
    (initialData.tutorials || []).map((t: any) => ({
      id: t.id,
      pathId: t.path_id,
      title: t.title,
      description: t.description || "",
      duration: t.video_duration_minutes ? `${t.video_duration_minutes} min` : "10:00",
      difficulty: t.difficulty || "beginner",
      completed: t.completed || false,
      xpReward: t.xp_reward || 25,
      order: 1
    }))
  )

  const [creations, setCreations] = useState<Creation[]>(
    (initialData.creations || []).map((c: any) => ({
      id: c.id,
      pathId: c.path_id,
      title: c.title,
      description: c.description || "",
      type: c.media_type || "image",
      createdAt: c.created_at,
      likes: c.likes_count || 0,
      views: c.comments_count || 0
    }))
  )

  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    pathId: "",
    type: "image" as Creation["type"]
  })
  const [uploading, setUploading] = useState(false)

  const stats = {
    totalXP: initialData.stats?.creaScore || 0,
    pathsStarted: passionPaths.filter(p => p.progress > 0).length,
    tutorialsCompleted: initialData.stats?.tutorialsCompleted || 0,
    creationsUploaded: initialData.stats?.creationsCount || 0
  }

  const filteredTutorials = selectedPath
    ? tutorials.filter(t => t.pathId === selectedPath.id).sort((a, b) => a.order - b.order)
    : []

  const filteredCreations = selectedPath
    ? creations.filter(c => c.pathId === selectedPath.id)
    : creations

  const handleCompleteTutorial = (tutorial: Tutorial) => {
    setTutorials(prev => prev.map(t =>
      t.id === tutorial.id ? { ...t, completed: true } : t
    ))
    toast.success(`Tutoriel terminé! +${tutorial.xpReward} XP`)
  }

  const handleUploadCreation = async () => {
    if (!uploadForm.title || !uploadForm.pathId) {
      toast.error("Remplis tous les champs obligatoires")
      return
    }

    setUploading(true)
    try {
      const result = await uploadCreation(teenId, {
        title: uploadForm.title,
        description: uploadForm.description,
        pathId: uploadForm.pathId,
        type: uploadForm.type
      })

      if (result.success) {
        toast.success("Création ajoutée! +50 XP")
        setShowUploadDialog(false)
        setUploadForm({ title: "", description: "", pathId: "", type: "image" })
      } else {
        toast.error("Erreur: " + result.error)
      }
    } catch (error) {
      toast.error("Erreur lors de l'upload")
    } finally {
      setUploading(false)
    }
  }

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return <span className="px-2 py-0.5 rounded-full bg-lime/20 text-lime text-xs">Débutant</span>
      case "intermediate":
        return <span className="px-2 py-0.5 rounded-full bg-gold/20 text-gold text-xs">Intermédiaire</span>
      case "advanced":
        return <span className="px-2 py-0.5 rounded-full bg-destructive/20 text-destructive text-xs">Avancé</span>
    }
  }

  const getTypeIcon = (type: Creation["type"]) => {
    switch (type) {
      case "image": return ImageIcon
      case "video": return Video
      case "audio": return Music
      case "code": return Code
      case "text": return BookOpen
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink to-white">
      <div className="container mx-auto px-4 py-8 md:pl-72">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-ink flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-pink" />
              Parcours Passion
            </h1>
            <p className="text-mute">Explore tes passions et développe tes talents!</p>
          </div>
          <Button onClick={() => setShowUploadDialog(true)} className="bg-pink hover:bg-pink">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une création
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-pink/10 to-pink/10 border-pink">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-pink font-medium">XP Gagnés</p>
                  <p className="text-2xl font-black text-ink">{stats.totalXP}</p>
                </div>
                <Star className="h-8 w-8 text-pink" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-lime/10 to-teal/10 border-lime">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-lime font-medium">Parcours Actifs</p>
                  <p className="text-2xl font-black text-ink">{stats.pathsStarted}</p>
                </div>
                <Sparkles className="h-8 w-8 text-lime" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-teal/10 to-teal/10 border-teal">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-teal font-medium">Tutos Terminés</p>
                  <p className="text-2xl font-black text-ink">{stats.tutorialsCompleted}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-teal" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-gold/10 to-coral/10 border-gold">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gold font-medium">Créations</p>
                  <p className="text-2xl font-black text-ink">{stats.creationsUploaded}</p>
                </div>
                <Trophy className="h-8 w-8 text-gold" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-paper-2 border border-pink">
            <TabsTrigger value="paths" className="data-[state=active]:bg-pink data-[state=active]:text-ink">
              <Sparkles className="h-4 w-4 mr-2" />
              Parcours
            </TabsTrigger>
            <TabsTrigger value="portfolio" className="data-[state=active]:bg-pink data-[state=active]:text-ink">
              <ImageIcon className="h-4 w-4 mr-2" />
              Mon Portfolio
            </TabsTrigger>
          </TabsList>

          <TabsContent value="paths">
            {!selectedPath ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {passionPaths.map((path) => {
                  const PathIcon = path.icon || Sparkles
                  return (
                    <Card
                      key={path.id}
                      className={`overflow-hidden cursor-pointer hover:shadow-lg transition-all ${
                        !path.unlocked ? "opacity-60" : "hover:scale-[1.02]"
                      }`}
                      onClick={() => path.unlocked && setSelectedPath(path)}
                    >
                      <div className={`h-3 bg-gradient-to-r ${path.color}`} />
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${path.color} flex items-center justify-center`}>
                            {path.unlocked ? <PathIcon className="h-7 w-7 text-ink" /> : <Lock className="h-7 w-7 text-ink" />}
                          </div>
                          <div className="flex items-center gap-1 text-gold">
                            <Star className="h-4 w-4" />
                            <span className="text-sm font-medium">+{path.xpReward} XP</span>
                          </div>
                        </div>
                        <h3 className="font-bold text-ink mb-1">{path.name}</h3>
                        <p className="text-sm text-mute mb-4">{path.description}</p>
                        {path.unlocked ? (
                          <>
                            <Progress value={path.progress} className="h-2 mb-2" />
                            <div className="flex justify-between text-xs text-mute">
                              <span>{path.completedLessons}/{path.totalLessons} leçons</span>
                              <span>{path.progress}% complété</span>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-2">
                            <Lock className="h-5 w-5 mx-auto mb-1 text-mute" />
                            <p className="text-xs text-mute">Débloque avec 500 XP</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedPath(null)} className="text-mute">
                    Tous les parcours
                  </Button>
                  <ChevronRight className="h-4 w-4 text-mute" />
                  <span className="font-medium text-pink">{selectedPath.name}</span>
                </div>

                <Card className="mb-6 overflow-hidden">
                  <div className={`h-3 bg-gradient-to-r ${selectedPath.color}`} />
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${selectedPath.color} flex items-center justify-center`}>
                        <Sparkles className="h-8 w-8 text-ink" />
                      </div>
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold text-ink">{selectedPath.name}</h2>
                        <p className="text-mute">{selectedPath.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-black text-pink">{selectedPath.progress}%</p>
                        <p className="text-sm text-mute">complété</p>
                      </div>
                    </div>
                    <Progress value={selectedPath.progress} className="h-3" />
                  </CardContent>
                </Card>

                <h3 className="text-lg font-bold text-ink mb-4">Tutoriels</h3>
                <div className="space-y-3">
                  {filteredTutorials.length > 0 ? filteredTutorials.map((tutorial) => (
                    <Card key={tutorial.id} className={tutorial.completed ? "border-lime bg-lime/30" : ""}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${tutorial.completed ? "bg-lime" : "bg-pink"}`}>
                              {tutorial.completed ? <CheckCircle2 className="h-5 w-5 text-lime" /> : <span className="text-sm font-bold text-pink">{tutorial.order}</span>}
                            </div>
                            <div>
                              <h4 className="font-semibold text-ink">{tutorial.title}</h4>
                              <div className="flex items-center gap-3 text-sm text-mute">
                                <span>{tutorial.duration}</span>
                                {getDifficultyBadge(tutorial.difficulty)}
                              </div>
                            </div>
                          </div>
                          <Button size="sm" onClick={() => handleCompleteTutorial(tutorial)} className={tutorial.completed ? "bg-lime" : "bg-pink"}>
                            <Play className="h-4 w-4 mr-1" />
                            {tutorial.completed ? "Revoir" : "Commencer"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )) : (
                    <EmptyState
                      size="small"
                      icon={Video}
                      title="Aucun tutoriel disponible"
                      description="Aucun tutoriel n'est disponible pour ce parcours pour le moment."
                    />
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="portfolio">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCreations.map((creation) => {
                const TypeIcon = getTypeIcon(creation.type)
                const path = passionPaths.find(p => p.id === creation.pathId)
                return (
                  <Card key={creation.id} className="overflow-hidden hover:shadow-lg transition-all">
                    <div className={`aspect-video bg-gradient-to-br ${path?.color || "from-paper-2 to-card"} relative flex items-center justify-center`}>
                      <TypeIcon className="h-12 w-12 text-ink/80" />
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-bold text-ink mb-1">{creation.title}</h3>
                      <p className="text-sm text-mute mb-3 line-clamp-2">{creation.description}</p>
                      <div className="flex items-center justify-between text-sm text-mute">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1"><Heart className="h-4 w-4 text-pink" />{creation.likes}</span>
                          <span className="flex items-center gap-1"><Eye className="h-4 w-4" />{creation.views}</span>
                        </div>
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(creation.createdAt)}</span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
            {filteredCreations.length === 0 && (
              <div className="text-center py-16">
                <ImageIcon className="h-16 w-16 mx-auto mb-4 text-ink-2" />
                <h3 className="text-xl font-bold text-ink mb-2">Ton portfolio est vide</h3>
                <p className="text-mute mb-4">Ajoute tes premières créations!</p>
                <Button onClick={() => setShowUploadDialog(true)} className="bg-pink">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une création
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-pink" />
                Ajouter une création
              </DialogTitle>
              <DialogDescription>Partage ton travail avec la communauté</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Titre *</Label>
                <Input placeholder="Ex: Mon premier dessin" value={uploadForm.title} onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea placeholder="Décris ta création..." value={uploadForm.description} onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Parcours associé *</Label>
                <div className="grid grid-cols-4 gap-2">
                  {passionPaths.filter(p => p.unlocked).map((path) => {
                    const PathIcon = path.icon || Sparkles
                    return (
                      <button key={path.id} type="button" onClick={() => setUploadForm(prev => ({ ...prev, pathId: path.id }))} className={`p-3 rounded-xl border-2 transition-all ${uploadForm.pathId === path.id ? "border-pink bg-pink" : "border-line"}`}>
                        <PathIcon className={`h-6 w-6 mx-auto ${uploadForm.pathId === path.id ? "text-pink" : "text-mute"}`} />
                        <p className="text-xs mt-1 truncate">{path.name}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="border-2 border-dashed border-line rounded-xl p-8 text-center">
                <Upload className="h-10 w-10 mx-auto mb-2 text-mute" />
                <p className="text-sm text-mute">Glisse ton fichier ici</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUploadDialog(false)}>Annuler</Button>
              <Button onClick={handleUploadCreation} disabled={uploading || !uploadForm.title || !uploadForm.pathId} className="bg-pink">
                {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Publier
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
