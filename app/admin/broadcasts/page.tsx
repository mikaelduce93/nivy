import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { FieldInput } from "@/components/ui/field-input"
import { SelectSticker, SelectStickerItem } from "@/components/ui/select-sticker"
import { StickerCard } from "@/components/ui/sticker-card"
import { StatHero, Niv } from "@/components/brand/niv"
import { Megaphone, Send, Users } from "lucide-react"

export const metadata: Metadata = { title: "Broadcasts — Admin" }

// Refonte V1.5 (#107) — composer/envoyer des broadcasts push/notif (spec §16/§18).
export default function AdminBroadcastsPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="eyebrow">Communication</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">
          Composer un <em className="font-semibold italic text-pink">broadcast</em>
        </h1>
        <p className="text-mute">Une annonce push/notification, envoyée à un segment d'utilisateurs.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Composer */}
        <StickerCard className="gap-5 p-6">
          <FieldInput label="Titre" placeholder="Nouvelle quête du jour" />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="broadcast-message" className="eyebrow tracking-[0.16em]">
              Message
            </label>
            <Textarea id="broadcast-message" rows={4} placeholder="Ton message…" />
          </div>

          <SelectSticker label="Cible" placeholder="Choisir un segment" defaultValue="all">
            <SelectStickerItem value="all">Tous les utilisateurs</SelectStickerItem>
            <SelectStickerItem value="teens">Ados</SelectStickerItem>
            <SelectStickerItem value="parents">Parents</SelectStickerItem>
            <SelectStickerItem value="partners">Partenaires</SelectStickerItem>
          </SelectSticker>

          <Button variant="pink" className="w-full">
            <Send className="mr-2 h-4 w-4" />
            Envoyer le broadcast
          </Button>
        </StickerCard>

        {/* Aperçu + portée */}
        <div className="space-y-4">
          <StatHero
            eyebrow="Portée estimée"
            value={0}
            tone="teal"
            icon={<Users className="h-6 w-6" />}
            meta="Utilisateurs dans le segment ciblé"
          />

          <StickerCard variant="panel" className="gap-3 p-5">
            <span className="eyebrow tracking-[0.16em]">Aperçu de la notification</span>
            <div className="flex items-start gap-3 rounded-xl border-2 border-ink bg-paper p-3">
              <Niv mood="happy" size={44} className="shrink-0" />
              <div className="min-w-0">
                <p className="font-display text-sm font-bold text-ink">Nivy</p>
                <p className="truncate text-sm font-semibold text-ink">Titre de l'annonce</p>
                <p className="text-xs text-mute">Le message apparaîtra ici.</p>
              </div>
            </div>
          </StickerCard>
        </div>
      </div>
    </div>
  )
}
