"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import {
  Share2,
  Trophy,
  Medal,
  Star,
  Flame,
  Target,
  Download,
  Copy,
  Instagram,
  Twitter,
  Facebook,
  Link2,
  Sparkles,
  Palette,
  CheckCircle2,
  Loader2,
  Image as ImageIcon,
  Zap,
  Crown,
  Heart
} from "lucide-react"
import { toast } from "sonner"

interface ShareableItem {
  id: string
  type: "achievement" | "badge" | "level" | "streak" | "challenge" | "event"
  title: string
  subtitle: string
  value?: string | number
  icon: React.ComponentType<any>
  color: string
  date: string
}

interface ShareTemplate {
  id: string
  name: string
  preview: string
  bgGradient: string
  textColor: string
}

const shareableItems: ShareableItem[] = [
  { id: "1", type: "level", title: "Niveau 12 atteint!", subtitle: "Tu progresses vite", value: 12, icon: Star, color: "from-amber-500 to-orange-500", date: "Aujourd'hui" },
  { id: "2", type: "badge", title: "Badge 'Super Fan'", subtitle: "5 events consécutifs", icon: Medal, color: "from-purple-500 to-pink-500", date: "Hier" },
  { id: "3", type: "streak", title: "Série de 15 jours!", subtitle: "Tu es en feu", value: 15, icon: Flame, color: "from-red-500 to-orange-500", date: "Il y a 2 jours" },
  { id: "4", type: "challenge", title: "Défi 'Push-ups' complété", subtitle: "30 pompes en 1 minute", value: "30", icon: Target, color: "from-emerald-500 to-teal-500", date: "Il y a 3 jours" },
  { id: "5", type: "achievement", title: "1000 XP accumulés!", subtitle: "Continue comme ça", value: "1000", icon: Zap, color: "from-blue-500 to-cyan-500", date: "Cette semaine" },
  { id: "6", type: "event", title: "Teen Party Casablanca", subtitle: "Participation confirmée", icon: Sparkles, color: "from-pink-500 to-rose-500", date: "Le 15 Janvier" },
]

const shareTemplates: ShareTemplate[] = [
  { id: "gradient1", name: "Sunset", preview: "bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600", bgGradient: "from-orange-500 via-pink-500 to-purple-600", textColor: "text-white" },
  { id: "gradient2", name: "Ocean", preview: "bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500", bgGradient: "from-blue-500 via-cyan-500 to-teal-500", textColor: "text-white" },
  { id: "gradient3", name: "Forest", preview: "bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600", bgGradient: "from-emerald-500 via-green-500 to-teal-600", textColor: "text-white" },
  { id: "gradient4", name: "Night", preview: "bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900", bgGradient: "from-slate-900 via-purple-900 to-slate-900", textColor: "text-white" },
  { id: "gradient5", name: "Fire", preview: "bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500", bgGradient: "from-red-500 via-orange-500 to-yellow-500", textColor: "text-white" },
  { id: "gradient6", name: "Aurora", preview: "bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500", bgGradient: "from-violet-500 via-purple-500 to-pink-500", textColor: "text-white" },
]

export default function TeenSharePage() {
  const [selectedItem, setSelectedItem] = useState<ShareableItem | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<ShareTemplate>(shareTemplates[0])
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [customText, setCustomText] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleShare = (item: ShareableItem) => {
    setSelectedItem(item)
    setCustomText(`Je viens d'accomplir: ${item.title} sur TeensParty! 🎉`)
    setShowPreviewDialog(true)
  }

  const generateShareImage = async () => {
    if (!selectedItem || !canvasRef.current) return

    setIsGenerating(true)

    try {
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Set canvas size for Instagram story (1080x1920) scaled down
      canvas.width = 540
      canvas.height = 960

      // Create gradient background
      const gradientColors = {
        "gradient1": ["#f97316", "#ec4899", "#9333ea"],
        "gradient2": ["#3b82f6", "#06b6d4", "#14b8a6"],
        "gradient3": ["#10b981", "#22c55e", "#0d9488"],
        "gradient4": ["#0f172a", "#581c87", "#0f172a"],
        "gradient5": ["#ef4444", "#f97316", "#eab308"],
        "gradient6": ["#8b5cf6", "#a855f7", "#ec4899"],
      }

      const colors = gradientColors[selectedTemplate.id as keyof typeof gradientColors] || gradientColors.gradient1
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      gradient.addColorStop(0, colors[0])
      gradient.addColorStop(0.5, colors[1])
      gradient.addColorStop(1, colors[2])
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Add decorative elements
      ctx.fillStyle = "rgba(255, 255, 255, 0.1)"
      ctx.beginPath()
      ctx.arc(50, 100, 150, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(490, 800, 200, 0, Math.PI * 2)
      ctx.fill()

      // TeensParty logo text
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)"
      ctx.font = "bold 28px system-ui"
      ctx.textAlign = "center"
      ctx.fillText("TeensParty Morocco", canvas.width / 2, 80)

      // Main content card
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)"
      ctx.beginPath()
      ctx.roundRect(40, 200, canvas.width - 80, 400, 30)
      ctx.fill()

      // Icon circle
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)"
      ctx.beginPath()
      ctx.arc(canvas.width / 2, 300, 60, 0, Math.PI * 2)
      ctx.fill()

      // Achievement text
      ctx.fillStyle = "white"
      ctx.font = "bold 36px system-ui"
      ctx.textAlign = "center"
      ctx.fillText(selectedItem.title, canvas.width / 2, 420)

      ctx.font = "24px system-ui"
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
      ctx.fillText(selectedItem.subtitle, canvas.width / 2, 470)

      // Value if exists
      if (selectedItem.value) {
        ctx.font = "bold 72px system-ui"
        ctx.fillStyle = "white"
        ctx.fillText(String(selectedItem.value), canvas.width / 2, 560)
      }

      // Custom text
      if (customText) {
        ctx.font = "20px system-ui"
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)"
        const words = customText.split(" ")
        let line = ""
        let y = 700
        const maxWidth = canvas.width - 80

        for (const word of words) {
          const testLine = line + word + " "
          const metrics = ctx.measureText(testLine)
          if (metrics.width > maxWidth) {
            ctx.fillText(line, canvas.width / 2, y)
            line = word + " "
            y += 30
          } else {
            line = testLine
          }
        }
        ctx.fillText(line, canvas.width / 2, y)
      }

      // Footer
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)"
      ctx.font = "18px system-ui"
      ctx.fillText("teensparty.ma", canvas.width / 2, canvas.height - 60)

      // Generate image URL
      const imageUrl = canvas.toDataURL("image/png")
      setGeneratedImageUrl(imageUrl)

      toast.success("Image générée!")
    } catch (error) {
      toast.error("Erreur lors de la génération")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = () => {
    if (!generatedImageUrl) return

    const link = document.createElement("a")
    link.download = `teensparty-share-${Date.now()}.png`
    link.href = generatedImageUrl
    link.click()

    toast.success("Image téléchargée!")
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://teensparty.ma/share/${selectedItem?.id}`)
    toast.success("Lien copié!")
  }

  const handleSocialShare = (platform: string) => {
    const text = encodeURIComponent(customText)
    const url = encodeURIComponent(`https://teensparty.ma/share/${selectedItem?.id}`)

    let shareUrl = ""
    switch (platform) {
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`
        break
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`
        break
      case "instagram":
        toast.info("Télécharge l'image et partage-la sur Instagram!")
        handleDownload()
        return
    }

    if (shareUrl) {
      window.open(shareUrl, "_blank", "width=600,height=400")
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container-wide py-8 md:pl-72">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-foreground flex items-center gap-3">
            <Share2 className="h-8 w-8 text-primary" />
            Partager
          </h1>
          <p className="text-muted-foreground">Partage tes accomplissements avec le monde!</p>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <Crown className="h-8 w-8 mx-auto mb-2 text-warning" />
              <p className="text-2xl font-black text-foreground">Niveau 12</p>
              <p className="text-xs text-muted-foreground">Ton niveau actuel</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <Medal className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-black text-foreground">8 badges</p>
              <p className="text-xs text-muted-foreground">Collectionnés</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <Flame className="h-8 w-8 mx-auto mb-2 text-destructive" />
              <p className="text-2xl font-black text-foreground">15 jours</p>
              <p className="text-xs text-muted-foreground">Série active</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <Zap className="h-8 w-8 mx-auto mb-2 text-info" />
              <p className="text-2xl font-black text-foreground">2,450 XP</p>
              <p className="text-xs text-muted-foreground">Total accumulé</p>
            </CardContent>
          </Card>
        </div>

        {/* Shareable Items */}
        <Card className="mb-8 bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-warning" />
              Tes accomplissements à partager
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {shareableItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-border hover:border-primary/40 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => handleShare(item)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center`}>
                      <item.icon className="h-7 w-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-foreground">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                      <p className="text-xs text-muted-foreground mt-1">{item.date}</p>
                    </div>
                    <Button size="sm" variant="outline" className="shrink-0">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Share Cards */}
        <h3 className="text-lg font-bold text-foreground mb-4">Cartes de partage rapide</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-all" onClick={() => {
            setSelectedItem({
              id: "profile",
              type: "level",
              title: "Mon profil TeensParty",
              subtitle: "Niveau 12 • 2450 XP",
              icon: Star,
              color: "from-purple-500 to-pink-500",
              date: ""
            })
            setCustomText("Rejoins-moi sur TeensParty! 🎉")
            setShowPreviewDialog(true)
          }}>
            <div className="aspect-video bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <div className="text-center text-white">
                <Star className="h-12 w-12 mx-auto mb-2" />
                <p className="font-bold">Carte Profil</p>
              </div>
            </div>
            <CardContent className="p-3">
              <p className="text-sm font-medium">Partage ton profil</p>
              <p className="text-xs text-muted-foreground">Niveau, XP et badges</p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-all" onClick={() => {
            setSelectedItem({
              id: "streak",
              type: "streak",
              title: "Ma série de 15 jours!",
              subtitle: "Je suis en feu 🔥",
              value: 15,
              icon: Flame,
              color: "from-red-500 to-orange-500",
              date: ""
            })
            setCustomText("15 jours de suite sur TeensParty! 🔥")
            setShowPreviewDialog(true)
          }}>
            <div className="aspect-video bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <div className="text-center text-white">
                <Flame className="h-12 w-12 mx-auto mb-2" />
                <p className="font-bold">Carte Streak</p>
              </div>
            </div>
            <CardContent className="p-3">
              <p className="text-sm font-medium">Partage ta série</p>
              <p className="text-xs text-muted-foreground">Montre ta régularité</p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-all" onClick={() => {
            setSelectedItem({
              id: "invite",
              type: "achievement",
              title: "Rejoins TeensParty!",
              subtitle: "La communauté des teens au Maroc",
              icon: Heart,
              color: "from-emerald-500 to-teal-500",
              date: ""
            })
            setCustomText("Rejoins la communauté TeensParty! Events, défis et fun garantis 🎉")
            setShowPreviewDialog(true)
          }}>
            <div className="aspect-video bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <div className="text-center text-white">
                <Heart className="h-12 w-12 mx-auto mb-2" />
                <p className="font-bold">Carte Invitation</p>
              </div>
            </div>
            <CardContent className="p-3">
              <p className="text-sm font-medium">Invite tes amis</p>
              <p className="text-xs text-muted-foreground">Partage TeensParty</p>
            </CardContent>
          </Card>
        </div>

        {/* Hidden Canvas for Image Generation */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Preview & Share Dialog */}
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Personnalise et partage
              </DialogTitle>
            </DialogHeader>

            <div className="grid md:grid-cols-2 gap-6 py-4">
              {/* Preview */}
              <div>
                <Label className="mb-2 block">Aperçu</Label>
                <div className={`aspect-[9/16] rounded-2xl bg-gradient-to-br ${selectedTemplate.bgGradient} p-6 flex flex-col items-center justify-center text-white relative overflow-hidden`}>
                  {/* Decorative circles */}
                  <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
                  <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/10 rounded-full translate-x-1/4 translate-y-1/4" />

                  {/* Content */}
                  <p className="text-sm font-medium mb-8 opacity-80">TeensParty Morocco</p>

                  <div className="bg-white/20 rounded-2xl p-6 backdrop-blur-sm text-center">
                    {selectedItem && (
                      <>
                        <div className={`h-16 w-16 rounded-full bg-white/30 flex items-center justify-center mx-auto mb-4`}>
                          <selectedItem.icon className="h-8 w-8" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">{selectedItem.title}</h3>
                        <p className="text-sm opacity-80 mb-4">{selectedItem.subtitle}</p>
                        {selectedItem.value && (
                          <p className="text-4xl font-black">{selectedItem.value}</p>
                        )}
                      </>
                    )}
                  </div>

                  {customText && (
                    <p className="mt-6 text-sm text-center opacity-90 max-w-[80%]">{customText}</p>
                  )}

                  <p className="absolute bottom-4 text-xs opacity-60">teensparty.ma</p>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block">Style du fond</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {shareTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => setSelectedTemplate(template)}
                        className={`aspect-square rounded-xl ${template.preview} ${
                          selectedTemplate.id === template.id
                            ? "ring-2 ring-primary ring-offset-2"
                            : ""
                        }`}
                      >
                        <span className="sr-only">{template.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="customText">Message personnalisé</Label>
                  <Textarea
                    id="customText"
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder="Ajoute ton message..."
                    className="mt-2"
                    rows={3}
                  />
                </div>

                <div className="pt-4 border-t">
                  <Label className="mb-3 block">Partager sur</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleSocialShare("instagram")}
                    >
                      <Instagram className="h-5 w-5 mr-2 text-pink-500" />
                      Instagram
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleSocialShare("twitter")}
                    >
                      <Twitter className="h-5 w-5 mr-2 text-blue-400" />
                      Twitter
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleSocialShare("facebook")}
                    >
                      <Facebook className="h-5 w-5 mr-2 text-blue-600" />
                      Facebook
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleCopyLink}>
                <Link2 className="h-4 w-4 mr-2" />
                Copier le lien
              </Button>
              <Button
                onClick={async () => {
                  await generateShareImage()
                  handleDownload()
                }}
                disabled={isGenerating}
                className="bg-primary hover:bg-primary/90"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Télécharger l'image
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
