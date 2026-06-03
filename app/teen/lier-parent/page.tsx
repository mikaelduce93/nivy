import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivCoach } from "@/components/brand"
import { ParentLinkQR } from "@/components/teen/parent-link-qr"

/**
 * /teen/lier-parent — V11 #297. Surface where the teen shows their parent-link
 * QR so a parent can scan it (/parent/scan-teen) and link instantly.
 */
export default async function TeenLinkParentPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") {
    redirect("/auth/redirect")
  }

  return (
    <div className="container mx-auto max-w-lg px-6 py-10">
      <div className="mb-6">
        <p className="eyebrow tracking-[0.16em] text-mute">Lier mon parent</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold text-ink">
          Montre ton <em className="font-semibold italic text-pink">QR</em>
        </h1>
      </div>

      <NivCoach
        mood="happy"
        className="mb-6"
        message="Ouvre cet écran à côté de ton parent : il scanne ce QR depuis son app Nivy pour activer ton compte. Le code change toutes les 5 minutes pour ta sécurité."
      />

      <StickerCard className="items-center p-6">
        <ParentLinkQR />
      </StickerCard>
    </div>
  )
}
