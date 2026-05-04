import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/admin/", "/profile/", "/reservation/", "/mes-reservations/"],
      },
    ],
    sitemap: "https://teensparty.ma/sitemap.xml",
  }
}
