"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
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
  ArrowLeft,
  CheckCircle2,
  XCircle,
  BookOpen,
  Calendar,
  User,
  Search,
  AlertCircle,
  Loader2
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { StickerCard } from "@/components/ui/sticker-card"
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge"
import { StatHero, NivCoach, NivEmpty } from "@/components/brand"

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

  const getStatusBadge = (status: string): { text: string; variant: StatusVariant } => {
    switch (status) {
      case "pending":
        return { text: "En attente", variant: "warning" }
      case "approved":
        return { text: "Validée", variant: "success" }
      case "rejected":
        return { text: "Rejetée", variant: "danger" }
      default:
        return { text: status.replace(/_/g, " "), variant: "neutral" }
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
      <div className="container mx-auto px-6 py-10">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-6 text-mute hover:text-ink">
          <Link href="/parent">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        {/* Header éditorial */}
        <div className="mb-6">
          <p className="eyebrow text-pink">SUIVI · NOTES</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Les notes de <em className="font-semibold italic text-pink">ton crew</em>
          </h1>
          <p className="mt-2 text-sm text-mute">Valide les notes soumises par tes teens.</p>
        </div>

        <NivCoach
          mood="proud"
          tone="paper"
          className="mb-8"
          message="Bravo à ton crew ! Valide leurs notes pour leur débloquer des récompenses."
        />

        {/* Unavailable banner */}
        {unavailable && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border-2 border-gold/40 bg-gold/10 p-4">
            <AlertCircle className="h-5 w-5 text-gold mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gold">Bientôt disponible</p>
              <p className="text-xs text-gold/80 mt-1">
                La validation des notes sera affichée ici une fois la fonctionnalité activée. Aucune note réelle n'est disponible pour le moment.
              </p>
            </div>
          </div>
        )}

        {/* Hiérarchie 1-2-3 : moyenne en hero sombre + 3 stickers */}
        <div className="mb-8 grid gap-4 md:grid-cols-2">
          <StatHero
            eyebrow="Moyenne validée"
            value={stats.averageGrade}
            unit="/20"
            tone="teal"
            size="lg"
            meta={`${stats.totalValidated} note${stats.totalValidated > 1 ? "s" : ""} validée${stats.totalValidated > 1 ? "s" : ""}`}
          />
          <div className="grid grid-cols-3 gap-4">
            <StickerCard className="p-4">
              <p className="eyebrow text-mute">En attente</p>
              <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-gold">{stats.totalPending}</p>
            </StickerCard>
            <StickerCard className="p-4">
              <p className="eyebrow text-mute">Validées</p>
              <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-lime">{stats.totalValidated}</p>
            </StickerCard>
            <StickerCard className="p-4">
              <p className="eyebrow text-mute">Rejetées</p>
              <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-coral">{stats.totalRejected}</p>
            </StickerCard>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-mute" />
            <Input
              placeholder="Rechercher par matière, teen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 border-2 border-ink bg-white text-ink"
            />
          </div>
          <div className="flex gap-2">
            {(["pending", "approved", "rejected", "all"] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "pink" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
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
        <section className="space-y-3">
          <h2 className="eyebrow text-mute">Notes ({filteredGrades.length})</h2>
          {filteredGrades.length > 0 ? (
            <div className="space-y-3">
              {filteredGrades.map((grade) => {
                const gradeStatus = getStatusBadge(grade.status)
                return (
                  <StickerCard key={grade.id} className="p-4">
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                      <div className="flex items-center gap-4">
                        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border-2 border-ink bg-paper">
                          <BookOpen className="h-7 w-7 text-ink" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-display text-lg font-bold text-ink">{grade.subject}</h3>
                            <StatusBadge variant={gradeStatus.variant} label={gradeStatus.text} size="sm" />
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-mute">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {grade.teen_name}
                            </span>
                            <span>·</span>
                            <span>{grade.exam_type}</span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(grade.exam_date)}
                            </span>
                          </div>
                          {grade.rejection_reason && (
                            <p className="mt-2 text-xs italic text-mute">
                              "{grade.rejection_reason}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className={`font-display text-3xl font-extrabold tabular-nums ${getGradeColor(grade.grade, grade.max_grade)}`}>
                            {grade.grade}/{grade.max_grade}
                          </p>
                          <p className="eyebrow text-[10px] text-mute">Note</p>
                        </div>

                        {grade.status === "pending" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="pink"
                              onClick={() => setSelectedGrade(grade)}
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
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Rejeter
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </StickerCard>
                )
              })}
            </div>
          ) : (
            <NivEmpty
              title={filter === "pending" ? "Aucune note en attente" : "Aucune note trouvée"}
              description={filter === "pending"
                ? "Les nouvelles notes soumises par tes teens apparaîtront ici ✏️"
                : "Modifie tes filtres pour voir d'autres notes"}
            />
          )}
        </section>

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
                <div className="mb-4 rounded-xl border-2 border-ink bg-paper p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-ink font-semibold">{selectedGrade.subject}</p>
                      <p className="text-sm text-mute">{selectedGrade.exam_type} - {formatDate(selectedGrade.exam_date)}</p>
                    </div>
                    <p className={`font-display text-2xl font-extrabold tabular-nums ${getGradeColor(selectedGrade.grade, selectedGrade.max_grade)}`}>
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
                <div className="mb-4 rounded-xl border-2 border-ink bg-paper p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-ink font-semibold">{selectedGrade.subject}</p>
                      <p className="text-sm text-mute">{selectedGrade.exam_type}</p>
                    </div>
                    <p className={`font-display text-2xl font-extrabold tabular-nums ${getGradeColor(selectedGrade.grade, selectedGrade.max_grade)}`}>
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
