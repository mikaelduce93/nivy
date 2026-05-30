/**
 * /dev/kit — galerie du design system handoff (V2 / F12).
 *
 * Une section par primitive F1–F11, chacune **important** la brique livrée
 * (aucune réimplémentation locale). Scaffold à la charte (paper/ink, Bricolage,
 * eyebrows mono). Dev-only : `notFound()` en production, hors sitemap, non linké.
 */

import { notFound } from "next/navigation"

import { KitGallery } from "./kit-client"

export const dynamic = "force-dynamic"

export default function KitPage() {
  if (process.env.NODE_ENV === "production") {
    notFound()
  }
  return <KitGallery />
}
