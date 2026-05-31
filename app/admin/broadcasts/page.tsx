import type { Metadata } from "next"
import { BroadcastComposer } from "@/components/admin/broadcast-composer"

export const metadata: Metadata = { title: "Broadcasts — Admin" }

// Refonte V1.5 (#107) + V3 (#196) — composer/envoyer des broadcasts push/notif.
// Le composer (client) POST vers /api/admin/broadcasts (fan-out user_notifications).
export default function AdminBroadcastsPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="eyebrow">Communication</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">
          Composer un <em className="font-semibold italic text-pink">broadcast</em>
        </h1>
        <p className="text-mute">Une annonce push/notification, envoyée à un segment d'utilisateurs.</p>
      </header>

      <BroadcastComposer />
    </div>
  )
}
