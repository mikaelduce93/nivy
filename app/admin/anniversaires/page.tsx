import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getUserRole } from "@/lib/auth/get-user-role"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Cake,
  Calendar,
  Users,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  CreditCard,
  Search,
  Filter,
  MoreVertical,
  Download,
  RefreshCw
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

function getStatusBadge(status: string) {
  switch (status) {
    case "confirmed":
      return <Badge className="bg-lime text-ink">Confirmé</Badge>
    case "pending":
      return <Badge className="bg-gold text-ink">En attente</Badge>
    case "cancelled":
      return <Badge className="bg-destructive text-ink">Annulé</Badge>
    case "completed":
      return <Badge className="bg-teal text-ink">Terminé</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function getPaymentBadge(status: string) {
  switch (status) {
    case "paid":
      return <Badge variant="outline" className="border-lime text-lime">Payé</Badge>
    case "deposit":
      return <Badge variant="outline" className="border-gold text-gold">Acompte</Badge>
    case "pending":
      return <Badge variant="outline" className="border-line text-mute">Non payé</Badge>
    case "refunded":
      return <Badge variant="outline" className="border-destructive text-destructive">Remboursé</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-ink flex items-center gap-3">
            <Cake className="w-8 h-8 text-pink" />
            Gestion Anniversaires
          </h1>
          <p className="text-mute mt-1">
            Gérez les commandes et réservations d'anniversaires
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-card border-ink">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-mute">
              Total Commandes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-ink">{stats.totalOrders}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-ink">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-mute">
              En Attente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-gold">{stats.pendingOrders}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-ink">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-mute">
              Confirmées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-lime">{stats.confirmedOrders}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-ink">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-mute">
              À Venir
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-teal">{stats.upcomingOrders}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-ink">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-mute">
              Chiffre d'Affaires
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-pink">{stats.totalRevenue.toLocaleString()} DH</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Orders Table */}
      <Tabs defaultValue={status || "all"} className="w-full">
        <TabsList className="grid w-full max-w-xl grid-cols-5 bg-card">
          <TabsTrigger value="all" asChild>
            <Link href="/admin/anniversaires">Tous</Link>
          </TabsTrigger>
          <TabsTrigger value="pending" asChild>
            <Link href="/admin/anniversaires?status=pending">En attente</Link>
          </TabsTrigger>
          <TabsTrigger value="confirmed" asChild>
            <Link href="/admin/anniversaires?status=confirmed">Confirmées</Link>
          </TabsTrigger>
          <TabsTrigger value="completed" asChild>
            <Link href="/admin/anniversaires?status=completed">Terminées</Link>
          </TabsTrigger>
          <TabsTrigger value="cancelled" asChild>
            <Link href="/admin/anniversaires?status=cancelled">Annulées</Link>
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <Card className="bg-card border-ink">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-ink">
                    <TableHead className="text-mute">Référence</TableHead>
                    <TableHead className="text-mute">Enfant</TableHead>
                    <TableHead className="text-mute">Parent</TableHead>
                    <TableHead className="text-mute">Date</TableHead>
                    <TableHead className="text-mute">Formule</TableHead>
                    <TableHead className="text-mute">Invités</TableHead>
                    <TableHead className="text-mute">Total</TableHead>
                    <TableHead className="text-mute">Statut</TableHead>
                    <TableHead className="text-mute">Paiement</TableHead>
                    <TableHead className="text-mute text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-12">
                        <Cake className="w-12 h-12 text-ink mx-auto mb-4" />
                        <p className="text-mute">Aucune commande trouvée</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((order: any) => (
                      <TableRow key={order.id} className="border-ink hover:bg-card">
                        <TableCell className="font-mono text-pink font-bold">
                          {order.booking_reference}
                        </TableCell>
                        <TableCell>
                          <div className="text-ink font-medium">
                            {order.teen?.pseudo || order.teen?.first_name || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-ink text-sm">
                            {order.parent?.full_name || "-"}
                          </div>
                          <div className="text-mute text-xs">
                            {order.parent?.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-ink">
                            <Calendar className="w-4 h-4 text-pink" />
                            {new Date(order.celebration_date).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short"
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-ink text-sm">
                            {order.pack?.name || "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-ink">
                            <Users className="w-4 h-4 text-mute" />
                            {order.guest_count}
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-ink">
                          {order.total_price?.toLocaleString()} DH
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(order.status)}
                        </TableCell>
                        <TableCell>
                          {getPaymentBadge(order.payment_status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              className="h-8 w-8"
                            >
                              <Link href={`/admin/anniversaires/${order.id}`}>
                                <Eye className="w-4 h-4" />
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </Tabs>
    </div>
  )
}
