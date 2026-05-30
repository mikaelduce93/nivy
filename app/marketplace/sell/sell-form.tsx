"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { ImagePlus, X, AlertTriangle } from "lucide-react"

import { FieldInput } from "@/components/ui/field-input"
import { Button } from "@/components/ui/button"

const CATEGORIES = [
  "clothing","books","school","sport","gaming","art","crafts","tickets","services","other",
] as const

const CONDITIONS = ["new","like_new","good","fair","poor"] as const

// Libellés FR (présentation) — les `value` envoyés au POST restent les slugs.
const CATEGORY_LABELS: Record<string, string> = {
  clothing: "Vêtements",
  books: "Livres",
  school: "Scolaire",
  sport: "Sport",
  gaming: "Gaming",
  art: "Art",
  crafts: "Fait main",
  tickets: "Billets",
  services: "Services",
  other: "Autre",
}

const CONDITION_LABELS: Record<string, string> = {
  new: "Neuf",
  like_new: "Comme neuf",
  good: "Bon état",
  fair: "Correct",
  poor: "Usé",
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function SellForm() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [images, setImages] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const urls = await Promise.all(Array.from(files).map(readFileAsDataUrl))
    setImages((prev) => [...prev, ...urls].slice(0, 5))
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    const fd = new FormData(e.currentTarget)
    const body = {
      title: String(fd.get("title") ?? ""),
      description: String(fd.get("description") ?? ""),
      category: String(fd.get("category") ?? "other"),
      price_coins: Number(fd.get("price_coins") ?? 0),
      condition: String(fd.get("condition") ?? "good"),
      brand: String(fd.get("brand") ?? ""),
      size: String(fd.get("size") ?? ""),
      color: String(fd.get("color") ?? ""),
      city: String(fd.get("city") ?? ""),
      neighborhood: String(fd.get("neighborhood") ?? ""),
      images,
    }
    const res = await fetch("/api/marketplace/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    setBusy(false)
    if (!json.success) {
      setErr(json.error ?? "unknown_error")
      return
    }
    router.push("/marketplace/my-listings")
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Zone photos — carte sticker pointillée */}
      <div className="flex flex-col gap-2">
        <span className="eyebrow tracking-[0.16em]">Photos</span>
        <div className="rounded-2xl border-2 border-dashed border-ink bg-white p-4">
          {images.length > 0 ? (
            <div className="mb-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
              {images.map((src, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-xl border-2 border-ink bg-paper-2">
                  <Image src={src} alt={`Photo ${i + 1}`} fill className="object-cover" unoptimized />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute right-1 top-1 grid size-6 place-items-center rounded-full border-2 border-ink bg-white text-ink"
                    aria-label={`Retirer la photo ${i + 1}`}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-xl py-6 text-center transition-colors hover:bg-paper-2"
          >
            <span className="grid size-12 place-items-center rounded-xl border-2 border-ink bg-pink/20">
              <ImagePlus className="size-6 text-ink" aria-hidden="true" />
            </span>
            <span className="font-display font-bold text-ink">Ajoute tes photos</span>
            <span className="font-mono text-xs uppercase tracking-[0.1em] text-mute">5 photos max</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => onFiles(e.target.files)}
          />
        </div>
      </div>

      <FieldInput
        name="title"
        label="Titre"
        required
        minLength={3}
        maxLength={120}
        placeholder="Ex : Sweat oversize à capuche"
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="sell-description" className="eyebrow tracking-[0.16em]">Description</label>
        <textarea
          id="sell-description"
          name="description"
          rows={4}
          placeholder="Décris ton article (sans coordonnées)"
          className="w-full resize-y rounded-xl border-2 border-input bg-white px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-mute focus:border-ink"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="sell-category" className="eyebrow tracking-[0.16em]">Catégorie</label>
          <select
            id="sell-category"
            name="category"
            required
            className="h-11 rounded-xl border-2 border-input bg-white px-3.5 text-sm font-medium text-ink outline-none transition-colors focus:border-ink"
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="sell-condition" className="eyebrow tracking-[0.16em]">État</label>
          <select
            id="sell-condition"
            name="condition"
            className="h-11 rounded-xl border-2 border-input bg-white px-3.5 text-sm font-medium text-ink outline-none transition-colors focus:border-ink"
          >
            {CONDITIONS.map((c) => <option key={c} value={c}>{CONDITION_LABELS[c] ?? c}</option>)}
          </select>
        </div>

        <FieldInput
          name="price_coins"
          type="number"
          min={1}
          required
          label="Prix"
          prefix="⊙"
          placeholder="coins"
          hint="100 coins = 1 DH"
        />
        <FieldInput name="brand" label="Marque" placeholder="Optionnel" />
        <FieldInput name="size" label="Taille" placeholder="Optionnel" />
        <FieldInput name="color" label="Couleur" placeholder="Optionnel" />
        <FieldInput name="city" label="Ville" placeholder="Casablanca…" />
        <FieldInput name="neighborhood" label="Quartier" placeholder="Optionnel" />
      </div>

      {err && (
        <div className="flex items-start gap-3 rounded-2xl border-2 border-ink bg-coral/15 p-4 shadow-stkr-sm">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-coral" aria-hidden="true" />
          <p className="text-sm font-medium text-ink">
            Impossible de publier l&apos;annonce. Code : <span className="font-mono">{err}</span>
          </p>
        </div>
      )}

      <Button type="submit" disabled={busy} variant="pink" size="lg" className="w-full shadow-stkr-md">
        {busy ? "Envoi…" : "Publier l'annonce"}
      </Button>
    </form>
  )
}
