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
  { id: "music", name: "Musique", description: "Apprends à jouer, composer et produire", icon: Music, color: "from-pink-500 to-rose-500", progress: 0, totalLessons: 20, completedLessons: 0, xpReward: 500, unlocked: true },
  { id: "art", name: "Arts Visuels", description: "Dessin, peinture, illustration digitale", icon: Palette, color: "from-purple-500 to-violet-500", progress: 0, totalLessons: 25, completedLessons: 0, xpReward: 600, unlocked: true },
  { id: "photo", name: "Photographie", description: "Techniques de photo et retouche", icon: Camera, color: "from-cyan-500 to-blue-500", progress: 0, totalLessons: 15, completedLessons: 0, xpReward: 400, unlocked: true },
  { id: "coding", name: "Programmation", description: "Apprends à coder", icon: Code, color: "from-emerald-500 to-teal-500", progress: 0, totalLessons: 30, completedLessons: 0, xpReward: 800, unlocked: true },
  { id: "podcast", name: "Podcast & Radio", description: "Animation et production audio", icon: Mic2, color: "from-amber-500 to-orange-500", progress: 0, totalLessons: 12, completedLessons: 0, xpReward: 350, unlocked: false },
  { id: "writing", name: "Écriture Créative", description: "Histoires, poésie, blog", icon: BookOpen, color: "from-indigo-500 to-purple-500", progress: 0, totalLessons: 18, completedLessons: 0, xpReward: 450, unlocked: false },
  { id: "gaming", name: "Game Design", description: "Crée tes propres jeux", icon: Gamepad2, color: "from-red-500 to-pink-500", progress: 0, totalLessons: 22, completedLessons: 0, xpReward: 700, unlocked: false }
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
        color: defaultPassionPaths.find(dp => dp.id === p.id)?.color || "from-purple-500 to-violet-500",
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
        return <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-600 text-xs">Débutant</span>
      case "intermediate":
        return <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 text-xs">Intermédiaire</span>
      case "advanced":
        return <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-600 text-xs">Avancé</span>
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
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <div className="container mx-auto px-4 py-8 md:pl-72">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-purple-500" />
              Parcours Passion
            </h1>
            <p className="text-gray-600">Explore tes passions et développe tes talents!</p>
          </div>
          <Button onClick={() => setShowUploadDialog(true)} className="bg-purple-500 hover:bg-purple-600">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une création
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-600 font-medium">XP Gagnés</p>
                  <p className="text-2xl font-black text-gray-900">{stats.totalXP}</p>
                </div>
                <Star className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-600 font-medium">Parcours Actifs</p>
                  <p className="text-2xl font-black text-gray-900">{stats.pathsStarted}</p>
                </div>
                <Sparkles className="h-8 w-8 text-emerald-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 font-medium">Tutos Terminés</p>
                  <p className="text-2xl font-black text-gray-900">{stats.tutorialsCompleted}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-600 font-medium">Créations</p>
                  <p className="text-2xl font-black text-gray-900">{stats.creationsUploaded}</p>
                </div>
                <Trophy className="h-8 w-8 text-amber-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/50 border border-purple-100">
            <TabsTrigger value="paths" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <Sparkles className="h-4 w-4 mr-2" />
              Parcours
            </TabsTrigger>
            <TabsTrigger value="portfolio" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
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
                            {path.unlocked ? <PathIcon className="h-7 w-7 text-white" /> : <Lock className="h-7 w-7 text-white" />}
                          </div>
                          <div className="flex items-center gap-1 text-amber-600">
                            <Star className="h-4 w-4" />
                            <span className="text-sm font-medium">+{path.xpReward} XP</span>
                          </div>
                        </div>
                        <h3 className="font-bold text-gray-900 mb-1">{path.name}</h3>
                        <p className="text-sm text-gray-500 mb-4">{path.description}</p>
                        {path.unlocked ? (
                          <>
                            <Progress value={path.progress} className="h-2 mb-2" />
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>{path.completedLessons}/{path.totalLessons} leçons</span>
                              <span>{path.progress}% complété</span>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-2">
                            <Lock className="h-5 w-5 mx-auto mb-1 text-gray-400" />
                            <p className="text-xs text-gray-500">Débloque avec 500 XP</p>
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
                  <Button variant="ghost" size="sm" onClick={() => setSelectedPath(null)} className="text-gray-500">
                    Tous les parcours
                  </Button>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                  <span className="font-medium text-purple-600">{selectedPath.name}</span>
                </div>

                <Card className="mb-6 overflow-hidden">
                  <div className={`h-3 bg-gradient-to-r ${selectedPath.color}`} />
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${selectedPath.color} flex items-center justify-center`}>
                        <Sparkles className="h-8 w-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold text-gray-900">{selectedPath.name}</h2>
                        <p className="text-gray-500">{selectedPath.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-black text-purple-600">{selectedPath.progress}%</p>
                        <p className="text-sm text-gray-500">complété</p>
                      </div>
                    </div>
                    <Progress value={selectedPath.progress} className="h-3" />
                  </CardContent>
                </Card>

                <h3 className="text-lg font-bold text-gray-900 mb-4">Tutoriels</h3>
                <div className="space-y-3">
                  {filteredTutorials.length > 0 ? filteredTutorials.map((tutorial) => (
                    <Card key={tutorial.id} className={tutorial.completed ? "border-green-200 bg-green-50/30" : ""}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${tutorial.completed ? "bg-green-100" : "bg-purple-100"}`}>
                              {tutorial.completed ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <span className="text-sm font-bold text-purple-600">{tutorial.order}</span>}
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{tutorial.title}</h4>
                              <div className="flex items-center gap-3 text-sm text-gray-500">
                                <span>{tutorial.duration}</span>
                                {getDifficultyBadge(tutorial.difficulty)}
                              </div>
                            </div>
                          </div>
                          <Button size="sm" onClick={() => handleCompleteTutorial(tutorial)} className={tutorial.completed ? "bg-green-500" : "bg-purple-500"}>
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
                    <div className={`aspect-video bg-gradient-to-br ${path?.color || "from-gray-400 to-gray-500"} relative flex items-center justify-center`}>
                      <TypeIcon className="h-12 w-12 text-white/80" />
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-bold text-gray-900 mb-1">{creation.title}</h3>
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">{creation.description}</p>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1"><Heart className="h-4 w-4 text-pink-500" />{creation.likes}</span>
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
                <ImageIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Ton portfolio est vide</h3>
                <p className="text-gray-500 mb-4">Ajoute tes premières créations!</p>
                <Button onClick={() => setShowUploadDialog(true)} className="bg-purple-500">
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
                <Upload className="h-5 w-5 text-purple-500" />
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
                      <button key={path.id} type="button" onClick={() => setUploadForm(prev => ({ ...prev, pathId: path.id }))} className={`p-3 rounded-xl border-2 transition-all ${uploadForm.pathId === path.id ? "border-purple-500 bg-purple-50" : "border-gray-200"}`}>
                        <PathIcon className={`h-6 w-6 mx-auto ${uploadForm.pathId === path.id ? "text-purple-500" : "text-gray-400"}`} />
                        <p className="text-xs mt-1 truncate">{path.name}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                <Upload className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-500">Glisse ton fichier ici</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUploadDialog(false)}>Annuler</Button>
              <Button onClick={handleUploadCreation} disabled={uploading || !uploadForm.title || !uploadForm.pathId} className="bg-purple-500">
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
