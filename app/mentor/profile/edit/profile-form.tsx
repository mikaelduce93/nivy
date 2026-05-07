"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Save } from "lucide-react"

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
            placeholder="Parlez de votre parcours, vos domaines, ce que vous aimez transmettre…"
            className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50"
          />
        </Field>

        <Field
          label="Expertises"
          hint="Séparez par des virgules. Exemples: medicine, coding, music_oud, art_drawing."
        >
          <input
            type="text"
            value={expertiseInput}
            onChange={(e) => setExpertiseInput(e.target.value)}
            placeholder="medicine, coding, football"
            className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50"
          />
        </Field>

        <Field label="Lien vidéo d'intro (optionnel)">
          <input
            type="url"
            value={introUrl}
            onChange={(e) => setIntroUrl(e.target.value)}
            placeholder="https://…"
            className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50"
          />
        </Field>

        <Field label="Années d'expérience">
          <input
            type="number"
            min={0}
            value={yearsXp}
            onChange={(e) => setYearsXp(e.target.value)}
            className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50"
          />
        </Field>
      </Section>

      <Section title="Tarification">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Tarif horaire (DH)">
            <input
              type="number"
              min={0}
              step="0.01"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50"
            />
          </Field>

          <Field label="Session d'intro gratuite">
            <label className="flex items-center gap-3 h-[46px] px-4 rounded-2xl border border-white/10 bg-zinc-950 cursor-pointer">
              <input
                type="checkbox"
                checked={freeIntro}
                onChange={(e) => setFreeIntro(e.target.checked)}
                className="h-4 w-4 accent-purple-500"
              />
              <span className="text-sm text-zinc-300">Offrir la première session</span>
            </label>
          </Field>
        </div>
      </Section>

      <Section title="Tranche d'âge des mentees">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Âge min" hint="13 minimum (T&S)">
            <input
              type="number"
              min={13}
              max={17}
              value={ageMin}
              onChange={(e) => setAgeMin(e.target.value)}
              className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50"
            />
          </Field>

          <Field label="Âge max" hint="17 maximum">
            <input
              type="number"
              min={13}
              max={17}
              value={ageMax}
              onChange={(e) => setAgeMax(e.target.value)}
              className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50"
            />
          </Field>
        </div>
      </Section>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}
      {okMsg && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          {okMsg}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-black font-black hover:bg-zinc-200 disabled:opacity-60"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Enregistrer
        </button>
      </div>
    </form>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/5 bg-zinc-900/40 p-6 space-y-4">
      <h2 className="text-lg font-black tracking-tight">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
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
      <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-zinc-500">{hint}</p>}
    </div>
  )
}
