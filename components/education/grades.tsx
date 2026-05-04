"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus,
  Check,
  X,
  Clock,
  TrendingUp,
  TrendingDown,
  BookOpen,
  ChevronDown,
  AlertCircle,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface Grade {
  id: string
  teen_id: string
  subject: string
  subject_label: string
  grade: number
  max_grade: number
  grade_type: string
  status: "pending" | "approved" | "rejected"
  term?: string
  school_year: string
  grade_date: string
  xp_awarded: number
  rejection_reason?: string
  validated_at?: string
}

interface Subject {
  id: string
  label: string
  labelAr?: string
}

interface GradeStats {
  totalGrades: number
  approvedGrades: number
  pendingGrades: number
  averageGrade: number | null
  bySubject: Array<{
    subject: string
    label: string
    count: number
    average: number | null
  }>
}

/* ==========================================================================
   ADD GRADE FORM (Teen)
   ========================================================================== */

interface AddGradeFormProps {
  teenId: string
  subjects: Subject[]
  onSuccess: () => void
  onCancel: () => void
}

export function AddGradeForm({ teenId, subjects, onSuccess, onCancel }: AddGradeFormProps) {
  const [subject, setSubject] = useState("")
  const [grade, setGrade] = useState("")
  const [maxGrade, setMaxGrade] = useState("20")
  const [gradeType, setGradeType] = useState("exam")
  const [term, setTerm] = useState("")
  const [gradeDate, setGradeDate] = useState(new Date().toISOString().split("T")[0])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const gradeTypes = [
    { id: "exam", label: "Examen" },
    { id: "homework", label: "Devoir" },
    { id: "quiz", label: "Controle" },
    { id: "project", label: "Projet" },
    { id: "oral", label: "Oral" },
  ]

  const terms = [
    { id: "T1", label: "1er Trimestre" },
    { id: "T2", label: "2eme Trimestre" },
    { id: "T3", label: "3eme Trimestre" },
    { id: "S1", label: "1er Semestre" },
    { id: "S2", label: "2eme Semestre" },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!subject || !grade) {
      setError("Veuillez remplir tous les champs obligatoires")
      return
    }

    const gradeValue = parseFloat(grade)
    const maxGradeValue = parseFloat(maxGrade)

    if (isNaN(gradeValue) || gradeValue < 0 || gradeValue > maxGradeValue) {
      setError(`La note doit etre entre 0 et ${maxGradeValue}`)
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/teen/education/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teenId,
          subject,
          grade: gradeValue,
          maxGrade: maxGradeValue,
          gradeType,
          term: term || null,
          gradeDate,
        }),
      })

      const data = await response.json()

      if (data.success) {
        onSuccess()
      } else {
        setError(data.error || "Une erreur est survenue")
      }
    } catch (err) {
      setError("Erreur de connexion")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="p-6 bg-zinc-900 border-zinc-800">
      <h3 className="text-lg font-bold text-white mb-4">Ajouter une note</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Subject */}
        <div>
          <label className="block text-sm text-zinc-400 mb-2">Matiere *</label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:border-cyan-500 focus:outline-none"
          >
            <option value="">Selectionner une matiere</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Grade and Max */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Note *</label>
            <Input
              type="number"
              step="0.5"
              min="0"
              max={maxGrade}
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="Ex: 15.5"
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Sur</label>
            <Input
              type="number"
              min="1"
              value={maxGrade}
              onChange={(e) => setMaxGrade(e.target.value)}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm text-zinc-400 mb-2">Type</label>
          <div className="flex flex-wrap gap-2">
            {gradeTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setGradeType(type.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm transition-all",
                  gradeType === type.id
                    ? "bg-cyan-500 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                )}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Term and Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Periode</label>
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:border-cyan-500 focus:outline-none"
            >
              <option value="">Non specifie</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Date</label>
            <Input
              type="date"
              value={gradeDate}
              onChange={(e) => setGradeDate(e.target.value)}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Info */}
        <div className="p-3 rounded-lg bg-cyan-500/10 text-cyan-400 text-sm">
          La note sera envoyee a ton parent pour validation
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500"
          >
            {isSubmitting ? "Envoi..." : "Soumettre"}
          </Button>
        </div>
      </form>
    </Card>
  )
}

/* ==========================================================================
   GRADE CARD
   ========================================================================== */

interface GradeCardProps {
  grade: Grade
  onValidate?: (gradeId: string, action: "approve" | "reject", reason?: string) => void
  isParent?: boolean
}

export function GradeCard({ grade, onValidate, isParent = false }: GradeCardProps) {
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  const percentage = (grade.grade / grade.max_grade) * 100
  const gradeColor = percentage >= 80 ? "text-green-400" :
                     percentage >= 60 ? "text-cyan-400" :
                     percentage >= 50 ? "text-yellow-400" :
                     "text-red-400"

  const statusConfig = {
    pending: { icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/10", label: "En attente" },
    approved: { icon: Check, color: "text-green-400", bg: "bg-green-500/10", label: "Approuvee" },
    rejected: { icon: X, color: "text-red-400", bg: "bg-red-500/10", label: "Rejetee" },
  }

  const status = statusConfig[grade.status]
  const StatusIcon = status.icon

  return (
    <>
      <Card className="p-4 bg-zinc-900 border-zinc-800">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-bold text-white">{grade.subject_label}</h4>
            <p className="text-sm text-zinc-500">
              {grade.grade_type === "exam" ? "Examen" :
               grade.grade_type === "homework" ? "Devoir" :
               grade.grade_type === "quiz" ? "Controle" :
               grade.grade_type === "project" ? "Projet" : "Oral"}
              {grade.term && ` - ${grade.term}`}
            </p>
          </div>
          <div className={cn("px-2 py-1 rounded-full text-xs flex items-center gap-1", status.bg, status.color)}>
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn("text-3xl font-black", gradeColor)}>
              {grade.grade}
              <span className="text-lg text-zinc-500">/{grade.max_grade}</span>
            </div>
            <div className="text-sm text-zinc-500">
              {new Date(grade.grade_date).toLocaleDateString("fr-FR")}
            </div>
          </div>

          {grade.status === "approved" && grade.xp_awarded > 0 && (
            <div className="flex items-center gap-1 text-cyan-400 text-sm">
              <Zap className="w-4 h-4" />
              +{grade.xp_awarded} XP
            </div>
          )}
        </div>

        {grade.status === "rejected" && grade.rejection_reason && (
          <div className="mt-3 p-2 rounded-lg bg-red-500/10 text-red-400 text-sm">
            Raison: {grade.rejection_reason}
          </div>
        )}

        {/* Parent validation actions */}
        {isParent && grade.status === "pending" && onValidate && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-800">
            <Button
              variant="outline"
              className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
              onClick={() => setShowRejectModal(true)}
            >
              <X className="w-4 h-4 mr-2" />
              Rejeter
            </Button>
            <Button
              className="flex-1 bg-green-500 hover:bg-green-600"
              onClick={() => onValidate(grade.id, "approve")}
            >
              <Check className="w-4 h-4 mr-2" />
              Approuver
            </Button>
          </div>
        )}
      </Card>

      {/* Reject modal */}
      <AnimatePresence>
        {showRejectModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-zinc-900 rounded-2xl p-6 max-w-md mx-4 w-full"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h3 className="text-lg font-bold text-white mb-4">Rejeter la note</h3>
              <p className="text-zinc-400 text-sm mb-4">
                Indique la raison du rejet (optionnel)
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ex: La photo de la copie n'est pas lisible..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white resize-none h-24 focus:border-cyan-500 focus:outline-none"
              />
              <div className="flex gap-3 mt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowRejectModal(false)}
                >
                  Annuler
                </Button>
                <Button
                  className="flex-1 bg-red-500 hover:bg-red-600"
                  onClick={() => {
                    onValidate?.(grade.id, "reject", rejectReason)
                    setShowRejectModal(false)
                  }}
                >
                  Confirmer
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/* ==========================================================================
   GRADES DASHBOARD
   ========================================================================== */

interface GradesDashboardProps {
  teenId: string
  isParent?: boolean
}

export function GradesDashboard({ teenId, isParent = false }: GradesDashboardProps) {
  const [grades, setGrades] = useState<Grade[]>([])
  const [stats, setStats] = useState<GradeStats | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [filterSubject, setFilterSubject] = useState("")
  const [filterStatus, setFilterStatus] = useState("")

  const fetchGrades = async () => {
    try {
      let url = `/api/teen/education/grades?teenId=${teenId}`
      if (filterSubject) url += `&subject=${filterSubject}`
      if (filterStatus) url += `&status=${filterStatus}`

      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        setGrades(data.grades)
        setStats(data.stats)
        setSubjects(data.subjects)
      }
    } catch (error) {
      console.error("Error fetching grades:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGrades()
  }, [teenId, filterSubject, filterStatus])

  const handleValidate = async (gradeId: string, action: "approve" | "reject", reason?: string) => {
    try {
      const response = await fetch("/api/teen/education/grades", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gradeId, action, rejectionReason: reason }),
      })

      if (response.ok) {
        fetchGrades()
      }
    } catch (error) {
      console.error("Error validating grade:", error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-zinc-800 rounded-2xl" />
        <div className="h-48 bg-zinc-800 rounded-2xl" />
      </div>
    )
  }

  const pendingGrades = grades.filter((g) => g.status === "pending")

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <Card className="p-6 bg-zinc-900 border-zinc-800">
          <h3 className="text-lg font-bold text-white mb-4">Resume</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-black text-white">
                {stats.averageGrade ? stats.averageGrade.toFixed(1) : "-"}
              </div>
              <div className="text-sm text-zinc-500">Moyenne generale</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-cyan-400">
                {stats.approvedGrades}
              </div>
              <div className="text-sm text-zinc-500">Notes validees</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-yellow-400">
                {stats.pendingGrades}
              </div>
              <div className="text-sm text-zinc-500">En attente</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-purple-400">
                {stats.bySubject.length}
              </div>
              <div className="text-sm text-zinc-500">Matieres</div>
            </div>
          </div>

          {/* Subject averages */}
          {stats.bySubject.length > 0 && (
            <div className="mt-6 pt-6 border-t border-zinc-800">
              <h4 className="text-sm font-medium text-zinc-400 mb-3">Par matiere</h4>
              <div className="space-y-2">
                {stats.bySubject.map((s) => (
                  <div key={s.subject} className="flex items-center justify-between">
                    <span className="text-sm text-zinc-300">{s.label}</span>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-bold",
                        (s.average || 0) >= 14 ? "text-green-400" :
                        (s.average || 0) >= 10 ? "text-cyan-400" :
                        "text-red-400"
                      )}>
                        {s.average?.toFixed(1) || "-"}
                      </span>
                      <span className="text-xs text-zinc-600">({s.count})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Pending grades alert for parent */}
      {isParent && pendingGrades.length > 0 && (
        <Card className="p-4 bg-yellow-500/10 border-yellow-500/30">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-yellow-400" />
            <div>
              <p className="text-yellow-400 font-medium">
                {pendingGrades.length} note(s) en attente de validation
              </p>
              <p className="text-sm text-yellow-400/70">
                Verifiez et validez les notes soumises par votre enfant
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Add button (teen only) */}
      {!isParent && !showAddForm && (
        <Button
          onClick={() => setShowAddForm(true)}
          className="w-full gap-2 bg-gradient-to-r from-cyan-500 to-blue-500"
        >
          <Plus className="w-4 h-4" />
          Ajouter une note
        </Button>
      )}

      {/* Add form */}
      {showAddForm && (
        <AddGradeForm
          teenId={teenId}
          subjects={subjects}
          onSuccess={() => {
            setShowAddForm(false)
            fetchGrades()
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white text-sm focus:border-cyan-500 focus:outline-none"
        >
          <option value="">Toutes les matieres</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white text-sm focus:border-cyan-500 focus:outline-none"
        >
          <option value="">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="approved">Approuvees</option>
          <option value="rejected">Rejetees</option>
        </select>
      </div>

      {/* Grades list */}
      <div className="space-y-4">
        {grades.length === 0 ? (
          <Card className="p-8 bg-zinc-900 border-zinc-800 text-center">
            <BookOpen className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400">Aucune note pour le moment</p>
          </Card>
        ) : (
          grades.map((grade) => (
            <GradeCard
              key={grade.id}
              grade={grade}
              isParent={isParent}
              onValidate={handleValidate}
            />
          ))
        )}
      </div>
    </div>
  )
}
