"use client"

import type React from "react"
import { UserPlus, Loader2 } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect, useRef } from "react"

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [prenom, setPrenom] = useState("")
  const [nom, setNom] = useState("")
  const [telephone, setTelephone] = useState("")
  const [ville, setVille] = useState("")
  const [acceptNewsletter, setAcceptNewsletter] = useState(false)
  const [acceptConditions, setAcceptConditions] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const errorRef = useRef<HTMLDivElement>(null)

  // Focus error message when it appears
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.focus()
    }
  }, [error])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!acceptConditions) {
      setError("Vous devez accepter les conditions d'utilisation")
      return
    }

    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/dashboard`,
          data: {
            nom,
            prenom,
            telephone,
            ville,
            accept_newsletter: acceptNewsletter,
          },
        },
      })
      if (error) throw error
      router.push("/auth/sign-up-success")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Une erreur est survenue")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 md:p-10 bg-zinc-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-purple-500/10" />
      <div className="absolute top-20 -left-20 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 -right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />

      <div className="w-full max-w-2xl relative z-10">
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-3xl blur-xl opacity-50" />
          <Card className="relative bg-zinc-900 border-zinc-800 rounded-3xl">
            <CardHeader className="text-center pb-8">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mx-auto mb-4" aria-hidden="true">
                <UserPlus className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-3xl font-black text-white text-balance">Créer un compte</CardTitle>
              <CardDescription className="text-zinc-400 text-balance">
                Inscription parent pour gérer les activités de vos enfants
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignUp} noValidate>
                <div className="flex flex-col gap-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="prenom" className="text-zinc-300">
                        Prénom
                      </Label>
                      <Input
                        id="prenom"
                        name="prenom"
                        type="text"
                        autoComplete="given-name"
                        placeholder="Prénom…"
                        required
                        value={prenom}
                        onChange={(e) => setPrenom(e.target.value)}
                        className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-cyan-500"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="nom" className="text-zinc-300">
                        Nom
                      </Label>
                      <Input
                        id="nom"
                        name="nom"
                        type="text"
                        autoComplete="family-name"
                        placeholder="Nom…"
                        required
                        value={nom}
                        onChange={(e) => setNom(e.target.value)}
                        className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="email" className="text-zinc-300">
                      Email
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      spellCheck={false}
                      placeholder="parent@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-cyan-500"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="telephone" className="text-zinc-300">
                      Téléphone
                    </Label>
                    <Input
                      id="telephone"
                      name="telephone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="+212 6XX XXX XXX"
                      required
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-cyan-500"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="ville" className="text-zinc-300">
                      Ville
                    </Label>
                    <Input
                      id="ville"
                      name="ville"
                      type="text"
                      autoComplete="address-level2"
                      placeholder="Casablanca…"
                      required
                      value={ville}
                      onChange={(e) => setVille(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-cyan-500"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="password" className="text-zinc-300">
                      Mot de passe
                    </Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Minimum 8 caractères…"
                      required
                      minLength={8}
                      aria-describedby="password-hint"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-cyan-500"
                    />
                    <p id="password-hint" className="text-xs text-zinc-500">Minimum 8 caractères</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="newsletter"
                        checked={acceptNewsletter}
                        onCheckedChange={(checked) => setAcceptNewsletter(checked as boolean)}
                        className="border-zinc-700"
                      />
                      <Label htmlFor="newsletter" className="text-sm font-normal cursor-pointer text-zinc-300">
                        Je souhaite recevoir la newsletter
                      </Label>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="conditions"
                        checked={acceptConditions}
                        onCheckedChange={(checked) => setAcceptConditions(checked as boolean)}
                        className="border-zinc-700"
                        required
                      />
                      <Label htmlFor="conditions" className="text-sm font-normal cursor-pointer text-zinc-300">
                        J'accepte les{" "}
                        <Link href="/conditions" className="text-cyan-400 hover:text-cyan-300 underline">
                          conditions d'utilisation
                        </Link>
                      </Label>
                    </div>
                  </div>

                  {error && (
                    <div
                      ref={errorRef}
                      tabIndex={-1}
                      role="alert"
                      aria-live="assertive"
                      className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <p className="text-sm text-red-400">{error}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0 h-12 text-base font-semibold focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
                    disabled={isLoading}
                    aria-busy={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                        <span>Création…</span>
                      </>
                    ) : (
                      "Créer mon compte"
                    )}
                  </Button>
                </div>
                <div className="mt-6 text-center text-sm">
                  <span className="text-zinc-400">Déjà un compte ? </span>
                  <Link
                    href="/auth/login"
                    className="text-cyan-400 hover:text-cyan-300 font-semibold underline-offset-4 hover:underline"
                  >
                    Se connecter
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
