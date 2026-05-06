"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { QRScanner } from "@/components/qr-scanner"
import {
  QrCode,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
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
        toast.error("Veuillez selectionner un evenement")
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
          ? `Entree enregistree pour ${data.childName}`
          : `Sortie enregistree pour ${data.childName}`
      )

      // Refresh stats
      fetchStats()
    } catch (error) {
      console.error("QR scan error:", error)
      toast.error("Oups, ca a pas marche. On retente? 💪")
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

      toast.success(data.message || "Pass VIP valide!")
    } catch (error) {
      console.error("VIP pass scan error:", error)
      toast.error("Verification ratee. Reessaye?")
    } finally {
      setIsProcessing(false)
      setCheckInMode(null)
    }
  }

  const handleExport = async (format: "json" | "csv") => {
    if (!selectedEvent) {
      toast.error("Veuillez selectionner un evenement")
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
        toast.success("Export CSV telecharge")
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
        toast.success("Export JSON telecharge")
      }
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'export")
    } finally {
      setIsExporting(false)
    }
  }

  const handleManualSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Entrez une reference de reservation")
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch(
        `/api/check-in/search?reference=${encodeURIComponent(searchQuery)}&eventId=${selectedEvent}`
      )
      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || "Reservation non trouvee")
        return
      }

      setScannedData({
        ...data,
        scanType: "search"
      })
      toast.success("Reservation trouvee")
    } catch (error) {
      console.error("Manual search error:", error)
      toast.error("Recherche ratee. Retente?")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleManualCheckIn = async (mode: "in" | "out") => {
    if (!scannedData?.bookingId) {
      toast.error("Aucune reservation selectionnee")
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

      toast.success(mode === "in" ? "Entree enregistree" : "Sortie enregistree")
      playSuccessSound()
      fetchStats()
      setScannedData(null)
      setSearchQuery("")
    } catch (error) {
      console.error("Manual check-in error:", error)
      toast.error("Check-in rate. On retente? 💪")
    } finally {
      setIsProcessing(false)
    }
  }

  const playSuccessSound = () => {
    try {
      const audio = new Audio("/sounds/success.mp3")
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
      {/* Event Selection */}
      {events.length > 0 && (
        <Card className="p-6 bg-zinc-900 border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-white mb-2">
                Evenement actif
              </label>
              <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800 w-full max-w-md">
                  <SelectValue placeholder="Selectionner un evenement" />
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
              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport("csv")}
                  disabled={isExporting}
                  className="border-zinc-700"
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-1" />
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
        </Card>
      )}

      {/* Real-time Stats */}
      {selectedEvent && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/30 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-blue-400">Reservations</p>
                <p className="text-2xl font-black text-white">{stats.stats.totalBookings}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/30 flex items-center justify-center">
                <LogIn className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-green-400">A l'interieur</p>
                <p className="text-2xl font-black text-white">{stats.stats.currentlyInside}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/30 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-purple-400">Total entrees</p>
                <p className="text-2xl font-black text-white">{stats.stats.totalCheckedIn}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-orange-500/20 to-red-500/20 border-orange-500/30">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-500/30 flex items-center justify-center">
                <LogOut className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-orange-400">Sorties</p>
                <p className="text-2xl font-black text-white">{stats.stats.checkedOut}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Capacity Bar */}
      {stats && stats.event.capacity > 0 && (
        <Card className="p-4 bg-zinc-900 border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-400">Capacite</span>
            <span className="text-sm font-semibold text-white">
              {stats.stats.currentlyInside} / {stats.event.capacity}
            </span>
          </div>
          <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-500",
                stats.stats.capacityPercentage > 90
                  ? "bg-red-500"
                  : stats.stats.capacityPercentage > 70
                    ? "bg-orange-500"
                    : "bg-green-500"
              )}
              style={{ width: `${Math.min(stats.stats.capacityPercentage, 100)}%` }}
            />
          </div>
          {stats.stats.capacityPercentage > 90 && (
            <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Capacite presque atteinte
            </p>
          )}
        </Card>
      )}

      {/* Scan Mode Selection */}
      {!checkInMode && selectedEvent && (
        <div className="grid lg:grid-cols-3 gap-6">
          <Card
            className="p-8 bg-zinc-900 border-zinc-800 hover:border-green-500/50 transition-all cursor-pointer group"
            onClick={() => setCheckInMode("in")}
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <QrCode className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-3">Entree</h2>
              <p className="text-zinc-400 text-sm mb-5">
                Scannez le QR code du billet pour enregistrer l'arrivee
              </p>
              <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600">
                <Camera className="w-4 h-4 mr-2" />
                Scanner entree
              </Button>
            </div>
          </Card>

          <Card
            className="p-8 bg-zinc-900 border-zinc-800 hover:border-orange-500/50 transition-all cursor-pointer group"
            onClick={() => setCheckInMode("out")}
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <QrCode className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-3">Sortie</h2>
              <p className="text-zinc-400 text-sm mb-5">
                Scannez le QR code et verifiez l'autorisation parentale
              </p>
              <Button className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
                <Camera className="w-4 h-4 mr-2" />
                Scanner sortie
              </Button>
            </div>
          </Card>

          <Card
            className="p-8 bg-zinc-900 border-zinc-800 hover:border-purple-500/50 transition-all cursor-pointer group"
            onClick={() => setCheckInMode("vip")}
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Crown className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-3">Pass VIP</h2>
              <p className="text-zinc-400 text-sm mb-5">
                Verifiez un pass VIP et ses avantages
              </p>
              <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                <Crown className="w-4 h-4 mr-2" />
                Verifier Pass
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* QR Scanner */}
      {checkInMode && (
        <div className="space-y-4">
          <div className={cn(
            "p-4 rounded-lg text-center font-semibold",
            checkInMode === "in"
              ? "bg-green-500/20 text-green-400 border border-green-500/30"
              : checkInMode === "out"
                ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                : "bg-purple-500/20 text-purple-400 border border-purple-500/30"
          )}>
            {checkInMode === "in" ? "Mode ENTREE" : checkInMode === "out" ? "Mode SORTIE" : "Mode PASS VIP"}
          </div>

          <QRScanner
            onScan={handleQRScan}
            onClose={() => setCheckInMode(null)}
            onError={(error) => toast.error(error)}
          />

          <Button
            variant="outline"
            onClick={() => setCheckInMode(null)}
            className="w-full border-zinc-700"
          >
            Annuler
          </Button>
        </div>
      )}

      {/* Manual Search */}
      <Card className="p-6 bg-zinc-900 border-zinc-800">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Search className="h-5 w-5 text-cyan-400" />
          Recherche manuelle
        </h3>
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <Input
              placeholder="Reference QR ou nom..."
              className="pl-10 bg-zinc-950 border-zinc-800"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
            />
          </div>
          <Button
            variant="outline"
            className="bg-transparent border-cyan-500 text-cyan-400"
            onClick={handleManualSearch}
            disabled={isProcessing}
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Rechercher"}
          </Button>
        </div>
      </Card>

      {/* Scanned Result */}
      {scannedData && (
        <Card className="p-6 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/30">
          <div className="flex items-start gap-4">
            {scannedData.childPhoto ? (
              <Image
                src={scannedData.childPhoto}
                alt=""
                width={80}
                height={80}
                className="w-20 h-20 rounded-xl object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                <User className="w-10 h-10 text-white" />
              </div>
            )}
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-2">
                {scannedData.childName}
              </h3>
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-zinc-400">Age</p>
                  <p className="text-white font-semibold">{scannedData.age} ans</p>
                </div>
                <div>
                  <p className="text-zinc-400">Type de billet</p>
                  <p className="text-white font-semibold uppercase">{scannedData.ticketType}</p>
                </div>
                <div>
                  <p className="text-zinc-400">Parent</p>
                  <p className="text-white font-semibold">{scannedData.parentName}</p>
                </div>
                <div>
                  <p className="text-zinc-400">Telephone</p>
                  <p className="text-white font-semibold">{scannedData.parentPhone}</p>
                </div>
              </div>

              {/* Status badges */}
              <div className="flex flex-wrap gap-2 mt-4">
                {scannedData.checkedIn && (
                  <div className="bg-green-500/20 border border-green-500/30 rounded-lg px-3 py-1 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 text-sm">Entree a {formatTime(scannedData.checkedInAt)}</span>
                  </div>
                )}
                {scannedData.checkedOut && (
                  <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg px-3 py-1 flex items-center gap-2">
                    <LogOut className="w-4 h-4 text-orange-400" />
                    <span className="text-orange-400 text-sm">Sorti a {formatTime(scannedData.checkedOutAt)}</span>
                  </div>
                )}
                {scannedData.photoConsent === false && (
                  <div className="bg-red-500/20 border border-red-500/30 rounded-lg px-3 py-1 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="text-red-400 text-sm">NO-PHOTO</span>
                  </div>
                )}
                {scannedData.age < 16 && (
                  <div className="bg-amber-500/20 border border-amber-500/30 rounded-lg px-3 py-1">
                    <span className="text-amber-400 text-sm font-semibold">{"<"}16 ANS</span>
                  </div>
                )}
                {scannedData.hasAuthorization && (
                  <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg px-3 py-1 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-purple-400" />
                    <span className="text-purple-400 text-sm">
                      Autorise: {scannedData.authorizedPerson}
                    </span>
                  </div>
                )}
              </div>

              {/* Manual check-in buttons */}
              {scannedData.scanType === "search" && (
                <div className="flex gap-3 mt-4">
                  {!scannedData.checkedIn && (
                    <Button
                      onClick={() => handleManualCheckIn("in")}
                      disabled={isProcessing}
                      className="bg-gradient-to-r from-green-500 to-emerald-500"
                    >
                      <LogIn className="w-4 h-4 mr-2" />
                      Valider entree
                    </Button>
                  )}
                  {scannedData.checkedIn && !scannedData.checkedOut && (
                    <Button
                      onClick={() => handleManualCheckIn("out")}
                      disabled={isProcessing}
                      className="bg-gradient-to-r from-orange-500 to-red-500"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Valider sortie
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* VIP Pass Result */}
      {vipPassData && (
        <Card className={cn(
          "p-6 border",
          vipPassData.isValid
            ? "bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30"
            : "bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/30"
        )}>
          <div className="flex items-start gap-4">
            <div className={cn(
              "w-20 h-20 rounded-xl flex items-center justify-center flex-shrink-0",
              vipPassData.isValid
                ? "bg-gradient-to-br from-purple-500 to-pink-500"
                : "bg-gradient-to-br from-red-500 to-orange-500"
            )}>
              <Crown className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl font-bold text-white">
                  {vipPassData.holder?.name || "Pass VIP"}
                </h3>
                {vipPassData.isValid ? (
                  <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs font-semibold">
                    VALIDE
                  </span>
                ) : (
                  <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded-full text-xs font-semibold">
                    INVALIDE
                  </span>
                )}
              </div>

              {vipPassData.type === "vip_pass" && vipPassData.pass && (
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-zinc-400">Numero de carte</p>
                    <p className="text-white font-semibold font-mono">{vipPassData.pass.cardNumber}</p>
                  </div>
                  <div>
                    <p className="text-zinc-400">Tier</p>
                    <p className="text-white font-semibold">{vipPassData.pass.tier}</p>
                  </div>
                  <div>
                    <p className="text-zinc-400">Age</p>
                    <p className="text-white font-semibold">{vipPassData.holder?.age} ans</p>
                  </div>
                  <div>
                    <p className="text-zinc-400">Expire le</p>
                    <p className="text-white font-semibold">
                      {new Date(vipPassData.pass.endDate).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>
              )}

              {/* Discount display */}
              {vipPassData.applicableDiscount > 0 && (
                <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                  <div className="flex items-center gap-2">
                    <Percent className="w-5 h-5 text-purple-400" />
                    <span className="text-purple-300 font-semibold">
                      Reduction applicable: {vipPassData.applicableDiscount}%
                    </span>
                  </div>
                </div>
              )}

              {/* Benefits */}
              {vipPassData.pass?.benefits && vipPassData.pass.benefits.length > 0 && (
                <div className="mt-4">
                  <p className="text-zinc-400 text-xs mb-2">Avantages</p>
                  <div className="flex flex-wrap gap-2">
                    {vipPassData.pass.benefits.map((benefit: string, index: number) => (
                      <span
                        key={index}
                        className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full text-xs"
                      >
                        {benefit}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Error message */}
              {!vipPassData.isValid && vipPassData.error && (
                <div className="mt-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30">
                  <p className="text-red-400 text-sm">{vipPassData.error}</p>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                className="mt-4 border-zinc-700"
                onClick={() => setVipPassData(null)}
              >
                Fermer
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Recent Check-ins */}
      {stats && stats.recentCheckIns.length > 0 && (
        <Card className="p-6 bg-zinc-900 border-zinc-800">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-zinc-400" />
            Derniers check-ins
          </h3>
          <div className="space-y-2">
            {stats.recentCheckIns.map((checkIn) => (
              <div
                key={checkIn.id}
                className="flex items-center justify-between p-3 rounded-lg bg-zinc-950"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center",
                    checkIn.status === "in"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-orange-500/20 text-orange-400"
                  )}>
                    {checkIn.status === "in" ? <LogIn className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
                  </div>
                  <span className="text-white font-medium">{checkIn.teenName}</span>
                </div>
                <span className="text-sm text-zinc-500">
                  {formatTime(checkIn.status === "out" ? checkIn.checkedOutAt! : checkIn.checkedInAt)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Exit Procedure */}
      <Card className="p-6 bg-cyan-500/10 border-cyan-500/30">
        <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-cyan-400" />
          Procedure de sortie
        </h4>
        <ol className="text-sm text-zinc-300 space-y-2 list-decimal list-inside">
          <li>Scanner le QR code du billet ou entrer la reference</li>
          <li>Verifier l'identite de la personne qui recupere l'enfant</li>
          <li>Si ce n'est pas le parent, verifier l'autorisation parentale</li>
          <li>Demander une piece d'identite et verifier la correspondance</li>
          <li>Valider la sortie dans le systeme</li>
        </ol>
      </Card>
    </div>
  )
}
