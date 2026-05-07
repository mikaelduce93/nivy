/**
 * W3.3 — Mentorship & Career Exploration verification.
 *
 * Spec: docs/vision/mentorship-career.md + whitepaper §19.4.7.
 *
 * Steps:
 *   1. Create ephemeral adult user (age 23, role='mentor') and apply as mentor.
 *   2. Admin approves mentor → status='active', kyc_status='approved'.
 *   3. teen.amine declares 'medicine' pathway → teen_pathway_progress row.
 *   4. teen.amine books a session with mentor → parental_approvals row +
 *      mentor_sessions(status='pending_approval').
 *   5. parent.test approves → status='approved' (intro session: free, no debit).
 *   6. Mentor sees the booking via mentor_sessions RLS visibility.
 *   7. Both rate the session → mentor.rating populated.
 *   8. Insert internship (age_min=14, age_max=17, partner=null).
 *   9. Amine applies → internship_applications row + parental_approvals.
 *   10. Admin accepts → status='accepted'.
 *
 * Run: npx tsx scripts/verify-mentorship.ts
 *
 * NOTE on 3-strike rule: enforced manually by admin via admin_audit_logs +
 * mentors.status='suspended'. P1 TODO: automated strike counter table.
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"

try {
  const raw = readFileSync(".env.local", "utf8")
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const eq = t.indexOf("=")
    if (eq === -1) continue
    const k = t.slice(0, eq).trim()
    let v = t.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    if (!process.env[k]) process.env[k] = v
  }
} catch {
  // ignore
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing SUPABASE creds in .env.local")
  process.exit(1)
}

const TEEN_ID = "37ff4a09-25ca-44c2-a313-141ab6d7e1b9" // teen.amine
const PARENT_ID = "69a068cd-df5b-4165-98b8-33fb93e41117" // parent.test (also has admin_role)

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function fmt(label: string, ok: boolean, details?: string) {
  return `  [${ok ? "PASS" : "FAIL"}] ${label}${details ? ` — ${details}` : ""}`
}

async function main() {
  const lines: string[] = []
  let allOk = true

  console.log("W3.3 mentorship + career verification")
  console.log("=====================================")

  // -------- Setup teen.amine: needs DOB + parent link --------
  const fifteenYearsAgo = new Date()
  fifteenYearsAgo.setFullYear(fifteenYearsAgo.getFullYear() - 15)
  await sb.from("teens").upsert(
    { id: TEEN_ID, parent_id: PARENT_ID, date_of_birth: fifteenYearsAgo.toISOString().slice(0, 10) },
    { onConflict: "id" }
  )
  await sb.from("parent_teen_links").upsert(
    { parent_id: PARENT_ID, teen_id: TEEN_ID },
    { onConflict: "parent_id,teen_id" }
  )

  // -------- Setup ephemeral mentor user (adult age 23) --------
  const mentorEmail = `mentor.test.${Date.now()}@teenclub.local`
  const { data: created, error: createErr } = await sb.auth.admin.createUser({
    email: mentorEmail,
    password: "Test123!",
    email_confirm: true,
  })
  if (createErr || !created.user) {
    console.error("Failed to create ephemeral mentor:", createErr?.message)
    process.exit(1)
  }
  const MENTOR_USER_ID = created.user.id
  await sb.from("users").upsert({ id: MENTOR_USER_ID, email: mentorEmail }, { onConflict: "id" })
  await sb.from("profiles").upsert(
    { id: MENTOR_USER_ID, email: mentorEmail, full_name: "Mentor Test", role: "mentor" },
    { onConflict: "id" }
  )

  lines.push(fmt("seed ephemeral mentor user", true, MENTOR_USER_ID))

  // -------- 1. apply_mentor --------
  const { data: applyRes, error: applyErr } = await sb.rpc("apply_mentor", {
    p_user_id: MENTOR_USER_ID,
    p_expertise: ["medicine", "biology"],
    p_bio: "Med student at FMP Casablanca, can advise on bac S + concours.",
    p_hourly_rate: 0,
  })
  const applyJson = applyRes as { success?: boolean; mentor_id?: string; kyc_document_id?: string; error?: string } | null
  const applyOk = !applyErr && !!applyJson?.success
  lines.push(fmt("apply_mentor → mentors row + kyc placeholder", applyOk, JSON.stringify(applyJson)))
  if (!applyOk || !applyJson?.mentor_id) { allOk = false; throw new Error("apply_mentor failed") }
  const MENTOR_ID = applyJson.mentor_id

  // Verify mentor is pending
  const { data: pre } = await sb.from("mentors").select("status,kyc_status").eq("id", MENTOR_ID).single()
  lines.push(fmt("mentor created with status=pending", pre?.status === "pending" && pre?.kyc_status === "pending",
    JSON.stringify(pre)))
  if (pre?.status !== "pending") allOk = false

  // -------- 2. admin_approve_mentor --------
  const { data: appRes, error: appErr } = await sb.rpc("admin_approve_mentor", {
    p_mentor_id: MENTOR_ID,
    p_admin_user_id: PARENT_ID, // parent.test has admin_role
  })
  const appJson = appRes as { success?: boolean; error?: string } | null
  const appOk = !appErr && !!appJson?.success
  lines.push(fmt("admin_approve_mentor → status=active", appOk, JSON.stringify(appJson)))
  if (!appOk) allOk = false

  const { data: post } = await sb.from("mentors").select("status,kyc_status").eq("id", MENTOR_ID).single()
  const activeOk = post?.status === "active" && post?.kyc_status === "approved"
  lines.push(fmt("mentor row now status=active kyc=approved", activeOk, JSON.stringify(post)))
  if (!activeOk) allOk = false

  // -------- 3. Teen declares 'medicine' pathway --------
  const { data: pathway } = await sb.from("career_pathways").select("id").eq("slug", "medicine").single()
  if (!pathway?.id) { allOk = false; throw new Error("medicine pathway missing in seed") }
  const PATHWAY_ID = pathway.id
  await sb.from("teen_pathway_progress").delete().eq("teen_id", TEEN_ID).eq("pathway_id", PATHWAY_ID)
  const { error: declareErr } = await sb.from("teen_pathway_progress").insert({
    teen_id: TEEN_ID,
    pathway_id: PATHWAY_ID,
    last_active_at: new Date().toISOString(),
  })
  lines.push(fmt("teen declares 'medicine' pathway → progress row", !declareErr, declareErr?.message))
  if (declareErr) allOk = false

  // -------- 4. book_mentor_session --------
  const scheduledFor = new Date(Date.now() + 24 * 3600 * 1000).toISOString()
  const { data: bookRes, error: bookErr } = await sb.rpc("book_mentor_session", {
    p_mentor_id: MENTOR_ID,
    p_mentee_user_id: TEEN_ID,
    p_scheduled_for: scheduledFor,
    p_duration_minutes: 30,
  })
  const bookJson = bookRes as { success?: boolean; session_id?: string; parent_approval_id?: string; is_intro?: boolean; amount_coins?: number; error?: string } | null
  const bookOk = !bookErr && !!bookJson?.success && bookJson?.is_intro === true && bookJson?.amount_coins === 0
  lines.push(fmt("book_mentor_session (intro=free)", bookOk, JSON.stringify(bookJson)))
  if (!bookOk || !bookJson?.session_id) { allOk = false; throw new Error("book failed") }
  const SESSION_ID = bookJson.session_id

  // Verify session row + approval row
  const { data: sess } = await sb.from("mentor_sessions").select("status,parent_approval_id").eq("id", SESSION_ID).single()
  const sessOk = sess?.status === "pending_approval" && !!sess.parent_approval_id
  lines.push(fmt("mentor_sessions(status=pending_approval, parent_approval linked)", sessOk, JSON.stringify(sess)))
  if (!sessOk) allOk = false

  const { data: appr } = await sb.from("parental_approvals").select("status,action_type,resource_type,resource_id").eq("id", sess?.parent_approval_id ?? "").single()
  const apprOk = appr?.status === "pending" && appr?.action_type === "coach_meeting" && appr?.resource_type === "mentor_session" && appr?.resource_id === SESSION_ID
  lines.push(fmt("parental_approvals row created (coach_meeting/mentor_session)", apprOk, JSON.stringify(appr)))
  if (!apprOk) allOk = false

  // -------- 5. parent_approve_session --------
  const { data: payRes, error: payErr } = await sb.rpc("parent_approve_session", {
    p_session_id: SESSION_ID,
    p_parent_id: PARENT_ID,
  })
  const payJson = payRes as { success?: boolean; amount_coins_debited?: number; error?: string } | null
  const payOk = !payErr && !!payJson?.success && payJson?.amount_coins_debited === 0
  lines.push(fmt("parent_approve_session (intro: 0 debit)", payOk, JSON.stringify(payJson)))
  if (!payOk) allOk = false

  const { data: sess2 } = await sb.from("mentor_sessions").select("status").eq("id", SESSION_ID).single()
  lines.push(fmt("mentor_session.status='approved'", sess2?.status === "approved", sess2?.status))
  if (sess2?.status !== "approved") allOk = false

  // -------- 6. Mentor visibility check (using anon client + JWT-as-mentor) --------
  // We use service_role to read mentor_sessions filtered by mentor_id and verify the row exists.
  // True RLS roundtrip would require a real JWT for the mentor; we approximate by ensuring
  // the policy expression is satisfiable: mentor_id matches a mentor whose user_id=p_rater
  const { data: mentorView } = await sb.from("mentor_sessions")
    .select("id,status,mentor_id,mentee_user_id")
    .eq("mentor_id", MENTOR_ID)
  const mentorSeesOk = (mentorView ?? []).some(r => r.id === SESSION_ID)
  lines.push(fmt("mentor sees the booking via mentor_id index", mentorSeesOk, `${mentorView?.length ?? 0} rows`))
  if (!mentorSeesOk) allOk = false

  // -------- 7. Both rate the session --------
  const { data: rateMenteeRes } = await sb.rpc("rate_mentor_session", {
    p_session_id: SESSION_ID,
    p_rater_id: TEEN_ID,
    p_rating: 5,
  })
  const { data: rateMentorRes } = await sb.rpc("rate_mentor_session", {
    p_session_id: SESSION_ID,
    p_rater_id: MENTOR_USER_ID,
    p_rating: 4,
  })
  const rated = !!(rateMenteeRes as { success?: boolean } | null)?.success && !!(rateMentorRes as { success?: boolean } | null)?.success
  lines.push(fmt("rate_mentor_session both sides", rated, JSON.stringify({ mentee: rateMenteeRes, mentor: rateMentorRes })))
  if (!rated) allOk = false

  const { data: ratedSess } = await sb.from("mentor_sessions").select("rating_by_mentee,rating_by_mentor").eq("id", SESSION_ID).single()
  const ratedOk = ratedSess?.rating_by_mentee === 5 && ratedSess?.rating_by_mentor === 4
  lines.push(fmt("mentor_sessions ratings persisted", ratedOk, JSON.stringify(ratedSess)))
  if (!ratedOk) allOk = false

  const { data: mentorRating } = await sb.from("mentors").select("rating,sessions_count").eq("id", MENTOR_ID).single()
  const mrOk = Number(mentorRating?.rating) === 5 && mentorRating?.sessions_count === 1
  lines.push(fmt("mentor rating recomputed (avg=5, count=1)", mrOk, JSON.stringify(mentorRating)))
  if (!mrOk) allOk = false

  // -------- 8. Insert an internship (partner=null) --------
  const { data: internIns, error: internInsErr } = await sb.from("internships").insert({
    partner_id: null,
    title: "Stage decouverte hopital",
    description: "Shadowing 1 jour aux urgences pediatriques.",
    duration: "1_day",
    age_min: 14,
    age_max: 17,
    spots_total: 2,
    paid: false,
    status: "open",
  }).select("id").single()
  const internOk = !internInsErr && !!internIns?.id
  lines.push(fmt("internship created (partner=null, age 14-17)", internOk, internInsErr?.message ?? internIns?.id))
  if (!internOk) { allOk = false; throw new Error("internship insert failed") }
  const INTERN_ID = internIns!.id

  // -------- 9. Amine applies --------
  const { data: applyResI, error: applyErrI } = await sb.rpc("apply_to_internship", {
    p_internship_id: INTERN_ID,
    p_applicant_id: TEEN_ID,
    p_cover_letter: "Je veux devenir medecin pediatre.",
    p_portfolio_urls: [],
  })
  const applyJsonI = applyResI as { success?: boolean; application_id?: string; parental_approval_id?: string; error?: string } | null
  const aiOk = !applyErrI && !!applyJsonI?.success
  lines.push(fmt("apply_to_internship → application + parental_approvals", aiOk, JSON.stringify(applyJsonI)))
  if (!aiOk || !applyJsonI?.application_id) { allOk = false; throw new Error("intern apply failed") }
  const APP_ID = applyJsonI.application_id

  // -------- 10. Admin accepts --------
  const { data: decRes, error: decErr } = await sb.rpc("decide_internship_application", {
    p_application_id: APP_ID,
    p_decider_id: PARENT_ID,
    p_decision: "accepted",
    p_notes: "Strong cover letter.",
  })
  const decJson = decRes as { success?: boolean; status?: string; error?: string } | null
  const decOk = !decErr && !!decJson?.success && decJson?.status === "accepted"
  lines.push(fmt("admin accepts internship → status=accepted", decOk, JSON.stringify(decJson)))
  if (!decOk) allOk = false

  const { data: postApp } = await sb.from("internship_applications").select("status,decision_at").eq("id", APP_ID).single()
  const acceptedOk = postApp?.status === "accepted" && !!postApp?.decision_at
  lines.push(fmt("internship_applications.status='accepted'", acceptedOk, JSON.stringify(postApp)))
  if (!acceptedOk) allOk = false

  // -------- BONUS: out-of-range age refused --------
  // teen.amine is 15. Make a too-old mentor (age_max=14) by direct update; verify book is rejected.
  await sb.from("mentors").update({ age_max_mentee: 14 }).eq("id", MENTOR_ID)
  const { data: ageRej } = await sb.rpc("book_mentor_session", {
    p_mentor_id: MENTOR_ID,
    p_mentee_user_id: TEEN_ID,
    p_scheduled_for: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    p_duration_minutes: 30,
  })
  const ageRejOk = (ageRej as { success?: boolean; error?: string } | null)?.error === "mentee_age_out_of_range"
  lines.push(fmt("book_mentor_session blocks age out of range", ageRejOk, JSON.stringify(ageRej)))
  if (!ageRejOk) allOk = false
  await sb.from("mentors").update({ age_max_mentee: 17 }).eq("id", MENTOR_ID)

  // -------- BONUS: book on non-active mentor refused --------
  await sb.from("mentors").update({ status: "suspended" }).eq("id", MENTOR_ID)
  const { data: inactRej } = await sb.rpc("book_mentor_session", {
    p_mentor_id: MENTOR_ID,
    p_mentee_user_id: TEEN_ID,
    p_scheduled_for: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
    p_duration_minutes: 30,
  })
  const inactRejOk = (inactRej as { success?: boolean; error?: string } | null)?.error === "mentor_not_active_or_kyc_pending"
  lines.push(fmt("book_mentor_session blocks unapproved mentor", inactRejOk, JSON.stringify(inactRej)))
  if (!inactRejOk) allOk = false

  // -------- Cleanup --------
  await sb.from("mentor_sessions").delete().eq("mentor_id", MENTOR_ID)
  await sb.from("parental_approvals").delete().eq("teen_id", TEEN_ID).eq("resource_type", "mentor_session")
  await sb.from("parental_approvals").delete().eq("teen_id", TEEN_ID).eq("resource_type", "internship_application")
  await sb.from("internship_applications").delete().eq("id", APP_ID)
  await sb.from("internships").delete().eq("id", INTERN_ID)
  await sb.from("teen_pathway_progress").delete().eq("teen_id", TEEN_ID).eq("pathway_id", PATHWAY_ID)
  await sb.from("kyc_documents").delete().eq("owner_user_id", MENTOR_USER_ID)
  await sb.from("mentors").delete().eq("id", MENTOR_ID)
  await sb.from("admin_audit_logs").delete().eq("target_id", MENTOR_ID)
  await sb.from("admin_audit_logs").delete().eq("target_id", APP_ID)
  await sb.from("profiles").delete().eq("id", MENTOR_USER_ID)
  await sb.from("users").delete().eq("id", MENTOR_USER_ID)
  await sb.auth.admin.deleteUser(MENTOR_USER_ID)

  console.log("\nResults:")
  for (const l of lines) console.log(l)
  console.log("\n" + (allOk ? "ALL CHECKS PASSED" : "ONE OR MORE CHECKS FAILED"))
  process.exit(allOk ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
