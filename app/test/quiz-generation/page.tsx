"use client"

import { useState } from "react"
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
import { Loader2, CheckCircle2, XCircle, Play, FileText, Sparkles, Zap, TestTube, Shield, Languages, Code, Brain } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface TestResult {
  success: boolean
  message?: string
  results?: {
    test1_prompts?: any
    test2_interests?: any
    test3_parser?: any
    test4_validation?: any
    test5_french?: any
    summary?: {
      totalTests: number
      passedTests: number
      successRate: string
      allPassed: boolean
    }
  }
  error?: string
}

export default function QuizGenerationTestPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<TestResult | null>(null)
  const [testParams, setTestParams] = useState({
    gradeLevel: "3ème",
    subject: "Mathématiques",
    difficulty: "normal" as "easy" | "normal" | "hard" | "expert",
    interests: "Football, Jeux vidéo",
  })

  const runTests = async () => {
    setLoading(true)
    setResults(null)

    try {
      const response = await fetch("/api/test/quiz-generation")
      const data: TestResult = await response.json()

      if (data.success) {
        setResults(data)
        toast.success("Tests terminés avec succès !")
      } else {
        setResults(data)
        toast.error(data.error || "Erreur lors des tests")
      }
    } catch (error) {
      console.error("Error running tests:", error)
      toast.error("Erreur lors de l'exécution des tests")
      setResults({
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      })
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

      <div className="relative z-10">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 px-6">
          <div className="container mx-auto max-w-7xl">
            <div className="text-center space-y-6 mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-white/10 backdrop-blur-md mb-4">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#22d3ee]" />
                <span className="text-sm font-medium text-cyan-400">Système de Test</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-black leading-[0.9] tracking-tighter">
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.5)]">
                  TESTS DE
                </span>
                <span className="block text-white">
                  GÉNÉRATION QUIZ
                </span>
              </h1>

              <p className="text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                Cette page exécute des tests techniques (pas la génération réelle).
                <br />
                Testez les systèmes : 
                <span className="text-cyan-400"> Prompts enrichis</span> • 
                <span className="text-purple-400"> Intégration intérêts</span> • 
                <span className="text-pink-400"> Parser JSON</span> • 
                <span className="text-emerald-400"> Validation factuelle</span>
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
                <Link href="/test/generate-quiz">
                  <NeonButton variant="intellect" size="lg" className="px-8">
                    Générer un quiz
                  </NeonButton>
                </Link>
                <Link href="/test/play-quiz">
                  <NeonButton
                    variant="outline"
                    size="lg"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    Passer un quiz
                  </NeonButton>
                </Link>
              </div>
              <p className="text-sm text-zinc-500">
                Pour générer un quiz, utilise la page “Générer un quiz” puis clique sur “Jouer ce quiz”.
              </p>
            </div>
          </div>
        </section>

        {/* Paramètres de test */}
        <section className="px-6 mb-8">
          <div className="container mx-auto max-w-7xl">
            <GlassCard intensity="high" className="p-8 border-white/10">
              <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
                <FileText className="w-6 h-6 text-cyan-400" />
                <span>Paramètres de test</span>
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="gradeLevel" className="text-zinc-300">Niveau scolaire</Label>
                  <Select
                    value={testParams.gradeLevel}
                    onValueChange={(value) =>
                      setTestParams({ ...testParams, gradeLevel: value })
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
                    value={testParams.subject}
                    onValueChange={(value) =>
                      setTestParams({ ...testParams, subject: value })
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
                    value={testParams.difficulty}
                    onValueChange={(value: any) =>
                      setTestParams({ ...testParams, difficulty: value })
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
                    value={testParams.interests}
                    onChange={(e) =>
                      setTestParams({ ...testParams, interests: e.target.value })
                    }
                    placeholder="Football, K-Pop, Danse..."
                    className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 hover:bg-white/10 focus:border-cyan-500/50"
                  />
                </div>
              </div>
            </GlassCard>
          </div>
        </section>

        {/* Bouton de test */}
        <section className="px-6 mb-12">
          <div className="container mx-auto max-w-7xl flex justify-center">
            <NeonButton
              onClick={runTests}
              disabled={loading}
              variant="intellect"
              size="lg"
              className="px-12 h-16 text-lg font-black"
              glow
            >
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                  Exécution des tests...
                </>
              ) : (
                <>
                  <Play className="w-6 h-6 mr-2" />
                  Lancer les tests
                </>
              )}
            </NeonButton>
          </div>
        </section>

        {/* Résultats */}
        {results && (
          <section className="px-6 pb-20">
            <div className="container mx-auto max-w-7xl space-y-6">
              {/* Résumé global */}
              {results.results?.summary && (
                <GlassCard intensity="high" neon="intellect" className="p-8 border-white/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-3xl font-black flex items-center gap-3">
                        <Sparkles className="w-8 h-8 text-cyan-400" />
                        <span>Résumé des tests</span>
                      </h2>
                      {results.results.summary.allPassed ? (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 border border-green-500/30">
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                          <span className="font-bold text-green-400">Tous les tests passés !</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/20 border border-orange-500/30">
                          <XCircle className="w-5 h-5 text-orange-400" />
                          <span className="font-bold text-orange-400">Certains tests ont échoué</span>
                        </div>
                      )}
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                      <GlassCard intensity="low" className="p-6 border-cyan-500/20">
                        <p className="text-sm text-zinc-400 mb-2">Tests réussis</p>
                        <p className="text-4xl font-black text-cyan-400">
                          {results.results.summary.passedTests} / {results.results.summary.totalTests}
                        </p>
                      </GlassCard>
                      <GlassCard intensity="low" className="p-6 border-purple-500/20">
                        <p className="text-sm text-zinc-400 mb-2">Taux de réussite</p>
                        <p className="text-4xl font-black text-purple-400">{results.results.summary.successRate}</p>
                      </GlassCard>
                      <GlassCard intensity="low" className="p-6 border-emerald-500/20">
                        <p className="text-sm text-zinc-400 mb-2">Statut</p>
                        <p className="text-4xl font-black text-emerald-400">
                          {results.results.summary.allPassed ? "✅ OK" : "⚠️"}
                        </p>
                      </GlassCard>
                    </div>
                  </div>
                </GlassCard>
              )}

              {/* Détails des tests */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Test 1: Prompts enrichis */}
                {results.results?.test1_prompts && (
                  <GlassCard intensity="medium" neon="intellect" variant="hover" className="p-6 border-cyan-500/20 relative group overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-cyan-500/20 transition-all" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                            <Brain className="w-6 h-6 text-cyan-400" />
                          </div>
                          <h3 className="text-xl font-black">Test 1: Prompts enrichis</h3>
                        </div>
                        {results.results.test1_prompts.success ? (
                          <CheckCircle2 className="w-6 h-6 text-green-400" />
                        ) : (
                          <XCircle className="w-6 h-6 text-red-400" />
                        )}
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                          {results.results.test1_prompts.hasFrenchInstruction ? (
                            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                          )}
                          <span className="text-zinc-300">Instructions en français</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                          {results.results.test1_prompts.hasMoroccanContext ? (
                            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                          )}
                          <span className="text-zinc-300">Contexte marocain</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                          {results.results.test1_prompts.hasInterests ? (
                            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                          )}
                          <span className="text-zinc-300">Intérêts intégrés</span>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                )}

                {/* Test 2: Intégration intérêts */}
                {results.results?.test2_interests && (
                  <GlassCard intensity="medium" neon="party" variant="hover" className="p-6 border-purple-500/20 relative group overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-purple-500/20 transition-all" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                            <Zap className="w-6 h-6 text-purple-400" />
                          </div>
                          <h3 className="text-xl font-black">Test 2: Intégration intérêts</h3>
                        </div>
                        {results.results.test2_interests.success ? (
                          <CheckCircle2 className="w-6 h-6 text-green-400" />
                        ) : (
                          <XCircle className="w-6 h-6 text-red-400" />
                        )}
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                          {results.results.test2_interests.hasCustomPrompt ? (
                            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                          )}
                          <span className="text-zinc-300">Prompt personnalisé créé</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                          {results.results.test2_interests.hasSubject ? (
                            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                          )}
                          <span className="text-zinc-300">Matière suggérée</span>
                        </div>
                        {results.results.test2_interests.suggestedSubjects && (
                          <div className="mt-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                            <p className="text-xs text-purple-400 mb-1">Matières suggérées:</p>
                            <p className="text-sm font-bold text-white">
                              {results.results.test2_interests.suggestedSubjects.join(", ")}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                )}

                {/* Test 3: Parser JSON */}
                {results.results?.test3_parser && (
                  <GlassCard intensity="medium" neon="intellect" variant="hover" className="p-6 border-cyan-500/20 relative group overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-cyan-500/20 transition-all" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                            <Code className="w-6 h-6 text-cyan-400" />
                          </div>
                          <h3 className="text-xl font-black">Test 3: Parser JSON</h3>
                        </div>
                        {results.results.test3_parser.success ? (
                          <CheckCircle2 className="w-6 h-6 text-green-400" />
                        ) : (
                          <XCircle className="w-6 h-6 text-red-400" />
                        )}
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                          {results.results.test3_parser.validJSONParsed ? (
                            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                          )}
                          <span className="text-zinc-300">JSON valide parsé</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                          {results.results.test3_parser.markdownJSONParsed ? (
                            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                          )}
                          <span className="text-zinc-300">JSON avec markdown parsé</span>
                        </div>
                        {results.results.test3_parser.parsedTitle && (
                          <div className="mt-3 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                            <p className="text-xs text-cyan-400 mb-1">Titre parsé:</p>
                            <p className="text-sm font-bold text-white">{results.results.test3_parser.parsedTitle}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                )}

                {/* Test 4: Validation factuelle */}
                {results.results?.test4_validation && (
                  <GlassCard intensity="medium" neon="vitality" variant="hover" className="p-6 border-emerald-500/20 relative group overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-emerald-500/20 transition-all" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                            <Shield className="w-6 h-6 text-emerald-400" />
                          </div>
                          <h3 className="text-xl font-black">Test 4: Validation factuelle</h3>
                        </div>
                        {results.results.test4_validation.success ? (
                          <CheckCircle2 className="w-6 h-6 text-green-400" />
                        ) : (
                          <XCircle className="w-6 h-6 text-red-400" />
                        )}
                      </div>
                      <div className="space-y-3">
                        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          <p className="text-xs text-emerald-400 mb-1">Score de validation</p>
                          <p className="text-3xl font-black text-emerald-400">{results.results.test4_validation.score}/100</p>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                          {results.results.test4_validation.isValid ? (
                            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                          )}
                          <span className="text-zinc-300">Quiz valide</span>
                        </div>
                        <div className="flex gap-4 text-xs">
                          <div className="flex-1 p-2 rounded bg-red-500/10 border border-red-500/20">
                            <p className="text-red-400">Erreurs</p>
                            <p className="text-white font-bold">{results.results.test4_validation.errorsCount}</p>
                          </div>
                          <div className="flex-1 p-2 rounded bg-orange-500/10 border border-orange-500/20">
                            <p className="text-orange-400">Avertissements</p>
                            <p className="text-white font-bold">{results.results.test4_validation.warningsCount}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                )}

                {/* Test 5: Vérification français */}
                {results.results?.test5_french && (
                  <GlassCard intensity="medium" neon="intellect" variant="hover" className="p-6 border-blue-500/20 relative group overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-blue-500/20 transition-all" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                            <Languages className="w-6 h-6 text-blue-400" />
                          </div>
                          <h3 className="text-xl font-black">Test 5: Vérification français</h3>
                        </div>
                        {results.results.test5_french.success ? (
                          <CheckCircle2 className="w-6 h-6 text-green-400" />
                        ) : (
                          <XCircle className="w-6 h-6 text-red-400" />
                        )}
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                          {results.results.test5_french.frenchTextDetected ? (
                            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                          )}
                          <span className="text-zinc-300">Texte français détecté</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                          {results.results.test5_french.englishTextDetected ? (
                            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                          )}
                          <span className="text-zinc-300">Texte anglais rejeté</span>
                        </div>
                        <div className="mt-3 space-y-2">
                          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                            <p className="text-xs text-blue-400 mb-1">Exemple français:</p>
                            <p className="text-xs font-mono text-white">
                              {results.results.test5_french.frenchExample}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                )}
              </div>

              {/* Erreur si présente */}
              {results.error && (
                <GlassCard intensity="high" className="p-6 border-red-500/30 bg-red-500/10">
                  <div className="flex items-center gap-3 text-red-400 mb-3">
                    <XCircle className="w-6 h-6" />
                    <h3 className="text-xl font-black">Erreur</h3>
                  </div>
                  <p className="text-sm text-red-300">{results.error}</p>
                </GlassCard>
              )}

              {/* JSON brut (pour debug) */}
              <details className="mt-6">
                <summary className="cursor-pointer text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-2">
                  <TestTube className="w-4 h-4" />
                  Voir les résultats JSON complets
                </summary>
                <GlassCard intensity="low" className="p-4 mt-4 border-white/5">
                  <pre className="text-xs overflow-auto text-zinc-300 font-mono">
                    {JSON.stringify(results, null, 2)}
                  </pre>
                </GlassCard>
              </details>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

