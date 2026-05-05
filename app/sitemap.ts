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

  // Get all clubs
  const { data: clubs } = await supabase.from("clubs").select("slug, created_at").eq("is_active", true)

  const eventUrls =
    events?.map((event) => ({
      url: `${baseUrl}/agenda/${event.slug}`,
      lastModified: event.updated_at ? new Date(event.updated_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })) || []

  const clubUrls =
    clubs?.map((club) => ({
      url: `${baseUrl}/clubs/${club.slug}`,
      lastModified: club.created_at ? new Date(club.created_at) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
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
    ...clubUrls,
  ]
}
