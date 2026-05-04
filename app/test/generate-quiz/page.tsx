"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { GlassCard } from "@/components/ui/glass-card"
import { NeonButton } from "@/components/ui/neon-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Sparkles, BookOpen, Zap, CheckCircle2, XCircle, Brain } from "lucide-react"
import { toast } from "sonner"

interface GeneratedQuiz {
  title: string
  description: string
  subject: string
  difficulty: string
  grade_level?: string
  questions: Array<{
    type?: string
    question: string
    options?: string[]
    correct: number | boolean | number[]
    explanation?: string
  }>
  time_limit_minutes: number
  passing_score: number
  xp_reward: number
}

export default function GenerateQuizPage() {
  const [loading, setLoading] = useState(false)
  const [quiz, setQuiz] = useState<GeneratedQuiz | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [apiConfig, setApiConfig] = useState<any>(null)
  const [balanceCheck, setBalanceCheck] = useState<any>(null)
  const [checkingBalance, setCheckingBalance] = useState(false)
  const [params, setParams] = useState({
    gradeLevel: "3ème",
    subject: "Mathématiques",
    difficulty: "normal" as "easy" | "normal" | "hard" | "expert",
    interests: "Football, Jeux vidéo",
  })

  // Vérifier la configuration des clés API au chargement
  useEffect(() => {
    fetch("/api/test/check-api-keys")
      .then(res => res.json())
      .then(data => setApiConfig(data.config))
      .catch(err => console.error("Error checking API keys:", err))
  }, [])

  const checkOpenAIBalance = async () => {
    setCheckingBalance(true)
    setBalanceCheck(null)
    try {
      const response = await fetch("/api/test/check-openai-balance")
      const data = await response.json()
      setBalanceCheck(data)
      if (data.success) {
        toast.success("Clé API OpenAI valide !")
      } else {
        toast.error(data.error || "Erreur lors de la vérification")
      }
    } catch (error) {
      toast.error("Erreur lors de la vérification du solde")
      setBalanceCheck({ success: false, error: "Erreur réseau" })
    } finally {
      setCheckingBalance(false)
    }
  }

  const generateQuiz = async () => {
    setLoading(true)
    setQuiz(null)
    setError(null)

    try {
      console.log("Génération du quiz avec params:", params)
      
      const response = await fetch("/api/test/generate-quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gradeLevel: params.gradeLevel,
          subject: params.subject,
          difficulty: params.difficulty,
          interests: params.interests.split(",").map(i => i.trim()).filter(i => i.length > 0),
        }),
      })

      console.log("Response status:", response.status)
      const data = await response.json()
      console.log("Response data:", data)

      if (data.success && data.quiz) {
        setQuiz(data.quiz)
        // Sauvegarder le quiz pour la page de jeu
        localStorage.setItem("generatedQuiz", JSON.stringify(data.quiz))
        toast.success("Quiz généré avec succès !")
      } else {
        const errorMsg = data.error || "Erreur lors de la génération"
        setError(errorMsg)
        toast.error(errorMsg)
      }
    } catch (error) {
      console.error("Error generating quiz:", error)
      const errorMsg = error instanceof Error ? error.message : "Erreur lors de la génération du quiz"
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-white overflow-hidden selection:bg-purple-500/30">
      <Navbar />
      
      
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/20 rounded-full blur-[120px] animate-pulse-slow delay-1000" />
        <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] bg-emerald-600/10 rounded-full blur-[100px] animate-pulse-slow delay-700" />
      </div>

      <div className="relative z-10 pt-20">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 px-6">
          <div className="container mx-auto max-w-7xl">
            <div className="text-center space-y-6 mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-white/10 backdrop-blur-md mb-4">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#22d3ee]" />
                <span className="text-sm font-medium text-cyan-400">Générateur de Quiz</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-black leading-[0.9] tracking-tighter">
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.5)]">
                  GÉNÈRE TON
                </span>
                <span className="block text-white">
                  QUIZ PERSONNALISÉ
                </span>
              </h1>

              <p className="text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                Crée un quiz adapté à tes intérêts avec les nouveaux systèmes de génération intelligente
              </p>
            </div>
          </div>
        </section>

        {/* Configuration API */}
        {apiConfig && (
          <section className="px-6 mb-4">
            <div className="container mx-auto max-w-7xl">
              <GlassCard intensity="medium" className="p-4 border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${apiConfig.hasOpenAI || apiConfig.hasAnthropic ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
                    <div>
                      <p className="text-sm font-bold text-white">
                        {apiConfig.hasOpenAI || apiConfig.hasAnthropic 
                          ? "Clé API configurée" 
                          : "Aucune clé API configurée"}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {apiConfig.hasOpenAI && "OpenAI"} 
                        {apiConfig.hasOpenAI && apiConfig.hasAnthropic && " + "}
                        {apiConfig.hasAnthropic && "Anthropic"}
                        {apiConfig.recommendedProvider && ` → Utilisation: ${apiConfig.recommendedProvider}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {apiConfig.hasOpenAI && (
                      <NeonButton
                        onClick={checkOpenAIBalance}
                        disabled={checkingBalance}
                        variant="intellect"
                        size="sm"
                      >
                        {checkingBalance ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Vérification...
                          </>
                        ) : (
                          "Vérifier solde OpenAI"
                        )}
                      </NeonButton>
                    )}
                    {!apiConfig.hasOpenAI && !apiConfig.hasAnthropic && (
                      <p className="text-xs text-red-400">
                        Configurez OPENAI_API_KEY ou ANTHROPIC_API_KEY
                      </p>
                    )}
                  </div>
                </div>
                {balanceCheck && (
                  <div className={`mt-4 p-3 rounded-lg border ${
                    balanceCheck.success 
                      ? "bg-green-500/10 border-green-500/30" 
                      : "bg-red-500/10 border-red-500/30"
                  }`}>
                    <p className={`text-sm font-medium ${
                      balanceCheck.success ? "text-green-400" : "text-red-400"
                    }`}>
                      {balanceCheck.success ? "✅ " : "❌ "}
                      {balanceCheck.message || balanceCheck.error}
                    </p>
                    {balanceCheck.test && (
                      <p className="text-xs text-zinc-400 mt-1">
                        Tokens utilisés pour le test: {balanceCheck.test.tokensUsed}
                      </p>
                    )}
                    {balanceCheck.note && (
                      <p className="text-xs text-zinc-400 mt-1 italic">
                        {balanceCheck.note}
                      </p>
                    )}
                  </div>
                )}
              </GlassCard>
            </div>
          </section>
        )}

        {/* Paramètres */}
        <section className="px-6 mb-8">
          <div className="container mx-auto max-w-7xl">
            <GlassCard intensity="high" className="p-8 border-white/10">
              <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
                <Brain className="w-6 h-6 text-cyan-400" />
                <span>Paramètres de génération</span>
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="gradeLevel" className="text-zinc-300">Niveau scolaire</Label>
                  <Select
                    value={params.gradeLevel}
                    onValueChange={(value) =>
                      setParams({ ...params, gradeLevel: value })
                    }
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10">
                      <SelectItem value="6ème">6ème</SelectItem>
                      <SelectItem value="5ème">5ème</SelectItem>
                      <SelectItem value="4ème">4ème</SelectItem>
                      <SelectItem value="3ème">3ème</SelectItem>
                      <SelectItem value="2nde">2nde</SelectItem>
                      <SelectItem value="1ère">1ère</SelectItem>
                      <SelectItem value="Terminale">Terminale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject" className="text-zinc-300">Matière</Label>
                  <Select
                    value={params.subject}
                    onValueChange={(value) =>
                      setParams({ ...params, subject: value })
                    }
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10">
                      <SelectItem value="Mathématiques">Mathématiques</SelectItem>
                      <SelectItem value="Sciences">Sciences</SelectItem>
                      <SelectItem value="Histoire">Histoire</SelectItem>
                      <SelectItem value="Géographie">Géographie</SelectItem>
                      <SelectItem value="Français">Français</SelectItem>
                      <SelectItem value="Anglais">Anglais</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="difficulty" className="text-zinc-300">Difficulté</Label>
                  <Select
                    value={params.difficulty}
                    onValueChange={(value: any) =>
                      setParams({ ...params, difficulty: value })
                    }
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10">
                      <SelectItem value="easy">Facile</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="hard">Difficile</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interests" className="text-zinc-300">Intérêts (séparés par des virgules)</Label>
                  <Input
                    id="interests"
                    value={params.interests}
                    onChange={(e) =>
                      setParams({ ...params, interests: e.target.value })
                    }
                    placeholder="Football, K-Pop, Danse..."
                    className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 hover:bg-white/10 focus:border-cyan-500/50"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-center">
                <NeonButton
                  onClick={generateQuiz}
                  disabled={loading}
                  variant="intellect"
                  size="lg"
                  className="px-12 h-16 text-lg font-black"
                  glow
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                      Génération en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-6 h-6 mr-2" />
                      Générer le quiz
                    </>
                  )}
                </NeonButton>
              </div>
            </GlassCard>
          </div>
        </section>

        {/* Quiz généré */}
        {quiz && (
          <section className="px-6 pb-20">
            <div className="container mx-auto max-w-4xl">
              <GlassCard intensity="high" neon="intellect" className="p-8 border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
                <div className="relative z-10">
                  {/* Header Quiz */}
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/20 border border-cyan-500/30 mb-4">
                      <BookOpen className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm font-medium text-cyan-400">Quiz généré</span>
                    </div>
                    <h2 className="text-4xl font-black mb-3 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                      {quiz.title}
                    </h2>
                    <p className="text-zinc-400 text-lg">{quiz.description}</p>
                    <div className="flex items-center justify-center gap-4 mt-4 text-sm">
                      <span className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-400">
                        {quiz.subject}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                        {quiz.difficulty}
                      </span>
                      {quiz.grade_level && (
                        <span className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400">
                          {quiz.grade_level}
                        </span>
                      )}
                      <span className="px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {quiz.xp_reward} XP
                      </span>
                    </div>
                  </div>

                  {/* Questions */}
                  <div className="space-y-6">
                    {quiz.questions.map((q, index) => (
                      <GlassCard
                        key={index}
                        intensity="medium"
                        variant="hover"
                        className="p-6 border-white/10"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30 flex-shrink-0">
                            <span className="text-cyan-400 font-black">{index + 1}</span>
                          </div>
                          <div className="flex-1 space-y-4">
                            <div>
                              <h3 className="text-xl font-bold text-white mb-2">{q.question}</h3>
                              {q.type && (
                                <span className="text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-400">
                                  {q.type === "multiple_choice" ? "QCM" : 
                                   q.type === "true_false" ? "Vrai/Faux" :
                                   q.type === "multiple_correct" ? "Plusieurs réponses" :
                                   q.type}
                                </span>
                              )}
                            </div>

                            {/* Options */}
                            {q.options && q.options.length > 0 && (
                              <div className="space-y-2">
                                {q.options.map((option, optIndex) => {
                                  const isCorrect = typeof q.correct === "number" 
                                    ? q.correct === optIndex
                                    : Array.isArray(q.correct)
                                    ? q.correct.includes(optIndex)
                                    : false
                                  
                                  return (
                                    <div
                                      key={optIndex}
                                      className={`p-3 rounded-lg border ${
                                        isCorrect
                                          ? "bg-green-500/20 border-green-500/30"
                                          : "bg-white/5 border-white/10"
                                      }`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                          isCorrect
                                            ? "bg-green-500 text-white"
                                            : "bg-zinc-700 text-zinc-400"
                                        }`}>
                                          {String.fromCharCode(65 + optIndex)}
                                        </div>
                                        <span className="text-white">{option}</span>
                                        {isCorrect && (
                                          <CheckCircle2 className="w-5 h-5 text-green-400 ml-auto" />
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}

                            {/* Vrai/Faux */}
                            {q.type === "true_false" && (
                              <div className="grid grid-cols-2 gap-3">
                                <div className={`p-4 rounded-lg border ${
                                  q.correct === true
                                    ? "bg-green-500/20 border-green-500/30"
                                    : "bg-white/5 border-white/10"
                                }`}>
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                      q.correct === true
                                        ? "bg-green-500 text-white"
                                        : "bg-zinc-700 text-zinc-400"
                                    }`}>
                                      ✓
                                    </div>
                                    <span className="text-white font-medium">Vrai</span>
                                    {q.correct === true && (
                                      <CheckCircle2 className="w-5 h-5 text-green-400 ml-auto" />
                                    )}
                                  </div>
                                </div>
                                <div className={`p-4 rounded-lg border ${
                                  q.correct === false
                                    ? "bg-green-500/20 border-green-500/30"
                                    : "bg-white/5 border-white/10"
                                }`}>
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                      q.correct === false
                                        ? "bg-green-500 text-white"
                                        : "bg-zinc-700 text-zinc-400"
                                    }`}>
                                      ✗
                                    </div>
                                    <span className="text-white font-medium">Faux</span>
                                    {q.correct === false && (
                                      <CheckCircle2 className="w-5 h-5 text-green-400 ml-auto" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Explication */}
                            {q.explanation && (
                              <div className="mt-4 p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                                <p className="text-sm text-cyan-400 mb-1 font-medium">💡 Explication</p>
                                <p className="text-white text-sm">{q.explanation}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </GlassCard>
                    ))}
                  </div>

                  {/* Footer Quiz */}
                  <div className="mt-8 pt-6 border-t border-white/10">
                    <div className="grid grid-cols-3 gap-4 text-center mb-6">
                      <div>
                        <p className="text-xs text-zinc-400 mb-1">Temps limite</p>
                        <p className="text-lg font-black text-white">{quiz.time_limit_minutes} min</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-400 mb-1">Score de passage</p>
                        <p className="text-lg font-black text-white">{quiz.passing_score}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-400 mb-1">Récompense</p>
                        <p className="text-lg font-black text-cyan-400 flex items-center justify-center gap-1">
                          <Zap className="w-4 h-4" />
                          {quiz.xp_reward} XP
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <NeonButton
                        onClick={() => window.location.href = "/test/play-quiz"}
                        variant="intellect"
                        size="lg"
                        className="px-12 h-16 text-lg font-black"
                        glow
                      >
                        <Sparkles className="w-6 h-6 mr-2" />
                        Jouer ce quiz maintenant !
                      </NeonButton>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>
          </section>
        )}

        {/* Error State */}
        {error && (
          <section className="px-6 pb-20">
            <div className="container mx-auto max-w-4xl">
              <GlassCard intensity="high" className="p-8 border-red-500/30 bg-red-500/10">
                <div className="flex items-center gap-3 text-red-400 mb-3">
                  <XCircle className="w-6 h-6" />
                  <h3 className="text-xl font-black">Erreur</h3>
                </div>
                <p className="text-red-300 mb-4">{error}</p>
                <p className="text-sm text-zinc-400">
                  Vérifiez que les clés API (OPENAI_API_KEY ou ANTHROPIC_API_KEY) sont configurées dans vos variables d'environnement.
                </p>
              </GlassCard>
            </div>
          </section>
        )}

        {/* Empty State */}
        {!quiz && !loading && !error && (
          <section className="px-6 pb-20">
            <div className="container mx-auto max-w-4xl">
              <GlassCard intensity="medium" className="p-12 text-center border-white/10">
                <Brain className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-2xl font-black mb-2">Aucun quiz généré</h3>
                <p className="text-zinc-400">
                  Configure les paramètres ci-dessus et clique sur "Générer le quiz" pour créer ton quiz personnalisé
                </p>
              </GlassCard>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

