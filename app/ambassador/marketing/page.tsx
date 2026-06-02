import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getSocialBaseUrl } from "@/lib/config/app-config"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { DarkSurface, NivCoach } from "@/components/brand"
import {
  QrCode,
  Image as ImageIcon,
  FileText,
  Video,
  ArrowLeft,
  Instagram,
  MessageCircle,
  Facebook
} from "lucide-react"
import Link from "next/link"
import { QRCodeGenerator } from "@/components/ambassador/qr-code-generator"
import { ShareButtons } from "@/components/ambassador/share-buttons"
import { TextTemplateCard } from "@/components/ambassador/text-template-card"

async function getAmbassadorData(profileId: string) {
  const supabase = await createClient()

  // #29 — ambassadors keyed on user_id; the referral code lives on the row
  // (ambassadors.code), consistent with the dashboard. referral_codes is keyed
  // on user_id (not ambassador_id) and belongs to a separate referral system
  // (#67); the canonical ambassador code is ambassadors.code.
  const { data: ambassador } = await supabase
    .from("ambassadors")
    .select("id, code, commission_pct")
    .eq("user_id", profileId)
    .maybeSingle()

  if (!ambassador) return null

  return {
    ambassadorId: ambassador.id,
    commissionRate: Number(ambassador.commission_pct) || 15,
    referralCode: ambassador.code || profileId.slice(0, 8).toUpperCase(),
  }
}

export default async function AmbassadorMarketingPage() {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "ambassador") {
    redirect("/auth/redirect")
  }

  const data = await getAmbassadorData(userInfo.profileId)
  const referralCode = data?.referralCode || userInfo.profileId.slice(0, 8).toUpperCase()
  const referralLink = `${getSocialBaseUrl()}/join?ref=${referralCode}`

  const socialTemplates = [
    {
      platform: "Instagram Story",
      icon: Instagram,
      iconColor: "text-pink",
      description: "Template vertical 1080x1920",
      format: "9:16"
    },
    {
      platform: "Instagram Post",
      icon: Instagram,
      iconColor: "text-coral",
      description: "Template carré 1080x1080",
      format: "1:1"
    },
    {
      platform: "Facebook",
      icon: Facebook,
      iconColor: "text-teal",
      description: "Template paysage 1200x630",
      format: "1.91:1"
    },
    {
      platform: "WhatsApp Status",
      icon: MessageCircle,
      iconColor: "text-lime",
      description: "Template vertical 1080x1920",
      format: "9:16"
    }
  ]

  const textTemplates = [
    {
      title: "Message WhatsApp",
      content: `Salut ! Tu cherches des activités cool pour tes ados ? Nivy propose des events exclusifs, des sorties et des expériences uniques au Maroc. Utilise mon code ${referralCode} et bénéficie de -10% sur ta première inscription !`
    },
    {
      title: "Bio Instagram",
      content: `Ambassadeur Nivy | Des expériences uniques pour les 13-17 ans au Maroc | Code promo: ${referralCode} | -10% sur ta 1ère inscription`
    },
    {
      title: "Post Facebook",
      content: `Vous cherchez des activités pour vos ados ? Nivy c'est LA communauté qui organise des events exclusifs pour les 13-17 ans au Maroc ! Inscrivez-vous avec mon code ${referralCode} et profitez de -10% sur votre première inscription.`
    }
  ]

  return (
    <div className="bg-paper">
      <div className="container mx-auto px-6 py-20 md:py-32">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/ambassador">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        {/* Header éditorial */}
        <div className="mb-8">
          <span className="eyebrow tracking-[0.16em] text-pink">Matériel marketing</span>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink">
            Ton kit pour faire <em className="font-semibold italic text-pink">parler</em> de Nivy.
          </h1>
          <p className="mt-2 text-mute">Visuels, templates et liens prêts à partager.</p>
        </div>

        {/* Duo héro : code (surface sombre) + QR (sticker) */}
        <div className="mb-8 grid gap-6 md:grid-cols-2">
          <DarkSurface tone="pink" shadow className="p-6">
            <span className="eyebrow tracking-[0.16em] text-paper/60">Ton code parrain</span>
            <p className="mt-2 font-mono text-4xl font-bold tracking-wider text-pink">{referralCode}</p>
            <div className="mt-4 rounded-xl border-2 border-paper/15 bg-black/20 p-3">
              <span className="eyebrow tracking-[0.16em] text-paper/50">Ton lien</span>
              <p className="mt-1 break-all font-mono text-sm text-paper/90">{referralLink}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <ShareButtons referralCode={referralCode} referralLink={referralLink} />
            </div>
          </DarkSurface>

          <StickerCard className="p-6">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-extrabold text-ink">
              <QrCode className="h-5 w-5 text-teal" />
              Ton QR code
            </h2>
            <QRCodeGenerator referralLink={referralLink} referralCode={referralCode} />
          </StickerCard>
        </div>

        {/* Social Media Templates — « Bientôt dispo » (pas d'asset = pas de bouton mort) */}
        <StickerCard className="mb-8 p-6">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-extrabold text-ink">
            <ImageIcon className="h-5 w-5 text-pink" />
            Templates réseaux sociaux
          </h2>
          <div className="grid gap-4 md:grid-cols-4">
            {socialTemplates.map((template, index) => (
              <div
                key={index}
                className="rounded-xl border-2 border-line bg-white p-5"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border-2 border-ink bg-paper-2">
                  <template.icon className={`h-6 w-6 ${template.iconColor}`} />
                </div>
                <h3 className="mb-1 font-display font-extrabold text-ink">{template.platform}</h3>
                <p className="mb-3 text-xs text-mute">{template.description}</p>
                <p className="mb-4 font-mono text-xs text-mute">Format : {template.format}</p>
                <span className="inline-flex w-full items-center justify-center rounded-lg border-2 border-line px-3 py-2 font-mono text-xs font-semibold text-mute">
                  Bientôt dispo
                </span>
              </div>
            ))}
          </div>
        </StickerCard>

        {/* Text Templates — copier-coller fonctionnel */}
        <StickerCard className="mb-8 p-6">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-extrabold text-ink">
            <FileText className="h-5 w-5 text-teal" />
            Templates texte
          </h2>
          <div className="space-y-4">
            {textTemplates.map((template, index) => (
              <TextTemplateCard key={index} title={template.title} content={template.content} />
            ))}
          </div>
        </StickerCard>

        {/* Video Resources — « Bientôt dispo » */}
        <StickerCard className="mb-8 p-6">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-extrabold text-ink">
            <Video className="h-5 w-5 text-coral" />
            Ressources vidéo
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { title: "Présentation Nivy", duration: "Vidéo de 30 secondes" },
              { title: "Témoignages parents", duration: "Vidéo de 45 secondes" },
              { title: "Highlights events", duration: "Vidéo de 60 secondes" },
            ].map((video, index) => (
              <div key={index} className="rounded-xl border-2 border-line bg-white p-5">
                <div className="mb-4 flex aspect-video items-center justify-center rounded-lg border-2 border-line bg-paper-2">
                  <Video className="h-12 w-12 text-mute" />
                </div>
                <h3 className="mb-1 font-display font-extrabold text-ink">{video.title}</h3>
                <p className="mb-3 text-xs text-mute">{video.duration}</p>
                <span className="inline-flex w-full items-center justify-center rounded-lg border-2 border-line px-3 py-2 font-mono text-xs font-semibold text-mute">
                  Bientôt dispo
                </span>
              </div>
            ))}
          </div>
        </StickerCard>

        {/* Coach Niv — le script de partage */}
        <NivCoach
          mood="hype"
          message={
            <div className="space-y-2">
              <p className="font-semibold text-paper">Mon script de partage qui convertit :</p>
              <ul className="list-disc space-y-1 pl-4 text-paper/80">
                <li>Poste 2-3 fois par semaine, c'est la régularité qui paie.</li>
                <li>Mise sur les stories : montre l'ambiance des events, du vrai.</li>
                <li>Personnalise le message selon ton audience.</li>
                <li>Cible les parents : ce sont eux qui décident et qui paient.</li>
              </ul>
            </div>
          }
        />
      </div>
    </div>
  )
}
