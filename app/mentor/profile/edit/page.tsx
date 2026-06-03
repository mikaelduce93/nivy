import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Niv, NivCoach } from "@/components/brand"
import { MentorProfileForm, type MentorProfile } from "./profile-form"

const STATUS_FR: Record<string, string> = {
  active: "Actif",
  pending: "En attente",
  suspended: "Suspendu",
  denied: "Refusé",
}
const KYC_FR: Record<string, string> = {
  approved: "Vérifié",
  pending: "En cours",
  rejected: "Refusé",
}

export default async function MentorProfileEditPage() {
  const userInfo = await getUserRole()
  if (!userInfo) redirect("/auth/login")
  if (userInfo.role !== "mentor") redirect("/auth/redirect")

  const supabase = await createClient()
  const { data } = await supabase
    .from("mentors")
    .select(`
      id, expertise_tags, years_experience, bio, intro_video_url,
      hourly_rate_dh, free_intro_session, status, kyc_status,
      age_min_mentee, age_max_mentee, rating, sessions_count
    `)
    .eq("user_id", userInfo.profileId)
    .limit(1)
    .maybeSingle()

  return (
    <div className="min-h-screen bg-background text-ink -m-4 md:-m-8 lg:-m-10 p-4 md:p-8 lg:p-10 -mt-24 pt-24">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="flex items-start gap-4 border-b border-ink pb-6">
          <Niv mood="happy" size={72} className="hidden shrink-0 sm:block" />
          <div>
            <p className="eyebrow tracking-[0.16em] text-pink">Profil mentor</p>
            <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
              Ta <em className="font-semibold italic text-pink">vitrine</em> mentor
            </h1>
            <p className="mt-2 text-mute">
              Bio, expertises, tarif et tranche d&apos;âge de tes mentees.
            </p>
          </div>
        </header>

        {!data ? (
          <NivCoach
            mood="calm"
            message="Aucune fiche mentor n'existe encore pour ce compte. Contacte le support pour lancer ta candidature."
          />
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Stat label="Statut" value={STATUS_FR[data.status ?? ""] ?? data.status ?? "En attente"} accent="text-gold" />
              <Stat label="KYC" value={KYC_FR[data.kyc_status ?? ""] ?? data.kyc_status ?? "En cours"} accent="text-teal" />
              <Stat
                label="Note"
                value={data.rating != null ? `${Number(data.rating).toFixed(1)} / 5` : "—"}
                accent="text-pink"
              />
            </div>

            <NivCoach
              mood="proud"
              message="Une bio béton + une vidéo d'intro = 2x plus de bookings, akhouya. Soigne-les."
            />

            <MentorProfileForm profile={data as MentorProfile} />
          </>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl border-2 border-line bg-paper-2 px-4 py-2.5">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-mute">{label}</p>
      <p className={`mt-0.5 font-display text-sm font-extrabold ${accent}`}>{value}</p>
    </div>
  )
}
