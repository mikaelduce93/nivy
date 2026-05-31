/**
 * Wave 2.3 — Submission composer.
 */
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { StickerCard } from "@/components/ui/sticker-card"
import { FieldInput } from "@/components/ui/field-input"
import { SelectSticker, SelectStickerItem } from "@/components/ui/select-sticker"
import { Button } from "@/components/ui/button"
import { NivCoach } from "@/components/brand"

const TYPES = ["photo", "video", "story", "tutorial", "review"] as const
const CATEGORIES = ["sport", "art", "tech", "academic", "food", "lifestyle"] as const
const VISIBILITY = ["private", "friends", "crew", "public"] as const

// Libellés FR Gen-Z — purement présentation. La VALEUR envoyée au POST reste
// l'enum d'origine (iso-fonctionnel : mapping libellé→valeur uniquement).
const TYPE_LABELS: Record<(typeof TYPES)[number], string> = {
  photo: "Photo",
  video: "Vidéo",
  story: "Story",
  tutorial: "Tuto",
  review: "Avis",
}
const CATEGORY_LABELS: Record<(typeof CATEGORIES)[number], string> = {
  sport: "Sport",
  art: "Art",
  tech: "Tech",
  academic: "Études",
  food: "Food",
  lifestyle: "Lifestyle",
}
const VISIBILITY_LABELS: Record<(typeof VISIBILITY)[number], string> = {
  private: "Privé",
  friends: "Amis",
  crew: "Crew",
  public: "Public",
}

export default function CreateSubmissionPage() {
  const router = useRouter()
  const [type, setType] = useState<(typeof TYPES)[number]>("photo")
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("sport")
  const [visibility, setVisibility] = useState<(typeof VISIBILITY)[number]>("public")
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [mediaUrl, setMediaUrl] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/teen/feed/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          category,
          title,
          body,
          media_urls: mediaUrl ? [mediaUrl] : [],
          visibility,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "Erreur")
        setSubmitting(false)
        return
      }
      router.push(`/teen/feed/${json.submission_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur")
      setSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto max-w-xl space-y-6 px-4 py-6">
      <header className="space-y-2">
        <p className="eyebrow">Créer · Partager</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">
          Créer un <em className="font-semibold italic text-pink not-italic">post</em>
        </h1>
        <p className="max-w-md text-mute">
          Montre ta création au feed. Choisis le format, ajoute un titre et publie.
        </p>
      </header>

      <StickerCard className="gap-5 p-5 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectSticker
              label="Type"
              value={type}
              onValueChange={(v) => setType(v as (typeof TYPES)[number])}
            >
              {TYPES.map((t) => (
                <SelectStickerItem key={t} value={t}>
                  {TYPE_LABELS[t]}
                </SelectStickerItem>
              ))}
            </SelectSticker>

            <SelectSticker
              label="Catégorie"
              value={category}
              onValueChange={(v) => setCategory(v as (typeof CATEGORIES)[number])}
            >
              {CATEGORIES.map((c) => (
                <SelectStickerItem key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </SelectStickerItem>
              ))}
            </SelectSticker>
          </div>

          <FieldInput
            label="Titre"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="Un titre qui claque"
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="create-body" className="eyebrow tracking-[0.16em]">
              Description
            </label>
            <textarea
              id="create-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Raconte ce que tu partages…"
              className="w-full rounded-xl border-2 border-input bg-card px-3.5 py-2.5 text-base outline-none transition-colors placeholder:text-mute focus:border-ink md:text-sm"
            />
          </div>

          <FieldInput
            label="URL média (image/vidéo)"
            type="url"
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder="https://..."
          />

          <div className="space-y-2">
            <SelectSticker
              label="Visibilité"
              value={visibility}
              onValueChange={(v) => setVisibility(v as (typeof VISIBILITY)[number])}
            >
              {VISIBILITY.map((v) => (
                <SelectStickerItem key={v} value={v}>
                  {VISIBILITY_LABELS[v]}
                </SelectStickerItem>
              ))}
            </SelectSticker>
            {visibility === "public" && (
              <NivCoach
                mood="proud"
                tone="paper"
                message="Les posts publics passent par la modération avant publication."
              />
            )}
          </div>

          {error && (
            <div className="rounded-xl border-2 border-coral bg-white px-3.5 py-2.5 text-sm font-medium text-coral shadow-stkr-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="pink"
            disabled={submitting || (!body && !mediaUrl)}
            className="w-full"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Envoi…" : "Publier"}
          </Button>
        </form>
      </StickerCard>

      {/* Aperçu live — carte post style feed, construite pendant la saisie. */}
      <section className="space-y-2">
        <p className="eyebrow">Aperçu</p>
        <StickerCard variant="panel" className="overflow-hidden">
          {mediaUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaUrl}
              alt=""
              className="aspect-video w-full border-b-2 border-ink object-cover"
            />
          ) : (
            <div className="grid aspect-video place-items-center border-b-2 border-ink bg-paper-2 font-mono text-xs uppercase tracking-widest text-mute">
              {TYPE_LABELS[type]}
            </div>
          )}
          <div className="space-y-2 p-4">
            <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-mute">
              <span className="rounded-full border-2 border-ink px-2 py-0.5 text-ink">
                {CATEGORY_LABELS[category]}
              </span>
              <span>{VISIBILITY_LABELS[visibility]}</span>
            </div>
            <h3 className="font-display text-lg font-bold text-ink">
              {title.trim() || "Titre de ton post"}
            </h3>
            {body.trim() && (
              <p className="line-clamp-3 text-sm text-mute">{body}</p>
            )}
          </div>
        </StickerCard>
      </section>
    </div>
  )
}
