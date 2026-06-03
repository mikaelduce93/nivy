import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivCoach } from "@/components/brand"
import { JoinParentClient } from "@/components/teen/join-parent-client"

/**
 * /teen/rejoindre — V11 #300. Teen redeems a parent's 6-digit linking code
 * (typed or scanned). The shareable link `/teen/rejoindre?code=NNNNNN` prefills
 * the code. `initialCode` is read server-side and passed as a prop (no
 * useSearchParams → no Suspense boundary needed).
 */
export default async function JoinParentPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") {
    redirect("/auth/redirect")
  }

  const { code } = await searchParams

  return (
    <div className="container mx-auto max-w-lg px-6 py-10">
      <div className="mb-6">
        <p className="eyebrow tracking-[0.16em] text-mute">Rejoindre un parent</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold text-ink">
          Lie ton <em className="font-semibold italic text-pink">parent</em>
        </h1>
      </div>

      <NivCoach
        mood="happy"
        className="mb-6"
        message="Ton parent t'a donné un code à 6 chiffres (ou un QR) ? Entre-le ici pour relier vos comptes."
      />

      <JoinParentClient initialCode={typeof code === "string" ? code : ""} />

      <StickerCard variant="panel" className="mt-6 p-4">
        <p className="text-sm text-ink-2">
          Pas encore de code ? Demande à ton parent de le générer depuis son espace Nivy.
        </p>
      </StickerCard>
    </div>
  )
}
