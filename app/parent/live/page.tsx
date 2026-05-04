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

      // Get linked teens
      const { data: parentTeens } = await supabase
        .from("parent_teen_links")
        .select(`
          teen_id,
          teens:teen_id(
            id,
            user_id,
            pseudo,
            profiles:user_id(full_name)
          )
        `)
        .eq("parent_id", profile.id)

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
          events:event_id(title, venue_name)
        `)
        .in("teen_id", teenIds)
        .gte("checked_in_at", `${today}T00:00:00`)
        .order("checked_in_at", { ascending: false })

      // Build teen statuses
      const statuses: TeenStatus[] = parentTeens.map((pt: any) => {
        const teenCheckIn = checkIns?.find((c: any) => c.teen_id === pt.teen_id)
        const teenName = pt.teens?.profiles?.full_name || "Inconnu"
        const pseudo = pt.teens?.pseudo || ""

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
            photoConsent: false,
          }
        }

        return {
          teenId: pt.teen_id,
          teenName,
          pseudo,
          eventId: teenCheckIn.event_id,
          eventTitle: teenCheckIn.events?.title || "Événement",
          eventVenue: teenCheckIn.events?.venue_name || "",
          status: teenCheckIn.checked_out_at ? "checked_out" as const : "checked_in" as const,
          checkedInAt: teenCheckIn.checked_in_at,
          checkedOutAt: teenCheckIn.checked_out_at,
          photoConsent: true, // TODO: Get from teen profile
        }
      })

      setTeenStatuses(statuses)

      // Build timeline
      const timelineEvents: TimelineEvent[] = []
      checkIns?.forEach((checkIn: any) => {
        const teen = parentTeens.find((pt: any) => pt.teen_id === checkIn.teen_id)
        const teenName = teen?.teens?.profiles?.full_name || "Inconnu"

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

      // TODO: Fetch event photos if consent given
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
      // Create notification for staff
      const { error } = await supabase.from("notifications").insert({
        user_id: selectedTeen.teenId,
        type: "early_checkout_request",
        title: "Demande de sortie anticipée",
        message: `Le parent de ${selectedTeen.teenName} demande une sortie anticipée`,
        data: {
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
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" className="text-zinc-400 hover:text-white">
              <Link href="/parent">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-black text-white flex items-center gap-3">
                <Activity className="w-8 h-8 text-emerald-400" />
                Suivi en Direct
              </h1>
              <p className="text-zinc-400">Suivez vos teens en temps réel</p>
            </div>
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>

        {/* Live Status Indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm text-emerald-400">
            Mise à jour automatique toutes les 30 secondes
          </span>
        </div>

        {teenStatuses.length === 0 ? (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="py-16 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-zinc-700" />
              <p className="text-zinc-500 mb-4">Aucun teen lié à votre compte</p>
              <Button asChild className="bg-emerald-500 hover:bg-emerald-600">
                <Link href="/parent/teens/add">Ajouter un teen</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Teen Status Cards */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-xl font-bold text-white mb-4">Statut de vos teens</h2>

              {teenStatuses.map((teen) => (
                <Card
                  key={teen.teenId}
                  className={`bg-gradient-to-br border transition-all ${
                    teen.status === "checked_in"
                      ? "from-emerald-500/20 to-teal-500/20 border-emerald-500/30"
                      : teen.status === "checked_out"
                      ? "from-blue-500/20 to-cyan-500/20 border-blue-500/30"
                      : "from-zinc-900 to-zinc-950 border-zinc-800"
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
                          teen.status === "checked_in"
                            ? "bg-emerald-500"
                            : teen.status === "checked_out"
                            ? "bg-blue-500"
                            : "bg-zinc-700"
                        } text-white`}>
                          {teen.teenName.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white">{teen.teenName}</h3>
                          {teen.pseudo && (
                            <p className="text-zinc-400">@{teen.pseudo}</p>
                          )}

                          {/* Status Badge */}
                          <div className="mt-2">
                            {teen.status === "checked_in" ? (
                              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                En activité
                              </Badge>
                            ) : teen.status === "checked_out" ? (
                              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                                <LogOut className="w-3 h-3 mr-1" />
                                Sorti(e)
                              </Badge>
                            ) : (
                              <Badge className="bg-zinc-700 text-zinc-400">
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
                          <p className="text-sm text-zinc-400">Présent depuis</p>
                          <p className="text-2xl font-black text-emerald-400">
                            {formatDuration(teen.checkedInAt)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Event Info */}
                    {teen.eventTitle && (
                      <div className="mt-4 p-4 rounded-xl bg-black/20">
                        <div className="flex items-center gap-3 mb-2">
                          <Calendar className="w-4 h-4 text-zinc-400" />
                          <span className="text-white font-medium">{teen.eventTitle}</span>
                        </div>
                        {teen.eventVenue && (
                          <div className="flex items-center gap-3 text-sm text-zinc-400">
                            <MapPin className="w-4 h-4" />
                            <span>{teen.eventVenue}</span>
                          </div>
                        )}

                        {/* Check-in/out times */}
                        <div className="mt-3 flex items-center gap-6 text-sm">
                          {teen.checkedInAt && (
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span className="text-zinc-400">Entrée:</span>
                              <span className="text-white font-medium">
                                {formatTime(teen.checkedInAt)}
                              </span>
                            </div>
                          )}
                          {teen.checkedOutAt && (
                            <div className="flex items-center gap-2">
                              <LogOut className="w-4 h-4 text-blue-400" />
                              <span className="text-zinc-400">Sortie:</span>
                              <span className="text-white font-medium">
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
                              className="w-full border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                              onClick={() => setSelectedTeen(teen)}
                            >
                              <AlertCircle className="w-4 h-4 mr-2" />
                              Demander sortie anticipée
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-zinc-900 border-zinc-800">
                            <DialogHeader>
                              <DialogTitle className="text-white">Demande de sortie anticipée</DialogTitle>
                              <DialogDescription className="text-zinc-400">
                                Cette demande sera envoyée au staff de l'événement.
                                Ils prépareront la sortie de {teen.teenName}.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                              <div className="flex items-center gap-3 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                                <Shield className="w-8 h-8 text-orange-400" />
                                <div>
                                  <p className="text-white font-medium">Procédure de sécurité</p>
                                  <p className="text-sm text-zinc-400">
                                    Vous devrez présenter une pièce d'identité à la sortie
                                  </p>
                                </div>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                variant="ghost"
                                onClick={() => setEarlyCheckoutDialogOpen(false)}
                                className="text-zinc-400"
                              >
                                Annuler
                              </Button>
                              <Button
                                onClick={handleEarlyCheckoutRequest}
                                disabled={requestingCheckout}
                                className="bg-orange-500 hover:bg-orange-600"
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
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-emerald-400" />
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
                              ? "bg-emerald-500/20"
                              : "bg-blue-500/20"
                          }`}>
                            {event.type === "check_in" ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <LogOut className="w-4 h-4 text-blue-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-white text-sm font-medium">
                              {event.teenName}
                            </p>
                            <p className="text-zinc-400 text-xs">
                              {event.description}
                            </p>
                            <p className="text-zinc-500 text-xs mt-1">
                              {formatTime(event.time)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-zinc-500">
                      <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Aucune activité aujourd'hui</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Photo Gallery */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Camera className="w-5 h-5 text-purple-400" />
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
                    <div className="text-center py-8 text-zinc-500">
                      <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">
                        Photos disponibles si consentement accordé
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Emergency Contact */}
              <Card className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                      <Phone className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Urgence</p>
                      <p className="text-sm text-zinc-400">
                        Contactez le staff: <span className="text-red-400">+212 6 00 00 00 00</span>
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
