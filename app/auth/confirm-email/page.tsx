import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function ConfirmEmailPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 md:p-10 bg-zinc-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-purple-500/10" aria-hidden="true" />
      <div className="absolute top-20 -left-20 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl" aria-hidden="true" />
      <div className="absolute bottom-20 -right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" aria-hidden="true" />

      <div className="w-full max-w-md relative z-10">
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-3xl blur-xl opacity-50" aria-hidden="true" />
          <Card className="relative bg-zinc-900 border-zinc-800 rounded-3xl">
            <CardHeader className="text-center pb-8">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-4" aria-hidden="true">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-3xl font-black text-white text-balance">Vérifiez votre email</CardTitle>
              <CardDescription className="text-zinc-400 mt-3 text-balance">
                Nous avons envoyé un lien de confirmation à votre adresse email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-6 text-center" role="status" aria-live="polite">
                <Mail className="w-12 h-12 text-cyan-400 mx-auto mb-3" aria-hidden="true" />
                <p className="text-white font-semibold mb-2">Email envoyé !</p>
                <p className="text-sm text-zinc-400 text-balance">
                  Cliquez sur le lien dans l'email pour activer votre compte et commencer à réserver des événements
                </p>
              </div>

              <ol className="space-y-3 text-sm text-zinc-400 list-none" aria-label="Étapes pour confirmer votre email">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold tabular-nums" aria-hidden="true">1.</span>
                  Vérifiez votre boîte de réception
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold tabular-nums" aria-hidden="true">2.</span>
                  Cliquez sur le lien de confirmation
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold tabular-nums" aria-hidden="true">3.</span>
                  Vous serez redirigé vers votre dashboard
                </li>
              </ol>

              <div className="pt-6 border-t border-zinc-800">
                <p className="text-center text-sm text-zinc-500 mb-4">Vous n'avez pas reçu l'email ?</p>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 border-zinc-700 text-zinc-400 hover:bg-zinc-800 focus-visible:ring-cyan-500">
                    Vérifier les spams
                  </Button>
                  <Button variant="outline" className="flex-1 border-cyan-500 text-cyan-400 hover:bg-cyan-500/10 focus-visible:ring-cyan-500">
                    Renvoyer
                  </Button>
                </div>
              </div>

              <div className="text-center">
                <Link href="/" className="text-sm text-cyan-400 hover:text-cyan-300 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-cyan-500 rounded">
                  Retour à l'accueil
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
