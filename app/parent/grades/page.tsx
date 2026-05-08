"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  GraduationCap,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  Calendar,
  User,
  Filter,
  Search,
  AlertCircle,
  Award,
  TrendingUp,
  History,
  Loader2
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { EmptyState } from "@/components/ui/states/empty-state"

interface Grade {
  id: string
  teen_id: string
  teen_name: string
  subject: string
  grade: number
  max_grade: number
  exam_type: string
  exam_date: string
  status: "pending" | "validated" | "rejected"
  parent_comment?: string
  validated_at?: string
  created_at: string
}

interface GradeStats {
  totalPending: number
  totalValidated: number
  totalRejected: number
  averageGrade: number
}

export default function ParentGradesPage() {
  const [grades, setGrades] = useState<Grade[]>([])
  const [filteredGrades, setFilteredGrades] = useState<Grade[]>([])
  const [stats, setStats] = useState<GradeStats>({ totalPending: 0, totalValidated: 0, totalRejected: 0, averageGrade: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "pending" | "validated" | "rejected">("pending")
  const [search, setSearch] = useState("")
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null)
  const [validationComment, setValidationComment] = useState("")
  const [isValidating, setIsValidating] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [unavailable, setUnavailable] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchGrades()
  }, [])

  useEffect(() => {
    filterGrades()
  }, [grades, filter, search])

  const fetchGrades = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get linked teens
      const { data: teens } = await supabase
        .from("parent_teen_links")
        .select("teen_id, children(prenom, nom)")
        .eq("parent_id", user.id)
        .eq("status", "active")

      if (!teens || teens.length === 0) {
        setLoading(false)
        return
      }

      const teenIds = teens.map((t: any) => t.teen_id)
      const teenNameMap = new Map<string, string>(teens.map((t: any) => [
        t.teen_id,
        `${t.children?.prenom || ""} ${t.children?.nom || ""}`.trim() || "Teen"
      ]))

      // Fetch real grades from Supabase
      const { data: rows, error: gradesError } = await supabase
        .from("teen_grades")
        .select("id, teen_id, subject, grade, max_grade, grade_type, grade_date, status, parent_comment, validated_at, created_at")
        .in("teen_id", teenIds)
        .order("created_at", { ascending: false })

      if (gradesError) {
        // Table missing or schema not deployed -> graceful empty/unavailable state
        const code = (gradesError as { code?: string }).code
        const tableMissing = code === "42P01" || code === "PGRST205" || code === "PGRST204"
        if (tableMissing) {
          setGrades([])
          setStats({ totalPending: 0, totalValidated: 0, totalRejected: 0, averageGrade: 0 })
          setUnavailable(true)
          return
        }
        console.error("Error fetching grades:", gradesError)
        toast.error("Erreur lors du chargement des notes")
        return
      }

      const real: Grade[] = (rows || []).map((r: any) => ({
        id: r.id,
        teen_id: r.teen_id,
        teen_name: teenNameMap.get(r.teen_id) || "Teen",
        subject: r.subject,
        grade: r.grade,
        max_grade: r.max_grade ?? 20,
        exam_type: r.grade_type ?? "",
        exam_date: r.grade_date ?? r.created_at,
        status: (r.status as Grade["status"]) ?? "pending",
        parent_comment: r.parent_comment ?? undefined,
        validated_at: r.validated_at ?? undefined,
        created_at: r.created_at,
      }))

      setGrades(real)

      const pending = real.filter(g => g.status === "pending").length
      const validated = real.filter(g => g.status === "validated").length
      const rejected = real.filter(g => g.status === "rejected").length
      const validatedGrades = real.filter(g => g.status === "validated")
      const avgGrade = validatedGrades.length > 0
        ? validatedGrades.reduce((sum, g) => sum + (g.grade / g.max_grade) * 20, 0) / validatedGrades.length
        : 0

      setStats({
        totalPending: pending,
        totalValidated: validated,
        totalRejected: rejected,
        averageGrade: Math.round(avgGrade * 10) / 10
      })

    } catch (error) {
      console.error("Error fetching grades:", error)
      toast.error("Erreur lors du chargement des notes")
    } finally {
      setLoading(false)
    }
  }

  const filterGrades = () => {
    let filtered = [...grades]

    if (filter !== "all") {
      filtered = filtered.filter(g => g.status === filter)
    }

    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(g =>
        g.subject.toLowerCase().includes(searchLower) ||
        g.teen_name.toLowerCase().includes(searchLower) ||
        g.exam_type.toLowerCase().includes(searchLower)
      )
    }

    setFilteredGrades(filtered)
  }

  const handleValidate = async (grade: Grade) => {
    setIsValidating(true)
    try {
      const validatedAt = new Date().toISOString()
      const { error } = await supabase
        .from("teen_grades")
        .update({
          status: "validated",
          parent_comment: validationComment || null,
          validated_at: validatedAt,
        })
        .eq("id", grade.id)

      if (error) throw error

      setGrades(prev => prev.map(g =>
        g.id === grade.id
          ? { ...g, status: "validated" as const, parent_comment: validationComment, validated_at: validatedAt }
          : g
      ))

      toast.success("Note validée avec succès!")
      setSelectedGrade(null)
      setValidationComment("")

      // Update stats
      setStats(prev => ({
        ...prev,
        totalPending: prev.totalPending - 1,
        totalValidated: prev.totalValidated + 1
      }))

    } catch (error) {
      toast.error("Erreur lors de la validation")
    } finally {
      setIsValidating(false)
    }
  }

  const handleReject = async () => {
    if (!selectedGrade) return
    setIsValidating(true)

    try {
      const validatedAt = new Date().toISOString()
      const { error } = await supabase
        .from("teen_grades")
        .update({
          status: "rejected",
          parent_comment: validationComment || null,
          validated_at: validatedAt,
        })
        .eq("id", selectedGrade.id)

      if (error) throw error

      setGrades(prev => prev.map(g =>
        g.id === selectedGrade.id
          ? { ...g, status: "rejected" as const, parent_comment: validationComment, validated_at: validatedAt }
          : g
      ))

      toast.success("Note rejetée")
      setSelectedGrade(null)
      setValidationComment("")
      setShowRejectDialog(false)

      // Update stats
      setStats(prev => ({
        ...prev,
        totalPending: prev.totalPending - 1,
        totalRejected: prev.totalRejected + 1
      }))

    } catch (error) {
      toast.error("Erreur lors du rejet")
    } finally {
      setIsValidating(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric"
    })
  }

  const getGradeColor = (grade: number, maxGrade: number) => {
    const percentage = (grade / maxGrade) * 100
    if (percentage >= 80) return "text-emerald-400"
    if (percentage >= 60) return "text-blue-400"
    if (percentage >= 40) return "text-amber-400"
    return "text-red-400"
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs">
            <Clock className="h-3 w-3" />
            En attente
          </span>
        )
      case "validated":
        return (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
            <CheckCircle2 className="h-3 w-3" />
            Validée
          </span>
        )
      case "rejected":
        return (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs">
            <XCircle className="h-3 w-3" />
            Rejetée
          </span>
        )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-6 text-zinc-400 hover:text-white">
          <Link href="/parent">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <GraduationCap className="h-8 w-8 text-emerald-400" />
              Validation Notes Scolaires
            </h1>
            <p className="text-zinc-400">Validez les notes soumises par vos teens</p>
          </div>
        </div>

        {/* Unavailable banner */}
        {unavailable && (
          <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-300">Bientôt disponible</p>
              <p className="text-xs text-amber-200/80 mt-1">
                La validation des notes sera affichée ici une fois la fonctionnalité activée. Aucune note réelle n'est disponible pour le moment.
              </p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30 bg-zinc-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-400 font-medium">En attente</p>
                  <p className="text-3xl font-black text-white">{stats.totalPending}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-500/30 bg-zinc-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-400 font-medium">Validées</p>
                  <p className="text-3xl font-black text-white">{stats.totalValidated}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500/20 to-pink-500/20 border-red-500/30 bg-zinc-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-400 font-medium">Rejetées</p>
                  <p className="text-3xl font-black text-white">{stats.totalRejected}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30 bg-zinc-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-400 font-medium">Moyenne</p>
                  <p className="text-3xl font-black text-white">{stats.averageGrade}/20</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Rechercher par matière, teen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-zinc-900 border-zinc-800 text-white"
            />
          </div>
          <div className="flex gap-2">
            {(["pending", "validated", "rejected", "all"] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
                className={filter === f
                  ? "bg-emerald-500 hover:bg-emerald-600"
                  : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                }
              >
                {f === "pending" && "En attente"}
                {f === "validated" && "Validées"}
                {f === "rejected" && "Rejetées"}
                {f === "all" && "Toutes"}
              </Button>
            ))}
          </div>
        </div>

        {/* Grades List */}
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-emerald-400" />
              Notes ({filteredGrades.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredGrades.length > 0 ? (
              <div className="space-y-3">
                {filteredGrades.map((grade) => (
                  <div
                    key={grade.id}
                    className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/30 transition-all"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                          <BookOpen className="h-7 w-7 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-white">{grade.subject}</h3>
                            {getStatusBadge(grade.status)}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-zinc-400 mt-1">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {grade.teen_name}
                            </span>
                            <span>•</span>
                            <span>{grade.exam_type}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(grade.exam_date)}
                            </span>
                          </div>
                          {grade.parent_comment && (
                            <p className="text-xs text-zinc-500 mt-2 italic">
                              "{grade.parent_comment}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className={`text-3xl font-black ${getGradeColor(grade.grade, grade.max_grade)}`}>
                            {grade.grade}/{grade.max_grade}
                          </p>
                          <p className="text-xs text-zinc-500">Note</p>
                        </div>

                        {grade.status === "pending" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => setSelectedGrade(grade)}
                              className="bg-emerald-500 hover:bg-emerald-600"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Valider
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedGrade(grade)
                                setShowRejectDialog(true)
                              }}
                              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Rejeter
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={GraduationCap}
                size="large"
                title={filter === "pending" ? "Aucune note en attente" : "Aucune note trouvée"}
                description={filter === "pending"
                  ? "Les nouvelles notes soumises par vos teens apparaîtront ici"
                  : "Modifiez vos filtres pour voir d'autres notes"}
              />
            )}
          </CardContent>
        </Card>

        {/* Validate Dialog */}
        <Dialog open={!!selectedGrade && !showRejectDialog} onOpenChange={() => setSelectedGrade(null)}>
          <DialogContent className="bg-zinc-900 border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                Valider la note
              </DialogTitle>
              <DialogDescription className="text-zinc-400">
                Confirmez la validation de cette note de {selectedGrade?.teen_name}
              </DialogDescription>
            </DialogHeader>

            {selectedGrade && (
              <div className="py-4">
                <div className="p-4 rounded-xl bg-zinc-800 mb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-white font-semibold">{selectedGrade.subject}</p>
                      <p className="text-sm text-zinc-400">{selectedGrade.exam_type} - {formatDate(selectedGrade.exam_date)}</p>
                    </div>
                    <p className={`text-2xl font-black ${getGradeColor(selectedGrade.grade, selectedGrade.max_grade)}`}>
                      {selectedGrade.grade}/{selectedGrade.max_grade}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comment" className="text-zinc-300">Commentaire (optionnel)</Label>
                  <Textarea
                    id="comment"
                    placeholder="Félicitations, continue comme ça!"
                    value={validationComment}
                    onChange={(e) => setValidationComment(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white"
                    rows={3}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedGrade(null)
                  setValidationComment("")
                }}
                className="border-zinc-700 text-zinc-300"
              >
                Annuler
              </Button>
              <Button
                onClick={() => selectedGrade && handleValidate(selectedGrade)}
                disabled={isValidating}
                className="bg-emerald-500 hover:bg-emerald-600"
              >
                {isValidating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Valider la note
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent className="bg-zinc-900 border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-400" />
                Rejeter la note
              </DialogTitle>
              <DialogDescription className="text-zinc-400">
                Indiquez la raison du rejet de cette note
              </DialogDescription>
            </DialogHeader>

            {selectedGrade && (
              <div className="py-4">
                <div className="p-4 rounded-xl bg-zinc-800 mb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-white font-semibold">{selectedGrade.subject}</p>
                      <p className="text-sm text-zinc-400">{selectedGrade.exam_type}</p>
                    </div>
                    <p className={`text-2xl font-black ${getGradeColor(selectedGrade.grade, selectedGrade.max_grade)}`}>
                      {selectedGrade.grade}/{selectedGrade.max_grade}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reject-reason" className="text-zinc-300">Raison du rejet *</Label>
                  <Textarea
                    id="reject-reason"
                    placeholder="Ex: Note incorrecte, preuve manquante..."
                    value={validationComment}
                    onChange={(e) => setValidationComment(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white"
                    rows={3}
                    required
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectDialog(false)
                  setSelectedGrade(null)
                  setValidationComment("")
                }}
                className="border-zinc-700 text-zinc-300"
              >
                Annuler
              </Button>
              <Button
                onClick={handleReject}
                disabled={isValidating || !validationComment.trim()}
                className="bg-red-500 hover:bg-red-600"
              >
                {isValidating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Rejeter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
