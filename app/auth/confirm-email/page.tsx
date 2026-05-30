import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function ConfirmEmailPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 md:p-10 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-teal/10 via-teal/5 to-pink/10" aria-hidden="true" />
      <div className="absolute top-20 -left-20 w-72 h-72 bg-teal/20 rounded-full blur-3xl" aria-hidden="true" />
      <div className="absolute bottom-20 -right-20 w-96 h-96 bg-pink/20 rounded-full blur-3xl" aria-hidden="true" />

      <div className="w-full max-w-md relative z-10">
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-teal via-teal to-pink rounded-2xl blur-xl opacity-50" aria-hidden="true" />
          <Card className="relative bg-card border-ink rounded-2xl">
            <CardHeader className="text-center pb-8">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-lime to-lime flex items-center justify-center mx-auto mb-4" aria-hidden="true">
                <CheckCircle className="w-10 h-10 text-ink" />
              </div>
              <CardTitle className="text-3xl font-black text-ink text-balance">Vérifiez votre email</CardTitle>
              <CardDescription className="text-mute mt-3 text-balance">
                Nous avons envoyé un lien de confirmation à votre adresse email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-teal/10 border border-teal/30 rounded-xl p-6 text-center" role="status" aria-live="polite">
                <Mail className="w-12 h-12 text-teal mx-auto mb-3" aria-hidden="true" />
                <p className="text-ink font-semibold mb-2">Email envoyé !</p>
                <p className="text-sm text-mute text-balance">
                  Cliquez sur le lien dans l'email pour activer votre compte et commencer à réserver des événements
                </p>
              </div>

              <ol className="space-y-3 text-sm text-mute list-none" aria-label="Étapes pour confirmer votre email">
                <li className="flex items-start gap-2">
                  <span className="text-teal font-bold tabular-nums" aria-hidden="true">1.</span>
                  Vérifiez votre boîte de réception
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal font-bold tabular-nums" aria-hidden="true">2.</span>
                  Cliquez sur le lien de confirmation
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal font-bold tabular-nums" aria-hidden="true">3.</span>
                  Vous serez redirigé vers votre dashboard
                </li>
              </ol>

              <div className="pt-6 border-t border-ink">
                <p className="text-center text-sm text-mute mb-4">Vous n'avez pas reçu l'email ?</p>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 border-ink text-mute hover:bg-card focus-visible:ring-teal">
                    Vérifier les spams
                  </Button>
                  <Button variant="outline" className="flex-1 border-teal text-teal hover:bg-teal/10 focus-visible:ring-teal">
                    Renvoyer
                  </Button>
                </div>
              </div>

              <div className="text-center">
                <Link href="/" className="text-sm text-teal hover:text-teal underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-teal rounded">
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
