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
  status: "pending" | "approved" | "rejected"
  rejection_reason?: string
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
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending")
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

      // Get linked teens (#31 — no `children` table; teen name from `teens`).
      const { data: teens } = await supabase
        .from("parent_teen_links")
        .select("teen_id, teens:teen_id(first_name, last_name, pseudo)")
        .eq("parent_id", user.id)
        .eq("status", "active")

      if (!teens || teens.length === 0) {
        setLoading(false)
        return
      }

      const teenIds = teens.map((t: any) => t.teen_id)
      const teenNameMap = new Map<string, string>(teens.map((t: any) => [
        t.teen_id,
        `${t.teens?.first_name || ""} ${t.teens?.last_name || ""}`.trim() || t.teens?.pseudo || "Teen"
      ]))

      // Fetch real grades (#31 — teen_grades has no rejection_reason; rejection
      // reason lives in rejection_reason).
      const { data: rows, error: gradesError } = await supabase
        .from("teen_grades")
        .select("id, teen_id, subject, grade, max_grade, grade_type, grade_date, status, rejection_reason, validated_at, created_at")
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
        rejection_reason: r.rejection_reason ?? undefined,
        validated_at: r.validated_at ?? undefined,
        created_at: r.created_at,
      }))

      setGrades(real)

      const pending = real.filter(g => g.status === "pending").length
      const validated = real.filter(g => g.status === "approved").length
      const rejected = real.filter(g => g.status === "rejected").length
      const validatedGrades = real.filter(g => g.status === "approved")
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
      // #31 — canonical status is 'approved' (CHECK rejects 'validated'); no
      // rejection_reason column on teen_grades.
      const { error } = await supabase
        .from("teen_grades")
        .update({
          status: "approved",
          validated_at: validatedAt,
        })
        .eq("id", grade.id)

      if (error) throw error

      setGrades(prev => prev.map(g =>
        g.id === grade.id
          ? { ...g, status: "approved" as const, validated_at: validatedAt }
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
      // #31 — the rejection comment lives in the real rejection_reason column.
      const { error } = await supabase
        .from("teen_grades")
        .update({
          status: "rejected",
          rejection_reason: validationComment || null,
          validated_at: validatedAt,
        })
        .eq("id", selectedGrade.id)

      if (error) throw error

      setGrades(prev => prev.map(g =>
        g.id === selectedGrade.id
          ? { ...g, status: "rejected" as const, rejection_reason: validationComment, validated_at: validatedAt }
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
    if (percentage >= 80) return "text-lime"
    if (percentage >= 60) return "text-teal"
    if (percentage >= 40) return "text-gold"
    return "text-destructive"
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-gold/20 text-gold text-xs">
            <Clock className="h-3 w-3" />
            En attente
          </span>
        )
      case "approved":
        return (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-lime/20 text-lime text-xs">
            <CheckCircle2 className="h-3 w-3" />
            Validée
          </span>
        )
      case "rejected":
        return (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/20 text-destructive text-xs">
            <XCircle className="h-3 w-3" />
            Rejetée
          </span>
        )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-lime" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-32">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-6 text-mute hover:text-ink">
          <Link href="/parent">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-ink flex items-center gap-3">
              <GraduationCap className="h-8 w-8 text-lime" />
              Validation Notes Scolaires
            </h1>
            <p className="text-mute">Validez les notes soumises par vos teens</p>
          </div>
        </div>

        {/* Unavailable banner */}
        {unavailable && (
          <div className="mb-6 p-4 rounded-xl border border-gold/30 bg-gold/10 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-gold mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gold">Bientôt disponible</p>
              <p className="text-xs text-gold/80 mt-1">
                La validation des notes sera affichée ici une fois la fonctionnalité activée. Aucune note réelle n'est disponible pour le moment.
              </p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-gold/20 to-coral/20 border-gold/30 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gold font-medium">En attente</p>
                  <p className="text-3xl font-black text-ink">{stats.totalPending}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-gold/20 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-gold" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-lime/20 to-teal/20 border-lime/30 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-lime font-medium">Validées</p>
                  <p className="text-3xl font-black text-ink">{stats.totalValidated}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-lime/20 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-lime" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-destructive/20 to-pink/20 border-destructive/30 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-destructive font-medium">Rejetées</p>
                  <p className="text-3xl font-black text-ink">{stats.totalRejected}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-destructive/20 flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-teal/20 to-teal/20 border-teal/30 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-teal font-medium">Moyenne</p>
                  <p className="text-3xl font-black text-ink">{stats.averageGrade}/20</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-teal/20 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-teal" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-mute" />
            <Input
              placeholder="Rechercher par matière, teen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-card border-ink text-ink"
            />
          </div>
          <div className="flex gap-2">
            {(["pending", "approved", "rejected", "all"] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
                className={filter === f
                  ? "bg-lime hover:bg-lime"
                  : "border-ink text-ink-2 hover:bg-card"
                }
              >
                {f === "pending" && "En attente"}
                {f === "approved" && "Validées"}
                {f === "rejected" && "Rejetées"}
                {f === "all" && "Toutes"}
              </Button>
            ))}
          </div>
        </div>

        {/* Grades List */}
        <Card className="bg-gradient-to-br from-paper-2 to-card border-ink">
          <CardHeader>
            <CardTitle className="text-ink flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-lime" />
              Notes ({filteredGrades.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredGrades.length > 0 ? (
              <div className="space-y-3">
                {filteredGrades.map((grade) => (
                  <div
                    key={grade.id}
                    className="p-4 rounded-xl bg-card border border-ink hover:border-lime/30 transition-all"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-lime to-teal flex items-center justify-center">
                          <BookOpen className="h-7 w-7 text-ink" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-ink">{grade.subject}</h3>
                            {getStatusBadge(grade.status)}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-mute mt-1">
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
                          {grade.rejection_reason && (
                            <p className="text-xs text-mute mt-2 italic">
                              "{grade.rejection_reason}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className={`text-3xl font-black ${getGradeColor(grade.grade, grade.max_grade)}`}>
                            {grade.grade}/{grade.max_grade}
                          </p>
                          <p className="text-xs text-mute">Note</p>
                        </div>

                        {grade.status === "pending" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => setSelectedGrade(grade)}
                              className="bg-lime hover:bg-lime"
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
                              className="border-destructive/50 text-destructive hover:bg-destructive/10"
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
          <DialogContent className="bg-card border-ink">
            <DialogHeader>
              <DialogTitle className="text-ink flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-lime" />
                Valider la note
              </DialogTitle>
              <DialogDescription className="text-mute">
                Confirmez la validation de cette note de {selectedGrade?.teen_name}
              </DialogDescription>
            </DialogHeader>

            {selectedGrade && (
              <div className="py-4">
                <div className="p-4 rounded-xl bg-card mb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-ink font-semibold">{selectedGrade.subject}</p>
                      <p className="text-sm text-mute">{selectedGrade.exam_type} - {formatDate(selectedGrade.exam_date)}</p>
                    </div>
                    <p className={`text-2xl font-black ${getGradeColor(selectedGrade.grade, selectedGrade.max_grade)}`}>
                      {selectedGrade.grade}/{selectedGrade.max_grade}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comment" className="text-ink-2">Commentaire (optionnel)</Label>
                  <Textarea
                    id="comment"
                    placeholder="Félicitations, continue comme ça!"
                    value={validationComment}
                    onChange={(e) => setValidationComment(e.target.value)}
                    className="bg-card border-ink text-ink"
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
                className="border-ink text-ink-2"
              >
                Annuler
              </Button>
              <Button
                onClick={() => selectedGrade && handleValidate(selectedGrade)}
                disabled={isValidating}
                className="bg-lime hover:bg-lime"
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
          <DialogContent className="bg-card border-ink">
            <DialogHeader>
              <DialogTitle className="text-ink flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Rejeter la note
              </DialogTitle>
              <DialogDescription className="text-mute">
                Indiquez la raison du rejet de cette note
              </DialogDescription>
            </DialogHeader>

            {selectedGrade && (
              <div className="py-4">
                <div className="p-4 rounded-xl bg-card mb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-ink font-semibold">{selectedGrade.subject}</p>
                      <p className="text-sm text-mute">{selectedGrade.exam_type}</p>
                    </div>
                    <p className={`text-2xl font-black ${getGradeColor(selectedGrade.grade, selectedGrade.max_grade)}`}>
                      {selectedGrade.grade}/{selectedGrade.max_grade}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reject-reason" className="text-ink-2">Raison du rejet *</Label>
                  <Textarea
                    id="reject-reason"
                    placeholder="Ex: Note incorrecte, preuve manquante..."
                    value={validationComment}
                    onChange={(e) => setValidationComment(e.target.value)}
                    className="bg-card border-ink text-ink"
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
                className="border-ink text-ink-2"
              >
                Annuler
              </Button>
              <Button
                onClick={handleReject}
                disabled={isValidating || !validationComment.trim()}
                className="bg-destructive hover:bg-destructive"
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
