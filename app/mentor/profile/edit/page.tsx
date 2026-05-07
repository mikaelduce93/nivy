import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { MentorProfileForm, type MentorProfile } from "./profile-form"

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
    <div className="min-h-screen bg-[#030303] text-white -m-4 md:-m-8 lg:-m-10 p-4 md:p-8 lg:p-10 -mt-24 pt-24">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="border-b border-white/5 pb-6">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter">Mon profil mentor</h1>
          <p className="text-zinc-400 mt-2">
            Bio, expertises, tarification et tranche d'âge des mentees.
          </p>
        </header>

        {!data ? (
          <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-100">
            Aucune fiche mentor n'existe encore pour ce compte. Contactez un administrateur ou
            lancez une candidature via <code>/api/mentor/apply</code>.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Statut" value={data.status || "pending"} />
              <Stat label="KYC" value={data.kyc_status || "pending"} />
              <Stat
                label="Note"
                value={data.rating != null ? `${Number(data.rating).toFixed(1)} / 5` : "—"}
              />
            </div>
            <MentorProfileForm profile={data as MentorProfile} />
          </>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-zinc-900/40 px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="text-sm font-black text-white mt-1 truncate">{value}</p>
    </div>
  )
}
