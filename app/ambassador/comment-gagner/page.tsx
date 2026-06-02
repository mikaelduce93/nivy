"use client"

import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { DarkSurface, NivCoach } from "@/components/brand"
import {
  Users,
  Video,
  Camera,
  Calendar,
  ArrowRight,
  Wallet,
  Sparkles,
} from "lucide-react"
import Link from "next/link"

// Commission cash en DH par tier (whitepaper §12, modèle verrouillé).
const COMMISSION_TIERS = [
  { tier: "Bronze", rate: "10%", detail: "Ton taux de départ, dès ta première famille parrainée.", tone: "coral" as const },
  { tier: "Silver", rate: "12%", detail: "Débloqué quand tu fais grandir ton crew régulièrement.", tone: "teal" as const },
  { tier: "Gold", rate: "15%", detail: "Le top : taux max pour les ambassadeurs les plus actifs.", tone: "gold" as const },
]

// Actions qui font venir des familles (le vrai levier de commission cash).
const EARNING_ACTIONS = [
  {
    icon: Users,
    title: "Parraine des familles",
    description: "Invite des parents et ados à rejoindre Nivy avec ton code. Tu touches une commission cash sur chaque top-up parental.",
  },
  {
    icon: Video,
    title: "Crée du contenu TikTok",
    description: "Poste une vidéo avec le hashtag #NivyMaroc. Plus elle tourne, plus tu ramènes de familles.",
  },
  {
    icon: Camera,
    title: "Crée du contenu Instagram",
    description: "Story ou post avec la mention @nivy.ma : un lien dans ta bio = des parrainages passifs.",
  },
  {
    icon: Calendar,
    title: "Viens aux events partenaires",
    description: "Sois présent aux events du réseau et fais découvrir Nivy en vrai, autour de toi.",
  },
]

export default function CommentGagnerPage() {
  return (
    <div className="bg-paper">
      <div className="container mx-auto max-w-4xl space-y-8 px-6 py-20 md:py-32">
        {/* Header éditorial */}
        <div>
          <span className="eyebrow tracking-[0.16em] text-pink">Comment gagner</span>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink">
            Du <em className="font-semibold italic text-pink">cash</em> réel sur chaque famille que tu ramènes.
          </h1>
          <p className="mt-2 text-mute">
            Ta commission, c'est du dirham qui tombe sur ton solde — pas des points fictifs.
          </p>
        </div>

        {/* Commission cash par tier */}
        <section className="space-y-4">
          <h2 className="font-display text-xl font-extrabold text-ink">Ta commission, par tier</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {COMMISSION_TIERS.map((t) => (
              <DarkSurface key={t.tier} tone={t.tone} shadow className="p-5">
                <span className="eyebrow tracking-[0.16em] text-paper/60">{t.tier}</span>
                <p className={`mt-1 font-display text-4xl font-extrabold tabular-nums ${
                  t.tone === "coral" ? "text-coral" : t.tone === "teal" ? "text-teal" : "text-gold"
                }`}>
                  {t.rate}
                </p>
                <p className="mt-2 text-sm text-paper/70">{t.detail}</p>
              </DarkSurface>
            ))}
          </div>
        </section>

        {/* Track XP-only pour les moins de 18 ans */}
        <StickerCard className="p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-paper-2">
              <Sparkles className="h-6 w-6 text-gold" />
            </div>
            <div>
              <h2 className="font-display text-lg font-extrabold text-ink">Tu as moins de 18 ans ?</h2>
              <p className="mt-1 text-sm text-mute">
                La loi encadre le cash pour les mineurs : tu es sur le track <strong className="text-ink">XP-only</strong>.
                Tes parrainages te font monter en XP et débloquent des avantages dans l'app. Le jour de tes 18 ans,
                tu peux basculer sur le track commission cash.
              </p>
            </div>
          </div>
        </StickerCard>

        {/* Actions qui rapportent */}
        <section className="space-y-4">
          <h2 className="font-display text-xl font-extrabold text-ink">Les actions qui font venir des familles</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {EARNING_ACTIONS.map((action, i) => (
              <StickerCard key={i} className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-paper-2">
                    <action.icon className="h-6 w-6 text-pink" />
                  </div>
                  <div>
                    <h3 className="font-display font-extrabold text-ink">{action.title}</h3>
                    <p className="mt-1 text-sm text-mute">{action.description}</p>
                  </div>
                </div>
              </StickerCard>
            ))}
          </div>
        </section>

        {/* Coach Niv — le mix cash/XP */}
        <NivCoach
          mood="hype"
          message={
            <div className="space-y-2">
              <p className="font-semibold text-paper">Mon conseil pour maximiser ton cash :</p>
              <ul className="list-disc space-y-1 pl-4 text-paper/80">
                <li>Mets ton code dans ta bio Insta et TikTok : des parrainages qui tournent tout seuls.</li>
                <li>Les TikToks ont le plus de potentiel viral — montre l'ambiance des events.</li>
                <li>Plus tes filleuls sont actifs, plus ta commission tombe régulièrement.</li>
                <li>Vise le tier Gold (15%) en restant régulier dans tes parrainages.</li>
              </ul>
            </div>
          }
        />

        {/* CTA — vers withdrawals + dashboard (plus de boutique/missions legacy) */}
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Button asChild size="lg" variant="pink">
            <Link href="/ambassador/withdrawals">
              <Wallet className="mr-2 h-5 w-5" />
              Retirer mes gains
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/ambassador">
              <Users className="mr-2 h-5 w-5" />
              Mon dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
