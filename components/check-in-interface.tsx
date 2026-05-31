"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { StickerCard } from "@/components/ui/sticker-card"
import { StatCard } from "@/components/admin/stat-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Confetti } from "@/components/ui/effects/confetti"
import { SegmentedProgress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { QRScanner } from "@/components/qr-scanner"
import {
  QrCode,
  Search,
  AlertTriangle,
  Check,
  User,
  Users,
  LogIn,
  LogOut,
  Clock,
  RefreshCw,
  Camera,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Crown,
  Download,
  Percent
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface CheckInInterfaceProps {
  events: any[]
  adminId: string
}

interface CheckInStats {
  event: {
    id: string
    title: string
    capacity: number
    date: string
  }
  stats: {
    totalBookings: number
    totalCheckedIn: number
    currentlyInside: number
    checkedOut: number
    capacityPercentage: number
  }
  recentCheckIns: {
    id: string
    teenName: string
    checkedInAt: string
    checkedOutAt: string | null
    status: "in" | "out"
  }[]
}

export function CheckInInterface({ events, adminId }: CheckInInterfaceProps) {
  const [selectedEvent, setSelectedEvent] = useState("")
  const [checkInMode, setCheckInMode] = useState<"in" | "out" | "vip" | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [scannedData, setScannedData] = useState<any>(null)
  const [vipPassData, setVipPassData] = useState<any>(null)
  const [stats, setStats] = useState<CheckInStats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  // Fetch stats when event is selected
  const fetchStats = useCallback(async () => {
    if (!selectedEvent) return

    setIsLoadingStats(true)
    try {
      const response = await fetch(`/api/check-in/stats?eventId=${selectedEvent}`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setIsLoadingStats(false)
    }
  }, [selectedEvent])

  useEffect(() => {
    fetchStats()
    // Auto-refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [fetchStats])

  const handleQRScan = async (qrData: string) => {
    if (isProcessing) return

    setIsProcessing(true)
    try {
      // Check if this is a VIP Pass QR code
      if (qrData.startsWith("VIPPASS:") || checkInMode === "vip") {
        await handleVIPPassScan(qrData)
        return
      }

      // Parse QR code format: TEENSPARTY:eventId:bookingId or just bookingId
      let eventId = selectedEvent
      let bookingTicketId = qrData

      if (qrData.startsWith("TEENSPARTY:")) {
        const parts = qrData.split(":")
        if (parts.length >= 3) {
          eventId = parts[1]
          bookingTicketId = parts[2]
        }
      }

      if (!eventId) {
        toast.error("Veuillez sélectionner un événement")
        return
      }

      const endpoint = checkInMode === "in" ? "/api/check-in/entry" : "/api/check-in/exit"

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingTicketId,
          eventId,
          adminId,
          checkInMethod: "qr_scan",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || "Erreur lors du check-in")
        return
      }

      setScannedData({
        ...data,
        scanType: checkInMode
      })
      setVipPassData(null)
      setLastScanTime(new Date())

      // Play success sound
      playSuccessSound()

      toast.success(
        checkInMode === "in"
          ? `Entrée enregistrée pour ${data.childName}`
          : `Sortie enregistrée pour ${data.childName}`
      )

      // Refresh stats
      fetchStats()
    } catch (error) {
      console.error("QR scan error:", error)
      toast.error("Oups, ça n'a pas marché. On retente ? 💪")
    } finally {
      setIsProcessing(false)
      setCheckInMode(null)
    }
  }

  const handleVIPPassScan = async (qrData: string) => {
    try {
      const response = await fetch("/api/check-in/verify-pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrData,
          eventId: selectedEvent,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || "Pass VIP invalide")
        return
      }

      if (!data.success) {
        toast.error(data.error || "Pass non valide")
        setVipPassData({
          ...data,
          isValid: false
        })
        return
      }

      setVipPassData({
        ...data,
        isValid: true
      })
      setScannedData(null)
      setLastScanTime(new Date())

      // Play success sound
      playSuccessSound()

      toast.success(data.message || "Pass VIP valide !")
    } catch (error) {
      console.error("VIP pass scan error:", error)
      toast.error("Vérification ratée. Réessaye ?")
    } finally {
      setIsProcessing(false)
      setCheckInMode(null)
    }
  }

  const handleExport = async (format: "json" | "csv") => {
    if (!selectedEvent) {
      toast.error("Veuillez sélectionner un événement")
      return
    }

    setIsExporting(true)
    try {
      const response = await fetch(
        `/api/check-in/export?eventId=${selectedEvent}&format=${format}`
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Erreur lors de l'export")
      }

      if (format === "csv") {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `checkin-export-${new Date().toISOString().split("T")[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        toast.success("Export CSV téléchargé")
      } else {
        const data = await response.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `checkin-export-${new Date().toISOString().split("T")[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        toast.success("Export JSON téléchargé")
      }
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'export")
    } finally {
      setIsExporting(false)
    }
  }

  const handleManualSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Entrez une référence de réservation")
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch(
        `/api/check-in/search?reference=${encodeURIComponent(searchQuery)}&eventId=${selectedEvent}`
      )
      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || "Réservation non trouvée")
        return
      }

      setScannedData({
        ...data,
        scanType: "search"
      })
      toast.success("Réservation trouvée")
    } catch (error) {
      console.error("Manual search error:", error)
      toast.error("Recherche ratée. Retente ?")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleManualCheckIn = async (mode: "in" | "out") => {
    if (!scannedData?.bookingId) {
      toast.error("Aucune réservation sélectionnée")
      return
    }

    setIsProcessing(true)
    try {
      const endpoint = mode === "in" ? "/api/check-in/entry" : "/api/check-in/exit"

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingTicketId: scannedData.bookingId,
          eventId: selectedEvent,
          adminId,
          checkInMethod: "manual",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || "Erreur")
        return
      }

      toast.success(mode === "in" ? "Entrée enregistrée" : "Sortie enregistrée")
      playSuccessSound()
      fetchStats()
      setScannedData(null)
      setSearchQuery("")
    } catch (error) {
      console.error("Manual check-in error:", error)
      toast.error("Check-in raté. On retente ? 💪")
    } finally {
      setIsProcessing(false)
    }
  }

  const playSuccessSound = () => {
    try {
      const audio = new Audio("/sounds/success.wav")
      audio.volume = 0.3
      audio.play().catch(() => {
        // Audio feedback is optional.
      })
    } catch {
      // Audio feedback is optional.
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  return (
    <div className="space-y-6">
      {/* Confettis de succès — rejoués à chaque scan validé (présentation). */}
      {lastScanTime ? (
        <Confetti key={lastScanTime.getTime()} trigger palette="success" />
      ) : null}

      {/* Event Selection — pills mono */}
      {events.length > 0 && (
        <StickerCard className="gap-3 p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex-1">
              <label className="eyebrow tracking-[0.14em] mb-2 block text-mute">
                Événement actif
              </label>
              <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                <SelectTrigger className="w-full max-w-md border-2 border-ink bg-white font-mono">
                  <SelectValue placeholder="Sélectionner un événement" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.title} - {event.venue_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedEvent && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport("csv")}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Download className="mr-1 h-4 w-4" />
                      CSV
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={fetchStats}
                  disabled={isLoadingStats}
                >
                  <RefreshCw className={cn("h-4 w-4", isLoadingStats && "animate-spin")} />
                </Button>
              </div>
            )}
          </div>
        </StickerCard>
      )}

      {/* Real-time Stats */}
      {selectedEvent && stats && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Réservations" value={stats.stats.totalBookings} tone="teal" icon={<Users className="h-5 w-5" />} />
          <StatCard label="À l'intérieur" value={stats.stats.currentlyInside} tone="lime" icon={<LogIn className="h-5 w-5" />} />
          <StatCard label="Total entrées" value={stats.stats.totalCheckedIn} tone="paper" icon={<QrCode className="h-5 w-5" />} />
          <StatCard label="Sorties" value={stats.stats.checkedOut} tone="coral" icon={<LogOut className="h-5 w-5" />} />
        </div>
      )}

      {/* Capacity Bar — segmentée */}
      {stats && stats.event.capacity > 0 && (
        <StickerCard className="gap-2 p-4">
          <div className="flex items-center justify-between">
            <span className="eyebrow tracking-[0.14em] text-mute">Capacité</span>
            <span className="font-mono text-sm font-bold text-ink">
              {stats.stats.currentlyInside} / {stats.event.capacity}
            </span>
          </div>
          <SegmentedProgress
            steps={10}
            current={Math.min(Math.round((stats.stats.capacityPercentage / 100) * 10), 10)}
          />
          {stats.stats.capacityPercentage > 90 && (
            <p className="mt-1 flex items-center gap-1 text-xs text-coral">
              <AlertTriangle className="h-3 w-3" />
              Capacité presque atteinte
            </p>
          )}
        </StickerCard>
      )}

      {/* Scan Mode Selection */}
      {!checkInMode && selectedEvent && (
        <div className="grid gap-6 lg:grid-cols-3">
          <StickerCard
            variant="hover"
            className="items-center p-8 text-center"
            onClick={() => setCheckInMode("in")}
          >
            <div className="mb-5 grid h-20 w-20 place-items-center rounded-full border-2 border-ink bg-lime">
              <QrCode className="h-10 w-10 text-ink" />
            </div>
            <h2 className="mb-3 font-display text-xl font-bold text-ink">Entrée</h2>
            <p className="mb-5 text-sm text-mute">
              Scannez le QR code du billet pour enregistrer l&apos;arrivée.
            </p>
            <Button variant="pink" className="w-full">
              <Camera className="mr-2 h-4 w-4" />
              Scanner entrée
            </Button>
          </StickerCard>

          <StickerCard
            variant="hover"
            className="items-center p-8 text-center"
            onClick={() => setCheckInMode("out")}
          >
            <div className="mb-5 grid h-20 w-20 place-items-center rounded-full border-2 border-ink bg-coral">
              <QrCode className="h-10 w-10 text-ink" />
            </div>
            <h2 className="mb-3 font-display text-xl font-bold text-ink">Sortie</h2>
            <p className="mb-5 text-sm text-mute">
              Scannez le QR code et vérifiez l&apos;autorisation parentale.
            </p>
            <Button variant="pink" className="w-full">
              <Camera className="mr-2 h-4 w-4" />
              Scanner sortie
            </Button>
          </StickerCard>

          <StickerCard
            variant="hover"
            className="items-center p-8 text-center"
            onClick={() => setCheckInMode("vip")}
          >
            <div className="mb-5 grid h-20 w-20 place-items-center rounded-full border-2 border-ink bg-pink">
              <Crown className="h-10 w-10 text-ink" />
            </div>
            <h2 className="mb-3 font-display text-xl font-bold text-ink">Pass VIP</h2>
            <p className="mb-5 text-sm text-mute">Vérifiez un pass VIP et ses avantages.</p>
            <Button variant="pink" className="w-full">
              <Crown className="mr-2 h-4 w-4" />
              Vérifier Pass
            </Button>
          </StickerCard>
        </div>
      )}

      {/* QR Scanner */}
      {checkInMode && (
        <div className="space-y-4">
          <div className="rounded-xl border-2 border-ink bg-ink px-4 py-3 text-center font-mono text-sm font-bold uppercase tracking-[0.14em] text-paper">
            {checkInMode === "in" ? "Mode entrée" : checkInMode === "out" ? "Mode sortie" : "Mode pass VIP"}
          </div>

          <QRScanner
            onScan={handleQRScan}
            onClose={() => setCheckInMode(null)}
            onError={(error) => toast.error(error)}
          />

          <Button variant="outline" onClick={() => setCheckInMode(null)} className="w-full">
            Annuler
          </Button>
        </div>
      )}

      {/* Manual Search */}
      <StickerCard className="gap-4 p-6">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
          <Search className="h-5 w-5 text-teal" />
          Recherche manuelle
        </h3>
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-mute" />
            <Input
              placeholder="Référence QR ou nom…"
              className="border-2 border-ink bg-white pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
            />
          </div>
          <Button variant="outline" onClick={handleManualSearch} disabled={isProcessing}>
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Rechercher"}
          </Button>
        </div>
      </StickerCard>

      {/* Scanned Result */}
      {scannedData && (
        <StickerCard className="gap-0 p-6">
          <div className="flex items-start gap-4">
            {scannedData.childPhoto ? (
              <Image
                src={scannedData.childPhoto}
                alt=""
                width={80}
                height={80}
                className="h-20 w-20 rounded-xl border-2 border-ink object-cover"
              />
            ) : (
              <div className="grid h-20 w-20 flex-shrink-0 place-items-center rounded-xl border-2 border-ink bg-paper-2">
                <User className="h-10 w-10 text-ink" />
              </div>
            )}
            <div className="flex-1">
              <h3 className="mb-2 font-display text-xl font-bold text-ink">{scannedData.childName}</h3>
              <div className="grid gap-3 text-sm md:grid-cols-2">
                <div>
                  <p className="text-mute">Âge</p>
                  <p className="font-semibold text-ink">{scannedData.age} ans</p>
                </div>
                <div>
                  <p className="text-mute">Type de billet</p>
                  <p className="font-mono font-semibold uppercase text-ink">{scannedData.ticketType}</p>
                </div>
                <div>
                  <p className="text-mute">Parent</p>
                  <p className="font-semibold text-ink">{scannedData.parentName}</p>
                </div>
                <div>
                  <p className="text-mute">Téléphone</p>
                  <p className="font-mono font-semibold text-ink">{scannedData.parentPhone}</p>
                </div>
              </div>

              {/* Status badges */}
              <div className="mt-4 flex flex-wrap gap-2">
                {scannedData.checkedIn && (
                  <span className="flex items-center gap-2 rounded-full border-2 border-ink bg-lime/15 px-3 py-1">
                    <span className="grid size-5 place-items-center rounded-full bg-lime">
                      <Check className="size-3 text-ink" strokeWidth={4} />
                    </span>
                    <span className="text-sm text-ink">Entrée à {formatTime(scannedData.checkedInAt)}</span>
                  </span>
                )}
                {scannedData.checkedOut && (
                  <span className="flex items-center gap-2 rounded-full border-2 border-ink bg-coral/15 px-3 py-1">
                    <LogOut className="h-4 w-4 text-coral" />
                    <span className="text-sm text-ink">Sorti à {formatTime(scannedData.checkedOutAt)}</span>
                  </span>
                )}
                {scannedData.photoConsent === false && (
                  <span className="flex items-center gap-2 rounded-full border-2 border-ink bg-coral/15 px-3 py-1">
                    <AlertTriangle className="h-4 w-4 text-coral" />
                    <span className="font-mono text-xs font-bold uppercase text-coral">No-photo</span>
                  </span>
                )}
                {scannedData.age < 16 && (
                  <span className="rounded-full border-2 border-ink bg-gold/15 px-3 py-1">
                    <span className="font-mono text-xs font-bold uppercase text-gold">&lt;16 ans</span>
                  </span>
                )}
                {scannedData.hasAuthorization && (
                  <span className="flex items-center gap-2 rounded-full border-2 border-ink bg-pink/15 px-3 py-1">
                    <ShieldCheck className="h-4 w-4 text-pink" />
                    <span className="text-sm text-ink">Autorisé : {scannedData.authorizedPerson}</span>
                  </span>
                )}
              </div>

              {/* Manual check-in buttons */}
              {scannedData.scanType === "search" && (
                <div className="mt-4 flex gap-3">
                  {!scannedData.checkedIn && (
                    <Button onClick={() => handleManualCheckIn("in")} disabled={isProcessing} variant="pink">
                      <LogIn className="mr-2 h-4 w-4" />
                      Valider entrée
                    </Button>
                  )}
                  {scannedData.checkedIn && !scannedData.checkedOut && (
                    <Button onClick={() => handleManualCheckIn("out")} disabled={isProcessing} variant="outline">
                      <LogOut className="mr-2 h-4 w-4" />
                      Valider sortie
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </StickerCard>
      )}

      {/* VIP Pass Result */}
      {vipPassData && (
        <StickerCard className={cn("gap-0 p-6", vipPassData.isValid ? "border-pink" : "border-coral")}>
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "grid h-20 w-20 flex-shrink-0 place-items-center rounded-xl border-2 border-ink",
                vipPassData.isValid ? "bg-pink" : "bg-coral"
              )}
            >
              <Crown className="h-10 w-10 text-ink" />
            </div>
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-3">
                <h3 className="font-display text-xl font-bold text-ink">
                  {vipPassData.holder?.name || "Pass VIP"}
                </h3>
                {vipPassData.isValid ? (
                  <span className="rounded-full border-2 border-ink bg-lime/15 px-2 py-1 font-mono text-xs font-bold uppercase text-lime">
                    Valide
                  </span>
                ) : (
                  <span className="rounded-full border-2 border-ink bg-coral/15 px-2 py-1 font-mono text-xs font-bold uppercase text-coral">
                    Invalide
                  </span>
                )}
              </div>

              {vipPassData.type === "vip_pass" && vipPassData.pass && (
                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <div>
                    <p className="text-mute">Numéro de carte</p>
                    <p className="font-mono font-semibold text-ink">{vipPassData.pass.cardNumber}</p>
                  </div>
                  <div>
                    <p className="text-mute">Tier</p>
                    <p className="font-semibold text-ink">{vipPassData.pass.tier}</p>
                  </div>
                  <div>
                    <p className="text-mute">Âge</p>
                    <p className="font-semibold text-ink">{vipPassData.holder?.age} ans</p>
                  </div>
                  <div>
                    <p className="text-mute">Expire le</p>
                    <p className="font-mono font-semibold text-ink">
                      {new Date(vipPassData.pass.endDate).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>
              )}

              {/* Discount display */}
              {vipPassData.applicableDiscount > 0 && (
                <div className="mt-4 rounded-xl border-2 border-ink bg-pink/15 p-3">
                  <div className="flex items-center gap-2">
                    <Percent className="h-5 w-5 text-pink" />
                    <span className="font-semibold text-ink">
                      Réduction applicable : {vipPassData.applicableDiscount}%
                    </span>
                  </div>
                </div>
              )}

              {/* Benefits */}
              {vipPassData.pass?.benefits && vipPassData.pass.benefits.length > 0 && (
                <div className="mt-4">
                  <p className="eyebrow tracking-[0.14em] mb-2 text-mute">Avantages</p>
                  <div className="flex flex-wrap gap-2">
                    {vipPassData.pass.benefits.map((benefit: string, index: number) => (
                      <span
                        key={index}
                        className="rounded-full border-2 border-ink bg-pink/15 px-2 py-1 text-xs text-ink"
                      >
                        {benefit}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Error message */}
              {!vipPassData.isValid && vipPassData.error && (
                <div className="mt-4 rounded-xl border-2 border-coral/40 bg-coral/10 p-3">
                  <p className="text-sm text-coral">{vipPassData.error}</p>
                </div>
              )}

              <Button variant="outline" size="sm" className="mt-4" onClick={() => setVipPassData(null)}>
                Fermer
              </Button>
            </div>
          </div>
        </StickerCard>
      )}

      {/* Recent Check-ins */}
      {stats && stats.recentCheckIns.length > 0 && (
        <StickerCard className="gap-4 p-6">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
            <Clock className="h-5 w-5 text-mute" />
            Derniers check-ins
          </h3>
          <div className="space-y-2">
            {stats.recentCheckIns.map((checkIn) => (
              <div
                key={checkIn.id}
                className="flex items-center justify-between rounded-xl border-2 border-ink bg-white p-3 shadow-stkr-sm"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "grid h-8 w-8 place-items-center rounded-full border-2 border-ink",
                      checkIn.status === "in" ? "bg-lime/15 text-lime" : "bg-coral/15 text-coral"
                    )}
                  >
                    {checkIn.status === "in" ? <LogIn className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
                  </div>
                  <span className="font-medium text-ink">{checkIn.teenName}</span>
                </div>
                <span className="font-mono text-sm text-mute">
                  {formatTime(checkIn.status === "out" ? checkIn.checkedOutAt! : checkIn.checkedInAt)}
                </span>
              </div>
            ))}
          </div>
        </StickerCard>
      )}

      {/* Exit Procedure */}
      <StickerCard className="gap-3 p-6">
        <h4 className="flex items-center gap-2 font-display font-bold text-ink">
          <ShieldAlert className="h-5 w-5 text-teal" />
          Procédure de sortie
        </h4>
        <ol className="list-inside list-decimal space-y-2 text-sm text-ink-2">
          <li>Scanner le QR code du billet ou entrer la référence</li>
          <li>Vérifier l&apos;identité de la personne qui récupère l&apos;enfant</li>
          <li>Si ce n&apos;est pas le parent, vérifier l&apos;autorisation parentale</li>
          <li>Demander une pièce d&apos;identité et vérifier la correspondance</li>
          <li>Valider la sortie dans le système</li>
        </ol>
      </StickerCard>
    </div>
  )
}
