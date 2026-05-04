"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Send, Video, Gift } from "lucide-react"

interface AmbassadorApplicationFormProps {
  profile: any
}

export default function AmbassadorApplicationForm({ profile }: AmbassadorApplicationFormProps) {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    stageName: "",
    bio: "",
    instagram: "",
    tiktok: "",
    snapchat: "",
    specialties: "",
    whyAmbassador: "",
    videoUrl: "",
  })

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    setError(null)

    try {
      const specialtiesArray = formData.specialties
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)

      const socialMedia: Record<string, string> = {}
      if (formData.instagram) socialMedia.instagram = formData.instagram
      if (formData.tiktok) socialMedia.tiktok = formData.tiktok
      if (formData.snapchat) socialMedia.snapchat = formData.snapchat

      const { error: applicationError } = await supabase.from("ambassadors").insert({
        profile_id: profile.id,
        stage_name: formData.stageName || profile.full_name,
        bio: formData.bio,
        social_media: socialMedia,
        specialties: specialtiesArray,
        video_url: formData.videoUrl || null,
        status: "pending",
      })

      if (applicationError) throw applicationError

      router.push("/ambassadeurs?applied=true")
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-3xl p-8 border border-zinc-800">
        <h2 className="text-2xl font-bold text-white mb-6">Tes informations</h2>

        <div className="space-y-6">
          <div>
            <Label htmlFor="stageName" className="text-white mb-2 block">
              Nom de scène (optionnel)
            </Label>
            <Input
              id="stageName"
              type="text"
              className="bg-zinc-900 border-zinc-800 text-white"
              placeholder="DJ Cool, Danseur Pro..."
              value={formData.stageName}
              onChange={(e) => setFormData({ ...formData, stageName: e.target.value })}
            />
            <p className="text-xs text-zinc-500 mt-1">Laisse vide pour utiliser ton vrai nom</p>
          </div>

          <div>
            <Label htmlFor="bio" className="text-white mb-2 block">
              Bio *
            </Label>
            <Textarea
              id="bio"
              rows={4}
              className="bg-zinc-900 border-zinc-800 text-white"
              placeholder="Parle-nous de toi, tes passions, ton expérience..."
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="specialties" className="text-white mb-2 block">
              Spécialités *
            </Label>
            <Input
              id="specialties"
              type="text"
              className="bg-zinc-900 border-zinc-800 text-white"
              placeholder="DJ, Danseur, Influenceur, Photographe..."
              value={formData.specialties}
              onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
              required
            />
            <p className="text-xs text-zinc-500 mt-1">Sépare les spécialités par des virgules</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="instagram" className="text-white mb-2 block">
                Instagram
              </Label>
              <Input
                id="instagram"
                type="text"
                className="bg-zinc-900 border-zinc-800 text-white"
                placeholder="@tonpseudo"
                value={formData.instagram}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="tiktok" className="text-white mb-2 block">
                TikTok
              </Label>
              <Input
                id="tiktok"
                type="text"
                className="bg-zinc-900 border-zinc-800 text-white"
                placeholder="@tonpseudo"
                value={formData.tiktok}
                onChange={(e) => setFormData({ ...formData, tiktok: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="snapchat" className="text-white mb-2 block">
                Snapchat
              </Label>
              <Input
                id="snapchat"
                type="text"
                className="bg-zinc-900 border-zinc-800 text-white"
                placeholder="tonpseudo"
                value={formData.snapchat}
                onChange={(e) => setFormData({ ...formData, snapchat: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="whyAmbassador" className="text-white mb-2 block">
              Pourquoi veux-tu devenir ambassadeur? *
            </Label>
            <Textarea
              id="whyAmbassador"
              rows={4}
              className="bg-zinc-900 border-zinc-800 text-white"
              placeholder="Explique-nous ta motivation..."
              value={formData.whyAmbassador}
              onChange={(e) => setFormData({ ...formData, whyAmbassador: e.target.value })}
              required
            />
          </div>

          <div className="p-6 bg-cyan-500/5 border border-cyan-500/20 rounded-xl">
            <div className="flex items-start gap-3 mb-4">
              <Video className="w-6 h-6 text-cyan-400 flex-shrink-0 mt-1" />
              <div>
                <Label htmlFor="videoUrl" className="text-white mb-2 block">
                  CV Vidéo (Recommandé) 🎬
                </Label>
                <p className="text-sm text-zinc-400 mb-3">
                  Présente-toi en vidéo (1-2 min) : qui es-tu, pourquoi Teen Party, ce que tu peux apporter.
                  Uploade sur YouTube, Loom, ou Google Drive et colle le lien ici.
                </p>
              </div>
            </div>
            <Input
              id="videoUrl"
              type="url"
              className="bg-zinc-900 border-zinc-700 text-white"
              placeholder="https://youtube.com/watch?v=... ou https://loom.com/..."
              value={formData.videoUrl}
              onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
            />
            <p className="text-xs text-zinc-500 mt-2">
              💡 Un CV vidéo augmente tes chances d'être accepté de 70%
            </p>
          </div>
        </div>
      </div>

      {/* Rewards Preview */}
      <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-3xl p-8 border border-purple-500/30">
        <div className="flex items-center gap-3 mb-6">
          <Gift className="w-8 h-8 text-purple-400" />
          <h2 className="text-2xl font-bold text-white">Ce que tu peux gagner</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-zinc-900/50 rounded-xl p-3 text-center">
            <div className="text-2xl mb-1">🎮</div>
            <p className="font-bold text-white text-sm">PlayStation 5</p>
            <p className="text-xs text-purple-400">5000 pts</p>
          </div>
          <div className="bg-zinc-900/50 rounded-xl p-3 text-center">
            <div className="text-2xl mb-1">🟢</div>
            <p className="font-bold text-white text-sm">Carte Roblox</p>
            <p className="text-xs text-purple-400">250 pts</p>
          </div>
          <div className="bg-zinc-900/50 rounded-xl p-3 text-center">
            <div className="text-2xl mb-1">🔵</div>
            <p className="font-bold text-white text-sm">Carte PS Store</p>
            <p className="text-xs text-purple-400">250 pts</p>
          </div>
          <div className="bg-zinc-900/50 rounded-xl p-3 text-center">
            <div className="text-2xl mb-1">🪩</div>
            <p className="font-bold text-white text-sm">Entrées Club</p>
            <p className="text-xs text-purple-400">200 pts</p>
          </div>
          <div className="bg-zinc-900/50 rounded-xl p-3 text-center">
            <div className="text-2xl mb-1">🎂</div>
            <p className="font-bold text-white text-sm">Anniv VIP</p>
            <p className="text-xs text-purple-400">3000 pts</p>
          </div>
          <div className="bg-zinc-900/50 rounded-xl p-3 text-center">
            <div className="text-2xl mb-1">🎧</div>
            <p className="font-bold text-white text-sm">AirPods Pro</p>
            <p className="text-xs text-purple-400">2000 pts</p>
          </div>
        </div>

        <p className="text-sm text-zinc-400 mt-4 text-center">
          Cartes cadeaux (Roblox, PS Store, Xbox, Netflix...), tech, entrées clubs, anniversaires gratuits et bien plus !
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0 text-lg py-6"
        disabled={isProcessing}
      >
        <Send className="w-5 h-5 mr-2" />
        {isProcessing ? "Envoi..." : "Envoyer ma candidature"}
      </Button>

      <p className="text-center text-xs text-zinc-500">Nous examinerons ta candidature et te contacterons sous 48h</p>
    </form>
  )
}
