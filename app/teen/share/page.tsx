"use client"

import { useState, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Share2,
  Trophy,
  Star,
  Download,
  Instagram,
  Twitter,
  Facebook,
  Link2,
  Sparkles,
  Loader2,
  Heart,
} from "lucide-react"
import { toast } from "sonner"
import { getPublicAppConfig } from "@/lib/config/app-config"
import { EmptyState } from "@/components/ui/states/empty-state"
import { Niv } from "@/components/brand"

const { socialBaseUrl: SHARE_BASE_URL, brandName: BRAND_NAME } = getPublicAppConfig()
// Domaine affiche dans les watermarks d'images partagees (sans protocole).
const SHARE_DOMAIN = SHARE_BASE_URL.replace(/^https?:\/\//, "")

interface ShareableItem {
  id: string
  type: "achievement" | "badge" | "level" | "streak" | "challenge" | "event"
  title: string
  subtitle: string
  value?: string | number
  icon: React.ComponentType<any>
  /** Accent token charte (texte) pour l'icône de la carte. */
  accent: string
  date: string
}

interface ShareTemplate {
  id: string
  name: string
  /** Accent token charte (rose/gold/teal/coral/lime) sur fond ink. */
  accent: string
  accentClass: string
}

// TODO(data): wire to /api/teen/achievements + /api/teen/streak once a unified
// "shareable highlights" endpoint exists. Empty array → honest empty state per
// FRONTEND_REDO §4. No fabricated levels/streaks here — the previous fixture
// contradicted real wallet/streak data on the same screen.
const shareableItems: ShareableItem[] = []

// Identité Nivy : fond encre uniforme, un accent charte par template (jamais
// de dégradé arc-en-ciel). `accent` = HEX charte pour le canvas PNG.
const shareTemplates: ShareTemplate[] = [
  { id: "pink", name: "Rose", accent: "#ff3d80", accentClass: "text-pink" },
  { id: "gold", name: "Or", accent: "#f2b134", accentClass: "text-gold" },
  { id: "teal", name: "Teal", accent: "#2dd4bf", accentClass: "text-teal" },
  { id: "coral", name: "Corail", accent: "#ff6b54", accentClass: "text-coral" },
  { id: "lime", name: "Lime", accent: "#a3e635", accentClass: "text-lime" },
]

const INK = "#0e0c1a"
const NIGHT_2 = "#1a1628"
const PAPER = "#f4ede0"

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
    setCustomText(`Je viens d'accomplir: ${item.title} sur ${BRAND_NAME} ! 🎉`)
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

      // Fond encre Nivy + halo accent (identité de marque, pas d'arc-en-ciel).
      const accent = selectedTemplate.accent
      const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      bg.addColorStop(0, NIGHT_2)
      bg.addColorStop(1, INK)
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Halo accent doux en haut + bas
      const halo = ctx.createRadialGradient(80, 120, 0, 80, 120, 260)
      halo.addColorStop(0, `${accent}55`)
      halo.addColorStop(1, "transparent")
      ctx.fillStyle = halo
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Brand logo text — sourced from app config (BRAND_NAME)
      ctx.fillStyle = PAPER
      ctx.font = "bold 28px system-ui"
      ctx.textAlign = "center"
      ctx.fillText(BRAND_NAME, canvas.width / 2, 80)

      // Carte contenu — bordure accent (style sticker), fond ink translucide
      ctx.fillStyle = "rgba(255, 255, 255, 0.06)"
      ctx.beginPath()
      ctx.roundRect(40, 200, canvas.width - 80, 400, 24)
      ctx.fill()
      ctx.lineWidth = 3
      ctx.strokeStyle = accent
      ctx.beginPath()
      ctx.roundRect(40, 200, canvas.width - 80, 400, 24)
      ctx.stroke()

      // Pastille accent
      ctx.fillStyle = accent
      ctx.beginPath()
      ctx.arc(canvas.width / 2, 300, 56, 0, Math.PI * 2)
      ctx.fill()

      // Achievement text
      ctx.fillStyle = PAPER
      ctx.font = "bold 36px system-ui"
      ctx.textAlign = "center"
      ctx.fillText(selectedItem.title, canvas.width / 2, 420)

      ctx.font = "24px system-ui"
      ctx.fillStyle = "rgba(244, 237, 224, 0.75)"
      ctx.fillText(selectedItem.subtitle, canvas.width / 2, 470)

      // Value if exists
      if (selectedItem.value) {
        ctx.font = "bold 72px system-ui"
        ctx.fillStyle = accent
        ctx.fillText(String(selectedItem.value), canvas.width / 2, 560)
      }

      // Custom text
      if (customText) {
        ctx.font = "20px system-ui"
        ctx.fillStyle = "rgba(244, 237, 224, 0.85)"
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

      // Footer — watermark domaine
      ctx.fillStyle = "rgba(244, 237, 224, 0.55)"
      ctx.font = "18px system-ui"
      ctx.fillText(SHARE_DOMAIN, canvas.width / 2, canvas.height - 60)

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
    link.download = `nivy-share-${Date.now()}.png`
    link.href = generatedImageUrl
    link.click()

    toast.success("Image téléchargée!")
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${SHARE_BASE_URL}/share/${selectedItem?.id}`)
    toast.success("Lien copié!")
  }

  const handleSocialShare = (platform: string) => {
    const text = encodeURIComponent(customText)
    const url = encodeURIComponent(`${SHARE_BASE_URL}/share/${selectedItem?.id}`)

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
    <div className="min-h-screen bg-paper">
      <div className="container-wide space-y-8 py-8">
        {/* Hero éditorial */}
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="eyebrow">Partager</p>
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">
              Montre ton <em className="font-semibold italic text-pink not-italic">parcours</em>
            </h1>
            <p className="max-w-md text-mute">
              Transforme tes accomplissements en cartes à partager avec tes amis.
            </p>
          </div>
          <Niv mood="hype" size={96} className="hidden shrink-0 sm:block" />
        </header>

        {/* Shareable Items */}
        <StickerCard className="gap-4 p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
            <Trophy className="h-5 w-5 text-gold" />
            Tes accomplissements à partager
          </h2>
          {shareableItems.length === 0 ? (
            <EmptyState
              size="small"
              icon={Trophy}
              title="Aucun accomplissement à partager"
              description="Termine des quêtes, gagne des badges ou atteins un nouveau palier de streak — ils apparaîtront ici."
              action={{ label: "Voir mes quêtes", href: "/teen/quests" }}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {shareableItems.map((item) => (
                <StickerCard
                  key={item.id}
                  variant="hover"
                  className="p-4"
                  onClick={() => handleShare(item)}
                >
                  <div className="flex items-center gap-4">
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border-2 border-ink bg-paper-2">
                      <item.icon className={`h-7 w-7 ${item.accent}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-bold text-ink">{item.title}</h3>
                      <p className="text-sm text-mute">{item.subtitle}</p>
                      <p className="mt-1 font-mono text-xs text-mute">{item.date}</p>
                    </div>
                    <Share2 className="h-4 w-4 shrink-0 text-ink" />
                  </div>
                </StickerCard>
              ))}
            </div>
          )}
        </StickerCard>

        {/* Quick Share Cards */}
        <div className="space-y-4">
          <h3 className="font-display text-lg font-bold text-ink">Cartes de partage rapide</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <StickerCard
              variant="hover"
              className="overflow-hidden"
              onClick={() => {
                setSelectedItem({
                  id: "profile",
                  type: "level",
                  title: `Mon profil ${BRAND_NAME}`,
                  subtitle: "Découvre mon parcours",
                  icon: Star,
                  accent: "text-pink",
                  date: "",
                })
                setCustomText(`Rejoins-moi sur ${BRAND_NAME} ! 🎉`)
                setShowPreviewDialog(true)
              }}
            >
              <div className="flex aspect-video items-center justify-center border-b-2 border-ink bg-[linear-gradient(135deg,var(--night-2),var(--night))]">
                <div className="text-center text-paper">
                  <Star className="mx-auto mb-2 h-12 w-12 text-pink" />
                  <p className="font-display font-bold">Carte Profil</p>
                </div>
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold text-ink">Partage ton profil</p>
                <p className="font-mono text-xs text-mute">Niveau, XP et badges</p>
              </div>
            </StickerCard>

            <StickerCard
              variant="hover"
              className="overflow-hidden"
              onClick={() => {
                setSelectedItem({
                  id: "invite",
                  type: "achievement",
                  title: `Rejoins ${BRAND_NAME} !`,
                  subtitle: "La communauté des teens au Maroc",
                  icon: Heart,
                  accent: "text-teal",
                  date: "",
                })
                setCustomText(`Rejoins la communauté ${BRAND_NAME} ! Events, défis et fun garantis 🎉`)
                setShowPreviewDialog(true)
              }}
            >
              <div className="flex aspect-video items-center justify-center border-b-2 border-ink bg-[linear-gradient(135deg,var(--night-2),var(--night))]">
                <div className="text-center text-paper">
                  <Heart className="mx-auto mb-2 h-12 w-12 text-teal" />
                  <p className="font-display font-bold">Carte Invitation</p>
                </div>
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold text-ink">Invite tes amis</p>
                <p className="font-mono text-xs text-mute">Partage {BRAND_NAME}</p>
              </div>
            </StickerCard>
          </div>
        </div>

        {/* Hidden Canvas for Image Generation */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Preview & Share Dialog */}
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="border-2 border-ink shadow-stkr-md sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-display">
                <Sparkles className="h-5 w-5 text-pink" />
                Personnalise et partage
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-6 py-4 md:grid-cols-2">
              {/* Preview */}
              <div>
                <Label className="mb-2 block eyebrow tracking-[0.16em]">Aperçu</Label>
                <div className="relative flex aspect-[9/16] flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-ink bg-[linear-gradient(135deg,var(--night-2),var(--night))] p-6 text-paper">
                  {/* Halo accent (rotation/translate uniquement, jamais blur) */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -left-12 -top-12 size-40 rounded-full"
                    style={{
                      background: `radial-gradient(circle, color-mix(in oklch, var(--${selectedTemplate.id}) 45%, transparent), transparent 70%)`,
                    }}
                  />

                  {/* Content */}
                  <p className="mb-8 font-mono text-sm font-medium uppercase tracking-widest text-paper/70">
                    {BRAND_NAME}
                  </p>

                  <div className="relative rounded-2xl border-2 border-ink bg-white/5 p-6 text-center">
                    {selectedItem && (
                      <>
                        <div
                          className={`mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full border-2 border-ink bg-paper-2 ${selectedTemplate.accentClass}`}
                        >
                          <selectedItem.icon className="h-8 w-8" />
                        </div>
                        <h3 className="mb-2 font-display text-xl font-bold text-paper">
                          {selectedItem.title}
                        </h3>
                        <p className="mb-4 text-sm text-paper/75">{selectedItem.subtitle}</p>
                        {selectedItem.value && (
                          <p
                            className={`font-display text-4xl font-extrabold tabular-nums ${selectedTemplate.accentClass}`}
                          >
                            {selectedItem.value}
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {customText && (
                    <p className="mt-6 max-w-[80%] text-center text-sm text-paper/90">{customText}</p>
                  )}

                  <p className="absolute bottom-4 font-mono text-xs text-paper/60">{SHARE_DOMAIN}</p>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block eyebrow tracking-[0.16em]">Accent</Label>
                  <div className="grid grid-cols-5 gap-2">
                    {shareTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => setSelectedTemplate(template)}
                        className={`aspect-square rounded-xl border-2 border-ink transition-all ${
                          selectedTemplate.id === template.id
                            ? "-translate-x-0.5 -translate-y-0.5 shadow-stkr-pink"
                            : "shadow-stkr-sm"
                        }`}
                        style={{ background: `var(--${template.id})` }}
                      >
                        <span className="sr-only">{template.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="customText" className="eyebrow tracking-[0.16em]">
                    Message personnalisé
                  </Label>
                  <Textarea
                    id="customText"
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder="Ajoute ton message..."
                    className="mt-2 border-2 border-input focus-visible:border-ink focus-visible:ring-0"
                    rows={3}
                  />
                </div>

                <div className="border-t-2 border-line pt-4">
                  <Label className="mb-3 block eyebrow tracking-[0.16em]">Partager sur</Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleSocialShare("instagram")}
                    >
                      <Instagram className="mr-2 h-5 w-5 text-pink" />
                      Instagram
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleSocialShare("twitter")}
                    >
                      <Twitter className="mr-2 h-5 w-5 text-teal" />
                      Twitter
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleSocialShare("facebook")}
                    >
                      <Facebook className="mr-2 h-5 w-5 text-teal" />
                      Facebook
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleCopyLink}>
                <Link2 className="mr-2 h-4 w-4" />
                Copier le lien
              </Button>
              <Button
                variant="pink"
                onClick={async () => {
                  await generateShareImage()
                  handleDownload()
                }}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
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
