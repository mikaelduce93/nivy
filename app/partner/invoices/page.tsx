"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  FileText,
  ArrowLeft,
  Download,
  Eye,
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Printer,
  Mail
} from "lucide-react"
import Link from "next/link"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Invoice {
  id: string
  number: string
  date: string
  dueDate: string
  amount: number
  status: "paid" | "pending" | "overdue"
  items: number
  period: string
}

export default function PartnerInvoicesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [yearFilter, setYearFilter] = useState("2026")

  const invoices: Invoice[] = [
    {
      id: "1",
      number: "INV-2026-001",
      date: "2026-01-15",
      dueDate: "2026-01-30",
      amount: 12500,
      status: "pending",
      items: 45,
      period: "1-15 Jan 2026"
    },
    {
      id: "2",
      number: "INV-2026-002",
      date: "2026-01-01",
      dueDate: "2026-01-15",
      amount: 8750,
      status: "paid",
      items: 32,
      period: "16-31 Déc 2025"
    },
    {
      id: "3",
      number: "INV-2025-024",
      date: "2025-12-15",
      dueDate: "2025-12-30",
      amount: 15000,
      status: "paid",
      items: 58,
      period: "1-15 Déc 2025"
    },
    {
      id: "4",
      number: "INV-2025-023",
      date: "2025-12-01",
      dueDate: "2025-12-15",
      amount: 9200,
      status: "paid",
      items: 41,
      period: "16-30 Nov 2025"
    },
    {
      id: "5",
      number: "INV-2025-022",
      date: "2025-11-15",
      dueDate: "2025-11-30",
      amount: 6500,
      status: "overdue",
      items: 28,
      period: "1-15 Nov 2025"
    }
  ]

  const stats = {
    totalInvoiced: 51950,
    totalPaid: 32950,
    pending: 12500,
    overdue: 6500
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500/20 text-green-400"><CheckCircle2 className="w-3 h-3 mr-1" />Payée</Badge>
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-400"><Clock className="w-3 h-3 mr-1" />En attente</Badge>
      case "overdue":
        return <Badge className="bg-red-500/20 text-red-400"><AlertTriangle className="w-3 h-3 mr-1" />En retard</Badge>
      default:
        return null
    }
  }

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.number.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-32">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button asChild variant="ghost" className="text-zinc-400 hover:text-white">
            <Link href="/partner/dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Link>
          </Button>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <FileText className="w-8 h-8 text-purple-400" />
              Mes Factures
            </h1>
            <p className="text-zinc-400 mt-1">Consultez et téléchargez vos factures</p>
          </div>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exporter tout
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
            <CardContent className="p-5">
              <p className="text-xs text-purple-400 font-medium">Total facturé</p>
              <p className="text-2xl font-black text-white">{stats.totalInvoiced.toLocaleString()} DH</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
            <CardContent className="p-5">
              <p className="text-xs text-green-400 font-medium">Total payé</p>
              <p className="text-2xl font-black text-white">{stats.totalPaid.toLocaleString()} DH</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
            <CardContent className="p-5">
              <p className="text-xs text-yellow-400 font-medium">En attente</p>
              <p className="text-2xl font-black text-white">{stats.pending.toLocaleString()} DH</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500/20 to-orange-500/20 border-red-500/30">
            <CardContent className="p-5">
              <p className="text-xs text-red-400 font-medium">En retard</p>
              <p className="text-2xl font-black text-white">{stats.overdue.toLocaleString()} DH</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6 bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    placeholder="Rechercher par numéro..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-zinc-800 border-zinc-700"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="paid">Payées</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="overdue">En retard</SelectItem>
                </SelectContent>
              </Select>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-32 bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Année" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Invoices Table */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-400">Numéro</TableHead>
                  <TableHead className="text-zinc-400">Période</TableHead>
                  <TableHead className="text-zinc-400">Date</TableHead>
                  <TableHead className="text-zinc-400">Échéance</TableHead>
                  <TableHead className="text-zinc-400">Transactions</TableHead>
                  <TableHead className="text-zinc-400">Montant</TableHead>
                  <TableHead className="text-zinc-400">Statut</TableHead>
                  <TableHead className="text-zinc-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id} className="border-zinc-800 hover:bg-zinc-800/50">
                    <TableCell className="font-mono font-bold text-purple-400">
                      {invoice.number}
                    </TableCell>
                    <TableCell className="text-white">
                      {invoice.period}
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      {new Date(invoice.date).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      {new Date(invoice.dueDate).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell className="text-white">
                      {invoice.items} transactions
                    </TableCell>
                    <TableCell className="font-bold text-white">
                      {invoice.amount.toLocaleString()} DH
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(invoice.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Printer className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {filteredInvoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
                      <p className="text-zinc-500">Aucune facture trouvée</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Invoice Info */}
        <Card className="mt-6 bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <p className="font-medium text-blue-400">Facturation bimensuelle</p>
                <p className="text-sm text-zinc-400">
                  Les factures sont générées le 1er et le 15 de chaque mois, couvrant les 15 jours précédents.
                  Le paiement est dû sous 15 jours.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
