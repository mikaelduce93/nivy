"use client"

import type React from "react"
import { Lock, Loader2 } from 'lucide-react'

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from "react"
import { useT } from "@/lib/i18n"

export default function LoginPage() {
  const t = useT()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      // Redirection intelligente selon le rôle
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
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/redirect`,
      },
    })
  }

  const handleAppleSignIn = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/redirect`,
      },
    })
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 md:p-10 bg-zinc-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-purple-500/10" />
      <div className="absolute top-20 -left-20 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 -right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />

      <div className="w-full max-w-sm relative z-10">
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-3xl blur-xl opacity-50" />
          <Card className="relative bg-zinc-900 border-zinc-800 rounded-3xl">
            <CardHeader className="text-center pb-8">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mx-auto mb-4" aria-hidden="true">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-3xl font-black text-white text-balance">{t("auth.login.title")}</CardTitle>
              <CardDescription className="text-zinc-400 text-balance">{t("auth.login.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3 mb-6">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-zinc-700 hover:bg-zinc-800"
                  onClick={handleGoogleSignIn}
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  {t("auth.login.googleCta")}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-zinc-700 hover:bg-zinc-800"
                  onClick={handleAppleSignIn}
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  {t("auth.login.appleCta")}
                </Button>
              </div>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-zinc-900 px-2 text-zinc-500">{t("auth.login.orEmail")}</span>
                </div>
              </div>

              <form onSubmit={handleLogin} noValidate>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="email">{t("auth.login.emailLabel")}</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      spellCheck={false}
                      placeholder={t("auth.login.emailPlaceholder")}
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="focus-visible:ring-cyan-500"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">{t("auth.login.passwordLabel")}</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="focus-visible:ring-cyan-500"
                    />
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
                        <span>{t("auth.login.loading")}</span>
                      </>
                    ) : (
                      t("auth.login.submit")
                    )}
                  </Button>
                </div>
                <div className="mt-6 text-center text-sm">
                  <span className="text-zinc-400">{t("auth.login.noAccount")} </span>
                  <Link
                    href="/auth/sign-up"
                    className="text-cyan-400 hover:text-cyan-300 font-semibold underline-offset-4 hover:underline"
                  >
                    {t("auth.login.createAccount")}
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
