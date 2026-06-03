"use client"

import type React from "react"
import { Loader2 } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { FieldInput } from "@/components/ui/field-input"
import { NivCoach } from "@/components/brand"
import { MeshBackground } from "@/components/ui/effects/mesh-background"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { useT } from "@/lib/i18n"
import { DemoAccountSwitcher } from "@/components/auth/demo-account-switcher"

export default function LoginPage() {
  const t = useT()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const errorRef = useRef<HTMLDivElement>(null)

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.push("/auth/redirect")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : t("errors.generic"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/auth/redirect` },
    })
  }

  const handleAppleSignIn = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/auth/redirect` },
    })
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-paper p-6 md:p-10">
      <MeshBackground />

      <div className="relative z-10 w-full max-w-sm space-y-4">
        <StickerCard className="p-6 sm:p-7">
          <p className="eyebrow tracking-[0.16em]">{t("auth.login.eyebrow")}</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold leading-[1.05] tracking-tight text-ink text-balance">
            {t("auth.login.titleLead")}{" "}
            <em className="font-semibold italic text-pink">{t("auth.login.titleEm")}</em>
          </h1>

          <div className="mt-4">
            <NivCoach mood="happy" message={t("auth.login.nivBubble")} />
          </div>

          <div className="mt-5 flex flex-col gap-3">
            <Button type="button" variant="outline" className="w-full" onClick={handleGoogleSignIn}>
              <svg className="mr-2 size-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {t("auth.login.googleCta")}
            </Button>

            <Button type="button" variant="outline" className="w-full" onClick={handleAppleSignIn}>
              <svg className="mr-2 size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              {t("auth.login.appleCta")}
            </Button>
          </div>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="eyebrow">{t("auth.login.orEmail")}</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <form onSubmit={handleLogin} noValidate className="flex flex-col gap-4">
            <FieldInput
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              spellCheck={false}
              label={t("auth.login.emailLabel")}
              placeholder={t("auth.login.emailPlaceholder")}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <FieldInput
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              label={t("auth.login.passwordLabel")}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

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

            <Button type="submit" variant="pink" className="h-12 w-full text-base" disabled={isLoading} aria-busy={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                  <span>{t("auth.login.loading")}</span>
                </>
              ) : (
                t("auth.login.submit")
              )}
            </Button>

            <div className="text-center text-sm">
              <span className="text-mute">{t("auth.login.noAccount")} </span>
              <Link href="/auth/sign-up" className="font-semibold text-pink underline-offset-4 hover:underline">
                {t("auth.login.createAccount")}
              </Link>
            </div>
          </form>
        </StickerCard>

        {/* Comptes démo — hors du flux principal (repliable). */}
        <details className="rounded-xl border-2 border-line bg-white/60 px-4 py-2 text-sm">
          <summary className="cursor-pointer font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-mute">
            Comptes démo
          </summary>
          <div className="pt-3">
            <DemoAccountSwitcher />
          </div>
        </details>
      </div>
    </div>
  )
}
