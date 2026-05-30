import Link from "next/link"

import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivCoach } from "@/components/brand"
import { MeshBackground } from "@/components/ui/effects/mesh-background"

// Codes Supabase connus → message humain FR Gen-Z marocain.
const KNOWN: Record<string, string> = {
  unknown_role: "On n'a pas réussi à reconnaître ton rôle. Reconnecte-toi pour réessayer.",
  expired_token: "Ton lien a expiré. Demande-en un nouveau et c'est reparti.",
  otp_expired: "Le code a expiré. Recommence la connexion, ça prend 10 secondes.",
  access_denied: "Accès refusé. Vérifie que tu utilises le bon compte.",
  email_not_confirmed: "Ton email n'est pas encore confirmé. Check ta boîte mail.",
}

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reason?: string }>
}) {
  const params = await searchParams
  const detail = params?.error ?? params?.reason
  const human =
    (detail && KNOWN[detail]) ||
    "Un truc a coincé de notre côté. Réessaie — ça remarche souvent du premier coup."

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-paper p-6 md:p-10">
      <MeshBackground />

      <div className="relative z-10 w-full max-w-sm">
        <StickerCard
          className="border-destructive bg-danger-soft p-6 sm:p-7"
          style={{ background: "var(--danger-soft)" }}
        >
          <p className="eyebrow tracking-[0.16em] text-coral">Erreur</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold leading-[1.05] tracking-tight text-ink text-balance">
            Quelque chose a <em className="font-semibold italic text-pink">cassé</em>
          </h1>

          <div className="mt-4">
            <NivCoach mood="calm" message={human} />
          </div>

          {detail ? (
            <details className="mt-4 rounded-xl border-2 border-line bg-white p-3 text-sm">
              <summary className="cursor-pointer font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-mute">
                Détails techniques
              </summary>
              <p className="mt-2 break-words font-mono text-xs text-ink-2" data-error-code={detail}>
                {detail}
              </p>
            </details>
          ) : null}

          <div className="mt-6 flex flex-col gap-3">
            <Button asChild variant="pink" className="h-12 w-full text-base">
              <Link href="/auth/login">Réessayer la connexion</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/aide">Contacter le support</Link>
            </Button>
          </div>
        </StickerCard>
      </div>
    </div>
  )
}
