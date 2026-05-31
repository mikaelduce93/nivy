import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getUserRole } from "@/lib/auth/get-user-role"
import Link from "next/link"
import { StatCard } from "@/components/admin/stat-card"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivEmpty } from "@/components/brand"
import { AnnivStatusTabs } from "./status-tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Cake, Calendar, Users, Eye } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Gestion Anniversaires | Admin",
  description: "Gérez les commandes d'anniversaires",
}

async function getAnnivStats(supabase: any) {
  const today = new Date().toISOString().split('T')[0]

  const { count: totalOrders } = await supabase
    .from("anniv_orders")
    .select("*", { count: "exact", head: true })

  const { count: pendingOrders } = await supabase
    .from("anniv_orders")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending")

  const { count: confirmedOrders } = await supabase
    .from("anniv_orders")
    .select("*", { count: "exact", head: true })
    .eq("status", "confirmed")

  const { count: upcomingOrders } = await supabase
    .from("anniv_orders")
    .select("*", { count: "exact", head: true })
    .gte("celebration_date", today)
    .eq("status", "confirmed")

  const { data: revenueData } = await supabase
    .from("anniv_orders")
    .select("total_price")
    .in("payment_status", ["paid", "deposit"])

  const totalRevenue = revenueData?.reduce((sum: number, order: any) => sum + (order.total_price || 0), 0) || 0

  return {
    totalOrders: totalOrders || 0,
    pendingOrders: pendingOrders || 0,
    confirmedOrders: confirmedOrders || 0,
    upcomingOrders: upcomingOrders || 0,
    totalRevenue
  }
}

async function getAnnivOrders(supabase: any, status?: string) {
  let query = supabase
    .from("anniv_orders")
    .select(`
      *,
      teen:teen_id (first_name, last_name, pseudo),
      pack:pack_id (name, pack_type),
      parent:parent_id (full_name, email)
    `)
    .order("created_at", { ascending: false })
    .limit(100)

  if (status && status !== "all") {
    query = query.eq("status", status)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching orders:", error)
    return []
  }

  return data || []
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
    paid: { label: "Payé", cls: "bg-lime/15 text-lime" },
    deposit: { label: "Acompte", cls: "bg-gold/15 text-gold" },
    pending: { label: "Non payé", cls: "bg-white text-mute" },
    refunded: { label: "Remboursé", cls: "bg-coral/15 text-coral" },
  }
  const it = map[status] ?? { label: status.toUpperCase(), cls: "bg-white text-mute" }
  return (
    <span className={`inline-flex items-center rounded-full border-2 border-ink px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] ${it.cls}`}>
      {it.label}
    </span>
  )
}

export default async function AdminAnniversairesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const userInfo = await getUserRole()

  // Admin sub-roles (super_admin/moderator/support) live in admin_roles.role,
  // not in profiles.role — gate purely on the canonical 'admin' top-level role.
  if (!userInfo || userInfo.role !== "admin") {
    redirect("/auth/login")
  }

  const supabase = await createClient()
  const stats = await getAnnivStats(supabase)
  const orders = await getAnnivOrders(supabase, status)

  return (
    <div className="container mx-auto space-y-8 px-4 sm:px-6 py-8 sm:py-10">
      <header className="space-y-2">
        <p className="eyebrow text-mute">Anniversaires</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">
          Gérer les <em className="font-semibold italic text-pink">anniversaires</em>
        </h1>
        <p className="text-mute">Commandes et réservations d'anniversaires.</p>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Total" value={stats.totalOrders} tone="paper" />
        <StatCard label="En attente" value={stats.pendingOrders} tone="gold" />
        <StatCard label="Confirmées" value={stats.confirmedOrders} tone="lime" />
        <StatCard label="À venir" value={stats.upcomingOrders} tone="teal" />
        <StatCard label="Chiffre d'affaires" value={`${stats.totalRevenue.toLocaleString()} DH`} tone="coral" mono />
      </section>

      <AnnivStatusTabs value={status || "all"} />

      {orders.length === 0 ? (
        <NivEmpty
          title="Aucune commande trouvée"
          description="Les commandes d'anniversaire apparaîtront ici dès la première réservation."
        />
      ) : (
        <>
          {/* Mobile-first : liste de cartes sticker sous lg */}
          <div className="space-y-4 lg:hidden">
            {orders.map((order: any) => (
              <Link key={order.id} href={`/admin/anniversaires/${order.id}`} className="block">
                <StickerCard variant="hover" className="gap-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-mono font-bold text-pink">{order.booking_reference}</span>
                    <StatusPill status={order.status} />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-ink">
                    <Cake className="h-4 w-4 text-pink" />
                    {order.teen?.pseudo || order.teen?.first_name || "—"}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-mute">
                    <Calendar className="h-4 w-4 text-pink" />
                    {new Date(order.celebration_date).toLocaleDateString("fr-FR", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                    <Users className="ml-2 h-4 w-4" />
                    {order.guest_count}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-mono text-lg font-bold text-ink tabular-nums">
                      {order.total_price?.toLocaleString()} DH
                    </span>
                    <PaymentPill status={order.payment_status} />
                  </div>
                </StickerCard>
              </Link>
            ))}
          </div>

          {/* Table dense au-dessus de lg */}
          <div className="hidden lg:block">
            <StickerCard className="overflow-hidden p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-ink">
                    <TableHead className="eyebrow text-mute">Référence</TableHead>
                    <TableHead className="eyebrow text-mute">Enfant</TableHead>
                    <TableHead className="eyebrow text-mute">Parent</TableHead>
                    <TableHead className="eyebrow text-mute">Date</TableHead>
                    <TableHead className="eyebrow text-mute">Formule</TableHead>
                    <TableHead className="eyebrow text-mute">Invités</TableHead>
                    <TableHead className="eyebrow text-mute">Total</TableHead>
                    <TableHead className="eyebrow text-mute">Statut</TableHead>
                    <TableHead className="eyebrow text-mute">Paiement</TableHead>
                    <TableHead className="eyebrow text-right text-mute">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order: any) => (
                    <TableRow key={order.id} className="border-ink">
                      <TableCell className="font-mono font-bold text-pink">
                        {order.booking_reference}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-ink">
                          {order.teen?.pseudo || order.teen?.first_name || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-ink">
                          {order.parent?.full_name || "-"}
                        </div>
                        <div className="text-xs text-mute">
                          {order.parent?.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-ink">
                          <Calendar className="h-4 w-4 text-pink" />
                          {new Date(order.celebration_date).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short"
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-ink">
                          {order.pack?.name || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-ink">
                          <Users className="h-4 w-4 text-mute" />
                          {order.guest_count}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono font-bold text-ink tabular-nums">
                        {order.total_price?.toLocaleString()} DH
                      </TableCell>
                      <TableCell>
                        <StatusPill status={order.status} />
                      </TableCell>
                      <TableCell>
                        <PaymentPill status={order.payment_status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/admin/anniversaires/${order.id}`}
                          aria-label="Voir la commande"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border-2 border-ink bg-white text-ink transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-pink"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </StickerCard>
          </div>
        </>
      )}
    </div>
  )
}
