import type { MetadataRoute } from "next"
import { createClient } from "@/lib/supabase/server"
import { getAppUrl } from "@/lib/config/app-config"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()
  const baseUrl = getAppUrl()

  // Get all events
  const { data: events } = await supabase
    .from("events")
    .select("slug, updated_at")
    .gte("event_date", new Date().toISOString())
    .order("event_date")

  // Wave 6E — clubs detail URLs dropped from the sitemap. The legacy
  // `clubs` table is deprecated (PGRST205 in prod) and the canonical
  // `sport_clubs` table has no slug column → no /clubs/[slug] surface
  // is wired (the route is now a permanentRedirect to /clubs). Emitting
  // those URLs would point search engines at a 308 chain. The /clubs
  // index URL stays in the static list below.

  const eventUrls =
    events?.map((event) => ({
      url: `${baseUrl}/agenda/${event.slug}`,
      lastModified: event.updated_at ? new Date(event.updated_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })) || []

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/agenda`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/clubs`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/carte-vip`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/devenir-ambassadeur`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/devenir-partenaire`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/communaute`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/legal/confidentialite`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/legal/cgu`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/legal/mentions-legales`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...eventUrls,
  ]
}
