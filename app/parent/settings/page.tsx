import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { StickerCard } from "@/components/ui/sticker-card"
import { Button } from "@/components/ui/button"
import { Niv, StatHero } from "@/components/brand"
import {
  User, Bell, Lock, CreditCard, FileText, Shield,
  ChevronRight, Crown, ArrowLeft, Receipt
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
  const teenCount = userInfo.parentData?.teenCount ?? 0

  const settingsSections = [
    {
      title: "Compte",
      items: [
        { label: "Modifier le profil", icon: User, href: "/parent/profile" },
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
  ]

  return (
    <div className="min-h-screen bg-background text-ink">
      <div className="container mx-auto px-6 pt-10 pb-20 sm:pt-16 max-w-3xl">
        <Button variant="ghost" asChild className="mb-6 text-mute hover:text-ink">
          <Link href="/parent">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        <div className="mb-8 flex items-center gap-4">
          <Niv size={72} mood="happy" />
          <div>
            <p className="eyebrow">Compte · Réglages</p>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-ink">
              Ton espace <em className="font-semibold italic text-pink">famille</em>
            </h1>
            <p className="text-mute mt-1">Gère ton compte Nivy et tes préférences</p>
          </div>
        </div>

        {/* Tier card — reads from parent_subscription_view via getUserRole */}
        <StatHero
          eyebrow="Abonnement Nivy"
          value={tier.label}
          tone={tierKey === "gold" ? "gold" : tierKey === "platinum" ? "teal" : "pink"}
          size="sm"
          icon={<Crown className="h-6 w-6" />}
          className="mb-8"
        >
          <p className="font-mono">
            {teenCount} teen{teenCount > 1 ? "s" : ""} lié{teenCount > 1 ? "s" : ""}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {tierKey === "free" && (
              <span className="rounded-md border-2 border-pink bg-pink px-2.5 py-1 font-mono text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink">
                Passe Premium
              </span>
            )}
            <Button asChild variant="pink" size="sm">
              <Link href="/carte-vip/souscrire">Gérer l'abonnement</Link>
            </Button>
          </div>
        </StatHero>

        <div className="space-y-6">
          {settingsSections.map((section) => (
            <StickerCard key={section.title} className="p-6">
              <p className="eyebrow mb-4">{section.title}</p>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex items-center justify-between rounded-xl p-3 transition-colors hover:bg-paper-2"
                  >
                    <div className="flex items-center gap-4">
                      <item.icon className="w-5 h-5 text-ink-2" />
                      <span className="font-medium text-ink-2">{item.label}</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-mute" />
                  </Link>
                ))}
              </div>
            </StickerCard>
          ))}
        </div>
      </div>
    </div>
  )
}
