import type { MetadataRoute } from "next"
import { getAppUrl } from "@/lib/config/app-config"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/admin/", "/profile/", "/reservation/", "/mes-reservations/"],
      },
    ],
    sitemap: `${getAppUrl()}/sitemap.xml`,
  }
}
