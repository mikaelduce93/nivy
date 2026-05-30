"use client"

import { useEffect, useState, useCallback } from "react"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Activity,
  Clock,
  MapPin,
  CheckCircle2,
  LogOut,
  AlertCircle,
  RefreshCw,
  Camera,
  ArrowLeft,
  Users,
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
        // #35 — teens has no photo_consent column; default to false
        // (least-privilege) until a real consent source is wired.
        const photoConsent = false

        if (!teenCheckIn) {
          return {
            teenId: pt.teen_id,
            teenName,
            pseudo,
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-lime" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-32">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" className="text-mute hover:text-ink">
              <Link href="/parent">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-black text-ink flex items-center gap-3">
                <Activity className="w-8 h-8 text-lime" />
                Suivi en Direct
              </h1>
              <p className="text-mute">Suivez vos teens en temps réel</p>
            </div>
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="border-lime/30 text-lime hover:bg-lime/10"
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>

        {/* Live Status Indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-3 h-3 rounded-full bg-lime animate-pulse" />
          <span className="text-sm text-lime">
            Mise à jour automatique toutes les 30 secondes
          </span>
        </div>

        {teenStatuses.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Aucun teen lié"
            description="Aucun teen lié à votre compte."
            action={{ label: "Ajouter un teen", href: "/parent/teens/add" }}
          />
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Teen Status Cards */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-xl font-bold text-ink mb-4">Statut de vos teens</h2>

              {teenStatuses.map((teen) => (
                <Card
                  key={teen.teenId}
                  className={`bg-gradient-to-br border transition-all ${
                    teen.status === "checked_in"
                      ? "from-lime/20 to-teal/20 border-lime/30"
                      : teen.status === "checked_out"
                      ? "from-teal/20 to-teal/20 border-teal/30"
                      : "from-paper-2 to-card border-ink"
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
                          teen.status === "checked_in"
                            ? "bg-lime"
                            : teen.status === "checked_out"
                            ? "bg-teal"
                            : "bg-muted"
                        } text-ink`}>
                          {teen.teenName.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-ink">{teen.teenName}</h3>
                          {teen.pseudo && (
                            <p className="text-mute">@{teen.pseudo}</p>
                          )}

                          {/* Status Badge */}
                          <div className="mt-2">
                            {teen.status === "checked_in" ? (
                              <Badge className="bg-lime/20 text-lime border-lime/30">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                En activité
                              </Badge>
                            ) : teen.status === "checked_out" ? (
                              <Badge className="bg-teal/20 text-teal border-teal/30">
                                <LogOut className="w-3 h-3 mr-1" />
                                Sorti(e)
                              </Badge>
                            ) : (
                              <Badge className="bg-muted text-mute">
                                <Clock className="w-3 h-3 mr-1" />
                                Pas d'événement
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Duration */}
                      {teen.status === "checked_in" && teen.checkedInAt && (
                        <div className="text-right">
                          <p className="text-sm text-mute">Présent depuis</p>
                          <p className="text-2xl font-black text-lime">
                            {formatDuration(teen.checkedInAt)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Event Info */}
                    {teen.eventTitle && (
                      <div className="mt-4 p-4 rounded-xl bg-ink/20">
                        <div className="flex items-center gap-3 mb-2">
                          <Calendar className="w-4 h-4 text-mute" />
                          <span className="text-ink font-medium">{teen.eventTitle}</span>
                        </div>
                        {teen.eventVenue && (
                          <div className="flex items-center gap-3 text-sm text-mute">
                            <MapPin className="w-4 h-4" />
                            <span>{teen.eventVenue}</span>
                          </div>
                        )}

                        {/* Check-in/out times */}
                        <div className="mt-3 flex items-center gap-6 text-sm">
                          {teen.checkedInAt && (
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-lime" />
                              <span className="text-mute">Entrée:</span>
                              <span className="text-ink font-medium">
                                {formatTime(teen.checkedInAt)}
                              </span>
                            </div>
                          )}
                          {teen.checkedOutAt && (
                            <div className="flex items-center gap-2">
                              <LogOut className="w-4 h-4 text-teal" />
                              <span className="text-mute">Sortie:</span>
                              <span className="text-ink font-medium">
                                {formatTime(teen.checkedOutAt)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Early Checkout Button */}
                    {teen.status === "checked_in" && (
                      <div className="mt-4">
                        <Dialog open={earlyCheckoutDialogOpen && selectedTeen?.teenId === teen.teenId} onOpenChange={setEarlyCheckoutDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full border-coral/30 text-coral hover:bg-coral/10"
                              onClick={() => setSelectedTeen(teen)}
                            >
                              <AlertCircle className="w-4 h-4 mr-2" />
                              Demander sortie anticipée
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-card border-ink">
                            <DialogHeader>
                              <DialogTitle className="text-ink">Demande de sortie anticipée</DialogTitle>
                              <DialogDescription className="text-mute">
                                Cette demande sera envoyée au staff de l'événement.
                                Ils prépareront la sortie de {teen.teenName}.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                              <div className="flex items-center gap-3 p-4 rounded-xl bg-coral/10 border border-coral/20">
                                <Shield className="w-8 h-8 text-coral" />
                                <div>
                                  <p className="text-ink font-medium">Procédure de sécurité</p>
                                  <p className="text-sm text-mute">
                                    Vous devrez présenter une pièce d'identité à la sortie
                                  </p>
                                </div>
                              </div>
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
                                className="bg-coral hover:bg-coral"
                              >
                                {requestingCheckout ? "Envoi..." : "Envoyer la demande"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Timeline & Photos */}
            <div className="space-y-6">
              {/* Timeline */}
              <Card className="bg-card border-ink">
                <CardHeader>
                  <CardTitle className="text-ink flex items-center gap-2">
                    <Clock className="w-5 h-5 text-lime" />
                    Timeline du jour
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {timeline.length > 0 ? (
                    <div className="space-y-4">
                      {timeline.map((event) => (
                        <div key={event.id} className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            event.type === "check_in"
                              ? "bg-lime/20"
                              : "bg-teal/20"
                          }`}>
                            {event.type === "check_in" ? (
                              <CheckCircle2 className="w-4 h-4 text-lime" />
                            ) : (
                              <LogOut className="w-4 h-4 text-teal" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-ink text-sm font-medium">
                              {event.teenName}
                            </p>
                            <p className="text-mute text-xs">
                              {event.description}
                            </p>
                            <p className="text-mute text-xs mt-1">
                              {formatTime(event.time)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-mute">
                      <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Aucune activité aujourd'hui</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Photo Gallery */}
              <Card className="bg-card border-ink">
                <CardHeader>
                  <CardTitle className="text-ink flex items-center gap-2">
                    <Camera className="w-5 h-5 text-pink" />
                    Photos de l'événement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {photos.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {photos.map((photo) => (
                        <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden">
                          <Image
                            src={photo.url}
                            alt="Event photo"
                            fill
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-mute">
                      <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">
                        Photos disponibles si consentement accordé
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Emergency Contact */}
              <Card className="bg-gradient-to-br from-destructive/10 to-coral/10 border-destructive/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                      <Phone className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-ink font-medium">Urgence</p>
                      <p className="text-sm text-mute">
                        Contactez le staff: <span className="text-destructive">+212 6 00 00 00 00</span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
