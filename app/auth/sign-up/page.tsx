"use client"

import type React from "react"
import { Loader2 } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { FieldInput } from "@/components/ui/field-input"
import { CheckRound } from "@/components/ui/check-round"
import { SegmentedProgress } from "@/components/ui/progress"
import { NivCoach } from "@/components/brand"
import { MeshBackground } from "@/components/ui/effects/mesh-background"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect, useRef, Suspense } from "react"
import { useT } from "@/lib/i18n"

function SignUpForm() {
  const t = useT()
  const [step, setStep] = useState(0)
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
  // QR-onboarding: a parent arriving from a teen-shared validation link
  // (intent=validate-teen) signs up as a parent; the confirm-email must run
  // through /auth/callback so the session is established AND the pending-teen
  // cookie hop in /auth/redirect fires.
  const intent = searchParams.get("intent")
  const isValidateTeenIntent = intent === "validate-teen"

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
      const emailRedirectTo = isValidateTeenIntent
        ? `${window.location.origin}/auth/callback?next=/auth/redirect`
        : process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/auth/redirect`
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
          data: {
            nom,
            prenom,
            telephone: telephone.trim() ? `+212 ${telephone.trim()}` : "",
            ville,
            accept_newsletter: acceptNewsletter,
            // QR-onboarding: land role='parent' (handle_new_user trigger).
            ...(isValidateTeenIntent ? { role: "parent" } : {}),
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
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-paper p-6 md:p-10">
      <MeshBackground />

      <div className="relative z-10 w-full max-w-md">
        <StickerCard className="p-6 sm:p-7">
          <p className="eyebrow tracking-[0.16em]">{t("auth.signup.eyebrow")}</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold leading-[1.05] tracking-tight text-ink text-balance">
            {t("auth.signup.titleLead")}{" "}
            <em className="font-semibold italic text-pink">{t("auth.signup.titleEm")}</em>
          </h1>

          <div className="mt-4">
            <NivCoach
              mood="hype"
              message={
                isValidateTeenIntent
                  ? "Crée ton compte parent pour valider l'inscription de ton ado et activer son espace en toute sécurité."
                  : t("auth.signup.nivBubble")
              }
            />
          </div>

          <div className="mt-5">
            <SegmentedProgress steps={3} current={step} showLabel />
          </div>

          <form onSubmit={handleSignUp} noValidate className="mt-5 flex flex-col gap-4">
            {step === 0 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FieldInput
                  id="prenom"
                  name="prenom"
                  type="text"
                  autoComplete="given-name"
                  label={t("auth.signup.firstName")}
                  placeholder="Yassine"
                  required
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                />
                <FieldInput
                  id="nom"
                  name="nom"
                  type="text"
                  autoComplete="family-name"
                  label={t("auth.signup.lastName")}
                  placeholder="El Amrani"
                  required
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                />
              </div>
            )}

            {step === 1 && (
              <>
                <FieldInput
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  spellCheck={false}
                  label={t("auth.signup.email")}
                  placeholder="parent@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <FieldInput
                  id="telephone"
                  name="telephone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  label={t("auth.signup.phone")}
                  prefix="🇲🇦 +212"
                  placeholder="6 12 34 56 78"
                  required
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                />
                <FieldInput
                  id="ville"
                  name="ville"
                  type="text"
                  autoComplete="address-level2"
                  label={t("auth.signup.city")}
                  placeholder="Casablanca"
                  required
                  value={ville}
                  onChange={(e) => setVille(e.target.value)}
                />
              </>
            )}

            {step === 2 && (
              <>
                <FieldInput
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  label={t("auth.signup.password")}
                  placeholder="Minimum 8 caracteres"
                  required
                  minLength={8}
                  hint={t("auth.signup.passwordHint")}
                  aria-describedby="password-hint"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <CheckRound
                  id="newsletter"
                  checked={acceptNewsletter}
                  onCheckedChange={(checked) => setAcceptNewsletter(checked as boolean)}
                  label={t("auth.signup.newsletterLabel")}
                />
                <CheckRound
                  id="conditions"
                  checked={acceptConditions}
                  onCheckedChange={(checked) => setAcceptConditions(checked as boolean)}
                  label={
                    <>
                      {t("auth.signup.termsLabel")}{" "}
                      <Link href="/legal/cgu" className="font-semibold text-pink underline">
                        ({t("auth.signup.termsLink")})
                      </Link>
                    </>
                  }
                />
              </>
            )}

            {error && (
              <div
                ref={errorRef}
                tabIndex={-1}
                role="alert"
                aria-live="assertive"
                className="rounded-xl border-2 border-coral bg-coral/10 p-3 outline-none"
              >
                <p className="text-sm font-medium text-coral">{error}</p>
              </div>
            )}

            <div className="flex items-center gap-3">
              {step > 0 && (
                <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
                  {t("auth.signup.back")}
                </Button>
              )}
              {step < 2 ? (
                <Button type="button" variant="pink" className="flex-1 h-12 text-base" onClick={() => setStep((s) => s + 1)}>
                  {t("auth.signup.next")}
                </Button>
              ) : (
                <Button type="submit" variant="pink" className="flex-1 h-12 text-base" disabled={isLoading} aria-busy={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                      <span>{t("auth.signup.loading")}</span>
                    </>
                  ) : (
                    t("auth.signup.submit")
                  )}
                </Button>
              )}
            </div>

            <div className="text-center text-sm">
              <span className="text-mute">{t("auth.signup.haveAccount")} </span>
              <Link href="/auth/login" className="font-semibold text-pink underline-offset-4 hover:underline">
                {t("auth.signup.signIn")}
              </Link>
            </div>
          </form>
        </StickerCard>
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
