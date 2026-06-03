import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { getUserRole } from "@/lib/auth/get-user-role"
import Image from "next/image"
import Link from "next/link"
import { StickerCard } from "@/components/ui/sticker-card"
import { StatHero, Niv } from "@/components/brand"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  Users,
  ArrowLeft,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  QrCode,
  User,
  Gift,
  FileText,
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

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    confirmed: { label: "Confirmé", cls: "bg-lime/15 text-lime" },
    pending: { label: "En attente", cls: "bg-gold/15 text-gold" },
    cancelled: { label: "Annulé", cls: "bg-coral/15 text-coral" },
    completed: { label: "Terminé", cls: "bg-teal/15 text-teal" },
  }
  const it = map[status] ?? { label: status.toUpperCase(), cls: "bg-white text-mute" }
  return (
    <span className={`inline-flex items-center rounded-full border-2 border-ink px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.1em] ${it.cls}`}>
      {it.label}
    </span>
  )
}

function PaymentPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    paid: { label: "Payé intégralement", cls: "bg-lime/15 text-lime" },
    deposit: { label: "Acompte versé", cls: "bg-gold/15 text-gold" },
    pending: { label: "Non payé", cls: "bg-white text-mute" },
    refunded: { label: "Remboursé", cls: "bg-coral/15 text-coral" },
  }
  const it = map[status] ?? { label: status.toUpperCase(), cls: "bg-white text-mute" }
  return (
    <span className={`inline-flex items-center rounded-full border-2 border-ink px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.1em] ${it.cls}`}>
      {it.label}
    </span>
  )
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
    <div className="container mx-auto space-y-8 px-4 sm:px-6 py-8 sm:py-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-1">
            <Link href="/admin/anniversaires">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Anniversaires
            </Link>
          </Button>
          <p className="eyebrow text-mute">Anniversaire · Commande</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
            Commande <em className="font-mono not-italic text-pink">{order.booking_reference}</em>
          </h1>
          <p className="text-sm text-mute">
            Créée le {createdAt.toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric"
            })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill status={order.status} />
          <PaymentPill status={order.payment_status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="space-y-6 lg:col-span-2">
          {/* Event Details */}
          <StickerCard className="gap-4 p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
              <Calendar className="h-5 w-5 text-pink" />
              Détails de l'événement
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <StickerCard variant="panel" className="gap-1 p-4">
                <p className="eyebrow text-mute">Date de célébration</p>
                <p className="font-display text-xl font-bold text-ink">
                  {celebrationDate.toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                  })}
                </p>
                {isUpcoming ? (
                  <span className="mt-1 flex items-center gap-1 text-xs text-lime">
                    <Clock className="h-3 w-3" />
                    À venir
                  </span>
                ) : (
                  <span className="mt-1 flex items-center gap-1 text-xs text-mute">
                    <CheckCircle2 className="h-3 w-3" />
                    Passé
                  </span>
                )}
              </StickerCard>
              <StickerCard variant="panel" className="gap-1 p-4">
                <p className="eyebrow text-mute">Nombre d'invités</p>
                <p className="flex items-center gap-2 font-display text-xl font-bold text-ink">
                  <Users className="h-5 w-5 text-teal" />
                  {order.guest_count} personnes
                </p>
              </StickerCard>
            </div>

            {/* Pack Info */}
            <StickerCard variant="panel" className="gap-1 p-4">
              <p className="eyebrow text-mute">Formule choisie</p>
              <p className="font-display text-lg font-bold text-pink">{order.pack?.name || "Pack inconnu"}</p>
              <p className="text-sm text-mute">{order.pack?.description}</p>
              <p className="mt-2 font-mono font-bold text-ink tabular-nums">{order.pack?.base_price?.toLocaleString()} DH</p>
            </StickerCard>

            {/* Extras */}
            {order.extras && order.extras.length > 0 && (
              <div className="space-y-3">
                <p className="eyebrow text-mute">Options supplémentaires</p>
                {order.extras.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between rounded-xl border-2 border-ink bg-white p-3">
                    <div className="flex items-center gap-3">
                      <Gift className="h-4 w-4 text-pink" />
                      <div>
                        <p className="font-medium text-ink">{item.extra?.name}</p>
                        <p className="font-mono text-xs text-mute">
                          {item.quantity} × {item.unit_price} DH
                        </p>
                      </div>
                    </div>
                    <p className="font-mono font-bold text-ink tabular-nums">{(item.quantity * item.unit_price).toLocaleString()} DH</p>
                  </div>
                ))}
              </div>
            )}

            {/* Notes */}
            {order.special_requests && (
              <StickerCard variant="panel" className="gap-1 p-4">
                <p className="eyebrow flex items-center gap-1 text-mute">
                  <FileText className="h-3 w-3" />
                  Demandes spéciales
                </p>
                <p className="text-ink">{order.special_requests}</p>
              </StickerCard>
            )}
          </StickerCard>

          {/* Child Info */}
          <StickerCard className="gap-4 p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
              <User className="h-5 w-5 text-teal" />
              Enfant fêté
            </h2>
            <div className="flex items-center gap-4">
              {order.teen?.avatar_url ? (
                <Image
                  src={order.teen.avatar_url}
                  alt={order.teen.pseudo || order.teen.first_name}
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-full border-2 border-ink object-cover"
                />
              ) : (
                <Niv mood="happy" size={64} />
              )}
              <div>
                <p className="font-display text-lg font-bold text-ink">
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
          </StickerCard>

          {/* Parent Info */}
          <StickerCard className="gap-3 p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
              <Users className="h-5 w-5 text-lime" />
              Parent / Contact
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-ink bg-lime/15">
                <User className="h-5 w-5 text-lime" />
              </div>
              <p className="font-bold text-ink">{order.parent?.full_name || "Non renseigné"}</p>
            </div>
            {order.parent?.email && (
              <div className="flex items-center gap-3 text-mute">
                <Mail className="h-4 w-4" />
                <a href={`mailto:${order.parent.email}`} className="transition-colors hover:text-ink">
                  {order.parent.email}
                </a>
              </div>
            )}
            {order.parent?.phone && (
              <div className="flex items-center gap-3 text-mute">
                <Phone className="h-4 w-4" />
                <a href={`tel:${order.parent.phone}`} className="transition-colors hover:text-ink">
                  {order.parent.phone}
                </a>
              </div>
            )}
          </StickerCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pricing Summary — surface sombre « solde » charte */}
          <StatHero
            eyebrow="Récapitulatif"
            tone="pink"
            value={order.total_price?.toLocaleString()}
            unit="DH"
          >
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Formule de base</span>
                <span className="font-mono tabular-nums">{order.pack?.base_price?.toLocaleString() || 0} DH</span>
              </div>
              {extrasTotal > 0 && (
                <div className="flex justify-between">
                  <span>Options</span>
                  <span className="font-mono tabular-nums">{extrasTotal.toLocaleString()} DH</span>
                </div>
              )}
            </div>
            {order.deposit_amount && order.deposit_amount > 0 && (
              <div className="mt-4 rounded-xl border-2 border-paper/20 p-3">
                <p className="eyebrow tracking-[0.14em] text-gold">Acompte versé</p>
                <p className="font-mono text-lg font-bold text-gold tabular-nums">{order.deposit_amount.toLocaleString()} DH</p>
                <p className="text-xs text-paper/60">
                  Reste à payer : {((order.total_price ?? 0) - order.deposit_amount).toLocaleString()} DH
                </p>
              </div>
            )}
          </StatHero>

          {/* QR Code */}
          {order.qr_code && (
            <StickerCard className="items-center gap-3 p-6 text-center">
              <span className="eyebrow flex items-center gap-2 text-mute">
                <QrCode className="h-4 w-4 text-pink" />
                QR Check-in
              </span>
              <div className="rounded-xl border-2 border-ink bg-white p-4">
                <Image
                  src={order.qr_code}
                  alt="QR Code réservation"
                  width={160}
                  height={160}
                  className="h-40 w-40"
                  unoptimized
                />
              </div>
            </StickerCard>
          )}

          {/* Actions */}
          <StickerCard className="gap-2 p-6">
            <h2 className="font-display text-lg font-bold text-ink">Actions</h2>
            <p className="text-sm text-mute">Gérer cette commande</p>
            <div className="mt-2">
              <AnnivOrderActions
                orderId={order.id}
                currentStatus={order.status}
                currentPaymentStatus={order.payment_status}
              />
            </div>
          </StickerCard>

          {/* Timeline */}
          <StickerCard className="gap-4 p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
              <Clock className="h-5 w-5 text-mute" />
              Historique
            </h2>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="mt-2 h-2 w-2 rounded-full bg-pink" />
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
                  <div className="mt-2 h-2 w-2 rounded-full bg-lime" />
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
                  <div className="mt-2 h-2 w-2 rounded-full bg-coral" />
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
          </StickerCard>
        </div>
      </div>
    </div>
  )
}
