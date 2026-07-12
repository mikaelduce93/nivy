"use client"

/**
 * G3-C — One AI-generated mission_templates row in the admin review queue.
 *
 * Mirror of <ReviewQuizRow> for missions (the cron
 * app/api/cron/generate-daily-content also writes DAILY_-coded
 * mission_templates with is_active=false; until G3-C they accumulated with no
 * review UI). Unit approve/reject goes through the batch endpoint with a
 * single id — POST /api/admin/content/review/batch { target: 'mission', … } —
 * so the guards/audit live in exactly one place for missions.
 */
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { StatusBadge } from "@/components/ui/status-badge"

export interface PendingMission {
  id: string
  code: string
  name: string
  description: string
  mission_type: string
  category: string | null
  objective_type: string
  objective_target: number
  xp_reward: number
  difficulty: string | null
  created_at: string | null
}

export function ReviewMissionRow({
  mission,
  selected,
  onToggleSelected,
}: {
  mission: PendingMission
  /** Batch-selection state, wired by <ReviewQueue>. Omit to hide the checkbox. */
  selected?: boolean
  onToggleSelected?: () => void
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function act(action: "approve" | "reject") {
    if (action === "reject" && !reason.trim()) {
      setError("Indiquez un motif de rejet.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/content/review/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: "mission",
          action,
          ids: [mission.id],
          ...(action === "reject" ? { reason: reason.trim() } : {}),
        }),
      })
      const j = (await res.json().catch(() => ({}))) as {
        error?: unknown
        failed?: Array<{ id: string; error: string }>
      }
      if (!res.ok) {
        setError(typeof j.error === "string" ? j.error : "Erreur de traitement")
        return
      }
      const fail = Array.isArray(j.failed) ? j.failed.find((f) => f.id === mission.id) : undefined
      if (fail) {
        setError(fail.error)
        return
      }
      setShowReject(false)
      setReason("")
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="flex flex-col rounded-2xl border-2 border-ink bg-white text-ink shadow-stkr-md p-4">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        {onToggleSelected && (
          <Checkbox
            checked={selected === true}
            onCheckedChange={onToggleSelected}
            disabled={busy}
            aria-label={`Sélectionner « ${mission.name} »`}
            className="mt-1"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="font-mono text-xs uppercase tracking-[0.16em] text-mute">
            {mission.code}
          </div>
          <div className="font-semibold text-ink">{mission.name}</div>
          <div className="mt-1 text-sm text-mute">{mission.description}</div>
          <div className="mt-1 text-xs text-mute">
            Soumise le{" "}
            {mission.created_at
              ? new Date(mission.created_at).toLocaleString("fr-FR")
              : "?"}
          </div>
        </div>
        <StatusBadge
          variant="pending"
          label="En attente"
          size="sm"
          className="font-mono uppercase tracking-[0.16em]"
        />
      </header>

      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <Tag label="Type" value={mission.mission_type} />
        {mission.category && <Tag label="Catégorie" value={mission.category} />}
        <Tag
          label="Objectif"
          value={`${mission.objective_type} × ${mission.objective_target}`}
        />
        <Tag label="XP" value={String(mission.xp_reward)} />
        {mission.difficulty && <Tag label="Difficulté" value={mission.difficulty} />}
      </div>

      {showReject && (
        <div className="mb-3">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motif de rejet pédagogique (obligatoire)"
            rows={2}
            maxLength={1000}
            className="w-full rounded-lg border-2 border-ink bg-paper p-2 text-sm text-ink"
          />
        </div>
      )}

      {error && <p className="mb-2 text-xs text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="lime"
          disabled={busy}
          onClick={() => act("approve")}
        >
          Approuver
        </Button>
        {!showReject ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-destructive"
            disabled={busy}
            onClick={() => setShowReject(true)}
          >
            Rejeter
          </Button>
        ) : (
          <>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => act("reject")}
            >
              Confirmer le rejet
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setShowReject(false)
                setReason("")
                setError(null)
              }}
            >
              Annuler
            </Button>
          </>
        )}
      </div>
    </li>
  )
}

function Tag({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-md border-2 border-ink bg-paper px-2 py-0.5 font-mono text-ink-2">
      <span className="uppercase tracking-[0.16em] text-mute">{label}</span> {value}
    </span>
  )
}
