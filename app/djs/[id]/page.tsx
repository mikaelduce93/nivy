import { notFound } from "next/navigation"

export default async function DJProfilePage({ params }: { params: Promise<{ id: string }> }) {
  // The `djs` table was dropped from the live database (no `djs` relation nor any
  // of its columns — stage_name, photo_url, hourly_rate, video_urls… — exist in the
  // regenerated Supabase types). The previous query `.from("djs")…single()` returned
  // an error, so `dj` was always null and this page already 404'd on every visit.
  // Kept as a stub matching that observable behavior until the DJ feature is rebuilt
  // against a real table.
  await params
  notFound()
}
