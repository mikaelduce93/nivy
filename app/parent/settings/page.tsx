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
  free: { label: "Free", color: "text-zinc-300" },
  silver: { label: "Silver", color: "text-zinc-200" },
  gold: { label: "Gold", color: "text-amber-300" },
  platinum: { label: "Platinum", color: "text-cyan-300" },
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
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="container mx-auto px-6 py-32 max-w-3xl">
        <Button variant="ghost" asChild className="mb-6 text-zinc-400 hover:text-white">
          <Link href="/parent">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-black text-white">Paramètres</h1>
          <p className="text-zinc-400">Gérez votre compte Nivy et vos préférences</p>
        </div>

        {/* Tier card — reads from parent_subscription_view via getUserRole */}
        <Card className="mb-8 bg-gradient-to-br from-cyan-500/10 to-emerald-500/10 border-cyan-500/30">
          <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <Crown className={`h-6 w-6 ${tier.color}`} />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  Abonnement Nivy
                </p>
                <p className={`text-2xl font-black ${tier.color}`}>{tier.label}</p>
                <p className="text-xs text-zinc-500 mt-1">
                  {userInfo.parentData?.teenCount ?? 0} teen
                  {(userInfo.parentData?.teenCount ?? 0) > 1 ? "s" : ""} liés
                </p>
              </div>
            </div>
            <Button asChild className="bg-cyan-500 hover:bg-cyan-600 text-zinc-950 font-bold">
              <Link href="/carte-vip/souscrire">
                Gérer l'abonnement
              </Link>
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {settingsSections.map((section) => (
            <Card key={section.title} className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg text-white">{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {section.items.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex items-center justify-between p-4 rounded-xl hover:bg-zinc-800/60 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                        <item.icon className="w-5 h-5 text-emerald-400" />
                      </div>
                      <span className="font-medium text-zinc-200">{item.label}</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-500" />
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
