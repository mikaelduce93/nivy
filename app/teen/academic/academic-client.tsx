"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  BookOpen,
  GraduationCap,
  Play,
  CheckCircle2,
  XCircle,
  Trophy,
  Star,
  Plus,
  Send,
  Video,
  FileQuestion,
  Calculator,
  Beaker,
  Globe,
  BookText,
  Music,
  Palette,
  Dumbbell,
  Loader2,
  ChevronRight,
  Award
} from "lucide-react"
import { toast } from "sonner"
import { submitGrade } from "@/gamification-system/features/pillars/actions"
import { EmptyState } from "@/components/ui/states/empty-state"

interface Subject {
  id: string
  name: string
  icon: React.ComponentType<any>
  color: string
  quizCount: number
  videoCount: number
  completedQuizzes: number
}

interface Quiz {
  id: string
  subject: string
  title: string
  questions: number
  difficulty: "easy" | "medium" | "hard"
  xpReward: number
  completed: boolean
  score?: number
}

interface Tutorial {
  id: string
  subject: string
  title: string
  duration: string
  thumbnail: string
  watched: boolean
  xpReward: number
}

interface QuizQuestion {
  question: string
  options: string[]
  correctAnswer: number
}

const subjects: Subject[] = [
  { id: "math", name: "Mathématiques", icon: Calculator, color: "from-teal to-teal", quizCount: 12, videoCount: 8, completedQuizzes: 0 },
  { id: "physics", name: "Physique-Chimie", icon: Beaker, color: "from-pink to-pink", quizCount: 10, videoCount: 6, completedQuizzes: 0 },
  { id: "french", name: "Français", icon: BookText, color: "from-lime to-teal", quizCount: 8, videoCount: 5, completedQuizzes: 0 },
  { id: "history", name: "Histoire-Géo", icon: Globe, color: "from-gold to-coral", quizCount: 9, videoCount: 7, completedQuizzes: 0 },
  { id: "english", name: "Anglais", icon: BookOpen, color: "from-destructive to-pink", quizCount: 7, videoCount: 4, completedQuizzes: 0 },
  { id: "art", name: "Arts", icon: Palette, color: "from-pink to-pink", quizCount: 5, videoCount: 6, completedQuizzes: 0 },
  { id: "music", name: "Musique", icon: Music, color: "from-pink to-pink", quizCount: 4, videoCount: 5, completedQuizzes: 0 },
  { id: "sport", name: "Sport", icon: Dumbbell, color: "from-lime to-lime", quizCount: 6, videoCount: 8, completedQuizzes: 0 },
]

const sampleQuizQuestions: QuizQuestion[] = [
  {
    question: "Quelle est la solution de l'équation x² - 5x + 6 = 0 ?",
    options: ["x = 2 ou x = 3", "x = -2 ou x = -3", "x = 1 ou x = 6", "x = -1 ou x = -6"],
    correctAnswer: 0
  },
  {
    question: "Quel est le discriminant de cette équation ?",
    options: ["1", "25", "6", "-11"],
    correctAnswer: 0
  },
  {
    question: "Si Δ < 0, combien de solutions réelles a l'équation ?",
    options: ["0", "1", "2", "Infini"],
    correctAnswer: 0
  }
]

export function TeenAcademicClient({ initialData, teenId }: { initialData: any, teenId: string }) {
  const [activeTab, setActiveTab] = useState("subjects")
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [showGradeDialog, setShowGradeDialog] = useState(false)
  const [showQuizDialog, setShowQuizDialog] = useState(false)
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null)
  const [quizState, setQuizState] = useState<{
    currentQuestion: number
    answers: number[]
    started: boolean
    finished: boolean
    score: number
  }>({
    currentQuestion: 0,
    answers: [],
    started: false,
    finished: false,
    score: 0
  })
  const [gradeForm, setGradeForm] = useState({
    subject: "",
    grade: "",
    maxGrade: "20",
    examType: "",
    examDate: ""
  })
  const [submitting, setSubmitting] = useState(false)

  const quizzes = initialData.quizzes as Quiz[]
  const tutorials = initialData.tutorials as Tutorial[]
  const stats = initialData.stats

  const dynamicSubjects = subjects.map(sub => ({
    ...sub,
    quizCount: quizzes.filter(q => q.subject === sub.id).length,
    videoCount: tutorials.filter(t => t.subject === sub.id).length,
    completedQuizzes: quizzes.filter(q => q.subject === sub.id && q.completed).length
  }))

  const filteredQuizzes = selectedSubject
    ? quizzes.filter(q => q.subject === selectedSubject.id)
    : quizzes

  const filteredTutorials = selectedSubject
    ? tutorials.filter(t => t.subject === selectedSubject.id)
    : tutorials

  const handleStartQuiz = (quiz: Quiz) => {
    setSelectedQuiz(quiz)
    setQuizState({
      currentQuestion: 0,
      answers: [],
      started: true,
      finished: false,
      score: 0
    })
    setShowQuizDialog(true)
  }

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...quizState.answers, answerIndex]

    if (quizState.currentQuestion < sampleQuizQuestions.length - 1) {
      setQuizState(prev => ({
        ...prev,
        answers: newAnswers,
        currentQuestion: prev.currentQuestion + 1
      }))
    } else {
      const correctCount = newAnswers.filter((a, i) => a === sampleQuizQuestions[i].correctAnswer).length
      const score = Math.round((correctCount / sampleQuizQuestions.length) * 100)
      setQuizState(prev => ({
        ...prev,
        answers: newAnswers,
        finished: true,
        score
      }))

      if (selectedQuiz) {
        const xpEarned = Math.round((score / 100) * selectedQuiz.xpReward)
        toast.success(`Quiz terminé! +${xpEarned} XP gagnés!`)
      }
    }
  }

  const handleSubmitGrade = async () => {
    if (!gradeForm.subject || !gradeForm.grade || !gradeForm.examType || !gradeForm.examDate) {
      toast.error("Veuillez remplir tous les champs")
      return
    }

    setSubmitting(true)
    try {
      const result = await submitGrade(teenId, {
        subject: gradeForm.subject,
        grade: parseFloat(gradeForm.grade),
        maxGrade: parseFloat(gradeForm.maxGrade),
        type: gradeForm.examType,
        date: gradeForm.examDate
      })

      if (result.success) {
        toast.success("Note envoyée pour validation par vos parents!")
        setShowGradeDialog(false)
        setGradeForm({ subject: "", grade: "", maxGrade: "20", examType: "", examDate: "" })
      } else {
        toast.error("Erreur lors de l'envoi: " + result.error)
      }
    } catch (error) {
      toast.error("Erreur lors de l'envoi")
    } finally {
      setSubmitting(false)
    }
  }

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return <span className="px-2 py-0.5 rounded-full bg-lime/20 text-lime text-xs">Facile</span>
      case "medium":
        return <span className="px-2 py-0.5 rounded-full bg-gold/20 text-gold text-xs">Moyen</span>
      case "hard":
        return <span className="px-2 py-0.5 rounded-full bg-destructive/20 text-destructive text-xs">Difficile</span>
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink to-white">
      <div className="container mx-auto px-4 py-8 md:pl-72">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-ink flex items-center gap-3">
              <GraduationCap className="h-8 w-8 text-pink" />
              Aide Scolaire
            </h1>
            <p className="text-mute">Apprends, révise et gagne des XP!</p>
          </div>
          <Button onClick={() => setShowGradeDialog(true)} className="bg-pink hover:bg-pink">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une note
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-pink/10 to-pink/10 border-pink">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-pink font-medium">XP Gagnés</p>
                  <p className="text-2xl font-black text-ink">{stats.totalXP}</p>
                </div>
                <Star className="h-8 w-8 text-pink" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-teal/10 to-teal/10 border-teal">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-teal font-medium">Quiz Complétés</p>
                  <p className="text-2xl font-black text-ink">{stats.quizzesCompleted}</p>
                </div>
                <FileQuestion className="h-8 w-8 text-teal" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-lime/10 to-teal/10 border-lime">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-lime font-medium">Vidéos Vues</p>
                  <p className="text-2xl font-black text-ink">{stats.videosWatched}</p>
                </div>
                <Video className="h-8 w-8 text-lime" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gold/10 to-coral/10 border-gold">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gold font-medium">Moyenne Quiz</p>
                  <p className="text-2xl font-black text-ink">{stats.averageScore}%</p>
                </div>
                <Trophy className="h-8 w-8 text-gold" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-paper-2 border border-pink">
            <TabsTrigger value="subjects" className="data-[state=active]:bg-pink data-[state=active]:text-ink">
              <BookOpen className="h-4 w-4 mr-2" />
              Matières
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="data-[state=active]:bg-pink data-[state=active]:text-ink">
              <FileQuestion className="h-4 w-4 mr-2" />
              Quiz
            </TabsTrigger>
            <TabsTrigger value="tutorials" className="data-[state=active]:bg-pink data-[state=active]:text-ink">
              <Video className="h-4 w-4 mr-2" />
              Tutoriels
            </TabsTrigger>
          </TabsList>

          {/* Subjects Tab */}
          <TabsContent value="subjects">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {dynamicSubjects.map((subject) => (
                <Card
                  key={subject.id}
                  className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-transparent"
                  onClick={() => {
                    setSelectedSubject(subject)
                    setActiveTab("quizzes")
                  }}
                >
                  <CardContent className="p-6">
                    <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${subject.color} flex items-center justify-center mb-4`}>
                      <subject.icon className="h-7 w-7 text-ink" />
                    </div>
                    <h3 className="font-bold text-ink mb-2">{subject.name}</h3>
                    <div className="flex items-center gap-3 text-xs text-mute">
                      <span>{subject.quizCount} quiz</span>
                      <span>•</span>
                      <span>{subject.videoCount} vidéos</span>
                    </div>
                    <div className="mt-3">
                      <Progress value={(subject.completedQuizzes / Math.max(subject.quizCount, 1)) * 100} className="h-1.5" />
                      <p className="text-xs text-mute mt-1">{subject.completedQuizzes}/{subject.quizCount} complétés</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Quizzes Tab */}
          <TabsContent value="quizzes">
            {selectedSubject && (
              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSubject(null)}
                  className="text-mute"
                >
                  Toutes les matières
                </Button>
                <ChevronRight className="h-4 w-4 text-mute" />
                <span className="font-medium text-pink">{selectedSubject.name}</span>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              {filteredQuizzes.map((quiz) => (
                <Card key={quiz.id} className={`border ${quiz.completed ? "border-lime bg-lime/50" : "border-pink"}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-ink">{quiz.title}</h3>
                          {quiz.completed && <CheckCircle2 className="h-4 w-4 text-lime" />}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-mute mb-3">
                          <span>{quiz.questions} questions</span>
                          {getDifficultyBadge(quiz.difficulty)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-gold" />
                          <span className="text-sm text-gold font-medium">+{quiz.xpReward} XP</span>
                        </div>
                        {quiz.completed && quiz.score && (
                          <div className="mt-2">
                            <span className="text-sm text-lime font-medium">Score: {quiz.score}%</span>
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleStartQuiz(quiz)}
                        className={quiz.completed ? "bg-lime hover:bg-lime" : "bg-pink hover:bg-pink"}
                      >
                        {quiz.completed ? "Refaire" : "Commencer"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredQuizzes.length === 0 && (
              <EmptyState
                size="small"
                icon={FileQuestion}
                title="Aucun quiz disponible"
                description="Aucun quiz disponible pour cette matière. Sélectionne une autre matière ou reviens plus tard."
              />
            )}
          </TabsContent>

          {/* Tutorials Tab */}
          <TabsContent value="tutorials">
            {selectedSubject && (
              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSubject(null)}
                  className="text-mute"
                >
                  Toutes les matières
                </Button>
                <ChevronRight className="h-4 w-4 text-mute" />
                <span className="font-medium text-pink">{selectedSubject.name}</span>
              </div>
            )}

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTutorials.map((tutorial) => (
                <Card key={tutorial.id} className="overflow-hidden hover:shadow-lg transition-all">
                  <div className="aspect-video bg-gradient-to-br from-pink to-pink relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-14 w-14 rounded-full bg-paper-2  flex items-center justify-center cursor-pointer hover:bg-paper-2 transition-all">
                        <Play className="h-6 w-6 text-ink ml-1" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-ink/60 text-paper text-xs">
                      {tutorial.duration}
                    </div>
                    {tutorial.watched && (
                      <div className="absolute top-2 right-2 px-2 py-1 rounded bg-lime text-ink text-xs flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Vu
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-bold text-ink mb-2 line-clamp-2">{tutorial.title}</h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-gold" />
                        <span className="text-sm text-gold font-medium">+{tutorial.xpReward} XP</span>
                      </div>
                      <Button size="sm" variant="outline" className="text-pink border-pink">
                        <Play className="h-3 w-3 mr-1" />
                        Regarder
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredTutorials.length === 0 && (
              <EmptyState
                size="small"
                icon={Video}
                title="Aucun tutoriel disponible"
                description="Aucun tutoriel disponible pour cette matière. Sélectionne une autre matière ou reviens plus tard."
              />
            )}
          </TabsContent>
        </Tabs>

        {/* Add Grade Dialog */}
        <Dialog open={showGradeDialog} onOpenChange={setShowGradeDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-pink" />
                Ajouter une note
              </DialogTitle>
              <DialogDescription>
                Soumettez votre note pour validation par vos parents
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Matière</Label>
                <Select value={gradeForm.subject} onValueChange={(v) => setGradeForm(prev => ({ ...prev, subject: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une matière" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Note obtenue</Label>
                  <Input
                    type="number"
                    min="0"
                    max={gradeForm.maxGrade}
                    placeholder="Ex: 15"
                    value={gradeForm.grade}
                    onChange={(e) => setGradeForm(prev => ({ ...prev, grade: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Note max</Label>
                  <Select value={gradeForm.maxGrade} onValueChange={(v) => setGradeForm(prev => ({ ...prev, maxGrade: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">/ 10</SelectItem>
                      <SelectItem value="20">/ 20</SelectItem>
                      <SelectItem value="100">/ 100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Type d'examen</Label>
                <Select value={gradeForm.examType} onValueChange={(v) => setGradeForm(prev => ({ ...prev, examType: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir le type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="controle">Contrôle</SelectItem>
                    <SelectItem value="devoir">Devoir</SelectItem>
                    <SelectItem value="examen">Examen</SelectItem>
                    <SelectItem value="oral">Oral</SelectItem>
                    <SelectItem value="projet">Projet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date de l'examen</Label>
                <Input
                  type="date"
                  value={gradeForm.examDate}
                  onChange={(e) => setGradeForm(prev => ({ ...prev, examDate: e.target.value }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowGradeDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleSubmitGrade} disabled={submitting} className="bg-pink hover:bg-pink">
                {submitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Envoyer pour validation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Quiz Dialog */}
        <Dialog open={showQuizDialog} onOpenChange={setShowQuizDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileQuestion className="h-5 w-5 text-pink" />
                {selectedQuiz?.title}
              </DialogTitle>
            </DialogHeader>

            {!quizState.finished ? (
              <div className="py-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-mute">
                    Question {quizState.currentQuestion + 1}/{sampleQuizQuestions.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-gold" />
                    <span className="text-sm text-gold">+{selectedQuiz?.xpReward} XP</span>
                  </div>
                </div>

                <Progress
                  value={((quizState.currentQuestion + 1) / sampleQuizQuestions.length) * 100}
                  className="h-2 mb-6"
                />

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-ink mb-4">
                    {sampleQuizQuestions[quizState.currentQuestion]?.question}
                  </h3>

                  <div className="space-y-3">
                    {sampleQuizQuestions[quizState.currentQuestion]?.options.map((option, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="w-full justify-start h-auto py-3 px-4 text-left hover:bg-pink hover:border-pink"
                        onClick={() => handleAnswerSelect(index)}
                      >
                        <span className="h-6 w-6 rounded-full bg-pink text-pink flex items-center justify-center text-sm mr-3">
                          {String.fromCharCode(65 + index)}
                        </span>
                        {option}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center">
                <div className={`h-20 w-20 mx-auto rounded-full flex items-center justify-center mb-4 ${
                  quizState.score >= 70 ? "bg-lime" : quizState.score >= 50 ? "bg-gold" : "bg-destructive"
                }`}>
                  {quizState.score >= 70 ? (
                    <Trophy className="h-10 w-10 text-lime" />
                  ) : quizState.score >= 50 ? (
                    <Award className="h-10 w-10 text-gold" />
                  ) : (
                    <XCircle className="h-10 w-10 text-destructive" />
                  )}
                </div>

                <h3 className="text-2xl font-black text-ink mb-2">
                  {quizState.score >= 70 ? "Excellent!" : quizState.score >= 50 ? "Pas mal!" : "Continue!"}
                </h3>

                <p className="text-4xl font-black text-pink mb-4">{quizState.score}%</p>

                <p className="text-mute mb-6">
                  {quizState.answers.filter((a, i) => a === sampleQuizQuestions[i].correctAnswer).length} / {sampleQuizQuestions.length} bonnes réponses
                </p>

                <div className="flex items-center justify-center gap-2 text-gold mb-6">
                  <Star className="h-5 w-5" />
                  <span className="font-bold">
                    +{selectedQuiz ? Math.round((quizState.score / 100) * selectedQuiz.xpReward) : 0} XP gagnés!
                  </span>
                </div>

                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={() => setShowQuizDialog(false)}>
                    Fermer
                  </Button>
                  <Button
                    onClick={() => {
                      setQuizState({
                        currentQuestion: 0,
                        answers: [],
                        started: true,
                        finished: false,
                        score: 0
                      })
                    }}
                    className="bg-pink hover:bg-pink"
                  >
                    Refaire le quiz
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
