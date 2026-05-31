"use client"

/**
 * <DeclarePathwayButton> — V1.1 P2.5 client component.
 *
 * POSTs to /api/teen/pathways/:slug/declare to upsert teen_pathway_progress.
 * On success, refreshes server data to surface the new "in exploration" tile.
 */

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Compass, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  slug: string
  title: string
}

export function DeclarePathwayButton({ slug, title }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleDeclare() {
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/teen/pathways/${encodeURIComponent(slug)}/declare`,
          { method: "POST" }
        )
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          setError(j?.error ?? "failed")
          return
        }
        router.refresh()
      } catch (err) {
        console.error(err)
        setError("network")
      }
    })
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleDeclare}
        disabled={isPending}
        aria-label={`Déclarer ${title}`}
        className={cn(
          "inline-flex items-center gap-1 rounded-full border-2 border-ink bg-ink px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wide text-paper",
          "transition-all disabled:opacity-50 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-pink motion-reduce:translate-x-0 motion-reduce:translate-y-0",
          "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-pink/40"
        )}
      >
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Compass className="h-3 w-3" />
        )}
        Déclarer
      </button>
      {error ? (
        <span className="font-mono text-[10px] text-coral">Réessaie dans un instant.</span>
      ) : null}
    </div>
  )
}
