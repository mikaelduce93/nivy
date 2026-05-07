/**
 * Wave 2.3 — Submission composer.
 */
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

const TYPES = ["photo", "video", "story", "tutorial", "review"] as const
const CATEGORIES = ["sport", "art", "tech", "academic", "food", "lifestyle"] as const
const VISIBILITY = ["private", "friends", "crew", "public"] as const

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
    <div className="container mx-auto max-w-xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-semibold">Créer un post</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as (typeof TYPES)[number])}
            className="mt-1 w-full rounded border p-2"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Catégorie</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])}
            className="mt-1 w-full rounded border p-2"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Titre</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded border p-2"
            maxLength={120}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Description</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded border p-2"
            maxLength={2000}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">URL média (image/vidéo)</label>
          <input
            type="url"
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder="https://..."
            className="mt-1 w-full rounded border p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Visibilité</label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as (typeof VISIBILITY)[number])}
            className="mt-1 w-full rounded border p-2"
          >
            {VISIBILITY.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          {visibility === "public" && (
            <p className="mt-1 text-xs text-gray-500">
              Les posts publics passent par la modération avant publication.
            </p>
          )}
        </div>

        {error && <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <button
          type="submit"
          disabled={submitting || (!body && !mediaUrl)}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Envoi…" : "Publier"}
        </button>
      </form>
    </div>
  )
}
