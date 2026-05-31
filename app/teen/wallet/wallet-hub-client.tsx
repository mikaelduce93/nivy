"use client"

import { useState, useEffect, useTransition } from "react"
import Link from "next/link"
import { Coins, ShoppingBag, Award, Crown, Zap, Flame, TrendingUp, Gift, Sparkles, Loader2, PiggyBank, Receipt } from "lucide-react"
import { HubTabs, type HubTab } from "@/components/teen/hub-tabs"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useSearchParams } from "next/navigation"
import { SegmentedProgress } from "@/components/ui/progress"
import { toast } from "sonner"
import { purchaseReward } from "@/gamification-system/features/shop/actions"
import { TwinCurrencyGauge } from "@/components/teen/twin-currency-gauge"
import { StickerCard } from "@/components/ui/sticker-card"
import { StickerTabs } from "@/components/brand/sticker-tab"
import { NivCoach, NivEmpty, DarkSurface, StatHero } from "@/components/brand"

interface ShopReward {
  reward_id: string
  name: string
  description: string
  xp_cost: number
  icon: string
  image_url: string | null
  category_slug: string | null
  category_name: string | null
  is_featured: boolean
  is_new: boolean
  can_purchase: boolean
}

interface WalletHubClientProps {
  teenId: string
  walletData: {
    xp: {
      total: number
      level: number
      progressPercent: number
      xpToNextLevel?: number
      xpInLevel?: number
    }
    streak: number
    coins: number
    /** Coins minus locked savings goals (whitepaper §5 — savings = locked balance). */
    spendableCoins?: number
    /** Cashback XP earned in the last 7 days (W3.1 — twin-currency gauge metric). */
    cashbackThisWeek?: number
    shopHighlights: any
    rewards?: ShopReward[]
    categories?: Array<{ id: string; slug: string; name: string }>
    currency?: { xpToDhRate: number; xpValueDH: number }
  }
}

const WALLET_TABS: HubTab[] = [
  { id: "coins", label: "Coins", icon: Coins },
  { id: "shop", label: "Boutique", icon: ShoppingBag },
  { id: "badges", label: "Badges", icon: Award },
]

export function WalletHubClient({ teenId, walletData }: WalletHubClientProps) {
  const searchParams = useSearchParams()
  const currentTab = searchParams.get("tab") || "coins"

  return (
    <div className="space-y-8 pt-6">
      {/* Header */}
      <header className="space-y-6">
        <div className="space-y-1">
          <span className="eyebrow tracking-[0.16em] text-mute">Ton argent</span>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">
            Ton <em className="font-semibold italic text-pink">wallet</em>
          </h1>
          <p className="text-sm text-mute">Tes coins, tes badges et ta boutique au même endroit.</p>
        </div>

        {/*
          Twin-currency gauge — replaces the prior 3-pill display.
          XP and Coins are different currencies (whitepaper §5 / §29 #1: no
          convert). Rendered as the canonical wallet header surface.
        */}
        <TwinCurrencyGauge
          xp={walletData.xp.total}
          level={walletData.xp.level}
          xpToNextLevel={walletData.xp.xpToNextLevel}
          xpInLevel={walletData.xp.xpInLevel}
          coins={walletData.coins}
          spendableCoins={walletData.spendableCoins}
          variant="full"
        />

        {/* #206 — règle devise tranchée : on NE présente plus l'XP avec une
            « valeur en DH » (la bannière « 10 XP = 1 DH de remise » laissait
            croire que l'XP est de l'argent). Les XP achètent des récompenses,
            affichées en XP nus. Modèle expliqué sur la page Mes XP. */}
        <p className="text-xs text-mute">
          Tes XP débloquent des récompenses exclusives.{" "}
          <a href="/teen/xp-value" className="underline hover:text-ink-2">
            Comment ça marche
          </a>
        </p>

        {/* Tabs (VIP routé vers /teen/vip-card, canon VIP) */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <HubTabs tabs={WALLET_TABS} defaultTab="coins" />
          {/* #206 — accès aux surfaces économie absorbées par le hub Wallet :
              Épargne (savings) et Historique/codes de retrait (shop/history). */}
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/teen/savings">
              <Button variant="outline" size="sm">
                <PiggyBank className="w-4 h-4" />
                Épargne
              </Button>
            </Link>
            <Link href="/teen/shop/history">
              <Button variant="outline" size="sm">
                <Receipt className="w-4 h-4" />
                Historique
              </Button>
            </Link>
            <Link href="/teen/vip-card">
              <Button variant="outline" size="sm">
                <Crown className="w-4 h-4" />
                Carte VIP
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Tab Content */}
      <div>
        {currentTab === "coins" && <CoinsTab walletData={walletData} teenId={teenId} />}
        {currentTab === "shop" && <ShopTab walletData={walletData} teenId={teenId} />}
        {currentTab === "badges" && <BadgesTab teenId={teenId} />}
      </div>
    </div>
  )
}

function CoinsTab({ walletData, teenId }: { walletData: any; teenId?: string }) {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loadingTx, setLoadingTx] = useState(true)

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch('/api/teen/wallet')
        if (response.ok) {
          const data = await response.json()
          setTransactions(data.transactions || [])
        }
      } catch (error) {
        console.error('Failed to fetch wallet data:', error)
      } finally {
        setLoadingTx(false)
      }
    }
    fetchTransactions()
  }, [teenId])

  // Level progress en jauge segmentée (10 segments = 0→100 %).
  const levelSegments = 10
  const levelCurrent = Math.min(
    levelSegments,
    Math.round((walletData.xp.progressPercent / 100) * levelSegments),
  )

  return (
    <div className="space-y-8">
      {/* Solde — surface sombre ponctuelle (F2) + Niv pose proud */}
      <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <StatHero
          eyebrow="Solde total"
          tone="coral"
          size="lg"
          value={walletData.coins.toLocaleString()}
          unit="⊙ coins"
          icon={<Coins className="w-5 h-5" />}
        />
        <NivCoach
          mood="proud"
          message="Ton solde grossit à chaque quête. Garde le cap, je suis fier de toi !"
        />
      </div>

      {/* Quick-stats — mini-cartes sticker, chaque chiffre son token charte. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StickerCard variant="panel" className="p-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-gold" />
            <span className="font-display text-xl font-extrabold tabular-nums text-ink">
              {walletData.xp.total.toLocaleString()}
            </span>
          </div>
          <p className="eyebrow mt-1 tracking-[0.14em] text-mute">XP total</p>
        </StickerCard>
        <StickerCard variant="panel" className="p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-lime" />
            <span className="font-display text-xl font-extrabold tabular-nums text-ink">
              +{(walletData.cashbackThisWeek ?? 0).toLocaleString()}
            </span>
          </div>
          <p className="eyebrow mt-1 tracking-[0.14em] text-mute">Cashback 7j</p>
        </StickerCard>
        <StickerCard variant="panel" className="p-4">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-pink" />
            <span className="font-display text-xl font-extrabold tabular-nums text-ink">
              {walletData.streak}
            </span>
          </div>
          <p className="eyebrow mt-1 tracking-[0.14em] text-mute">Streak</p>
        </StickerCard>
        <StickerCard variant="panel" className="p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-teal" />
            <span className="font-display text-xl font-extrabold tabular-nums text-ink">
              Niv. {walletData.xp.level}
            </span>
          </div>
          <p className="eyebrow mt-1 tracking-[0.14em] text-mute">Niveau</p>
        </StickerCard>
      </div>

      {/* Progression niveau — jauge segmentée (F5) */}
      <StickerCard variant="default" className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-ink">Progression niveau</h3>
          <span className="font-mono text-sm font-bold tabular-nums text-teal">
            Niveau {walletData.xp.level + 1}
          </span>
        </div>
        <SegmentedProgress steps={levelSegments} current={levelCurrent} size="md" />
        <p className="font-mono text-xs tabular-nums text-mute mt-2">
          {walletData.xp.progressPercent}% vers le prochain niveau
        </p>
      </StickerCard>

      {/* Activité récente */}
      <div className="space-y-4">
        <h3 className="font-display text-lg font-bold text-ink">Activité récente</h3>
        {loadingTx ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-coral" />
          </div>
        ) : transactions.length === 0 ? (
          <NivEmpty
            mood="calm"
            title={walletData.coins === 0 ? "Pas encore de coins" : "Pas encore de transactions"}
            description={
              walletData.coins === 0
                ? "Lance une quête pour gagner tes premiers coins."
                : "Tes prochaines récompenses apparaîtront ici."
            }
            action={
              walletData.coins === 0 ? (
                <Link href="/teen/quests">
                  <Button variant="pink" size="sm">Voir les quêtes</Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          transactions.map((tx, idx) => (
            <StickerCard key={tx.id || idx} variant="panel" className="p-4">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-xl border-2 border-ink flex items-center justify-center",
                  tx.type === "earned" ? "bg-lime/20" : "bg-coral/20"
                )}>
                  {tx.type === "earned" ? (
                    <TrendingUp className="w-5 h-5 text-lime" />
                  ) : (
                    <ShoppingBag className="w-5 h-5 text-coral" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink truncate">{tx.reason}</p>
                  <p className="font-mono text-xs text-mute">{tx.time}</p>
                </div>
                <span className={cn(
                  "font-display font-extrabold tabular-nums",
                  tx.type === "earned" ? "text-lime" : "text-coral"
                )}>
                  {tx.type === "earned" ? "+" : ""}{tx.amount}
                </span>
              </div>
            </StickerCard>
          ))
        )}
      </div>
    </div>
  )
}

function ShopTab({
  walletData,
  teenId,
}: {
  walletData: WalletHubClientProps["walletData"]
  teenId?: string
}) {
  // Canonical shop data — server-fetched via getRewards() (reward_categories + RPC get_shop_rewards)
  const [rewards, setRewards] = useState<ShopReward[]>(walletData.rewards || [])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const userXP = walletData.xp.total
  const categories = walletData.categories || []
  const featured = rewards.find((r) => r.is_featured) || null
  const filteredRewards = activeCategory
    ? rewards.filter((r) => r.category_slug === activeCategory)
    : rewards.filter((r) => !r.is_featured)

  const handlePurchase = (reward: ShopReward) => {
    if (pendingId) return
    if (userXP < reward.xp_cost) {
      toast.error(
        `Il te manque ${(reward.xp_cost - userXP).toLocaleString()} XP pour ${reward.name}.`
      )
      return
    }
    setPendingId(reward.reward_id)
    startTransition(async () => {
      try {
        // Canonical purchase path: server action -> RPC purchase_reward
        // (debits XP, records purchase, applies promo). The hybrid /api/payments/hybrid
        // route is reserved for booking checkout (XP + Stripe/CMI/Mobile Money) — pure
        // XP redemption stays on the single-currency rail. See docs/economy.md.
        const result = await purchaseReward({ rewardId: reward.reward_id })
        if (result.success) {
          toast.success(`${reward.name} ajouté à ton inventaire !`)
          // Optimistically remove the purchased reward from the affordable grid
          setRewards((prev) =>
            prev.map((r) =>
              r.reward_id === reward.reward_id ? { ...r, can_purchase: false } : r
            )
          )
        } else {
          toast.error(result.error || "Achat impossible")
        }
      } catch (err) {
        console.error("[wallet/shop] purchase failed", err)
        toast.error("Erreur lors de l'achat")
      } finally {
        setPendingId(null)
      }
    })
  }

  // #206 — prix en XP nus (plus de « ≈ DH » : l'XP n'a pas de valeur en argent).
  const renderPriceTag = (xpCost: number) => {
    return (
      <div className="flex items-center gap-1">
        <Zap className="w-4 h-4 text-gold" />
        <span className="font-display font-extrabold tabular-nums text-gold">
          {xpCost.toLocaleString()} XP
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Coach Niv — entrée d'onglet */}
      <NivCoach
        mood="happy"
        message="Tes XP, tu les dépenses ici. Vise un item, je te dis s'il est à ta portée !"
      />

      {/* Affordability banner */}
      <StickerCard variant="panel" className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="text-sm text-ink-2">
            Tu as{" "}
            <span className="font-mono font-bold tabular-nums text-gold">
              {userXP.toLocaleString()} XP
            </span>{" "}
            à dépenser.
          </div>
          <div className="font-mono text-xs uppercase tracking-wider text-mute">
            {rewards.filter((r) => r.xp_cost <= userXP).length} item(s) accessible(s)
          </div>
        </div>
      </StickerCard>

      {/* Category filters */}
      {categories.length > 0 && (
        <StickerTabs
          ariaLabel="Filtres catégories"
          value={activeCategory ?? "__all__"}
          onValueChange={(v) => setActiveCategory(v === "__all__" ? null : v)}
          tabs={[
            { value: "__all__", label: "Tous" },
            ...categories.map((cat) => ({ value: cat.slug, label: cat.name })),
          ]}
        />
      )}

      {/* En vedette — surface sombre ponctuelle */}
      {featured && !activeCategory && (
        <DarkSurface tone="pink" shadow className="p-6 sm:p-8">
          <span className="eyebrow tracking-[0.16em] text-paper/60">En vedette</span>
          <div className="mt-3 flex items-center gap-6 flex-wrap">
            <div className="w-24 h-24 rounded-2xl border-2 border-paper/30 flex items-center justify-center">
              <Gift className="w-10 h-10 text-pink" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <h3 className="font-display text-2xl font-extrabold text-paper">
                {featured.name}
              </h3>
              <p className="text-paper/70 mt-1">{featured.description}</p>
              <div className="flex items-baseline gap-2 mt-4">
                <Zap className="w-5 h-5 self-center text-gold" />
                <span className="font-display text-xl font-extrabold tabular-nums text-gold">
                  {featured.xp_cost.toLocaleString()} XP
                </span>
              </div>
            </div>
            <Button
              variant="pink"
              disabled={
                !featured.can_purchase ||
                userXP < featured.xp_cost ||
                pendingId === featured.reward_id
              }
              onClick={() => handlePurchase(featured)}
            >
              {pendingId === featured.reward_id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : userXP >= featured.xp_cost ? (
                "Acheter"
              ) : (
                "XP insuffisants"
              )}
            </Button>
          </div>
        </DarkSurface>
      )}

      {/* Items Grid */}
      {filteredRewards.length === 0 ? (
        <NivEmpty
          mood="calm"
          title="Aucun item disponible"
          description="De nouveaux items arriveront bientôt !"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredRewards.map((item) => {
            const canAfford = userXP >= item.xp_cost
            const isPending = pendingId === item.reward_id
            return (
              <StickerCard
                key={item.reward_id}
                variant={canAfford ? "hover" : "default"}
                className={cn("p-5", !canAfford && "opacity-70")}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-14 h-14 rounded-2xl border-2 border-ink bg-paper-2 flex items-center justify-center">
                    <Gift className="w-7 h-7 text-pink" />
                  </div>
                  {renderPriceTag(item.xp_cost)}
                </div>
                <h4 className="font-display font-bold text-ink">{item.name}</h4>
                {item.category_name && (
                  <p className="font-mono text-[10px] uppercase tracking-wider text-mute mt-0.5">
                    {item.category_name}
                  </p>
                )}
                {item.description && (
                  <p className="text-xs text-mute mt-2 line-clamp-2 flex-1">
                    {item.description}
                  </p>
                )}
                <Button
                  size="sm"
                  variant="pink"
                  className="mt-4 w-full"
                  disabled={!item.can_purchase || !canAfford || isPending}
                  onClick={() => handlePurchase(item)}
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : !item.can_purchase ? (
                    "Indisponible"
                  ) : canAfford ? (
                    "Acheter"
                  ) : (
                    `Manque ${(item.xp_cost - userXP).toLocaleString()} XP`
                  )}
                </Button>
              </StickerCard>
            )
          })}
        </div>
      )}
    </div>
  )
}

function BadgesTab({ teenId }: { teenId?: string }) {
  const [badges, setBadges] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const response = await fetch('/api/teen/wallet')
        if (response.ok) {
          const data = await response.json()
          setBadges(data.badges || [])
        }
      } catch (error) {
        console.error('Failed to fetch badges:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchBadges()
  }, [teenId])

  // Vrais badges débloqués uniquement (les placeholders fictifs ont été retirés).
  const unlockedBadges = badges

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-coral" />
      </div>
    )
  }

  if (unlockedBadges.length === 0) {
    return (
      <NivEmpty
        mood="calm"
        title="Pas encore de badge"
        description="Continue tes quêtes et ton crew t'attend — tes badges débloqués apparaîtront ici."
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs font-bold uppercase tracking-[0.14em] rounded-full border-2 border-ink bg-lime px-3 py-1 text-on-bright">
          {unlockedBadges.length} débloqué{unlockedBadges.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* Badges Grid — vrais badges en cartes sticker */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {unlockedBadges.map((badge, idx) => (
          <StickerCard
            key={badge.id || idx}
            variant="default"
            className="items-center p-6 text-center"
          >
            <div className="text-5xl mb-4">{badge.icon || "🏆"}</div>
            <h4 className="font-display font-bold text-ink">{badge.name}</h4>
            {badge.rarity && (
              <p className="eyebrow mt-1 tracking-[0.14em] text-mute">{badge.rarity}</p>
            )}
          </StickerCard>
        ))}
      </div>
    </div>
  )
}
