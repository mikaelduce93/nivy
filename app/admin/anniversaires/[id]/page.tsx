import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { getUserRole } from "@/lib/auth/get-user-role"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Cake,
  Calendar,
  Users,
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  QrCode,
  User,
  Gift,
  FileText,
  Euro,
} from "lucide-react"
import type { Metadata } from "next"
import { AnnivOrderActions } from "./actions-client"

export const metadata: Metadata = {
  title: "Détail Commande | Admin Anniversaires",
  description: "Détails de la commande anniversaire",
}

async function getAnnivOrder(supabase: any, orderId: string) {
  const { data, error } = await supabase
    .from("anniv_orders")
    .select(`
      *,
      teen:teen_id (id, first_name, last_name, pseudo, birth_date, avatar_url),
      pack:pack_id (id, name, pack_type, base_price, description),
      parent:parent_id (id, full_name, email, phone),
      extras:anniv_order_extras (
        id,
        quantity,
        unit_price,
        extra:extra_id (id, name, unit, price_per_unit)
      )
    `)
    .eq("id", orderId)
    .single()

  if (error) {
    console.error("Error fetching order:", error)
    return null
  }

  return data
}

function getStatusBadge(status: string) {
  switch (status) {
    case "confirmed":
      return <Badge className="bg-lime text-ink text-sm px-3 py-1">Confirmé</Badge>
    case "pending":
      return <Badge className="bg-gold text-ink text-sm px-3 py-1">En attente</Badge>
    case "cancelled":
      return <Badge className="bg-destructive text-ink text-sm px-3 py-1">Annulé</Badge>
    case "completed":
      return <Badge className="bg-teal text-ink text-sm px-3 py-1">Terminé</Badge>
    default:
      return <Badge variant="secondary" className="text-sm px-3 py-1">{status}</Badge>
  }
}

function getPaymentBadge(status: string) {
  switch (status) {
    case "paid":
      return <Badge variant="outline" className="border-lime text-lime text-sm px-3 py-1">Payé intégralement</Badge>
    case "deposit":
      return <Badge variant="outline" className="border-gold text-gold text-sm px-3 py-1">Acompte versé</Badge>
    case "pending":
      return <Badge variant="outline" className="border-line text-mute text-sm px-3 py-1">Non payé</Badge>
    case "refunded":
      return <Badge variant="outline" className="border-destructive text-destructive text-sm px-3 py-1">Remboursé</Badge>
    default:
      return <Badge variant="outline" className="text-sm px-3 py-1">{status}</Badge>
  }
}

export default async function AdminAnnivOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "admin") {
    redirect("/auth/login")
  }

  const supabase = await createClient()
  const order = await getAnnivOrder(supabase, id)

  if (!order) {
    notFound()
  }

  const celebrationDate = new Date(order.celebration_date)
  const createdAt = new Date(order.created_at)
  const isUpcoming = celebrationDate > new Date()

  // Calculate extras total
  const extrasTotal = order.extras?.reduce((sum: number, item: any) => {
    return sum + (item.quantity * item.unit_price)
  }, 0) || 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/anniversaires">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-black text-ink flex items-center gap-3">
              <Cake className="w-7 h-7 text-pink" />
              Commande {order.booking_reference}
            </h1>
            <p className="text-mute mt-1">
              Créée le {createdAt.toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric"
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge(order.status)}
          {getPaymentBadge(order.payment_status)}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event Details */}
          <Card className="bg-card border-ink">
            <CardHeader>
              <CardTitle className="text-ink flex items-center gap-2">
                <Calendar className="w-5 h-5 text-pink" />
                Détails de l'événement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-card">
                  <p className="text-xs text-mute uppercase mb-1">Date de célébration</p>
                  <p className="text-xl font-bold text-ink">
                    {celebrationDate.toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric"
                    })}
                  </p>
                  {isUpcoming ? (
                    <span className="text-xs text-lime flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" />
                      À venir
                    </span>
                  ) : (
                    <span className="text-xs text-mute flex items-center gap-1 mt-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Passé
                    </span>
                  )}
                </div>
                <div className="p-4 rounded-lg bg-card">
                  <p className="text-xs text-mute uppercase mb-1">Nombre d'invités</p>
                  <p className="text-xl font-bold text-ink flex items-center gap-2">
                    <Users className="w-5 h-5 text-teal" />
                    {order.guest_count} personnes
                  </p>
                </div>
              </div>

              {/* Pack Info */}
              <div className="p-4 rounded-lg bg-gradient-to-r from-pink/10 to-pink/10 border border-pink/20">
                <p className="text-xs text-mute uppercase mb-1">Formule choisie</p>
                <p className="text-lg font-bold text-pink">{order.pack?.name || "Pack inconnu"}</p>
                <p className="text-sm text-mute">{order.pack?.description}</p>
                <p className="text-ink font-bold mt-2">{order.pack?.base_price?.toLocaleString()} DH</p>
              </div>

              {/* Extras */}
              {order.extras && order.extras.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-mute">Options supplémentaires</p>
                  {order.extras.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-card">
                      <div className="flex items-center gap-3">
                        <Gift className="w-4 h-4 text-pink" />
                        <div>
                          <p className="text-ink font-medium">{item.extra?.name}</p>
                          <p className="text-xs text-mute">
                            {item.quantity} x {item.unit_price} DH
                          </p>
                        </div>
                      </div>
                      <p className="font-bold text-ink">{(item.quantity * item.unit_price).toLocaleString()} DH</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Notes */}
              {order.special_requests && (
                <div className="p-4 rounded-lg bg-card">
                  <p className="text-xs text-mute uppercase mb-1 flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    Demandes spéciales
                  </p>
                  <p className="text-ink">{order.special_requests}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Child Info */}
          <Card className="bg-card border-ink">
            <CardHeader>
              <CardTitle className="text-ink flex items-center gap-2">
                <User className="w-5 h-5 text-teal" />
                Enfant fêté
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                {order.teen?.avatar_url ? (
                  <Image
                    src={order.teen.avatar_url}
                    alt={order.teen.pseudo || order.teen.first_name}
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded-full object-cover border-2 border-pink"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink to-pink flex items-center justify-center">
                    <span className="text-xl font-bold text-ink">
                      {(order.teen?.first_name || "?")[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-lg font-bold text-ink">
                    {order.teen?.first_name} {order.teen?.last_name}
                  </p>
                  {order.teen?.pseudo && (
                    <p className="text-pink">@{order.teen.pseudo}</p>
                  )}
                  {order.teen?.birth_date && (
                    <p className="text-sm text-mute">
                      Né(e) le {new Date(order.teen.birth_date).toLocaleDateString("fr-FR")}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Parent Info */}
          <Card className="bg-card border-ink">
            <CardHeader>
              <CardTitle className="text-ink flex items-center gap-2">
                <Users className="w-5 h-5 text-lime" />
                Parent / Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-lime/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-lime" />
                </div>
                <div>
                  <p className="font-bold text-ink">{order.parent?.full_name || "Non renseigné"}</p>
                </div>
              </div>
              {order.parent?.email && (
                <div className="flex items-center gap-3 text-mute">
                  <Mail className="w-4 h-4" />
                  <a href={`mailto:${order.parent.email}`} className="hover:text-ink transition-colors">
                    {order.parent.email}
                  </a>
                </div>
              )}
              {order.parent?.phone && (
                <div className="flex items-center gap-3 text-mute">
                  <Phone className="w-4 h-4" />
                  <a href={`tel:${order.parent.phone}`} className="hover:text-ink transition-colors">
                    {order.parent.phone}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* QR Code */}
          {order.qr_code && (
            <Card className="bg-card border-ink">
              <CardHeader>
                <CardTitle className="text-ink flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-pink" />
                  QR Code
                </CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <div className="p-4 bg-white rounded-lg">
                  <Image
                    src={order.qr_code}
                    alt="QR Code réservation"
                    width={160}
                    height={160}
                    className="w-40 h-40"
                    unoptimized
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pricing Summary */}
          <Card className="bg-card border-ink">
            <CardHeader>
              <CardTitle className="text-ink flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-lime" />
                Récapitulatif
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-mute">
                <span>Formule de base</span>
                <span>{order.pack?.base_price?.toLocaleString() || 0} DH</span>
              </div>
              {extrasTotal > 0 && (
                <div className="flex justify-between text-mute">
                  <span>Options</span>
                  <span>{extrasTotal.toLocaleString()} DH</span>
                </div>
              )}
              <div className="border-t border-ink pt-3 flex justify-between text-xl font-black">
                <span className="text-ink">Total</span>
                <span className="text-pink">{order.total_price?.toLocaleString()} DH</span>
              </div>

              {order.deposit_amount && order.deposit_amount > 0 && (
                <div className="p-3 rounded-lg bg-gold/10 border border-gold/30">
                  <p className="text-xs text-gold uppercase mb-1">Acompte versé</p>
                  <p className="text-lg font-bold text-gold">{order.deposit_amount.toLocaleString()} DH</p>
                  <p className="text-xs text-mute">
                    Reste à payer: {(order.total_price - order.deposit_amount).toLocaleString()} DH
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card className="bg-card border-ink">
            <CardHeader>
              <CardTitle className="text-ink">Actions</CardTitle>
              <CardDescription>Gérer cette commande</CardDescription>
            </CardHeader>
            <CardContent>
              <AnnivOrderActions
                orderId={order.id}
                currentStatus={order.status}
                currentPaymentStatus={order.payment_status}
              />
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="bg-card border-ink">
            <CardHeader>
              <CardTitle className="text-ink flex items-center gap-2">
                <Clock className="w-5 h-5 text-mute" />
                Historique
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-pink" />
                  <div>
                    <p className="text-sm font-medium text-ink">Commande créée</p>
                    <p className="text-xs text-mute">
                      {createdAt.toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                  </div>
                </div>
                {order.status === "confirmed" && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-lime" />
                    <div>
                      <p className="text-sm font-medium text-ink">Commande confirmée</p>
                      <p className="text-xs text-mute">
                        {order.confirmed_at ? new Date(order.confirmed_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit"
                        }) : "Date inconnue"}
                      </p>
                    </div>
                  </div>
                )}
                {order.status === "cancelled" && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-destructive" />
                    <div>
                      <p className="text-sm font-medium text-ink">Commande annulée</p>
                      <p className="text-xs text-mute">
                        {order.cancelled_at ? new Date(order.cancelled_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit"
                        }) : "Date inconnue"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
