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
        aria-label={`Declarer ${title}`}
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-black",
          "hover:bg-white/90 transition-colors disabled:opacity-50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        )}
      >
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Compass className="h-3 w-3" />
        )}
        Declarer
      </button>
      {error ? (
        <span className="text-[10px] text-red-300">Reessaye dans un instant.</span>
      ) : null}
    </div>
  )
}
