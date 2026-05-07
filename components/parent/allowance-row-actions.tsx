"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { PauseCircle, PlayCircle, Trash2 } from "lucide-react"

interface Props {
  allowanceId: string
  isPaused: boolean
}

export function AllowanceRowActions({ allowanceId, isPaused }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  async function call(path: string, body?: unknown, method: "POST" | "DELETE" = "POST") {
    setBusy(path)
    try {
      const res = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.error ?? "Erreur")
      } else {
        router.refresh()
      }
    } finally {
      setBusy(null)
    }
  }

  const oneWeekFromNow = new Date()
  oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7)

  return (
    <div className="flex flex-wrap gap-2">
      {isPaused ? (
        <Button
          size="sm"
          variant="outline"
          disabled={busy !== null}
          onClick={() => call(`/api/parent/allowances/${allowanceId}/resume`)}
        >
          <PlayCircle className="w-4 h-4 mr-1" /> Reprendre
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          disabled={busy !== null}
          onClick={() =>
            call(`/api/parent/allowances/${allowanceId}/pause`, {
              until: oneWeekFromNow.toISOString(),
            })
          }
        >
          <PauseCircle className="w-4 h-4 mr-1" /> Pause 1 sem
        </Button>
      )}
      <Button
        size="sm"
        variant="destructive"
        disabled={busy !== null}
        onClick={() => {
          if (confirm("Supprimer cette allowance ?")) {
            call(`/api/parent/allowances/${allowanceId}`, undefined, "DELETE")
          }
        }}
      >
        <Trash2 className="w-4 h-4 mr-1" /> Supprimer
      </Button>
    </div>
  )
}
