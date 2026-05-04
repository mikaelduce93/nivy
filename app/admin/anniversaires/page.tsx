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
      return <Badge className="bg-green-500 text-white">Confirmé</Badge>
    case "pending":
      return <Badge className="bg-yellow-500 text-black">En attente</Badge>
    case "cancelled":
      return <Badge className="bg-red-500 text-white">Annulé</Badge>
    case "completed":
      return <Badge className="bg-blue-500 text-white">Terminé</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function getPaymentBadge(status: string) {
  switch (status) {
    case "paid":
      return <Badge variant="outline" className="border-green-500 text-green-500">Payé</Badge>
    case "deposit":
      return <Badge variant="outline" className="border-yellow-500 text-yellow-500">Acompte</Badge>
    case "pending":
      return <Badge variant="outline" className="border-zinc-500 text-zinc-500">Non payé</Badge>
    case "refunded":
      return <Badge variant="outline" className="border-red-500 text-red-500">Remboursé</Badge>
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

  if (!userInfo || (userInfo.role !== "admin" && userInfo.role !== "super_admin")) {
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
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Cake className="w-8 h-8 text-pink-500" />
            Gestion Anniversaires
          </h1>
          <p className="text-zinc-400 mt-1">
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
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Total Commandes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-white">{stats.totalOrders}</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              En Attente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-yellow-500">{stats.pendingOrders}</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Confirmées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-green-500">{stats.confirmedOrders}</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              À Venir
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-cyan-500">{stats.upcomingOrders}</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Chiffre d'Affaires
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-pink-500">{stats.totalRevenue.toLocaleString()} DH</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Orders Table */}
      <Tabs defaultValue={status || "all"} className="w-full">
        <TabsList className="grid w-full max-w-xl grid-cols-5 bg-zinc-900">
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
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800">
                    <TableHead className="text-zinc-400">Référence</TableHead>
                    <TableHead className="text-zinc-400">Enfant</TableHead>
                    <TableHead className="text-zinc-400">Parent</TableHead>
                    <TableHead className="text-zinc-400">Date</TableHead>
                    <TableHead className="text-zinc-400">Formule</TableHead>
                    <TableHead className="text-zinc-400">Invités</TableHead>
                    <TableHead className="text-zinc-400">Total</TableHead>
                    <TableHead className="text-zinc-400">Statut</TableHead>
                    <TableHead className="text-zinc-400">Paiement</TableHead>
                    <TableHead className="text-zinc-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-12">
                        <Cake className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                        <p className="text-zinc-500">Aucune commande trouvée</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((order: any) => (
                      <TableRow key={order.id} className="border-zinc-800 hover:bg-zinc-800/50">
                        <TableCell className="font-mono text-pink-400 font-bold">
                          {order.booking_reference}
                        </TableCell>
                        <TableCell>
                          <div className="text-white font-medium">
                            {order.teen?.pseudo || order.teen?.first_name || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-white text-sm">
                            {order.parent?.full_name || "-"}
                          </div>
                          <div className="text-zinc-500 text-xs">
                            {order.parent?.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-white">
                            <Calendar className="w-4 h-4 text-pink-400" />
                            {new Date(order.celebration_date).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short"
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-white text-sm">
                            {order.pack?.name || "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-white">
                            <Users className="w-4 h-4 text-zinc-500" />
                            {order.guest_count}
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-white">
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
