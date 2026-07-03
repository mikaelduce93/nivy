"use client"

import { useEffect, useState, useCallback } from "react"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createClient } from "@/lib/supabase/client"
import { StickerCard } from "@/components/ui/sticker-card"
import { Button } from "@/components/ui/button"
import { Niv, DarkSurface } from "@/components/brand"
import {
  Clock,
  MapPin,
  CheckCircle2,
  LogOut,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  Calendar,
  Phone,
  Shield,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { EmptyState } from "@/components/ui/states/empty-state"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"

interface TeenStatus {
  teenId: string
  teenName: string
  pseudo: string
  avatarUrl: string | null
  eventId: string | null
  eventTitle: string | null
  eventVenue: string | null
  status: "not_at_event" | "checked_in" | "checked_out"
  checkedInAt: string | null
  checkedOutAt: string | null
  photoConsent: boolean
}

interface TimelineEvent {
  id: string
  type: "check_in" | "check_out" | "activity"
  time: string
  description: string
  teenName: string
}

interface EventPhoto {
  id: string
  url: string
  timestamp: string
}

export default function ParentLiveDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [teenStatuses, setTeenStatuses] = useState<TeenStatus[]>([])
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [photos, setPhotos] = useState<EventPhoto[]>([])
  const [earlyCheckoutDialogOpen, setEarlyCheckoutDialogOpen] = useState(false)
  const [selectedTeen, setSelectedTeen] = useState<TeenStatus | null>(null)
  const [requestingCheckout, setRequestingCheckout] = useState(false)

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get parent's profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single()

      if (!profile) return

      // #35 — teens real columns (no user_id/photo_consent; name is
      // first_name/last_name; no profiles:user_id join).
      const { data: parentTeens } = await supabase
        .from("parent_teen_links")
        .select(`
          teen_id,
          teens:teen_id(
            id,
            first_name,
            last_name,
            pseudo,
            avatar_url
          )
        `)
        .eq("parent_id", profile.id)
        .eq("status", "active")

      if (!parentTeens || parentTeens.length === 0) {
        setTeenStatuses([])
        setLoading(false)
        return
      }

      // Get today's events and check-ins
      const today = new Date().toISOString().split("T")[0]
      const teenIds = parentTeens.map((pt: any) => pt.teen_id)

      // Get active check-ins for today
      const { data: checkIns } = await supabase
        .from("event_check_ins")
        .select(`
          id,
          teen_id,
          event_id,
          checked_in_at,
          checked_out_at,
          events:event_id(title, address, city)
        `)
        .in("teen_id", teenIds)
        .gte("checked_in_at", `${today}T00:00:00`)
        .order("checked_in_at", { ascending: false })

      // Build teen statuses
      const statuses: TeenStatus[] = parentTeens.map((pt: any) => {
        const teenCheckIn = checkIns?.find((c: any) => c.teen_id === pt.teen_id)
        const teenName =
          `${pt.teens?.first_name ?? ""} ${pt.teens?.last_name ?? ""}`.trim() || "Inconnu"
        const pseudo = pt.teens?.pseudo || ""
        const avatarUrl = pt.teens?.avatar_url || null
        // #35 — teens has no photo_consent column; default to false
        // (least-privilege) until a real consent source is wired.
        const photoConsent = false

        if (!teenCheckIn) {
          return {
            teenId: pt.teen_id,
            teenName,
            pseudo,
            avatarUrl,
            eventId: null,
            eventTitle: null,
            eventVenue: null,
            status: "not_at_event" as const,
            checkedInAt: null,
            checkedOutAt: null,
            photoConsent,
          }
        }

        return {
          teenId: pt.teen_id,
          teenName,
          pseudo,
          avatarUrl,
          eventId: teenCheckIn.event_id,
          eventTitle: teenCheckIn.events?.title || "Événement",
          eventVenue: [teenCheckIn.events?.address, teenCheckIn.events?.city].filter(Boolean).join(", "),
          status: teenCheckIn.checked_out_at ? "checked_out" as const : "checked_in" as const,
          checkedInAt: teenCheckIn.checked_in_at,
          checkedOutAt: teenCheckIn.checked_out_at,
          photoConsent,
        }
      })

      setTeenStatuses(statuses)

      // Build timeline
      const timelineEvents: TimelineEvent[] = []
      checkIns?.forEach((checkIn: any) => {
        const teen = parentTeens.find((pt: any) => pt.teen_id === checkIn.teen_id)
        const teenName =
          `${teen?.teens?.first_name ?? ""} ${teen?.teens?.last_name ?? ""}`.trim() || "Inconnu"

        if (checkIn.checked_in_at) {
          timelineEvents.push({
            id: `${checkIn.id}-in`,
            type: "check_in",
            time: checkIn.checked_in_at,
            description: `Arrivée à ${checkIn.events?.title || "l'événement"}`,
            teenName,
          })
        }
        if (checkIn.checked_out_at) {
          timelineEvents.push({
            id: `${checkIn.id}-out`,
            type: "check_out",
            time: checkIn.checked_out_at,
            description: `Départ de ${checkIn.events?.title || "l'événement"}`,
            teenName,
          })
        }
      })

      // Sort by time descending
      timelineEvents.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      setTimeline(timelineEvents)

      // Charge les photos publiques liees aux evenements actifs du teen,
      // uniquement si au moins un teen a accorde son consentement photo.
      const consentedTeenHasActiveEvent = statuses.some(
        (s) => s.photoConsent && s.eventId
      )
      const activeEventIds = Array.from(
        new Set(
          statuses
            .filter((s) => s.photoConsent && s.eventId)
            .map((s) => s.eventId as string)
        )
      )

      // #35 — @deprecated: the event photo gallery (photo_galleries /
      // photo_gallery_items) has no tables in the schema. Keep the empty state
      // until a real gallery model exists; do not query phantom tables.
      void consentedTeenHasActiveEvent
      void activeEventIds
      setPhotos([])

    } catch (error) {
      console.error("Error fetching live data:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [supabase])

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData()
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchData])

  // Manual refresh
  const handleRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  // Request early checkout
  const handleEarlyCheckoutRequest = async () => {
    if (!selectedTeen || !selectedTeen.eventId) return

    setRequestingCheckout(true)
    try {
      // #35 — canonical table is user_notifications (real columns
      // user_id/title/body/data/priority); the old `notifications` table
      // doesn't exist.
      const { error } = await supabase.from("user_notifications").insert({
        user_id: selectedTeen.teenId,
        title: "Demande de sortie anticipée",
        body: `Le parent de ${selectedTeen.teenName} demande une sortie anticipée`,
        priority: "high",
        data: {
          kind: "early_checkout_request",
          teenId: selectedTeen.teenId,
          eventId: selectedTeen.eventId,
          requestedAt: new Date().toISOString(),
        },
      })

      if (error) throw error

      toast.success("Demande envoyée", {
        description: "Le staff a été notifié de votre demande",
      })
      setEarlyCheckoutDialogOpen(false)
    } catch (error) {
      console.error("Error requesting early checkout:", error)
      toast.error("Erreur lors de l'envoi de la demande")
    } finally {
      setRequestingCheckout(false)
    }
  }

  // Format duration since check-in
  const formatDuration = (checkedInAt: string) => {
    const start = new Date(checkedInAt)
    const now = new Date()
    const diffMs = now.getTime() - start.getTime()
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
      return `${hours}h ${minutes}min`
    }
    return `${minutes} min`
  }

  // Format time
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 pt-10 pb-20 sm:pt-16">
        {/* Header */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between mb-6">
          <div className="flex items-center gap-4">
            <Niv size={72} mood="hype" />
            <div>
              <p className="eyebrow">Suivi · Temps réel</p>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-ink">
                Où est <em className="font-semibold italic text-pink">ton crew</em> là ?
              </h1>
              <p className="text-mute mt-1">Suis tes teens en temps réel</p>
            </div>
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>

        {/* Live Status Indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-3 h-3 rounded-full bg-lime animate-pulse" />
          <span className="font-mono text-xs uppercase tracking-[0.1em] text-mute">
            Mise à jour automatique toutes les 30 secondes
          </span>
        </div>

        {teenStatuses.length === 0 ? (
          <EmptyState
            nivMood="calm"
            title="Aucun teen lié"
            description="Aucun teen lié à ton compte."
            action={{ label: "Ajouter un teen", href: "/parent/teens/add" }}
          />
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Teen Status Cards */}
            <div className="lg:col-span-2 space-y-4">
              <p className="eyebrow mb-4">Statut de tes teens</p>

              {teenStatuses.map((teen) => {
                const isLive = teen.status === "checked_in"
                const avatar = teen.avatarUrl ? (
                  <span className="relative block w-16 h-16 shrink-0 overflow-hidden rounded-full border-2 border-ink">
                    <Image
                      src={teen.avatarUrl}
                      // #319 — meaningful alt on teen avatar (fallback avoids empty alt)
                      alt={teen.teenName ? `Avatar de ${teen.teenName}` : 'Avatar du teen'}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </span>
                ) : (
                  <Niv size={56} mood={isLive ? "hype" : "calm"} className="shrink-0" />
                )

                const cardBody = (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        {avatar}
                        <div>
                          <h3 className={`font-display text-xl font-extrabold ${isLive ? "text-paper" : "text-ink"}`}>
                            {teen.teenName}
                          </h3>
                          {teen.pseudo && (
                            <p className={`font-mono text-xs ${isLive ? "text-paper/60" : "text-mute"}`}>@{teen.pseudo}</p>
                          )}

                          {/* Status pill */}
                          <div className="mt-2">
                            {isLive ? (
                              <span className="inline-flex items-center gap-1.5 rounded-md border-2 border-lime bg-lime/15 px-2 py-0.5 font-mono text-[11px] font-extrabold uppercase tracking-[0.1em] text-lime">
                                <span className="size-1.5 rounded-full bg-lime animate-pulse" />
                                En direct
                              </span>
                            ) : teen.status === "checked_out" ? (
                              <span className="inline-flex items-center gap-1.5 rounded-md border-2 border-ink bg-teal/15 px-2 py-0.5 font-mono text-[11px] font-extrabold uppercase tracking-[0.1em] text-teal">
                                <LogOut className="w-3 h-3" />
                                Sorti(e)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-md border-2 border-line bg-paper px-2 py-0.5 font-mono text-[11px] font-extrabold uppercase tracking-[0.1em] text-mute">
                                <Clock className="w-3 h-3" />
                                Pas d'événement
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Duration */}
                      {isLive && teen.checkedInAt && (
                        <div className="text-right">
                          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-paper/60">Présent depuis</p>
                          <p className="font-display text-2xl font-extrabold text-lime tabular-nums">
                            {formatDuration(teen.checkedInAt)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Event Info */}
                    {teen.eventTitle && (
                      <div className={`mt-4 p-4 rounded-xl border-2 ${isLive ? "border-paper/20 bg-paper/5" : "border-line bg-paper"}`}>
                        <div className="flex items-center gap-3 mb-2">
                          <Calendar className={`w-4 h-4 ${isLive ? "text-paper/60" : "text-mute"}`} />
                          <span className={`font-medium ${isLive ? "text-paper" : "text-ink"}`}>{teen.eventTitle}</span>
                        </div>
                        {teen.eventVenue && (
                          <div className={`flex items-center gap-3 text-sm ${isLive ? "text-paper/60" : "text-mute"}`}>
                            <MapPin className="w-4 h-4" />
                            <span>{teen.eventVenue}</span>
                          </div>
                        )}

                        {/* Check-in/out times */}
                        <div className="mt-3 flex flex-wrap items-center gap-6 text-sm">
                          {teen.checkedInAt && (
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-lime" />
                              <span className={isLive ? "text-paper/60" : "text-mute"}>Entrée :</span>
                              <span className={`font-mono ${isLive ? "text-paper" : "text-ink"}`}>
                                {formatTime(teen.checkedInAt)}
                              </span>
                            </div>
                          )}
                          {teen.checkedOutAt && (
                            <div className="flex items-center gap-2">
                              <LogOut className="w-4 h-4 text-teal" />
                              <span className={isLive ? "text-paper/60" : "text-mute"}>Sortie :</span>
                              <span className={`font-mono ${isLive ? "text-paper" : "text-ink"}`}>
                                {formatTime(teen.checkedOutAt)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Early Checkout Button */}
                    {isLive && (
                      <div className="mt-4">
                        <Dialog open={earlyCheckoutDialogOpen && selectedTeen?.teenId === teen.teenId} onOpenChange={setEarlyCheckoutDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              variant="coral"
                              className="w-full"
                              onClick={() => setSelectedTeen(teen)}
                            >
                              <AlertCircle className="w-4 h-4 mr-2" />
                              Demander sortie anticipée
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-white border-2 border-ink">
                            <DialogHeader>
                              <DialogTitle className="font-display text-ink">Demande de sortie anticipée</DialogTitle>
                              <DialogDescription className="text-mute">
                                Cette demande sera envoyée au staff de l'événement.
                                Ils prépareront la sortie de {teen.teenName}.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                              <StickerCard variant="panel" className="p-4 bg-coral/10">
                                <div className="flex items-center gap-3">
                                  <Shield className="w-8 h-8 text-coral shrink-0" />
                                  <div>
                                    <p className="text-ink font-bold">Procédure de sécurité</p>
                                    <p className="text-sm text-mute">
                                      Tu devras présenter une pièce d'identité à la sortie
                                    </p>
                                  </div>
                                </div>
                              </StickerCard>
                            </div>
                            <DialogFooter>
                              <Button
                                variant="ghost"
                                onClick={() => setEarlyCheckoutDialogOpen(false)}
                                className="text-mute"
                              >
                                Annuler
                              </Button>
                              <Button
                                onClick={handleEarlyCheckoutRequest}
                                disabled={requestingCheckout}
                                variant="coral"
                              >
                                {requestingCheckout ? "Envoi..." : "Envoyer la demande"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </>
                )

                return isLive ? (
                  <DarkSurface key={teen.teenId} tone="lime" shadow className="p-6">
                    {cardBody}
                  </DarkSurface>
                ) : (
                  <StickerCard key={teen.teenId} className="p-6">
                    {cardBody}
                  </StickerCard>
                )
              })}
            </div>

            {/* Timeline */}
            <div className="space-y-6">
              <StickerCard className="p-6">
                <h2 className="font-display text-lg font-extrabold text-ink flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-lime" />
                  Timeline du jour
                </h2>
                {timeline.length > 0 ? (
                  <div className="space-y-4">
                    {timeline.map((event) => (
                      <div key={event.id} className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full border-2 border-ink flex items-center justify-center flex-shrink-0 ${
                          event.type === "check_in" ? "bg-lime" : "bg-teal"
                        }`}>
                          {event.type === "check_in" ? (
                            <CheckCircle2 className="w-4 h-4 text-ink" />
                          ) : (
                            <LogOut className="w-4 h-4 text-ink" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-ink text-sm font-bold">
                            {event.teenName}
                          </p>
                          <p className="text-mute text-xs">
                            {event.description}
                          </p>
                          <p className="font-mono text-mute text-xs mt-1">
                            {formatTime(event.time)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Niv size={64} mood="calm" className="mx-auto mb-3" />
                    <p className="text-sm text-mute">Aucune activité aujourd'hui</p>
                  </div>
                )}
              </StickerCard>

              {/* Emergency Contact */}
              <StickerCard className="p-4 bg-coral/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border-2 border-ink bg-coral flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5 text-ink" />
                  </div>
                  <div>
                    <p className="text-ink font-bold">Urgence</p>
                    <p className="text-sm text-mute">
                      Contacte le staff : <span className="font-mono font-semibold text-coral">+212 6 00 00 00 00</span>
                    </p>
                  </div>
                </div>
              </StickerCard>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
