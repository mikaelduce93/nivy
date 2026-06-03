"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Save, Check } from "lucide-react"
import { FieldInput } from "@/components/ui/field-input"
import { CheckRound } from "@/components/ui/check-round"
import { StickerCard } from "@/components/ui/sticker-card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Catalogue d'expertises : libellé FR ↔ tag stocké (compat des valeurs en base).
const EXPERTISE_OPTIONS: { value: string; label: string }[] = [
  { value: "medicine", label: "Médecine" },
  { value: "coding", label: "Code" },
  { value: "music_oud", label: "Oud" },
  { value: "art_drawing", label: "Dessin" },
  { value: "football", label: "Foot" },
  { value: "math", label: "Maths" },
  { value: "languages", label: "Langues" },
  { value: "entrepreneurship", label: "Entrepreneuriat" },
  { value: "design", label: "Design" },
  { value: "science", label: "Sciences" },
]

export type MentorProfile = {
  id: string
  expertise_tags: string[] | null
  years_experience: number | null
  bio: string | null
  intro_video_url: string | null
  hourly_rate_dh: number | null
  free_intro_session: boolean | null
  age_min_mentee: number | null
  age_max_mentee: number | null
  rating: number | null
  sessions_count: number | null
  status: string | null
  kyc_status: string | null
}

export function MentorProfileForm({ profile }: { profile: MentorProfile }) {
  const router = useRouter()
  const [bio, setBio] = useState(profile.bio ?? "")
  const [expertiseInput, setExpertiseInput] = useState(
    (profile.expertise_tags ?? []).join(", "),
  )
  const [hourlyRate, setHourlyRate] = useState(String(profile.hourly_rate_dh ?? 0))
  const [freeIntro, setFreeIntro] = useState(profile.free_intro_session ?? true)
  const [ageMin, setAgeMin] = useState(String(profile.age_min_mentee ?? 13))
  const [ageMax, setAgeMax] = useState(String(profile.age_max_mentee ?? 17))
  const [yearsXp, setYearsXp] = useState(String(profile.years_experience ?? 0))
  const [introUrl, setIntroUrl] = useState(profile.intro_video_url ?? "")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  // Tags actuellement sélectionnés (dérivés de la même source `expertiseInput`).
  const selectedTags = expertiseInput
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)

  const toggleExpertise = (value: string) => {
    const next = selectedTags.includes(value)
      ? selectedTags.filter((t) => t !== value)
      : [...selectedTags, value]
    setExpertiseInput(next.join(", "))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setOkMsg(null)

    const expertise_tags = expertiseInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)

    try {
      const res = await fetch("/api/mentor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: bio || null,
          expertise_tags,
          hourly_rate_dh: Number(hourlyRate),
          free_intro_session: freeIntro,
          age_min_mentee: Number(ageMin),
          age_max_mentee: Number(ageMax),
          years_experience: Number(yearsXp),
          intro_video_url: introUrl || null,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json?.success) {
        setError(json?.error || "Échec de la mise à jour.")
      } else {
        setOkMsg("Profil mis à jour.")
        router.refresh()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Section title="Présentation">
        <Field label="Bio">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={5}
            placeholder="Parle de ton parcours, tes domaines, ce que tu aimes transmettre…"
            className="w-full rounded-xl border-2 border-input bg-white px-4 py-3 text-sm text-ink placeholder:text-mute outline-none transition-colors focus:border-ink"
          />
        </Field>

        <Field
          label="Expertises"
          hint="Choisis tes domaines : ils s'affichent sur ta fiche mentor."
        >
          <div className="flex flex-wrap gap-2">
            {EXPERTISE_OPTIONS.map((opt) => {
              const active = selectedTags.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleExpertise(opt.value)}
                  className={cn(
                    "min-h-touch rounded-full border-2 border-ink px-3.5 py-1.5 font-mono text-xs font-bold uppercase tracking-[0.08em] transition-all",
                    active
                      ? "-translate-x-0.5 -translate-y-0.5 bg-ink text-paper shadow-stkr-pink motion-reduce:translate-x-0 motion-reduce:translate-y-0"
                      : "bg-white text-ink hover:bg-paper-2",
                  )}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </Field>

        <FieldInput
          type="url"
          label="Lien vidéo d'intro (optionnel)"
          value={introUrl}
          onChange={(e) => setIntroUrl(e.target.value)}
          placeholder="https://…"
        />

        <FieldInput
          type="number"
          min={0}
          label="Années d'expérience"
          value={yearsXp}
          onChange={(e) => setYearsXp(e.target.value)}
        />
      </Section>

      <Section title="Tarification">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FieldInput
            type="number"
            min={0}
            step="0.01"
            label="Tarif horaire (DH)"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
          />

          <Field label="Session d'intro gratuite">
            <CheckRound
              checked={freeIntro}
              onCheckedChange={(v) => setFreeIntro(v === true)}
              label="Offrir la première session"
            />
          </Field>
        </div>
      </Section>

      <Section title="Tranche d'âge des mentees">
        <div className="grid grid-cols-2 gap-4">
          <FieldInput
            type="number"
            min={13}
            max={17}
            label="Âge min"
            hint="13 minimum"
            value={ageMin}
            onChange={(e) => setAgeMin(e.target.value)}
          />

          <FieldInput
            type="number"
            min={13}
            max={17}
            label="Âge max"
            hint="17 maximum"
            value={ageMax}
            onChange={(e) => setAgeMax(e.target.value)}
          />
        </div>
      </Section>

      {error && (
        <div className="rounded-2xl border-2 border-coral bg-coral/10 p-4 text-sm font-medium text-coral">
          {error}
        </div>
      )}
      {okMsg && (
        <div className="flex items-center gap-3 rounded-2xl border-2 border-lime bg-lime/10 p-4">
          <span className="grid size-6 shrink-0 place-items-center rounded-full border-2 border-lime bg-lime">
            <Check className="size-3.5 text-ink" strokeWidth={3} aria-hidden="true" />
          </span>
          <p className="text-sm font-bold text-ink">{okMsg}</p>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" variant="pink" disabled={submitting}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Enregistrer
        </Button>
      </div>
    </form>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <StickerCard className="gap-4 p-6">
      <h2 className="font-display text-lg font-extrabold tracking-tight">{title}</h2>
      <div className="space-y-4">{children}</div>
    </StickerCard>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="eyebrow tracking-[0.16em]">{label}</label>
      {children}
      {hint && <p className="text-xs text-mute">{hint}</p>}
    </div>
  )
}
