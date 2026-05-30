import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  User, Bell, Lock, CreditCard, FileText, Shield,
  ChevronRight, Globe, Crown, ArrowLeft, Receipt
} from "lucide-react"
import Link from "next/link"

// Canonical Nivy tier labels (Wave alpha — see migration 063 + whitepaper §10).
// `parent_subscription_view` returns lowercase keys; we render display labels.
const TIER_LABELS: Record<string, { label: string; color: string }> = {
  free: { label: "Free", color: "text-ink-2" },
  silver: { label: "Silver", color: "text-ink-2" },
  gold: { label: "Gold", color: "text-gold" },
  platinum: { label: "Platinum", color: "text-teal" },
}

export default async function ParentSettingsPage() {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "parent") {
    redirect("/auth/redirect")
  }

  const tierKey = (userInfo.parentData?.subscriptionTier || "free").toLowerCase()
  const tier = TIER_LABELS[tierKey] ?? TIER_LABELS.free

  const settingsSections = [
    {
      title: "Compte",
      items: [
        { label: "Modifier le profil", icon: User, href: "/profile/modifier" },
        { label: "Notifications", icon: Bell, href: "/parent/notifications" },
        { label: "Confidentialité & sécurité", icon: Lock, href: "/parent/e-signature" },
      ]
    },
    {
      title: "Famille",
      items: [
        { label: "Mes teens", icon: Shield, href: "/parent/teens" },
        { label: "Limites de budget", icon: CreditCard, href: "/parent/budget" },
        { label: "Documents & autorisations", icon: FileText, href: "/parent/documents" },
        { label: "Approbations", icon: Receipt, href: "/parent/approvals" },
      ]
    },
    {
      title: "Préférences",
      items: [
        { label: "Langue", icon: Globe, href: "#" },
      ]
    },
  ]

  return (
    <div className="min-h-screen bg-background text-ink">
      <div className="container mx-auto px-6 py-32 max-w-3xl">
        <Button variant="ghost" asChild className="mb-6 text-mute hover:text-ink">
          <Link href="/parent">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-black text-ink">Paramètres</h1>
          <p className="text-mute">Gérez votre compte Nivy et vos préférences</p>
        </div>

        {/* Tier card — reads from parent_subscription_view via getUserRole */}
        <Card className="mb-8 bg-gradient-to-br from-teal/10 to-lime/10 border-teal/30">
          <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-teal/20 flex items-center justify-center">
                <Crown className={`h-6 w-6 ${tier.color}`} />
              </div>
              <div>
                <p className="text-xs font-bold text-mute uppercase tracking-widest">
                  Abonnement Nivy
                </p>
                <p className={`text-2xl font-black ${tier.color}`}>{tier.label}</p>
                <p className="text-xs text-mute mt-1">
                  {userInfo.parentData?.teenCount ?? 0} teen
                  {(userInfo.parentData?.teenCount ?? 0) > 1 ? "s" : ""} liés
                </p>
              </div>
            </div>
            <Button asChild className="bg-teal hover:bg-teal text-ink font-bold">
              <Link href="/carte-vip/souscrire">
                Gérer l'abonnement
              </Link>
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {settingsSections.map((section) => (
            <Card key={section.title} className="bg-card border-ink">
              <CardHeader>
                <CardTitle className="text-lg text-ink">{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {section.items.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex items-center justify-between p-4 rounded-xl hover:bg-card transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-lime/10 flex items-center justify-center">
                        <item.icon className="w-5 h-5 text-lime" />
                      </div>
                      <span className="font-medium text-ink-2">{item.label}</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-mute" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
