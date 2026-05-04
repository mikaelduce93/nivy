"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Wallet,
  ArrowLeft,
  Download,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Calendar,
  CreditCard,
  Building2,
  TrendingUp,
  Filter,
  RefreshCw,
  AlertTriangle
} from "lucide-react"
import Link from "next/link"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Payout {
  id: string
  amount: number
  status: "pending" | "processing" | "completed" | "failed"
  createdAt: string
  processedAt?: string
  reference: string
  bankAccount: string
}

export default function PartnerPayoutsPage() {
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState("")

  const stats = {
    availableBalance: 15750,
    pendingPayouts: 5000,
    totalPaidOut: 85000,
    nextPayoutDate: "2026-01-25"
  }

  const payouts: Payout[] = [
    {
      id: "1",
      amount: 5000,
      status: "pending",
      createdAt: "2026-01-20",
      reference: "PAY-2026-001",
      bankAccount: "****4521"
    },
    {
      id: "2",
      amount: 12000,
      status: "completed",
      createdAt: "2026-01-15",
      processedAt: "2026-01-17",
      reference: "PAY-2026-002",
      bankAccount: "****4521"
    },
    {
      id: "3",
      amount: 8500,
      status: "completed",
      createdAt: "2026-01-01",
      processedAt: "2026-01-03",
      reference: "PAY-2025-045",
      bankAccount: "****4521"
    },
    {
      id: "4",
      amount: 15000,
      status: "completed",
      createdAt: "2025-12-15",
      processedAt: "2025-12-17",
      reference: "PAY-2025-044",
      bankAccount: "****4521"
    },
    {
      id: "5",
      amount: 3000,
      status: "failed",
      createdAt: "2025-12-01",
      reference: "PAY-2025-043",
      bankAccount: "****4521"
    }
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-400"><Clock className="w-3 h-3 mr-1" />En attente</Badge>
      case "processing":
        return <Badge className="bg-blue-500/20 text-blue-400"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Traitement</Badge>
      case "completed":
        return <Badge className="bg-green-500/20 text-green-400"><CheckCircle2 className="w-3 h-3 mr-1" />Complété</Badge>
      case "failed":
        return <Badge className="bg-red-500/20 text-red-400"><XCircle className="w-3 h-3 mr-1" />Échoué</Badge>
      default:
        return null
    }
  }

  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Montant invalide")
      return
    }
    if (amount > stats.availableBalance) {
      toast.error("Solde insuffisant")
      return
    }
    if (amount < 500) {
      toast.error("Montant minimum: 500 DH")
      return
    }

    toast.success("Demande de retrait envoyée", {
      description: `${amount} DH seront transférés sous 2-3 jours ouvrables`
    })
    setWithdrawDialogOpen(false)
    setWithdrawAmount("")
  }

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
              <Wallet className="w-8 h-8 text-green-400" />
              Mes Paiements
            </h1>
            <p className="text-zinc-400 mt-1">Gérez vos retraits et consultez l'historique</p>
          </div>
          <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-500 hover:bg-green-600">
                <ArrowUpRight className="w-4 h-4 mr-2" />
                Demander un retrait
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800">
              <DialogHeader>
                <DialogTitle className="text-white">Demander un retrait</DialogTitle>
                <DialogDescription>
                  Les fonds seront transférés sur votre compte bancaire enregistré
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-sm text-zinc-400">Solde disponible</p>
                  <p className="text-3xl font-black text-green-400">{stats.availableBalance.toLocaleString()} DH</p>
                </div>

                <div>
                  <Label>Montant à retirer (DH)</Label>
                  <Input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Minimum 500 DH"
                    className="bg-zinc-800 border-zinc-700 mt-2"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Frais de virement: 0 DH
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-zinc-800/50">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-zinc-400" />
                    <div>
                      <p className="text-sm text-zinc-400">Compte destinataire</p>
                      <p className="text-white font-medium">Attijariwafa Bank ****4521</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-blue-400 mt-0.5" />
                    <div className="text-sm">
                      <p className="text-blue-400 font-medium">Délai de traitement</p>
                      <p className="text-zinc-400">2-3 jours ouvrables</p>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setWithdrawDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleWithdraw} className="bg-green-500 hover:bg-green-600">
                  Confirmer le retrait
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-400 font-medium">Solde disponible</p>
                  <p className="text-3xl font-black text-white">{stats.availableBalance.toLocaleString()} DH</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-yellow-400 font-medium">En attente</p>
                  <p className="text-3xl font-black text-white">{stats.pendingPayouts.toLocaleString()} DH</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-400 font-medium">Total versé</p>
                  <p className="text-3xl font-black text-white">{stats.totalPaidOut.toLocaleString()} DH</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-400 font-medium">Prochain virement</p>
                  <p className="text-xl font-black text-white">
                    {new Date(stats.nextPayoutDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payout Schedule Info */}
        <Card className="mb-8 bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <p className="font-medium text-blue-400">Calendrier des versements</p>
                <p className="text-sm text-zinc-400">
                  Les versements automatiques sont effectués le 1er et le 15 de chaque mois pour les soldes supérieurs à 1000 DH.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payouts History */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Historique des paiements</CardTitle>
              <div className="flex gap-2">
                <Select defaultValue="all">
                  <SelectTrigger className="w-32 bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="completed">Complétés</SelectItem>
                    <SelectItem value="failed">Échoués</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {payouts.map((payout) => (
                <div
                  key={payout.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      payout.status === "completed" ? "bg-green-500/20" :
                      payout.status === "pending" ? "bg-yellow-500/20" :
                      payout.status === "failed" ? "bg-red-500/20" :
                      "bg-blue-500/20"
                    }`}>
                      {payout.status === "completed" ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      ) : payout.status === "pending" ? (
                        <Clock className="w-5 h-5 text-yellow-400" />
                      ) : payout.status === "failed" ? (
                        <XCircle className="w-5 h-5 text-red-400" />
                      ) : (
                        <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-white">{payout.amount.toLocaleString()} DH</p>
                      <p className="text-sm text-zinc-400">
                        {payout.reference} • {payout.bankAccount}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    {getStatusBadge(payout.status)}
                    <p className="text-xs text-zinc-500 mt-1">
                      {payout.processedAt
                        ? `Traité le ${new Date(payout.processedAt).toLocaleDateString('fr-FR')}`
                        : `Demandé le ${new Date(payout.createdAt).toLocaleDateString('fr-FR')}`
                      }
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
