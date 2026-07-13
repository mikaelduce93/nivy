"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Coins, ShoppingBag, Crown, Zap, Flame, TrendingUp, Gift, Sparkles, Loader2, PiggyBank, Receipt, QrCode, Award, Lock } from "lucide-react"
import { HubTabs, type HubTab } from "@/components/teen/hub-tabs"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { useSearchParams } from "next/navigation"
import { SegmentedProgress } from "@/components/ui/progress"
import { unlockLevelForXpCost } from "@/lib/gamification/level-curve"
import type { UserPurchase } from "@/gamification-system/features/shop/schema"
import { TwinCurrencyGauge } from "@/components/teen/twin-currency-gauge"
import { StickerCard } from "@/components/ui/sticker-card"
import { StickerTabs } from "@/components/brand/sticker-tab"
import { NivCoach, NivEmpty, DarkSurface, StatHero } from "@/components/brand"

interface SavingsGoal {
  id: string
  title: string
  description: string | null
  current_saved_coins: number
  target_coins: number
  status: string
  parent_match_pct: number
}

interface ShopReward {
  reward_id: string
  name: string
  description: string
  xp_cost: number
  icon: string
  image_url: string | null
  category_slug: string | null
  category_name: string | null
  /** Type canonique (get_shop_rewards) — départage déblocage niveau vs coins. */
  reward_type: string
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
    /** Onglet Épargne — vue user_coins_spendable (source unique) + objectifs. */
    savings?: {
      spendable: number
      total: number
      locked: number
      goals: SavingsGoal[]
    }
    /** Onglet Historique — achats canoniques (user_purchases via RPC). */
    purchases?: UserPurchase[]
    /** Onglet Badges — achievements + progression (get_user_achievements). */
    achievements?: Array<{
      id?: string
      code?: string
      name: string
      description?: string
      icon?: string | null
      rarity?: string
      xp_reward?: number
      is_unlocked?: boolean
    }>
  }
}

const WALLET_TABS: HubTab[] = [
  { id: "coins", label: "Solde", icon: Coins },
  { id: "shop", label: "Boutique", icon: ShoppingBag },
  { id: "badges", label: "Badges", icon: Award },
  { id: "savings", label: "Épargne", icon: PiggyBank },
  { id: "history", label: "Historique", icon: Receipt },
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
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-ink">
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

        {/* G2-A (décision PO 2026-07-11) — XP = progression pure, jamais
            dépensé. Les récompenses de la boutique se DÉBLOQUENT par niveau ;
            seuls les coins ⊙ (argent de poche) s'échangent contre des services. */}
        <p className="text-xs text-mute">
          Tes XP font monter ton niveau, et ton niveau débloque des récompenses — ils ne se
          dépensent jamais.{" "}
          <a href="/teen/xp-value" className="underline hover:text-ink-2">
            Comment ça marche
          </a>
        </p>

        {/* Tabs (VIP routé vers /teen/vip-card, canon VIP) */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* #206 — Épargne et Historique sont désormais des onglets in-page. */}
          <HubTabs tabs={WALLET_TABS} defaultTab="coins" />
          <Link href="/teen/vip-card">
            <Button variant="outline" size="sm">
              <Crown className="w-4 h-4" />
              Carte VIP
            </Button>
          </Link>
        </div>
      </header>

      {/* Tab Content */}
      <div>
        {currentTab === "coins" && <CoinsTab walletData={walletData} teenId={teenId} />}
        {currentTab === "shop" && <ShopTab walletData={walletData} />}
        {currentTab === "badges" && <BadgesTab walletData={walletData} />}
        {currentTab === "savings" && <SavingsTab walletData={walletData} teenId={teenId} />}
        {currentTab === "history" && <HistoryTab walletData={walletData} />}
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
        {/* G2-A — messaging devise honnête : les coins ⊙ = argent de poche
            (alimenté par le parent + cashback), PAS une récompense de quête.
            Les quêtes rapportent de l'XP (progression), jamais des coins. */}
        <NivCoach
          mood="proud"
          message="Ces coins ⊙, c'est ton argent de poche : tes parents l'alimentent, et tu le dépenses dans les services. Ton XP, lui, ne se dépense jamais — il raconte ta progression."
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
                ? "Les coins ⊙ arrivent quand tes parents alimentent ton wallet (et en cashback sur tes sorties) — pas via les quêtes, qui rapportent de l'XP."
                : "Tes prochains mouvements apparaîtront ici."
            }
            action={
              walletData.coins === 0 ? (
                <Link href="/teen/services">
                  <Button variant="pink" size="sm">Découvrir les services</Button>
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

/* ==========================================================================
   G2-A (décision PO 2026-07-11) — « XP = progression pure, jamais dépensé ».
   La boutique ne débite PLUS d'XP (l'ancien flux purchaseReward → RPC
   purchase_reward est débranché de cette surface) :
   - Récompenses virtuelles (personnalisation, digital, multiplicateur) →
     DÉBLOCAGES PAR NIVEAU. N = unlockLevelForXpCost(xp_cost) (courbe UI,
     arrondi au niveau supérieur), état verrouillé/débloqué selon le niveau
     réel de l'ado.
   - Récompenses à valeur réelle (entrées, pass VIP, goodies physiques,
     réductions, expériences, mystery box…) → PAS de prix en coins ici (la
     tarification coins est un arbitrage PO en attente) : affichées
     honnêtement « Bientôt en coins ».
   ========================================================================== */
const VIRTUAL_REWARD_TYPES = new Set(["profile_customization", "digital_item", "xp_multiplier"])

function ShopTab({ walletData }: { walletData: WalletHubClientProps["walletData"] }) {
  // Canonical shop data — server-fetched via getRewards() (reward_categories + RPC get_shop_rewards)
  const rewards = walletData.rewards || []
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const userLevel = walletData.xp.level
  const categories = walletData.categories || []
  const featured = rewards.find((r) => r.is_featured) || null
  const filteredRewards = activeCategory
    ? rewards.filter((r) => r.category_slug === activeCategory)
    : rewards.filter((r) => !r.is_featured)

  const isLevelUnlock = (r: ShopReward) => VIRTUAL_REWARD_TYPES.has(r.reward_type)
  const isUnlocked = (r: ShopReward) =>
    isLevelUnlock(r) && userLevel >= unlockLevelForXpCost(r.xp_cost)
  const unlockedCount = rewards.filter(isUnlocked).length

  // Tag de statut d'un reward — remplace l'ancien prix en XP.
  const renderStatusTag = (item: ShopReward, onDark = false) => {
    if (!isLevelUnlock(item)) {
      return (
        <span
          className={cn(
            "flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider",
            onDark ? "text-paper/60" : "text-mute"
          )}
        >
          <Coins className="w-3.5 h-3.5" aria-hidden="true" />
          Bientôt en coins
        </span>
      )
    }
    const unlockLevel = unlockLevelForXpCost(item.xp_cost)
    if (userLevel >= unlockLevel) {
      return (
        <span
          className={cn(
            "inline-flex items-center rounded-full border-2 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider",
            onDark ? "border-paper/40 bg-white/10 text-paper" : "border-ink bg-lime/20 text-ink"
          )}
        >
          Débloqué
        </span>
      )
    }
    return (
      <span
        className={cn(
          "flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider",
          onDark ? "text-paper/60" : "text-mute"
        )}
      >
        <Lock className="w-3.5 h-3.5" aria-hidden="true" />
        Niveau {unlockLevel}
      </span>
    )
  }

  // Ligne de pied de carte — état honnête, aucun bouton d'achat.
  const renderStatusFooter = (item: ShopReward) => {
    if (!isLevelUnlock(item)) {
      return (
        <p className="mt-4 font-mono text-xs text-mute">
          Bientôt disponible en coins ⊙ — ton argent de poche.
        </p>
      )
    }
    const unlockLevel = unlockLevelForXpCost(item.xp_cost)
    return userLevel >= unlockLevel ? (
      <p className="mt-4 font-mono text-xs font-bold text-ink">
        À toi — débloqué au niveau {unlockLevel}.
      </p>
    ) : (
      <p className="mt-4 font-mono text-xs text-mute">
        Se débloque au niveau {unlockLevel} (tu es niveau {userLevel}).
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {/* Coach Niv — entrée d'onglet */}
      <NivCoach
        mood="happy"
        message="Ici, rien ne s'achète avec tes XP : tu débloques en montant de niveau. Tes coins ⊙, garde-les pour les services !"
      />

      {/* Bandeau progression — remplace l'ancien bandeau « XP à dépenser » */}
      <StickerCard variant="panel" className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="text-sm text-ink-2">
            Tu es{" "}
            <span className="font-mono font-bold tabular-nums text-teal">
              niveau {userLevel}
            </span>{" "}
            — chaque niveau débloque de nouvelles récompenses.
          </div>
          <div className="font-mono text-xs uppercase tracking-wider text-mute">
            {unlockedCount} récompense(s) débloquée(s)
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
              <div className="mt-4">{renderStatusTag(featured, true)}</div>
            </div>
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
            const unlocked = isUnlocked(item)
            const lockedLevelItem = isLevelUnlock(item) && !unlocked
            return (
              <StickerCard
                key={item.reward_id}
                variant={unlocked ? "hover" : "default"}
                className={cn("p-5", lockedLevelItem && "opacity-70")}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-14 h-14 rounded-2xl border-2 border-ink bg-paper-2 flex items-center justify-center">
                    <Gift className="w-7 h-7 text-pink" />
                  </div>
                  {renderStatusTag(item)}
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
                {renderStatusFooter(item)}
              </StickerCard>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Onglet Badges — cible canonique des « achievements » (les redirects
// /teen/achievements et /gamification/collections pointent ici). Affiche les
// achievements du teen, débloqués en couleur, verrouillés en grisé.
function BadgesTab({ walletData }: { walletData: WalletHubClientProps["walletData"] }) {
  const achievements = walletData.achievements ?? []
  const unlocked = achievements.filter((a) => a.is_unlocked)

  if (achievements.length === 0) {
    return (
      <NivEmpty
        mood="calm"
        title="Pas encore de badges"
        description="Complète des quêtes et des défis pour débloquer tes premiers badges."
        action={
          <Link href="/teen/quests">
            <Button variant="pink" size="sm">Voir les quêtes</Button>
          </Link>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <StickerCard variant="panel" className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-gold" />
            <span className="font-display font-extrabold text-ink">Tes badges</span>
          </div>
          <span className="font-mono text-sm font-bold tabular-nums text-mute">
            {unlocked.length}/{achievements.length} débloqués
          </span>
        </div>
      </StickerCard>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {achievements.map((a, idx) => (
          <StickerCard
            key={a.id || a.code || idx}
            variant={a.is_unlocked ? "default" : "panel"}
            className={cn("p-4 text-center", !a.is_unlocked && "opacity-50 saturate-50")}
          >
            {/* `icon` en base = nom lucide minuscule ("zap"/"flame"…), pas un
                emoji — on n'affiche donc pas sa valeur brute. Trophée pour les
                badges débloqués, cadenas pour les verrouillés. */}
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-ink bg-paper-2 text-2xl">
              {a.is_unlocked ? "🏆" : <Lock className="h-5 w-5 text-mute" />}
            </div>
            <h4 className="mt-2 line-clamp-2 font-display text-sm font-bold leading-snug text-ink">
              {a.name}
            </h4>
            {a.xp_reward ? (
              <p className="mt-1 font-mono text-[11px] font-bold tabular-nums text-gold">
                +{a.xp_reward.toLocaleString()} XP
              </p>
            ) : null}
          </StickerCard>
        ))}
      </div>
    </div>
  )
}

// #206 — Onglet Épargne : panneau compact en lecture seule. Lock/withdraw
// restent sur /teen/savings (source des actions). Source coins = vue
// user_coins_spendable passée par la page (single source of truth).
// I10 — l'état est local (initialisé depuis les props SSR) puis resynchronisé
// sur nivy:wallet:refresh : sans ça, un lock/release sur /teen/savings ne
// rafraîchit pas user_coins_spendable ici (les props ne changiennent pas).
function SavingsTab({
  walletData,
  teenId,
}: {
  walletData: WalletHubClientProps["walletData"]
  teenId: string
}) {
  // État local initialisé depuis les props SSR, puis resynchronisé.
  const [savings, setSavings] = useState(walletData.savings)

  useEffect(() => {
    const refresh = async () => {
      try {
        const supabase = createClient()
        const [
          { data: spendableRow },
          { data: goals },
        ] = await Promise.all([
          supabase
            .from("user_coins_spendable")
            .select("total, locked_in_goals, spendable")
            .eq("teen_id", teenId)
            .maybeSingle(),
          supabase
            .from("savings_goals")
            .select("id, title, description, current_saved_coins, target_coins, status, parent_match_pct")
            .eq("teen_id", teenId)
            .order("created_at", { ascending: false }),
        ])
        const total = spendableRow?.total ?? 0
        const locked = spendableRow?.locked_in_goals ?? 0
        const spendable = spendableRow?.spendable ?? 0
        setSavings({ spendable, total, locked, goals: (goals ?? []) as SavingsGoal[] })
      } catch {
        // best-effort : on garde la dernière valeur connue.
      }
    }
    window.addEventListener("nivy:wallet:refresh", refresh)
    return () => window.removeEventListener("nivy:wallet:refresh", refresh)
  }, [teenId])

  const spendable = savings?.spendable ?? 0
  const total = savings?.total ?? 0
  const locked = savings?.locked ?? 0
  const goals = (savings?.goals ?? []).filter(
    (g) => g.status === "active" || g.status === "achieved"
  )

  return (
    <div className="space-y-6">
      <StatHero
        eyebrow="Disponible"
        tone="coral"
        size="lg"
        value={spendable.toLocaleString()}
        unit="⊙ coins"
        meta={
          <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono tabular-nums">
            <span>Total : {total.toLocaleString()} ⊙</span>
            <span>Bloqué (épargne) : {locked.toLocaleString()} ⊙</span>
          </div>
        }
      />

      {goals.length === 0 ? (
        <NivEmpty
          mood="calm"
          title="Aucun objectif d'épargne"
          description="Crée ton premier objectif et commence à mettre tes coins de côté pour ce qui compte."
          action={
            <Link href="/teen/savings/new">
              <Button variant="pink" size="sm">Créer un objectif</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((g) => {
            const pct = Math.min(100, Math.round((g.current_saved_coins / g.target_coins) * 100))
            const segments = 10
            const current = Math.min(segments, Math.round((pct / 100) * segments))
            return (
              <StickerCard key={g.id} variant="default" className="p-5 space-y-3">
                <h3 className="font-display text-base font-bold text-ink">{g.title}</h3>
                <div className="space-y-1.5">
                  <div className="flex justify-between font-mono text-sm tabular-nums text-ink-2">
                    <span>{g.current_saved_coins.toLocaleString()} / {g.target_coins.toLocaleString()} ⊙</span>
                    <span>{pct}%</span>
                  </div>
                  <SegmentedProgress steps={segments} current={current} size="md" />
                </div>
              </StickerCard>
            )
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Link href="/teen/savings">
          <Button variant="outline" size="sm">
            <PiggyBank className="w-4 h-4" />
            Gérer l&apos;épargne
          </Button>
        </Link>
        <Link href="/teen/savings/new">
          <Button variant="pink" size="sm">Nouvel objectif</Button>
        </Link>
      </div>
    </div>
  )
}

// #206 — Onglet Historique : achats canoniques (user_purchases via RPC).
// Code de retrait dérivé des 8 premiers caractères du purchase_id (uppercase)
// — pas de colonne dédiée dans le système canonique.
function HistoryTab({ walletData }: { walletData: WalletHubClientProps["walletData"] }) {
  const purchases = walletData.purchases ?? []
  const usable = purchases.filter((p) => p.is_usable)

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })

  const statusClass = (status: UserPurchase["status"]) => {
    switch (status) {
      case "completed":
      case "used":
        return "border-lime bg-lime/15 text-ink"
      case "pending":
        return "border-gold bg-gold/15 text-ink"
      case "expired":
      case "refunded":
        return "border-coral bg-coral/15 text-ink"
      default:
        return "border-line bg-paper-2 text-mute"
    }
  }
  const statusText: Record<UserPurchase["status"], string> = {
    pending: "En cours",
    completed: "Disponible",
    used: "Utilisé",
    expired: "Expiré",
    refunded: "Remboursé",
  }

  if (purchases.length === 0) {
    return (
      <NivEmpty
        mood="calm"
        title="Aucun achat"
        description="Rien ici pour l'instant. Les récompenses de la boutique se débloquent désormais par niveau — tes futurs achats en coins apparaîtront ici."
        action={
          <Link href="/teen/wallet?tab=shop">
            <Button variant="pink" size="sm">Voir la boutique</Button>
          </Link>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Récompenses à utiliser — codes de retrait en avant */}
      {usable.length > 0 && (
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 font-display text-lg font-extrabold text-ink">
            <Gift className="h-5 w-5 text-pink" />
            Récompenses à utiliser
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {usable.map((p) => (
              <DarkSurface key={p.purchase_id} tone="pink" shadow className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-paper/30 bg-white/10 text-3xl">
                    {p.reward_icon || "🎁"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-display font-bold text-paper">{p.reward_name || "Récompense"}</h4>
                    <p className="font-mono text-xs text-paper/60 mt-1">
                      Acheté le {formatDate(p.purchased_at)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border-2 border-paper/30 bg-white/5 p-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <QrCode className="h-5 w-5 shrink-0 text-pink" />
                    <span className="font-mono text-sm font-bold tracking-wider text-paper truncate">
                      {p.purchase_id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-paper/60">
                    Code à présenter
                  </span>
                </div>
              </DarkSurface>
            ))}
          </div>
        </div>
      )}

      {/* Liste compacte — tous les achats */}
      <div className="space-y-3">
        {purchases.map((p) => (
          <StickerCard key={p.purchase_id} variant="panel" className="p-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-paper-2 text-xl">
                  {p.reward_icon || "🎁"}
                </div>
                <div className="min-w-0">
                  <p className="font-display font-medium text-ink truncate">{p.reward_name || "Récompense"}</p>
                  <p className="font-mono text-xs text-mute">{formatDate(p.purchased_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 font-mono text-sm font-bold tabular-nums text-gold">
                  <Zap className="h-4 w-4" />
                  −{(p.xp_spent || 0).toLocaleString("fr-FR")} XP
                </span>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border-2 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider",
                    statusClass(p.status)
                  )}
                >
                  {statusText[p.status]}
                </span>
              </div>
            </div>
          </StickerCard>
        ))}
      </div>

      <Link href="/teen/shop/history">
        <Button variant="outline" size="sm">
          <Receipt className="w-4 h-4" />
          Voir tout l&apos;historique
        </Button>
      </Link>
    </div>
  )
}
