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
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect, useRef, Suspense } from "react"
import { useT } from "@/lib/i18n"

function SignUpForm() {
  const t = useT()
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
  // #52 — hand-off context from the pre-account wizard (parent-setup-step links
  // to /auth/sign-up?source=wizard&tempUserId=...). Forwarded into the auth user
  // metadata so handle_new_user / a post-profil sync can attach the pre-account
  // XP to the new profiles.id.
  const searchParams = useSearchParams()
  const onboardingSource = searchParams.get("source")
  const tempUserId = searchParams.get("tempUserId")

  // Auto-redirect already-authenticated users to the role-aware redirect.
  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    supabase.auth
      .getUser()
      .then((res: { data: { user: unknown } }) => {
        if (!cancelled && res.data.user) {
          router.replace("/auth/redirect")
        }
      })
      .catch(() => {
        // ignore — user is simply not authed
      })
    return () => {
      cancelled = true
    }
  }, [router])

  // Focus error message when it appears
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.focus()
    }
  }, [error])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!acceptConditions) {
      setError(t("auth.signup.termsRequired"))
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
            // #52 — pre-account wizard continuity (source + tempUserId).
            ...(onboardingSource ? { onboarding_source: onboardingSource } : {}),
            ...(tempUserId ? { temp_user_id: tempUserId } : {}),
          },
        },
      })
      if (error) throw error
      router.push("/auth/sign-up-success")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : t("errors.generic"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 md:p-10 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-teal/10 via-teal/5 to-pink/10" />
      <div className="absolute top-20 -left-20 w-72 h-72 bg-teal/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 -right-20 w-96 h-96 bg-pink/20 rounded-full blur-3xl" />

      <div className="w-full max-w-2xl relative z-10">
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-teal via-teal to-pink rounded-2xl blur-xl opacity-50" />
          <Card className="relative bg-card border-ink rounded-2xl">
            <CardHeader className="text-center pb-8">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal to-teal flex items-center justify-center mx-auto mb-4" aria-hidden="true">
                <UserPlus className="w-8 h-8 text-ink" />
              </div>
              <CardTitle className="text-3xl font-black text-ink text-balance">{t("auth.signup.title")}</CardTitle>
              <CardDescription className="text-mute text-balance">
                {t("auth.signup.subtitle")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignUp} noValidate>
                <div className="flex flex-col gap-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="prenom" className="text-ink-2">
                        {t("auth.signup.firstName")}
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
                        className="bg-card border-ink text-ink placeholder:text-mute focus-visible:ring-teal"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="nom" className="text-ink-2">
                        {t("auth.signup.lastName")}
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
                        className="bg-card border-ink text-ink placeholder:text-mute focus-visible:ring-teal"
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="email" className="text-ink-2">
                      {t("auth.signup.email")}
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
                      className="bg-card border-ink text-ink placeholder:text-mute focus-visible:ring-teal"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="telephone" className="text-ink-2">
                      {t("auth.signup.phone")}
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
                      className="bg-card border-ink text-ink placeholder:text-mute focus-visible:ring-teal"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="ville" className="text-ink-2">
                      {t("auth.signup.city")}
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
                      className="bg-card border-ink text-ink placeholder:text-mute focus-visible:ring-teal"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="password" className="text-ink-2">
                      {t("auth.signup.password")}
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
                      className="bg-card border-ink text-ink placeholder:text-mute focus-visible:ring-teal"
                    />
                    <p id="password-hint" className="text-xs text-mute">{t("auth.signup.passwordHint")}</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="newsletter"
                        checked={acceptNewsletter}
                        onCheckedChange={(checked) => setAcceptNewsletter(checked as boolean)}
                        className="border-ink"
                      />
                      <Label htmlFor="newsletter" className="text-sm font-normal cursor-pointer text-ink-2">
                        {t("auth.signup.newsletterLabel")}
                      </Label>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="conditions"
                        checked={acceptConditions}
                        onCheckedChange={(checked) => setAcceptConditions(checked as boolean)}
                        className="border-ink"
                        required
                      />
                      <Label htmlFor="conditions" className="text-sm font-normal cursor-pointer text-ink-2">
                        {t("auth.signup.termsLabel")}{" "}
                        <Link href="/conditions" className="text-teal hover:text-teal underline">
                          ({t("auth.signup.termsLink")})
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
                      className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 outline-none focus:ring-2 focus:ring-destructive"
                    >
                      <p className="text-sm text-destructive">{error}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-teal to-teal hover:from-teal hover:to-teal text-ink border-0 h-12 text-base font-semibold focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
                    disabled={isLoading}
                    aria-busy={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                        <span>{t("auth.signup.loading")}</span>
                      </>
                    ) : (
                      t("auth.signup.submit")
                    )}
                  </Button>
                </div>
                <div className="mt-6 text-center text-sm">
                  <span className="text-mute">{t("auth.signup.haveAccount")} </span>
                  <Link
                    href="/auth/login"
                    className="text-teal hover:text-teal font-semibold underline-offset-4 hover:underline"
                  >
                    {t("auth.signup.signIn")}
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

export default function SignUpPage() {
  // #52 — useSearchParams requires a Suspense boundary at build time.
  return (
    <Suspense fallback={null}>
      <SignUpForm />
    </Suspense>
  )
}
