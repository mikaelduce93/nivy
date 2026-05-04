"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Coins, Heart, Loader2, ShoppingCart, CheckCircle, Tag, Sparkles, Star } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { purchaseReward, toggleWishlist, validatePromoCode } from "@/gamification-system/features/shop/actions"

interface ShopReward {
  reward_id: string
  name: string
  description: string
  image_url: string | null
  xp_cost: number
  category_name?: string
  is_featured?: boolean
  is_new?: boolean
  is_limited?: boolean
  is_in_wishlist?: boolean
  stock_remaining?: number | null
}

interface ShopProductCardProps {
  reward: ShopReward
  userCoins: number
  featured?: boolean
  isNew?: boolean
}

export function ShopProductCard({ reward, userCoins, featured, isNew }: ShopProductCardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [wishlistLoading, setWishlistLoading] = useState(false)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [promoCode, setPromoCode] = useState("")
  const [promoValid, setPromoValid] = useState<boolean | null>(null)
  const [promoDiscount, setPromoDiscount] = useState(0)
  const [checkingPromo, setCheckingPromo] = useState(false)

  const canAfford = userCoins >= reward.xp_cost
  const finalCost = promoDiscount > 0 ? Math.max(0, reward.xp_cost - promoDiscount) : reward.xp_cost

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setWishlistLoading(true)
    try {
      const result = await toggleWishlist(reward.reward_id)
      if (result.success) {
        toast.success(result.action === "added" ? "Ajouté à la wishlist" : "Retiré de la wishlist")
        router.refresh()
      } else {
        toast.error(result.error || "Erreur")
      }
    } catch (error) {
      toast.error("Une erreur est survenue")
    } finally {
      setWishlistLoading(false)
    }
  }

  const handleCheckPromo = async () => {
    if (!promoCode.trim()) return

    setCheckingPromo(true)
    try {
      const result = await validatePromoCode(promoCode, reward.reward_id)
      setPromoValid(result.valid)
      if (result.valid && result.discountValue) {
        if (result.discountType === "percentage") {
          setPromoDiscount(Math.floor(reward.xp_cost * (result.discountValue / 100)))
        } else {
          setPromoDiscount(result.discountValue)
        }
        toast.success("Code promo appliqué !")
      } else {
        setPromoDiscount(0)
        toast.error(result.error || "Code invalide")
      }
    } catch (error) {
      toast.error("Erreur de validation")
    } finally {
      setCheckingPromo(false)
    }
  }

  const handlePurchase = async () => {
    if (!canAfford && promoDiscount === 0) {
      toast.error("Coins insuffisants")
      return
    }

    setLoading(true)
    try {
      const result = await purchaseReward({
        rewardId: reward.reward_id,
        promoCode: promoValid ? promoCode : undefined
      })

      if (result.success) {
        toast.success("Achat réussi !", {
          description: `Tu as dépensé ${result.xpSpent} coins`
        })
        setShowPurchaseModal(false)
        router.refresh()
      } else {
        toast.error(result.error || "Achat impossible")
      }
    } catch (error) {
      toast.error("Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  const cardClasses = featured
    ? "bg-warning/10 border-warning/30 hover:border-warning/50"
    : "bg-card border-border hover:border-primary/30"

  return (
    <>
      <Card
        className={`${cardClasses} transition-all cursor-pointer group`}
        onClick={() => setShowPurchaseModal(true)}
      >
        <CardContent className={featured ? "p-6" : "p-5"}>
          <div className="flex items-start justify-between mb-3">
            <span className={featured ? "text-4xl" : "text-3xl"}>
              {reward.image_url || '🎁'}
            </span>
            <div className="flex items-center gap-2">
              {featured && (
                <span className="text-xs bg-warning/20 text-warning px-2 py-1 rounded-full flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  Vedette
                </span>
              )}
              {isNew && !featured && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Nouveau
                </span>
              )}
              {reward.is_limited && (
                <span className="text-xs bg-destructive/20 text-destructive px-2 py-1 rounded-full">
                  Limité
                </span>
              )}
              <button
                onClick={handleWishlistToggle}
                disabled={wishlistLoading}
                className="p-1 hover:bg-muted rounded-full transition-colors"
              >
                {wishlistLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <Heart
                    className={`h-4 w-4 ${
                      reward.is_in_wishlist
                        ? "text-destructive fill-destructive"
                        : "text-muted-foreground hover:text-destructive"
                    }`}
                  />
                )}
              </button>
            </div>
          </div>

          <h3 className={`font-bold text-foreground mb-1 ${featured ? "" : "text-sm"}`}>
            {reward.name}
          </h3>
          {featured && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{reward.description}</p>
          )}
          {!featured && reward.description && (
            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{reward.description}</p>
          )}

          <div className="flex items-center justify-between mt-auto">
            <div className="flex items-center gap-1">
              <Coins className="h-4 w-4 text-warning" />
              <span className="font-black text-warning">{reward.xp_cost}</span>
            </div>
            {featured && (
              <Button
                size="sm"
                className={`${
                  canAfford
                    ? "bg-primary hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                } text-primary-foreground`}
                disabled={!canAfford}
                onClick={(e) => {
                  e.stopPropagation()
                  setShowPurchaseModal(true)
                }}
              >
                {canAfford ? "Acheter" : "Insuffisant"}
              </Button>
            )}
          </div>

          {reward.stock_remaining !== null && reward.stock_remaining !== undefined && (
            <p className="text-xs text-muted-foreground mt-2">
              {reward.stock_remaining} restant{reward.stock_remaining > 1 ? "s" : ""}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Purchase Modal */}
      <Dialog open={showPurchaseModal} onOpenChange={setShowPurchaseModal}>
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="text-4xl">{reward.image_url || '🎁'}</span>
              <span>{reward.name}</span>
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {reward.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Price Info */}
            <div className="p-4 bg-muted/40 rounded-xl border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground">Prix</span>
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-warning" />
                  <span className={`font-black ${promoDiscount > 0 ? "line-through text-muted-foreground" : "text-warning"}`}>
                    {reward.xp_cost}
                  </span>
                  {promoDiscount > 0 && (
                    <span className="font-black text-success">{finalCost}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tes coins</span>
                <span className={`font-bold ${userCoins >= finalCost ? "text-success" : "text-destructive"}`}>
                  {userCoins}
                </span>
              </div>
              {promoDiscount > 0 && (
                <div className="flex items-center justify-between mt-2 text-success">
                  <span>Réduction</span>
                  <span className="font-bold">-{promoDiscount} coins</span>
                </div>
              )}
            </div>

            {/* Promo Code */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Code promo (optionnel)</Label>
              <div className="flex gap-2">
                <Input
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value.toUpperCase())
                    setPromoValid(null)
                    setPromoDiscount(0)
                  }}
                  placeholder="TEEN2024"
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCheckPromo}
                  disabled={checkingPromo || !promoCode.trim()}
                  className="border-border text-muted-foreground shrink-0"
                >
                  {checkingPromo ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Tag className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {promoValid === true && (
                <p className="text-xs text-success flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> Code appliqué
                </p>
              )}
              {promoValid === false && (
                <p className="text-xs text-destructive">Code invalide</p>
              )}
            </div>

            {/* Affordable Check */}
            {userCoins < finalCost && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                <p className="text-sm text-destructive">
                  Il te manque {finalCost - userCoins} coins pour cet achat
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowPurchaseModal(false)}
              disabled={loading}
              className="border-border text-muted-foreground"
            >
              Annuler
            </Button>
            <Button
              onClick={handlePurchase}
              disabled={loading || userCoins < finalCost}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ShoppingCart className="h-4 w-4 mr-2" />
              )}
              Acheter pour {finalCost} coins
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
