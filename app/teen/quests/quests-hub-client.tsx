"use client"

import { useEffect, useMemo } from "react"
import { Brain, Dumbbell, Palette, Zap, ArrowRight, Trophy, Users, Flame } from "lucide-react"
import { useRouter } from "next/navigation"
import { HubTabs, type HubTab } from "@/components/teen/hub-tabs"
import { DefiCard, type DefiCardProps } from "@/components/teen/defi-card"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivCoach, OrbitingTokens, StatHero } from "@/components/brand"
import type { UnifiedQuest } from "@/lib/server/unified-quest-engine"

// Map UnifiedQuest.status → DefiCard.status. UnifiedQuest has no "expired"
// or "locked" terminal states, so we only ever produce active/completed.
function mapQuestStatus(s: UnifiedQuest["status"]): DefiCardProps["status"] {
  if (s === "completed") return "completed"
  return "active"
}

// Pick a DefiCard.type cadence from the current hub tab. Daily tab maps
// directly; the other pillar tabs default to "weekly" since UnifiedQuest
// itself does not carry a daily/weekly/monthly/seasonal cadence field.
function pickDefiType(tab: string): DefiCardProps["type"] {
  return tab === "daily" ? "daily" : "weekly"
}
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { NivEmpty } from "@/components/brand"
import { TwinCurrencyGauge } from "@/components/teen/twin-currency-gauge"
import { useGamificationContext } from "@/components/gamification/gamification-provider"

interface QuestsHubClientProps {
  quests: UnifiedQuest[]
  dailyChallenges: any[]
  xpData: { total_xp: number; level: number }
  coinsBalance?: number
  teenId: string
}

// #208 — chaque quête unifiée route vers sa VRAIE destination. La page détail
// /teen/quests/[id] interrogeait des tables inexistantes (`quests`,
// `daily_challenges`) → 404 systématique. On route par type vers l'écran réel.
// D1 (audit 2026-07-11) — les quêtes quotidiennes (user_challenges, onglet
// « Quotidien ») étaient mappées `type: "challenge"` et atterrissaient sur
// /teen/defis-physiques (liste physical_challenges sans rapport). Leur vraie
// surface de complétion (formulaires de validation + crédit XP via
// completeChallenge) est /daily : on les distingue via metadata.source.
function questTarget(quest: Pick<UnifiedQuest, "type" | "id" | "metadata">): string {
  if (quest.metadata?.source === "daily_challenge") return "/daily"
  switch (quest.type) {
    case "quiz":
      return `/teen/quiz/${quest.id}`
    case "challenge":
      return "/teen/defis-physiques"
    case "passion":
      return "/teen/passions"
    case "event":
      return "/teen/events"
    default:
      return "/teen/quests"
  }
}

const QUEST_TABS: HubTab[] = [
  { id: "daily", label: "Quotidien", icon: Zap },
  { id: "brain", label: "Cerveau", icon: Brain },
  { id: "body", label: "Corps", icon: Dumbbell },
  { id: "creative", label: "Créa", icon: Palette },
  // TICKET-020 — friend-défis tab. Selecting this tab navigates to the
  // dedicated /teen/quests/friend-defis route (see effect below). The tab
  // sits beside the four pillar tabs so it stays discoverable while the
  // detailed list / accept-decline UI lives on its own page.
  { id: "friends", label: "Défis amis", icon: Users },
]

// Pastels charte par pilier (token économique dédié). Plus aucun
// gradient/glow : la bannière pilier est une StickerCard à ombre dure.
const PILLAR_CONFIG = {
  daily: {
    title: "Quêtes du jour",
    subtitle: "Boucle-les pour un bonus d'XP",
    accent: "text-gold",
  },
  brain: {
    title: "Défis cerveau",
    subtitle: "Quiz, énigmes et quêtes scolaires",
    accent: "text-teal",
  },
  body: {
    title: "Défis corps",
    subtitle: "Activités physiques et sport",
    accent: "text-coral",
  },
  creative: {
    title: "Quêtes créa",
    subtitle: "Art, musique, projets passion",
    accent: "text-lime",
  },
}

export function QuestsHubClient({ quests, dailyChallenges, xpData, coinsBalance = 0, teenId }: QuestsHubClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const currentTab = searchParams.get("tab") || "daily"
  // Friction 2 (audit 2026-07-11) — la vraie streak vient du provider monté
  // dans le layout teen (user_streaks temps réel), pas du nombre de quêtes
  // faites sur l'onglet courant.
  const { streak } = useGamificationContext()
  const currentStreak = streak?.current_streak ?? 0

  // TICKET-020 — when the "friends" tab becomes active on this hub,
  // redirect to the dedicated friend-défis page. We keep the tab visible
  // here (it stays selected on the friend-défis page since HubTabs reads
  // the same `?tab=friends` query string) so users can still toggle back.
  useEffect(() => {
    if (currentTab === "friends") {
      router.push("/teen/quests/friend-defis?tab=friends")
    }
  }, [currentTab, router])

  // Filter quests by pillar/type
  const filteredQuests = useMemo(() => {
    switch (currentTab) {
      case "daily":
        // Return daily challenges or first few quests
        return dailyChallenges.length > 0
          ? dailyChallenges.map((c: any): UnifiedQuest => ({
              id: c.id,
              type: "challenge" as const,
              title: c.challenge?.title || "Quête du jour",
              description: c.challenge?.description || "",
              xp_reward: c.challenge?.xp_reward || 50,
              pillar: "vitality" as const,
              status: c.status,
              // D1 — marqueur local : cette carte est un user_challenges
              // (engine 1), sa surface de complétion est /daily, pas
              // /teen/defis-physiques (cf. questTarget).
              metadata: { source: "daily_challenge" },
            }))
          : quests.slice(0, 6)
      case "brain":
        return quests.filter(q => q.pillar === "intellect" || q.type === "quiz")
      case "body":
        return quests.filter(q => q.pillar === "vitality" || q.type === "challenge")
      case "creative":
        return quests.filter(q => q.pillar === "creativity" || q.type === "passion")
      default:
        return quests
    }
  }, [currentTab, quests, dailyChallenges])

  const config = PILLAR_CONFIG[currentTab as keyof typeof PILLAR_CONFIG] || PILLAR_CONFIG.daily

  // Stats for current pillar
  const completedCount = filteredQuests.filter(q => q.status === "completed").length
  const totalXpAvailable = filteredQuests.reduce((sum, q) => sum + (q.xp_reward || 0), 0)

  return (
    <div className="space-y-8 pt-6">
      {/* Header éditorial + Niv coach */}
      <header className="space-y-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <span className="eyebrow tracking-[0.16em] text-pink">Ton crew · Défis</span>
            <h1 className="font-display text-4xl font-extrabold leading-[0.95] tracking-tight text-ink sm:text-5xl">
              Tes <em className="font-semibold italic text-pink">quêtes</em>
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-white px-3 py-1 font-mono text-xs font-bold text-ink shadow-stkr-sm">
                {completedCount} faites
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-white px-3 py-1 font-mono text-xs font-bold text-gold shadow-stkr-sm">
                {totalXpAvailable} XP à gagner
              </span>
            </div>
          </div>

          {/* Niv coach — pose hype + tokens orbitants XP / streak / niveau / coins */}
          <div className="flex flex-col items-center gap-4">
            <OrbitingTokens
              xp={(xpData.total_xp || 0).toLocaleString("fr-FR")}
              coins={coinsBalance.toLocaleString("fr-FR")}
              level={xpData.level || 1}
              streak={currentStreak}
              nivMood="hype"
              size={240}
            />
            <NivCoach
              mood="hype"
              message="Yallah, enchaîne tes quêtes et fais grimper ton XP !"
              className="max-w-xs"
            />
          </div>
        </div>

        {/*
          Twin-currency gauge (full) — îlot sombre en tête de hub : garde les
          deux monnaies visibles pendant que l'ado parcourt les quêtes pour que
          la distinction XP/coins reste claire (whitepaper §5).
        */}
        <TwinCurrencyGauge
          xp={xpData.total_xp || 0}
          level={xpData.level || 1}
          coins={coinsBalance}
          variant="full"
        />

        {/* Tabs */}
        <HubTabs tabs={QUEST_TABS} defaultTab="daily" />
      </header>

      {/* Bannière pilier — StickerCard + chiffre hero */}
      <StickerCard className="p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink">
              {config.title}
            </h2>
            <p className="mt-1 text-mute">{config.subtitle}</p>
          </div>

          <StatHero
            eyebrow="Disponibles"
            value={filteredQuests.length}
            tone="pink"
            size="sm"
            className="w-full sm:w-44"
          />
        </div>
      </StickerCard>

      {/* Quest Grid */}
      {filteredQuests.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredQuests.map((quest) => {
            const target = questTarget(quest)
            return (
              <DefiCard
                key={quest.id}
                type={pickDefiType(currentTab)}
                title={quest.title}
                description={quest.description}
                xpReward={quest.xp_reward}
                status={mapQuestStatus(quest.status)}
                href={target}
                ctaHref={target}
                ctaLabel={quest.status === "completed" ? "Terminé" : quest.status === "in_progress" ? "Continuer" : "Commencer"}
                imageUrl={quest.image_url}
                morphId={`vt-quest-${quest.id}`}
              />
            )
          })}
        </div>
      ) : (
        <EmptyState tab={currentTab} />
      )}

      {/* Actions rapides — StickerCard FR */}
      <div className="grid grid-cols-1 gap-6 border-t-2 border-ink pt-8 md:grid-cols-2">
        <QuickActionCard
          icon={Brain}
          title="Joue à un quiz"
          description="Teste tes connaissances et gagne de l'XP"
          href="/teen/quiz"
        />
        <QuickActionCard
          icon={Trophy}
          title="Défie un ami"
          description="Lance une quête compétitive avec ton crew"
          href="/teen/quests/friend-defis/new"
        />
        {/* Friction 6 (audit 2026-07-11) — seul lien vers /teen/streak = header
            desktop (hidden md:flex). Ce hub est un pilier de la nav mobile :
            point d'entrée streak accessible sur téléphone. */}
        <QuickActionCard
          icon={Flame}
          title="Ta streak"
          description={`${currentStreak} jour${currentStreak > 1 ? "s" : ""} d'affilée — entretiens la flamme`}
          href="/teen/streak"
        />
      </div>
    </div>
  )
}

function EmptyState({ tab }: { tab: string }) {
  // Per-tab messaging — Niv pose calm sur les listes vides.
  const messages: Record<string, { title: string; desc: string }> = {
    daily: {
      title: "Aucune quête quotidienne",
      desc: "Reviens demain pour de nouvelles quêtes ! Le compteur reset à minuit.",
    },
    brain: {
      title: "Aucun challenge cerveau",
      desc: "L'IA prépare de nouveaux quiz pour toi…",
    },
    body: {
      title: "Aucun challenge physique",
      desc: "De nouveaux défis sportifs arrivent bientôt.",
    },
    creative: {
      title: "Aucune quête créative",
      desc: "Exprime-toi via tes projets passion !",
    },
  }

  const msg = messages[tab] || messages.daily

  return <NivEmpty mood="calm" title={msg.title} description={msg.desc} />
}

function QuickActionCard({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: any
  title: string
  description: string
  href: string
}) {
  return (
    <Link href={href} className="block">
      <StickerCard variant="hover" className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-ink bg-white">
              <Icon className="h-6 w-6 text-ink" />
            </div>
            <div>
              <h4 className="font-display font-bold text-ink">{title}</h4>
              <p className="text-sm text-mute">{description}</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-pink" />
        </div>
      </StickerCard>
    </Link>
  )
}
