import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivCoach } from "@/components/brand"
import { ArrowLeft, UserPlus, Info, QrCode, Mail, Link2 } from "lucide-react"
import Link from "next/link"
import { AddTeenForm } from "@/components/parent/add-teen-form"

export default async function AddTeenPage() {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "parent") {
    redirect("/auth/redirect")
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="container mx-auto px-6 py-32 max-w-5xl">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-6 text-mute hover:text-ink">
          <Link href="/parent/teens">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à mes teens
          </Link>
        </Button>

        {/* Header */}
        <div className="mb-8">
          <p className="eyebrow tracking-[0.16em] text-mute">Lier un compte</p>
          <h1 className="mt-1 font-display text-4xl font-extrabold text-ink">
            Ajoute ton <em className="font-semibold italic text-pink">ado</em>
          </h1>
          <p className="mt-1 text-mute">Lie le compte de ton ado à ton espace parent</p>
        </div>

        {/* Niv coach */}
        <NivCoach
          mood="happy"
          className="mb-8"
          message="Donne-lui le code, je m'occupe du reste. Une fois la liaison acceptée, tu gères tout depuis ton dashboard."
        />

        <div className="grid md:grid-cols-2 gap-8">
          {/* Main Form */}
          <StickerCard className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-lime" aria-hidden="true" />
              <h2 className="font-display text-lg font-extrabold text-ink">
                Lier un compte teen
              </h2>
            </div>
            <AddTeenForm parentId={userInfo.profileId} />
          </StickerCard>

          {/* Help Section */}
          <div className="space-y-6">
            {/* How it works */}
            <StickerCard className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <Info className="h-5 w-5 text-teal" aria-hidden="true" />
                <h2 className="font-display text-lg font-extrabold text-ink">
                  Comment ça marche ?
                </h2>
              </div>
              <ol className="space-y-4">
                <li className="flex gap-4">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-ink bg-pink font-mono text-sm font-bold text-ink">
                    1
                  </span>
                  <div>
                    <p className="font-semibold text-ink">Entre l'email ou le code</p>
                    <p className="text-sm text-mute">
                      Utilise l'email du compte teen ou son code unique de liaison.
                    </p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-ink bg-white font-mono text-sm font-bold text-ink">
                    2
                  </span>
                  <div>
                    <p className="font-semibold text-ink">Demande envoyée</p>
                    <p className="text-sm text-mute">
                      Le teen reçoit une notification pour accepter la liaison.
                    </p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-ink bg-white font-mono text-sm font-bold text-ink">
                    3
                  </span>
                  <div>
                    <p className="font-semibold text-ink">Compte lié</p>
                    <p className="text-sm text-mute">
                      Une fois accepté, gère ses paramètres depuis ton dashboard.
                    </p>
                  </div>
                </li>
              </ol>
            </StickerCard>

            {/* Alternative Methods — liste discrète */}
            <StickerCard variant="panel" className="p-5">
              <p className="eyebrow tracking-[0.14em] text-mute">Autres méthodes</p>
              <ul className="mt-3 space-y-2 text-sm text-mute">
                <li>
                  <Link
                    href="/parent/scan-teen"
                    className="flex items-center gap-3 rounded-xl px-1 py-1 text-ink transition-colors hover:text-pink"
                  >
                    <QrCode className="h-4 w-4 text-lime" aria-hidden="true" />
                    <span>Scanner le QR de ton ado</span>
                    <span className="ml-auto font-mono text-[11px] uppercase tracking-wide text-pink">
                      Scanner
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/parent/teens/invite"
                    className="flex items-center gap-3 rounded-xl px-1 py-1 text-ink transition-colors hover:text-pink"
                  >
                    <Mail className="h-4 w-4 text-teal" aria-hidden="true" />
                    <span>Générer un code d'invitation</span>
                    <span className="ml-auto font-mono text-[11px] uppercase tracking-wide text-pink">
                      Inviter
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/parent/teens/invite"
                    className="flex items-center gap-3 rounded-xl px-1 py-1 text-ink transition-colors hover:text-pink"
                  >
                    <Link2 className="h-4 w-4 text-pink" aria-hidden="true" />
                    <span>Lien de partage</span>
                    <span className="ml-auto font-mono text-[11px] uppercase tracking-wide text-pink">
                      Partager
                    </span>
                  </Link>
                </li>
              </ul>
            </StickerCard>

            {/* Info Box */}
            <StickerCard variant="panel" className="p-4">
              <p className="text-sm text-ink-2">
                <strong className="text-teal">Note :</strong> ton ado doit avoir un compte actif
                sur Nivy. S'il n'en a pas encore, invite-le à créer son compte depuis l'application.
              </p>
            </StickerCard>
          </div>
        </div>
      </div>
    </div>
  )
}
