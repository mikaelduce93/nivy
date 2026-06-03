"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { QRScanner } from "@/components/qr-scanner"
import {
  QrCode, Check, X, Crown, Loader2, AlertCircle,
  Gift, Coins, ShoppingBag, Tag,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

import { StickerCard } from "@/components/ui/sticker-card"
import { NivEmpty } from "@/components/brand"
import { DarkScannerShell } from "@/components/partner/dark-scanner-shell"
import { Confetti } from "@/components/ui/effects/confetti"

interface ScannedMember {
  member: { id: string; name: string; email: string; role: string }
  card: { id: string; cardNumber: string; tier: string; status: string; expiresAt: string }
  points: { total: number; tier: string }
  eligibleOffers: {
    id: string; name: string; description: string | null; type: string; value: number
    minPurchase: number | null; maxDiscount: number | null; terms: string | null
    expiresAt: string; usedByUser: number
  }[]
}

function tierPill(tier: string) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-paper-2 px-3 py-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-ink">
      <Crown className="size-3" aria-hidden="true" />
      {tier}
    </span>
  )
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
        body: JSON.stringify({ qrData }),
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
      if (error || !data) return { offerType: null, xpReward: null }
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
      const response = await fetch(`/api/partner/challenges/${offerId}/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      })
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
        body: JSON.stringify({ discountId: selectedOffer, memberId: scannedMember.member.id, purchaseAmount: amount }),
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

  /* ---------------------------------- Success view ---------------------------------- */
  if (transactionResult) {
    const isChallenge = transactionResult.kind === "challenge"
    return (
      <div className="py-4">
        <Confetti trigger palette="reward" />
        <DarkScannerShell
          eyebrow={isChallenge ? "Check-in validé" : "Transaction complète"}
          title={isChallenge ? "Défi" : "Réduction"}
          titleEm={isChallenge ? "validé" : "appliquée"}
          nivMood="hype"
        >
          <StickerCard className="items-center gap-2 p-6 text-center">
            <h2 className="font-display text-xl font-extrabold text-ink">
              {isChallenge ? transactionResult.challengeName : transactionResult.discountName}
            </h2>
            {isChallenge ? (
              <div className="mt-2">
                <p className="eyebrow">XP attribués</p>
                <p className="font-display text-4xl font-extrabold tabular-nums text-gold">
                  +{transactionResult.xpAwarded} XP
                </p>
              </div>
            ) : (
              <div className="mt-2 grid w-full grid-cols-3 gap-3">
                <div>
                  <p className="eyebrow">Achat</p>
                  <p className="font-display text-xl font-extrabold tabular-nums text-ink">{transactionResult.purchaseAmount} DH</p>
                </div>
                <div>
                  <p className="eyebrow">Réduction</p>
                  <p className="font-display text-xl font-extrabold tabular-nums text-coral">-{transactionResult.discountAmount} DH</p>
                </div>
                <div>
                  <p className="eyebrow">Total</p>
                  <p className="font-display text-xl font-extrabold tabular-nums text-ink">{transactionResult.finalAmount} DH</p>
                </div>
              </div>
            )}
            {transactionResult.transactionId && (
              <p className="mt-3 font-mono text-xs text-mute">
                Transaction #{String(transactionResult.transactionId).slice(0, 8)}
              </p>
            )}
          </StickerCard>

          <Button variant="pink" onClick={resetScanner} className="w-full">
            <QrCode className="mr-2 size-4" aria-hidden="true" />
            Scanner un autre membre
          </Button>
        </DarkScannerShell>
      </div>
    )
  }

  /* ---------------------------------- Member view ---------------------------------- */
  if (scannedMember) {
    return (
      <div className="py-4">
        <DarkScannerShell eyebrow="Membre identifié" title="Sélectionne une" titleEm="offre" nivMood="happy">
          {/* Member info */}
          <StickerCard className="gap-4 p-5">
            <div className="flex items-center gap-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-full border-2 border-ink bg-pink font-display text-2xl font-extrabold text-ink">
                {scannedMember.member.name.charAt(0)}
              </span>
              <div className="flex-1">
                <p className="font-display text-xl font-extrabold text-ink">{scannedMember.member.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  {tierPill(scannedMember.card.tier)}
                  <span className="flex items-center gap-1 font-mono text-sm text-mute">
                    <Coins className="size-3.5 text-coral" aria-hidden="true" />
                    {scannedMember.points.total} points
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t-2 border-dashed border-line pt-4 text-sm">
              <div>
                <p className="eyebrow">N° Carte</p>
                <p className="font-mono text-ink">{scannedMember.card.cardNumber}</p>
              </div>
              <div>
                <p className="eyebrow">Expire le</p>
                <p className="font-mono text-ink">{new Date(scannedMember.card.expiresAt).toLocaleDateString("fr-FR")}</p>
              </div>
            </div>
          </StickerCard>

          {/* Purchase amount */}
          <StickerCard className="gap-3 p-5">
            <p className="flex items-center gap-2 font-display font-bold text-ink">
              <ShoppingBag className="size-5 text-pink" aria-hidden="true" />
              Montant de l'achat
            </p>
            <div className="relative">
              <Input
                type="number"
                placeholder="0.00"
                value={purchaseAmount}
                onChange={(e) => setPurchaseAmount(e.target.value)}
                className="border-2 border-ink pr-12 text-xl font-bold focus-visible:ring-0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-mute">DH</span>
            </div>
          </StickerCard>

          {/* Eligible offers */}
          <StickerCard className="gap-3 p-5">
            <div>
              <p className="flex items-center gap-2 font-display font-bold text-ink">
                <Gift className="size-5 text-pink" aria-hidden="true" />
                Offres éligibles
              </p>
              <p className="font-mono text-xs text-mute">{scannedMember.eligibleOffers.length} offre(s) disponible(s)</p>
            </div>
            {scannedMember.eligibleOffers.length === 0 ? (
              <NivEmpty mood="calm" title="Aucune offre disponible" description="Ce membre n'a pas d'offre éligible pour le moment." />
            ) : (
              <div className="space-y-2">
                {scannedMember.eligibleOffers.map((offer) => {
                  const active = selectedOffer === offer.id
                  return (
                    <button
                      key={offer.id}
                      type="button"
                      onClick={() => setSelectedOffer(offer.id)}
                      aria-pressed={active}
                      aria-label={`Sélectionner l'offre ${offer.name}`}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl border-2 p-4 text-left transition-all",
                        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-pink/40",
                        active
                          ? "-translate-x-0.5 -translate-y-0.5 border-ink bg-ink text-paper shadow-stkr-pink motion-reduce:translate-x-0 motion-reduce:translate-y-0"
                          : "border-ink bg-white text-ink hover:-translate-x-0.5 hover:-translate-y-0.5 motion-reduce:translate-x-0 motion-reduce:translate-y-0"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <span className={cn("grid size-11 place-items-center rounded-xl border-2 border-ink", active ? "bg-pink" : "bg-paper-2")}>
                          <Tag className="size-5 text-ink" aria-hidden="true" />
                        </span>
                        <div>
                          <p className="font-display font-bold">{offer.name}</p>
                          <p className={cn("font-mono text-xs", active ? "text-paper/70" : "text-mute")}>
                            {offer.type === "percentage" ? `-${offer.value}%` : `-${offer.value} DH`}
                            {offer.minPurchase ? ` • Min ${offer.minPurchase} DH` : ""}
                          </p>
                        </div>
                      </div>
                      {active && <Check className="size-6 shrink-0" strokeWidth={3} aria-hidden="true" />}
                    </button>
                  )
                })}
              </div>
            )}
          </StickerCard>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={resetScanner} className="flex-1 border-paper/40 text-paper hover:bg-paper/10">
              <X className="mr-2 size-4" aria-hidden="true" />
              Annuler
            </Button>
            <Button variant="pink" onClick={handleApplyDiscount} disabled={!selectedOffer || isApplying} className="flex-1">
              {isApplying ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" /> : <Check className="mr-2 size-4" aria-hidden="true" />}
              Appliquer
            </Button>
          </div>
        </DarkScannerShell>
      </div>
    )
  }

  /* ---------------------------------- Scanner view ---------------------------------- */
  return (
    <div className="py-4">
      <DarkScannerShell eyebrow="Scanner QR" title="Scanne la" titleEm="carte VIP" nivMood="calm">
        {error && (
          <div role="alert" aria-live="assertive" className="flex items-center gap-3 rounded-xl border-2 border-destructive bg-danger-soft p-4">
            <AlertCircle className="size-5 shrink-0 text-destructive" aria-hidden="true" />
            <div className="flex-1">
              <p className="font-display font-bold text-ink">Erreur</p>
              <p className="text-sm text-ink-2">{error}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} aria-label="Fermer le message d'erreur" className="text-ink">
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>
        )}

        {isLoading && (
          <StickerCard className="items-center gap-3 p-12">
            <Loader2 className="size-12 animate-spin text-ink" aria-hidden="true" />
            <p className="font-display font-bold text-ink">Vérification en cours…</p>
          </StickerCard>
        )}

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
              <StickerCard className="items-center gap-4 p-8">
                {/* Viewfinder — coins-cibles roses animés (figés sous reduced-motion) */}
                <div className="relative grid aspect-square w-full max-w-xs place-items-center rounded-2xl bg-paper-2">
                  {(["left-3 top-3 border-l-4 border-t-4", "right-3 top-3 border-r-4 border-t-4", "bottom-3 left-3 border-b-4 border-l-4", "bottom-3 right-3 border-b-4 border-r-4"] as const).map((pos, i) => (
                    <span key={i} className={cn("absolute size-10 rounded-[4px] border-pink motion-safe:animate-pulse", pos)} aria-hidden="true" />
                  ))}
                  <QrCode className="size-20 text-mute" aria-hidden="true" />
                </div>
                <p className="text-center text-sm text-mute">Positionne le QR code de la carte VIP devant la caméra.</p>
                <Button variant="pink" onClick={() => setIsScanning(true)}>
                  <QrCode className="mr-2 size-4" aria-hidden="true" />
                  Activer le scanner
                </Button>
              </StickerCard>
            )}

            {/* Manual code */}
            <StickerCard className="gap-3 p-5">
              <div>
                <p className="font-display font-bold text-ink">Ou entre le numéro manuellement</p>
                <p className="font-mono text-xs text-mute">Le numéro se trouve sur la carte VIP du membre.</p>
              </div>
              <div className="flex gap-3">
                <label htmlFor="manual-card-code" className="sr-only">Numéro de carte VIP</label>
                <Input
                  id="manual-card-code"
                  placeholder="NIVY-XXXX-XXXX"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
                  aria-label="Numéro de carte VIP"
                  className="border-2 border-ink font-mono text-lg tracking-wider focus-visible:ring-0"
                />
                <Button variant="pink" onClick={handleManualSearch} disabled={isLoading}>
                  {isLoading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : "Valider"}
                </Button>
              </div>
            </StickerCard>

            {/* Help */}
            <StickerCard className="gap-2 p-5">
              <p className="font-display font-bold text-ink">Comment ça marche ?</p>
              <ol className="list-inside list-decimal space-y-1 text-sm text-ink-2">
                <li>Scanne la carte VIP du client</li>
                <li>Vérifie son identité</li>
                <li>Entre le montant de l'achat</li>
                <li>Sélectionne l'offre à appliquer</li>
                <li>Valide la réduction</li>
              </ol>
            </StickerCard>
          </>
        )}
      </DarkScannerShell>
    </div>
  )
}
