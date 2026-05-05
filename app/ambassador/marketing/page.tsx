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

  const { data: ambassador } = await supabase
    .from("ambassadors")
    .select("id, commission_rate")
    .eq("profile_id", profileId)
    .single()

  if (!ambassador) return null

  const { data: referralCode } = await supabase
    .from("referral_codes")
    .select("code")
    .eq("ambassador_id", ambassador.id)
    .eq("is_active", true)
    .single()

  return {
    ambassadorId: ambassador.id,
    commissionRate: ambassador.commission_rate || 15,
    referralCode: referralCode?.code || profileId.slice(0, 8).toUpperCase()
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
      color: "from-pink-500 to-purple-500",
      description: "Template vertical 1080x1920",
      format: "9:16"
    },
    {
      platform: "Instagram Post",
      icon: Instagram,
      color: "from-pink-500 to-orange-500",
      description: "Template carré 1080x1080",
      format: "1:1"
    },
    {
      platform: "Facebook",
      icon: Facebook,
      color: "from-blue-600 to-blue-400",
      description: "Template paysage 1200x630",
      format: "1.91:1"
    },
    {
      platform: "WhatsApp Status",
      icon: MessageCircle,
      color: "from-green-500 to-emerald-500",
      description: "Template vertical 1080x1920",
      format: "9:16"
    }
  ]

  const textTemplates = [
    {
      title: "Message WhatsApp",
      content: `Salut ! Tu cherches des activités cool pour tes ados ? Teen Club propose des events exclusifs, des sorties et des expériences uniques au Maroc. Utilise mon code ${referralCode} et bénéficie de -10% sur ta première inscription !`
    },
    {
      title: "Bio Instagram",
      content: `Ambassadeur Teen Club | Des expériences uniques pour les 13-19 ans au Maroc | Code promo: ${referralCode} | -10% sur ta 1ère inscription`
    },
    {
      title: "Post Facebook",
      content: `Vous cherchez des activités pour vos ados ? Teen Club c'est LA communauté qui organise des events exclusifs pour les 13-19 ans au Maroc ! Inscrivez-vous avec mon code ${referralCode} et profitez de -10% sur votre première inscription.`
    }
  ]

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-6 text-zinc-400 hover:text-white">
          <Link href="/ambassador">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white">Matériel Marketing</h1>
            <p className="text-zinc-400">Téléchargez des visuels et templates pour promouvoir Teen Club</p>
          </div>
          <ShareButtons referralCode={referralCode} referralLink={referralLink} />
        </div>

        {/* Your Code & QR */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Share2 className="h-5 w-5 text-amber-400" />
                Votre code & lien
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-zinc-800 rounded-xl p-5">
                <p className="text-xs text-zinc-400 mb-2">Votre code parrain</p>
                <p className="text-3xl font-black font-mono tracking-wider text-amber-400">{referralCode}</p>
              </div>
              <div className="bg-zinc-800 rounded-xl p-5">
                <p className="text-xs text-zinc-400 mb-2">Votre lien personnalisé</p>
                <p className="text-sm text-white font-mono break-all">{referralLink}</p>
              </div>
              <ShareButtons referralCode={referralCode} referralLink={referralLink} />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <QrCode className="h-5 w-5 text-emerald-400" />
                Votre QR Code
              </CardTitle>
            </CardHeader>
            <CardContent>
              <QRCodeGenerator referralLink={referralLink} referralCode={referralCode} />
            </CardContent>
          </Card>
        </div>

        {/* Social Media Templates */}
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-purple-400" />
              Templates Réseaux Sociaux
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              {socialTemplates.map((template, index) => (
                <div
                  key={index}
                  className="bg-zinc-800 rounded-xl p-5 border border-zinc-700 hover:border-purple-500/30 transition-all group cursor-pointer"
                >
                  <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${template.color} flex items-center justify-center mb-4`}>
                    <template.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-bold text-white mb-1">{template.platform}</h3>
                  <p className="text-xs text-zinc-400 mb-3">{template.description}</p>
                  <p className="text-xs text-zinc-500 mb-4">Format: {template.format}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-zinc-700 text-zinc-300 hover:border-purple-500/50 hover:text-purple-400 group-hover:border-purple-500/50"
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
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-400" />
              Templates Texte
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {textTemplates.map((template, index) => (
              <div
                key={index}
                className="bg-zinc-800 rounded-xl p-5 border border-zinc-700"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-white">{template.title}</h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                    onClick={() => {
                      // Client-side copy would need a client component
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copier
                  </Button>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed">{template.content}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Video Resources */}
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Video className="h-5 w-5 text-red-400" />
              Ressources Vidéo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-zinc-800 rounded-xl p-5 border border-zinc-700">
                <div className="aspect-video bg-zinc-700 rounded-lg mb-4 flex items-center justify-center">
                  <Video className="h-12 w-12 text-zinc-600" />
                </div>
                <h3 className="font-bold text-white mb-1">Présentation Teen Club</h3>
                <p className="text-xs text-zinc-400 mb-3">Vidéo de 30 secondes</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-zinc-700 text-zinc-300 hover:border-red-500/50 hover:text-red-400"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger
                </Button>
              </div>
              <div className="bg-zinc-800 rounded-xl p-5 border border-zinc-700">
                <div className="aspect-video bg-zinc-700 rounded-lg mb-4 flex items-center justify-center">
                  <Video className="h-12 w-12 text-zinc-600" />
                </div>
                <h3 className="font-bold text-white mb-1">Témoignages Parents</h3>
                <p className="text-xs text-zinc-400 mb-3">Vidéo de 45 secondes</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-zinc-700 text-zinc-300 hover:border-red-500/50 hover:text-red-400"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger
                </Button>
              </div>
              <div className="bg-zinc-800 rounded-xl p-5 border border-zinc-700">
                <div className="aspect-video bg-zinc-700 rounded-lg mb-4 flex items-center justify-center">
                  <Video className="h-12 w-12 text-zinc-600" />
                </div>
                <h3 className="font-bold text-white mb-1">Highlights Events</h3>
                <p className="text-xs text-zinc-400 mb-3">Vidéo de 60 secondes</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-zinc-700 text-zinc-300 hover:border-red-500/50 hover:text-red-400"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border-amber-500/20">
          <CardContent className="p-6">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-xl">💡</span> Conseils pour maximiser vos conversions
            </h3>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="p-4 bg-zinc-900/80 rounded-xl border border-zinc-800">
                <p className="font-bold text-white mb-1">Postez régulièrement</p>
                <p className="text-xs text-zinc-400">2-3 posts par semaine sur vos réseaux</p>
              </div>
              <div className="p-4 bg-zinc-900/80 rounded-xl border border-zinc-800">
                <p className="font-bold text-white mb-1">Utilisez les stories</p>
                <p className="text-xs text-zinc-400">Partagez des moments authentiques</p>
              </div>
              <div className="p-4 bg-zinc-900/80 rounded-xl border border-zinc-800">
                <p className="font-bold text-white mb-1">Personnalisez</p>
                <p className="text-xs text-zinc-400">Adaptez les messages à votre audience</p>
              </div>
              <div className="p-4 bg-zinc-900/80 rounded-xl border border-zinc-800">
                <p className="font-bold text-white mb-1">Ciblez les parents</p>
                <p className="text-xs text-zinc-400">Ce sont eux qui décident et paient</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
