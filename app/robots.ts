import type { MetadataRoute } from "next"
import { getAppUrl } from "@/lib/config/app-config"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Block authenticated surfaces from crawl (Wave D.6).
        disallow: [
          "/api/",
          "/admin/",
          "/dashboard/",
          "/profile/",
          "/teen/",
          "/parent/",
          "/partner/",
          "/ambassador/",
          "/mentor/",
          "/driver/",
          "/onboarding/",
          "/reservation/",
          "/mes-reservations/",
          "/auth/",
        ],
      },
    ],
    sitemap: `${getAppUrl()}/sitemap.xml`,
  }
}
