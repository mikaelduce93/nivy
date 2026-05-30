"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { QRScanner } from "@/components/qr-scanner"
import {
  QrCode,
  Check,
  X,
  User,
  Tag,
  CreditCard,
  Crown,
  Loader2,
  AlertCircle,
  CheckCircle,
  Gift,
  Coins,
  Calendar,
  ShoppingBag,
  Trophy
} from "lucide-react"
import { toast } from "sonner"
import { EmptyState } from "@/components/ui/states/empty-state"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

interface ScannedMember {
  member: {
    id: string
    name: string
    email: string
    role: string
  }
  card: {
    id: string
    cardNumber: string
    tier: string
    status: string
    expiresAt: string
  }
  points: {
    total: number
    tier: string
  }
  eligibleOffers: {
    id: string
    name: string
    description: string | null
    type: string
    value: number
    minPurchase: number | null
    maxDiscount: number | null
    terms: string | null
    expiresAt: string
    usedByUser: number
  }[]
}

export default function PartnerScannerPage() {
  const [isScanning, setIsScanning] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [scannedMember, setScannedMember] = useState<ScannedMember | null>(null)
  const [manualCode, setManualCode] = useState("")
  const [selectedOffer, setSelectedOffer] = useState<string | null>(null)
  const [purchaseAmount, setPurchaseAmount] = useState("")
  const [isApplying, setIsApplying] = useState(false)
  const [transactionResult, setTransactionResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleScan = async (qrData: string) => {
    setIsScanning(false)
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/partner/verify-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrData })
      })

      const data = await response.json()

      if (!data.success || !data.isValid) {
        setError(data.error || "Carte invalide")
        toast.error(data.error || "Carte invalide")
        return
      }

      setScannedMember(data)
      toast.success(`Membre identifié: ${data.member.name}`)
    } catch (err) {
      setError("Erreur lors de la vérification")
      toast.error("Erreur lors de la vérification")
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualSearch = async () => {
    if (!manualCode.trim()) {
      toast.error("Entrez un numéro de carte")
      return
    }

    await handleScan(manualCode.trim())
  }

  // ----------------------------------------------------------------
  // TICKET-027: detect challenge offers and call check-in instead of
  // apply-discount. We resolve offer_type at click-time via the Supabase
  // browser client (read is allowed by the partner_offers self_read RLS
  // policy) so verify-card's response shape stays untouched.
  // ----------------------------------------------------------------
  const resolveOfferType = async (
    offerId: string
  ): Promise<{ offerType: string | null; xpReward: number | null }> => {
    try {
      const sb = createClient()
      const { data, error } = await sb
        .from("partner_offers")
        .select("offer_type, xp_reward")
        .eq("id", offerId)
        .single()
      if (error || !data) {
        return { offerType: null, xpReward: null }
      }
      return {
        offerType: (data as { offer_type: string | null }).offer_type ?? null,
        xpReward: (data as { xp_reward: number | null }).xp_reward ?? null,
      }
    } catch {
      return { offerType: null, xpReward: null }
    }
  }

  const handleChallengeCheckIn = async (offerId: string, memberId: string) => {
    setIsApplying(true)
    try {
      const response = await fetch(
        `/api/partner/challenges/${offerId}/check-in`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId }),
        }
      )

      const data = await response.json()

      if (!data.success) {
        toast.error(data.error || "Erreur lors du check-in")
        return
      }

      setTransactionResult({
        kind: "challenge",
        challengeName: data.data?.offerTitle ?? "Défi partenaire",
        xpAwarded: data.data?.xpAwarded ?? 0,
        scannedAt: data.data?.scannedAt ?? new Date().toISOString(),
        transactionId: data.data?.checkInId ?? "",
      })
      toast.success(`Check-in OK — +${data.data?.xpAwarded ?? 0} XP`)
    } catch {
      toast.error("Erreur lors du check-in")
    } finally {
      setIsApplying(false)
    }
  }

  const handleApplyDiscount = async () => {
    if (!selectedOffer || !scannedMember) {
      toast.error("Sélectionnez une offre")
      return
    }

    // Branch on offer_type before requiring purchase amount: challenges
    // do not need a purchase amount.
    const { offerType } = await resolveOfferType(selectedOffer)

    if (offerType === "challenge") {
      await handleChallengeCheckIn(selectedOffer, scannedMember.member.id)
      return
    }

    if (!purchaseAmount) {
      toast.error("Entrez le montant de l'achat")
      return
    }

    const amount = parseFloat(purchaseAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Montant invalide")
      return
    }

    setIsApplying(true)
    try {
      const response = await fetch("/api/partner/apply-discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discountId: selectedOffer,
          memberId: scannedMember.member.id,
          purchaseAmount: amount
        })
      })

      const data = await response.json()

      if (!data.success) {
        toast.error(data.error || "Erreur lors de l'application")
        return
      }

      setTransactionResult({ kind: "discount", ...data.data })
      toast.success("Réduction appliquée!")
    } catch (err) {
      toast.error("Erreur lors de l'application")
    } finally {
      setIsApplying(false)
    }
  }

  const resetScanner = () => {
    setScannedMember(null)
    setManualCode("")
    setSelectedOffer(null)
    setPurchaseAmount("")
    setTransactionResult(null)
    setError(null)
  }

  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case "platinum":
        return "from-pink to-pink"
      case "gold":
        return "from-gold to-coral"
      case "silver":
        return "from-paper-2 to-card"
      default:
        return "from-lime to-teal"
    }
  }

  const getTierBadgeColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case "platinum":
        return "bg-pink/20 text-pink border-pink/30"
      case "gold":
        return "bg-gold/20 text-gold border-gold/30"
      case "silver":
        return "bg-muted text-ink-2 border-line"
      default:
        return "bg-lime/20 text-lime border-lime/30"
    }
  }

  // Transaction completed view
  if (transactionResult) {
    const isChallenge = transactionResult.kind === "challenge"

    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-black text-ink">
            {isChallenge ? "Check-in validé" : "Transaction Complète"}
          </h1>
          <p className="text-mute">
            {isChallenge
              ? "Défi partenaire enregistré avec succès"
              : "Réduction appliquée avec succès"}
          </p>
        </div>

        <Card className="bg-gradient-to-br from-lime/20 to-teal/20 border-lime/30">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-lime flex items-center justify-center mb-6">
              {isChallenge ? (
                <Trophy className="h-10 w-10 text-ink" />
              ) : (
                <CheckCircle className="h-10 w-10 text-ink" />
              )}
            </div>

            <h2 className="text-2xl font-bold text-ink mb-2">
              {isChallenge
                ? transactionResult.challengeName
                : transactionResult.discountName}
            </h2>

            {isChallenge ? (
              <div className="bg-card rounded-xl p-6 mt-6">
                <p className="text-xs text-mute mb-1">XP attribués</p>
                <p className="text-3xl font-bold text-gold">
                  +{transactionResult.xpAwarded} XP
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="bg-card rounded-xl p-4">
                  <p className="text-xs text-mute mb-1">Achat</p>
                  <p className="text-xl font-bold text-ink">
                    {transactionResult.purchaseAmount} DH
                  </p>
                </div>
                <div className="bg-card rounded-xl p-4">
                  <p className="text-xs text-mute mb-1">Réduction</p>
                  <p className="text-xl font-bold text-lime">
                    -{transactionResult.discountAmount} DH
                  </p>
                </div>
                <div className="bg-card rounded-xl p-4">
                  <p className="text-xs text-mute mb-1">Total</p>
                  <p className="text-xl font-bold text-ink">
                    {transactionResult.finalAmount} DH
                  </p>
                </div>
              </div>
            )}

            {transactionResult.transactionId && (
              <p className="text-sm text-mute mt-6">
                Transaction #{String(transactionResult.transactionId).slice(0, 8)}
              </p>
            )}
          </CardContent>
        </Card>

        <Button
          onClick={resetScanner}
          className="w-full bg-gradient-to-r from-lime to-teal hover:from-lime hover:to-teal"
        >
          <QrCode className="h-4 w-4 mr-2" />
          Scanner un autre membre
        </Button>
      </div>
    )
  }

  // Member scanned view
  if (scannedMember) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-black text-ink">Membre Identifié</h1>
          <p className="text-mute">Sélectionnez une offre à appliquer</p>
        </div>

        {/* Member Info Card */}
        <Card className={cn(
          "bg-gradient-to-br border",
          getTierColor(scannedMember.card.tier).replace("from-", "from-").replace("to-", "to-") + "/20",
          getTierBadgeColor(scannedMember.card.tier).split(" ")[2]
        )}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={cn(
                "h-16 w-16 rounded-full bg-gradient-to-br flex items-center justify-center text-ink font-bold text-2xl",
                getTierColor(scannedMember.card.tier)
              )}>
                {scannedMember.member.name.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="text-2xl font-black text-ink">{scannedMember.member.name}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-sm font-medium border",
                    getTierBadgeColor(scannedMember.card.tier)
                  )}>
                    <Crown className="h-3 w-3 inline mr-1" />
                    {scannedMember.card.tier}
                  </span>
                  <span className="text-mute text-sm flex items-center gap-1">
                    <Coins className="h-3 w-3" />
                    {scannedMember.points.total} points
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-ink grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-mute">N° Carte</p>
                <p className="text-ink font-mono">{scannedMember.card.cardNumber}</p>
              </div>
              <div>
                <p className="text-mute">Expire le</p>
                <p className="text-ink">
                  {new Date(scannedMember.card.expiresAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Purchase Amount */}
        <Card className="bg-card border-ink">
          <CardHeader>
            <CardTitle className="text-ink text-lg flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-lime" />
              Montant de l'achat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={purchaseAmount}
                  onChange={(e) => setPurchaseAmount(e.target.value)}
                  className="bg-card border-ink text-ink text-xl font-bold pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-mute">
                  DH
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Eligible Offers */}
        <Card className="bg-card border-ink">
          <CardHeader>
            <CardTitle className="text-ink flex items-center gap-2">
              <Gift className="h-5 w-5 text-lime" />
              Offres éligibles
            </CardTitle>
            <CardDescription className="text-mute">
              {scannedMember.eligibleOffers.length} offre(s) disponible(s)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {scannedMember.eligibleOffers.length === 0 ? (
              <EmptyState
                size="small"
                icon={Tag}
                title="Aucune offre disponible"
                description="Ce membre n'a pas d'offre éligible pour le moment."
              />
            ) : (
              scannedMember.eligibleOffers.map((offer) => (
                <button
                  key={offer.id}
                  type="button"
                  onClick={() => setSelectedOffer(offer.id)}
                  aria-pressed={selectedOffer === offer.id}
                  aria-label={`Sélectionner l'offre ${offer.name}`}
                  className={cn(
                    "w-full text-left flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900",
                    selectedOffer === offer.id
                      ? "bg-lime/20 border-lime"
                      : "bg-card border-ink hover:border-ink"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "h-12 w-12 rounded-xl flex items-center justify-center",
                      selectedOffer === offer.id ? "bg-lime" : "bg-lime/20"
                    )}>
                      <Tag className={cn(
                        "h-6 w-6",
                        selectedOffer === offer.id ? "text-ink" : "text-lime"
                      )} />
                    </div>
                    <div>
                      <p className="font-semibold text-ink">{offer.name}</p>
                      <p className="text-xs text-mute">
                        {offer.type === "percentage"
                          ? `-${offer.value}%`
                          : `-${offer.value} DH`}
                        {offer.minPurchase && ` • Min ${offer.minPurchase} DH`}
                      </p>
                    </div>
                  </div>
                  {selectedOffer === offer.id && (
                    <CheckCircle className="h-6 w-6 text-lime" aria-hidden="true" />
                  )}
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Apply Button */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={resetScanner}
            className="flex-1 border-ink text-ink-2"
          >
            <X className="h-4 w-4 mr-2" />
            Annuler
          </Button>
          <Button
            onClick={handleApplyDiscount}
            disabled={!selectedOffer || isApplying}
            className="flex-1 bg-lime hover:bg-lime text-ink"
          >
            {isApplying ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Appliquer
          </Button>
        </div>
      </div>
    )
  }

  // Scanner view
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-black text-ink">Scanner QR</h1>
        <p className="text-mute">Scannez la carte VIP d'un membre</p>
      </div>

      {/* Error Display */}
      {error && (
        <Card
          role="alert"
          aria-live="assertive"
          className="bg-destructive/10 border-destructive/30"
        >
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle
              className="h-5 w-5 text-destructive flex-shrink-0"
              aria-hidden="true"
            />
            <div>
              <p className="text-destructive font-semibold">Erreur</p>
              <p className="text-destructive text-sm">{error}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              aria-label="Fermer le message d'erreur"
              className="ml-auto text-destructive"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card className="bg-card border-ink">
          <CardContent className="p-12 flex flex-col items-center justify-center">
            <Loader2 className="h-12 w-12 text-lime animate-spin mb-4" />
            <p className="text-ink font-semibold">Vérification en cours...</p>
          </CardContent>
        </Card>
      )}

      {/* Scanner */}
      {!isLoading && (
        <>
          {isScanning ? (
            <QRScanner
              onScan={handleScan}
              onClose={() => setIsScanning(false)}
              onError={(err) => {
                setError(err)
                toast.error(err)
              }}
            />
          ) : (
            <Card className="bg-card border-ink">
              <CardContent className="p-8">
                <div className="aspect-square max-w-sm mx-auto rounded-2xl border-2 border-dashed border-ink flex flex-col items-center justify-center bg-background">
                  <QrCode className="h-24 w-24 text-mute mb-4" />
                  <p className="text-mute text-center px-4">
                    Positionnez le QR code de la carte VIP devant la caméra
                  </p>
                  <Button
                    className="mt-6 bg-lime hover:bg-lime text-ink"
                    onClick={() => setIsScanning(true)}
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    Activer le scanner
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Manual Code Entry */}
          <Card className="bg-card border-ink">
            <CardHeader>
              <CardTitle className="text-ink text-lg">
                Ou entrez le numéro manuellement
              </CardTitle>
              <CardDescription className="text-mute">
                Le numéro se trouve sur la carte VIP du membre
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <label htmlFor="manual-card-code" className="sr-only">
                  Numéro de carte VIP
                </label>
                <Input
                  id="manual-card-code"
                  placeholder="TPVIP-XXXX-XXXX"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
                  aria-label="Numéro de carte VIP"
                  className="bg-card border-ink text-ink placeholder:text-mute font-mono text-lg tracking-wider"
                />
                <Button
                  className="bg-lime hover:bg-lime text-ink"
                  onClick={handleManualSearch}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Valider"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Help Card */}
          <Card className="bg-teal/10 border-teal/30">
            <CardContent className="p-4">
              <h4 className="text-ink font-semibold mb-2 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-teal" />
                Comment ça marche ?
              </h4>
              <ol className="text-sm text-ink-2 space-y-1 list-decimal list-inside">
                <li>Scannez la carte VIP du client</li>
                <li>Vérifiez son identité</li>
                <li>Entrez le montant de l'achat</li>
                <li>Sélectionnez l'offre à appliquer</li>
                <li>Validez la réduction</li>
              </ol>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
