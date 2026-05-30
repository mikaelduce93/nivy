// V1.2 TODO: Per FRONTEND_REDO §5 this route is recommended for DELETE.
// The whitepaper §12 commission model is cash-based (DH withdrawals) +
// optional XP-only for under-18 ambassadors — there is no separate
// "ambassador rewards shop". Either redirect to /ambassador/withdrawals
// or fold the few experience-rewards into /teen/shop. Kept live for now
// so the existing `ambassador_rewards` data isn't stranded.
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Gift,
  Star,
  ShoppingBag,
  Gamepad2,
  Ticket,
  Sparkles,
  Shirt,
  CreditCard,
  Package,
  Check,
  Loader2,
  TrendingUp,
  History,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface Reward {
  id: string
  name: string
  description: string
  emoji: string
  points_cost: number
  category: string
  stock: number
}

interface PointsData {
  total: number
  lifetime: number
}

interface Redemption {
  id: string
  reward: Reward
  points_spent: number
  status: string
  created_at: string
}

const CATEGORY_ICONS: Record<string, any> = {
  tech: Gamepad2,
  experience: Sparkles,
  event: Ticket,
  merch: Shirt,
  other: CreditCard,
}

const CATEGORY_LABELS: Record<string, string> = {
  tech: "Tech & Gaming",
  experience: "Expériences",
  event: "Events & Clubs",
  merch: "Merch",
  other: "Cartes Cadeaux",
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-gold/20 text-gold" },
  processing: { label: "En cours", color: "bg-teal/20 text-teal" },
  shipped: { label: "Expédié", color: "bg-pink/20 text-pink" },
  delivered: { label: "Livré", color: "bg-lime/20 text-lime" },
  cancelled: { label: "Annulé", color: "bg-destructive/20 text-destructive" },
}

export default function AmbassadorBoutiquePage() {
  const [loading, setLoading] = useState(true)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [points, setPoints] = useState<PointsData>({ total: 0, lifetime: 0 })
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [ambassadorId, setAmbassadorId] = useState<string | null>(null)
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null)
  const [deliveryAddress, setDeliveryAddress] = useState("")
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [activeCategory, setActiveCategory] = useState("all")

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    // Get ambassador ID (accept both 'approved' and 'active' status)
    const { data: ambassador } = await supabase
      .from("ambassadors")
      .select("id")
      .eq("profile_id", user.id)
      .in("status", ["approved", "active"])
      .single()

    if (!ambassador) {
      setLoading(false)
      return
    }

    setAmbassadorId(ambassador.id)

    // Fetch rewards, points, and redemptions in parallel
    const [rewardsRes, pointsRes, redemptionsRes] = await Promise.all([
      supabase
        .from("ambassador_rewards")
        .select("*")
        .eq("is_active", true)
        .order("points_cost", { ascending: true }),

      supabase
        .from("ambassador_points")
        .select("total_points, lifetime_points")
        .eq("ambassador_id", ambassador.id)
        .single(),

      supabase
        .from("ambassador_redemptions")
        .select(`
          id,
          points_spent,
          status,
          created_at,
          reward:ambassador_rewards(id, name, description, emoji, points_cost, category)
        `)
        .eq("ambassador_id", ambassador.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ])

    setRewards(rewardsRes.data || [])
    setPoints({
      total: pointsRes.data?.total_points || 0,
      lifetime: pointsRes.data?.lifetime_points || 0,
    })
    setRedemptions(
      (redemptionsRes.data || []).map((r: any) => ({
        ...r,
        reward: r.reward,
      }))
    )
    setLoading(false)
  }

  async function handleRedeem() {
    if (!selectedReward || !ambassadorId) return

    setIsRedeeming(true)

    try {
      const supabase = createClient()

      const { error } = await supabase.rpc("redeem_ambassador_reward", {
        p_ambassador_id: ambassadorId,
        p_reward_id: selectedReward.id,
        p_delivery_address: deliveryAddress || null,
        p_delivery_notes: null,
      })

      if (error) throw error

      toast.success("Cadeau commandé !", {
        description: `Tu as échangé ${selectedReward.points_cost} points contre "${selectedReward.name}"`,
      })

      setSelectedReward(null)
      setDeliveryAddress("")
      fetchData() // Refresh data
    } catch (err: any) {
      toast.error("Erreur", {
        description: err.message || "Impossible d'échanger ce cadeau",
      })
    } finally {
      setIsRedeeming(false)
    }
  }

  const filteredRewards =
    activeCategory === "all"
      ? rewards
      : rewards.filter((r) => r.category === activeCategory)

  const categories = ["all", ...new Set(rewards.map((r) => r.category))]

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-32" />
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    )
  }

  if (!ambassadorId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-6">
        <Gift className="h-16 w-16 text-gold mb-4" />
        <h2 className="text-2xl font-bold text-ink mb-2">Accès réservé aux ambassadeurs</h2>
        <p className="text-mute text-center max-w-md">
          Tu dois être un ambassadeur approuvé pour accéder à la boutique de cadeaux.
        </p>
        <Button className="mt-6 bg-gradient-to-r from-gold to-coral hover:from-gold hover:to-coral" asChild>
          <a href="/devenir-ambassadeur">Devenir ambassadeur</a>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Points Summary */}
      <Card className="bg-gradient-to-br from-gold/10 to-coral/10 border-gold shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold to-coral flex items-center justify-center shadow-lg">
                <Star className="h-8 w-8 text-ink" />
              </div>
              <div>
                <p className="text-4xl font-black text-ink">{points.total.toLocaleString()}</p>
                <p className="text-gold font-medium">Points disponibles</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="flex items-center gap-1 text-mute">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm">Total gagné</span>
                </div>
                <p className="text-xl font-bold text-ink">{points.lifetime.toLocaleString()}</p>
              </div>

              <div className="text-center">
                <div className="flex items-center gap-1 text-mute">
                  <Package className="h-4 w-4" />
                  <span className="text-sm">Échangés</span>
                </div>
                <p className="text-xl font-bold text-ink">{redemptions.length}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="shop" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="shop" className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Boutique
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Mes Commandes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shop" className="space-y-6">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const Icon = cat === "all" ? Gift : CATEGORY_ICONS[cat] || Gift
              return (
                <Button
                  key={cat}
                  variant={activeCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveCategory(cat)}
                  className={
                    activeCategory === cat
                      ? "bg-gradient-to-r from-gold to-coral hover:from-gold hover:to-coral text-ink border-0"
                      : "bg-white hover:bg-gold border-gold text-ink"
                  }
                >
                  <Icon className="h-4 w-4 mr-1" />
                  {cat === "all" ? "Tout" : CATEGORY_LABELS[cat] || cat}
                </Button>
              )
            })}
          </div>

          {/* Rewards Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRewards.map((reward) => {
              const canAfford = points.total >= reward.points_cost
              const outOfStock = reward.stock === 0

              return (
                <Card
                  key={reward.id}
                  className={`relative overflow-hidden transition-all bg-white border-2 ${
                    canAfford && !outOfStock
                      ? "hover:border-gold cursor-pointer hover:shadow-lg"
                      : "opacity-60 border-line"
                  }`}
                  onClick={() => canAfford && !outOfStock && setSelectedReward(reward)}
                >
                  {outOfStock && (
                    <div className="absolute inset-0 bg-paper-2 flex items-center justify-center z-10 rounded-lg">
                      <Badge variant="destructive" className="bg-destructive text-ink">Rupture de stock</Badge>
                    </div>
                  )}

                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <span className="text-4xl">{reward.emoji}</span>
                      <Badge
                        variant="outline"
                        className={`${
                          canAfford
                            ? "border-lime text-lime bg-lime"
                            : "border-line text-mute"
                        }`}
                      >
                        {reward.points_cost.toLocaleString()} pts
                      </Badge>
                    </div>
                    <CardTitle className="text-lg text-ink">{reward.name}</CardTitle>
                    <CardDescription className="text-sm text-mute">{reward.description}</CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-mute">
                        <span>Progression</span>
                        <span>
                          {Math.min(points.total, reward.points_cost)} / {reward.points_cost}
                        </span>
                      </div>
                      <Progress
                        value={Math.min((points.total / reward.points_cost) * 100, 100)}
                        className="h-2 bg-paper-2"
                      />
                    </div>

                    {canAfford && !outOfStock && (
                      <Button className="w-full mt-4 bg-gradient-to-r from-gold to-coral hover:from-gold hover:to-coral text-ink" size="sm">
                        <Gift className="h-4 w-4 mr-2" />
                        Échanger
                      </Button>
                    )}

                    {!canAfford && (
                      <p className="text-xs text-center text-mute mt-4">
                        Il te manque {(reward.points_cost - points.total).toLocaleString()} points
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card className="bg-white border-gold">
            <CardHeader>
              <CardTitle className="text-ink">Historique des commandes</CardTitle>
              <CardDescription className="text-mute">Tous tes cadeaux échangés</CardDescription>
            </CardHeader>
            <CardContent>
              {redemptions.length === 0 ? (
                <div className="text-center py-12 text-mute">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50 text-gold" />
                  <p className="text-ink">Aucune commande pour le moment</p>
                  <p className="text-sm text-mute">Échange tes points contre des cadeaux !</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {redemptions.map((redemption) => (
                    <div
                      key={redemption.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-gold border border-gold hover:bg-gold transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-3xl">{redemption.reward?.emoji}</span>
                        <div>
                          <p className="font-medium text-ink">{redemption.reward?.name}</p>
                          <p className="text-sm text-mute">
                            {new Date(redemption.created_at).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={STATUS_LABELS[redemption.status]?.color || "bg-paper-2 text-ink"}>
                          {STATUS_LABELS[redemption.status]?.label || redemption.status}
                        </Badge>
                        <p className="text-sm text-gold font-medium mt-1">
                          -{redemption.points_spent} pts
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Redemption Dialog */}
      <Dialog open={!!selectedReward} onOpenChange={() => setSelectedReward(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="text-3xl">{selectedReward?.emoji}</span>
              {selectedReward?.name}
            </DialogTitle>
            <DialogDescription>{selectedReward?.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-gold border border-gold">
              <span className="text-ink font-medium">Coût</span>
              <span className="text-xl font-bold text-gold">
                {selectedReward?.points_cost.toLocaleString()} points
              </span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-coral border border-coral">
              <span className="text-ink font-medium">Après échange</span>
              <span className="text-xl font-bold text-ink">
                {(points.total - (selectedReward?.points_cost || 0)).toLocaleString()} points
              </span>
            </div>

            {selectedReward?.category === "tech" ||
            selectedReward?.category === "merch" ||
            selectedReward?.category === "other" ? (
              <div className="space-y-2">
                <Label htmlFor="address" className="text-ink">Adresse de livraison</Label>
                <Textarea
                  id="address"
                  placeholder="Ton adresse complète pour la livraison..."
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  rows={3}
                  className="bg-white border-line"
                />
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-gold border border-gold">
                <p className="text-sm text-gold">
                  Ce cadeau est une expérience. On te contactera pour organiser les détails !
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedReward(null)} className="border-line">
              Annuler
            </Button>
            <Button
              onClick={handleRedeem}
              disabled={isRedeeming}
              className="bg-gradient-to-r from-gold to-coral hover:from-gold hover:to-coral text-ink"
            >
              {isRedeeming ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Échange en cours...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Confirmer l'échange
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
