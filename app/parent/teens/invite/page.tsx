import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { MeshBackground } from "@/components/ui/effects/mesh-background"
import { InviteTeenClient } from "@/components/parent/invite-teen-client"

/**
 * /parent/teens/invite — V11 #299. Parent generates a 6-digit code + QR/link
 * for an existing teen to redeem (parent→ado sense).
 */
export default async function InviteTeenPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "parent") {
    redirect("/auth/redirect")
  }

  return (
    <div className="relative min-h-screen bg-paper">
      <MeshBackground />
      <div className="container relative z-10 mx-auto max-w-lg px-6 py-24">
        <Button variant="ghost" asChild className="mb-6 text-mute hover:text-ink">
          <Link href="/parent/teens/add">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Autres méthodes
          </Link>
        </Button>

        <div className="mb-6">
          <p className="eyebrow tracking-[0.16em] text-mute">Inviter un ado</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-ink">
            Invite ton <em className="font-semibold italic text-pink">ado</em>
          </h1>
          <p className="mt-1 text-mute">
            Donne-lui ce code (ou ce QR) : il rejoint ton espace en un scan.
          </p>
        </div>

        <InviteTeenClient />
      </div>
    </div>
  )
}
