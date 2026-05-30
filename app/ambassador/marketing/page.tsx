import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getSocialBaseUrl } from "@/lib/config/app-config"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Download,
  Share2,
  QrCode,
  Image as ImageIcon,
  FileText,
  Video,
  ArrowLeft,
  Copy,
  Instagram,
  MessageCircle,
  Facebook
} from "lucide-react"
import Link from "next/link"
import { QRCodeGenerator } from "@/components/ambassador/qr-code-generator"
import { ShareButtons } from "@/components/ambassador/share-buttons"

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
      color: "from-pink to-pink",
      description: "Template vertical 1080x1920",
      format: "9:16"
    },
    {
      platform: "Instagram Post",
      icon: Instagram,
      color: "from-pink to-coral",
      description: "Template carré 1080x1080",
      format: "1:1"
    },
    {
      platform: "Facebook",
      icon: Facebook,
      color: "from-teal to-teal",
      description: "Template paysage 1200x630",
      format: "1.91:1"
    },
    {
      platform: "WhatsApp Status",
      icon: MessageCircle,
      color: "from-lime to-lime",
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
      content: `Ambassadeur Nivy | Des expériences uniques pour les 13-19 ans au Maroc | Code promo: ${referralCode} | -10% sur ta 1ère inscription`
    },
    {
      title: "Post Facebook",
      content: `Vous cherchez des activités pour vos ados ? Nivy c'est LA communauté qui organise des events exclusifs pour les 13-19 ans au Maroc ! Inscrivez-vous avec mon code ${referralCode} et profitez de -10% sur votre première inscription.`
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-32">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-6 text-mute hover:text-ink">
          <Link href="/ambassador">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-ink">Matériel Marketing</h1>
            <p className="text-mute">Téléchargez des visuels et templates pour promouvoir Nivy</p>
          </div>
          <ShareButtons referralCode={referralCode} referralLink={referralLink} />
        </div>

        {/* Your Code & QR */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-gold/20 to-coral/20 border-gold/30 bg-card">
            <CardHeader>
              <CardTitle className="text-ink flex items-center gap-2">
                <Share2 className="h-5 w-5 text-gold" />
                Votre code & lien
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-card rounded-xl p-5">
                <p className="text-xs text-mute mb-2">Votre code parrain</p>
                <p className="text-3xl font-black font-mono tracking-wider text-gold">{referralCode}</p>
              </div>
              <div className="bg-card rounded-xl p-5">
                <p className="text-xs text-mute mb-2">Votre lien personnalisé</p>
                <p className="text-sm text-ink font-mono break-all">{referralLink}</p>
              </div>
              <ShareButtons referralCode={referralCode} referralLink={referralLink} />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-paper-2 to-card border-ink">
            <CardHeader>
              <CardTitle className="text-ink flex items-center gap-2">
                <QrCode className="h-5 w-5 text-lime" />
                Votre QR Code
              </CardTitle>
            </CardHeader>
            <CardContent>
              <QRCodeGenerator referralLink={referralLink} referralCode={referralCode} />
            </CardContent>
          </Card>
        </div>

        {/* Social Media Templates */}
        <Card className="bg-gradient-to-br from-paper-2 to-card border-ink mb-8">
          <CardHeader>
            <CardTitle className="text-ink flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-pink" />
              Templates Réseaux Sociaux
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              {socialTemplates.map((template, index) => (
                <div
                  key={index}
                  className="bg-card rounded-xl p-5 border border-ink hover:border-pink/30 transition-all group cursor-pointer"
                >
                  <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${template.color} flex items-center justify-center mb-4`}>
                    <template.icon className="h-6 w-6 text-ink" />
                  </div>
                  <h3 className="font-bold text-ink mb-1">{template.platform}</h3>
                  <p className="text-xs text-mute mb-3">{template.description}</p>
                  <p className="text-xs text-mute mb-4">Format: {template.format}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-ink text-ink-2 hover:border-pink/50 hover:text-pink group-hover:border-pink/50"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Text Templates */}
        <Card className="bg-gradient-to-br from-paper-2 to-card border-ink mb-8">
          <CardHeader>
            <CardTitle className="text-ink flex items-center gap-2">
              <FileText className="h-5 w-5 text-teal" />
              Templates Texte
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {textTemplates.map((template, index) => (
              <div
                key={index}
                className="bg-card rounded-xl p-5 border border-ink"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-ink">{template.title}</h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-teal hover:text-teal hover:bg-teal/10"
                    onClick={() => {
                      // Client-side copy would need a client component
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copier
                  </Button>
                </div>
                <p className="text-sm text-ink-2 leading-relaxed">{template.content}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Video Resources */}
        <Card className="bg-gradient-to-br from-paper-2 to-card border-ink mb-8">
          <CardHeader>
            <CardTitle className="text-ink flex items-center gap-2">
              <Video className="h-5 w-5 text-destructive" />
              Ressources Vidéo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-card rounded-xl p-5 border border-ink">
                <div className="aspect-video bg-muted rounded-lg mb-4 flex items-center justify-center">
                  <Video className="h-12 w-12 text-mute" />
                </div>
                <h3 className="font-bold text-ink mb-1">Présentation Nivy</h3>
                <p className="text-xs text-mute mb-3">Vidéo de 30 secondes</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-ink text-ink-2 hover:border-destructive/50 hover:text-destructive"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger
                </Button>
              </div>
              <div className="bg-card rounded-xl p-5 border border-ink">
                <div className="aspect-video bg-muted rounded-lg mb-4 flex items-center justify-center">
                  <Video className="h-12 w-12 text-mute" />
                </div>
                <h3 className="font-bold text-ink mb-1">Témoignages Parents</h3>
                <p className="text-xs text-mute mb-3">Vidéo de 45 secondes</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-ink text-ink-2 hover:border-destructive/50 hover:text-destructive"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger
                </Button>
              </div>
              <div className="bg-card rounded-xl p-5 border border-ink">
                <div className="aspect-video bg-muted rounded-lg mb-4 flex items-center justify-center">
                  <Video className="h-12 w-12 text-mute" />
                </div>
                <h3 className="font-bold text-ink mb-1">Highlights Events</h3>
                <p className="text-xs text-mute mb-3">Vidéo de 60 secondes</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-ink text-ink-2 hover:border-destructive/50 hover:text-destructive"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="bg-gradient-to-r from-gold/10 via-coral/10 to-destructive/10 border-gold/20">
          <CardContent className="p-6">
            <h3 className="font-bold text-ink mb-4 flex items-center gap-2">
              <span className="text-xl">💡</span> Conseils pour maximiser vos conversions
            </h3>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="p-4 bg-card rounded-xl border border-ink">
                <p className="font-bold text-ink mb-1">Postez régulièrement</p>
                <p className="text-xs text-mute">2-3 posts par semaine sur vos réseaux</p>
              </div>
              <div className="p-4 bg-card rounded-xl border border-ink">
                <p className="font-bold text-ink mb-1">Utilisez les stories</p>
                <p className="text-xs text-mute">Partagez des moments authentiques</p>
              </div>
              <div className="p-4 bg-card rounded-xl border border-ink">
                <p className="font-bold text-ink mb-1">Personnalisez</p>
                <p className="text-xs text-mute">Adaptez les messages à votre audience</p>
              </div>
              <div className="p-4 bg-card rounded-xl border border-ink">
                <p className="font-bold text-ink mb-1">Ciblez les parents</p>
                <p className="text-xs text-mute">Ce sont eux qui décident et paient</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
