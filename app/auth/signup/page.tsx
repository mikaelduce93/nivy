'use client'

import type React from 'react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { UserPlus, Mail, Lock, User, Phone, MapPin, Shield } from 'lucide-react'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [telephone, setTelephone] = useState('')
  const [ville, setVille] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acceptNewsletter, setAcceptNewsletter] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [userType, setUserType] = useState<'parent' | 'teen'>('parent')
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères')
      return
    }

    if (!acceptTerms) {
      setError('Vous devez accepter les conditions générales')
      return
    }

    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            prenom,
            nom,
            telephone,
            ville,
            role: userType,
            accept_newsletter: acceptNewsletter,
          },
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/dashboard`,
        },
      })

      if (signUpError) throw signUpError

      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          email,
          prenom,
          nom,
          telephone,
          ville,
          role: userType,
          accept_newsletter: acceptNewsletter,
        })

        if (profileError) console.error('Profile creation error:', profileError)

        router.push('/auth/confirm-email')
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  const handleAppleSignUp = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
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
            <CardHeader className="text-center pb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-3xl font-black text-white">Créer un compte</CardTitle>
              <CardDescription className="text-zinc-400">Rejoignez Teens Party Morocco</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={userType} onValueChange={(v) => setUserType(v as 'parent' | 'teen')} className="mb-6">
                <TabsList className="grid w-full grid-cols-2 bg-zinc-800">
                  <TabsTrigger value="parent" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white">
                    <User className="w-4 h-4 mr-2" />
                    Parent
                  </TabsTrigger>
                  <TabsTrigger value="teen" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
                    <Shield className="w-4 h-4 mr-2" />
                    Adolescent (11-17 ans)
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="parent" className="mt-6">
                  <p className="text-sm text-zinc-400 mb-6 text-center">
                    Créez un compte parent pour gérer les réservations et profils de vos enfants
                  </p>
                </TabsContent>
                
                <TabsContent value="teen" className="mt-6">
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-6">
                    <p className="text-sm text-purple-300">
                      L'autorisation parentale sera requise pour finaliser votre inscription
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              <Button
                type="button"
                variant="outline"
                className="w-full mb-6 border-zinc-700 hover:bg-zinc-800"
                onClick={handleGoogleSignUp}
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
                Continuer avec Google
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full mb-6 border-zinc-700 hover:bg-zinc-800"
                onClick={handleAppleSignUp}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Continuer avec Apple
              </Button>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-zinc-900 px-2 text-zinc-500">Ou par email</span>
                </div>
              </div>

              <form onSubmit={handleSignUp}>
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="prenom">Prénom</Label>
                      <Input
                        id="prenom"
                        type="text"
                        placeholder="Prénom"
                        required
                        value={prenom}
                        onChange={(e) => setPrenom(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="nom">Nom</Label>
                      <Input
                        id="nom"
                        type="text"
                        placeholder="Nom"
                        required
                        value={nom}
                        onChange={(e) => setNom(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="email@example.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="telephone">Téléphone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <Input
                          id="telephone"
                          type="tel"
                          placeholder="+212 6XX XX XX XX"
                          value={telephone}
                          onChange={(e) => setTelephone(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="ville">Ville</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <Input
                          id="ville"
                          type="text"
                          placeholder="Casablanca, Rabat..."
                          value={ville}
                          onChange={(e) => setVille(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="password">Mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="Minimum 8 caractères"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <p className="text-xs text-zinc-500">
                      Minimum 8 caractères, avec majuscules et chiffres recommandés
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Retapez votre mot de passe"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>

                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="terms"
                      checked={acceptTerms}
                      onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                    />
                    <Label htmlFor="terms" className="text-sm text-zinc-400 leading-tight cursor-pointer">
                      J'accepte les{' '}
                      <Link href="/conditions-generales" className="text-cyan-400 hover:underline">
                        conditions générales
                      </Link>{' '}
                      et la{' '}
                      <Link href="/confidentialite" className="text-cyan-400 hover:underline">
                        politique de confidentialité
                      </Link>
                    </Label>
                  </div>

                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="newsletter"
                      checked={acceptNewsletter}
                      onCheckedChange={(checked) => setAcceptNewsletter(checked as boolean)}
                    />
                    <Label htmlFor="newsletter" className="text-sm text-zinc-400 leading-tight cursor-pointer">
                      J'accepte de recevoir les actualités et offres spéciales
                    </Label>
                  </div>

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                      <p className="text-sm text-red-400">{error}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className={`w-full ${userType === 'parent' ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600' : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'} text-white border-0 h-12 text-base font-semibold`}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Création en cours...' : 'Créer mon compte'}
                  </Button>
                </div>
                <div className="mt-6 text-center text-sm">
                  <span className="text-zinc-400">Vous avez déjà un compte ? </span>
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
