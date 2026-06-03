import type { MetadataRoute } from "next"

// Single source of truth for the PWA manifest. public/manifest.json was
// removed in Wave D.4 (collision: Next would generate /manifest.webmanifest
// from this dynamic file AND statically serve public/manifest.json with
// stale "Teens Party Morocco" branding).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NIVY",
    short_name: "NIVY",
    description: "Le 1er écosystème lifestyle et gamification pour les 13-17 ans au Maroc",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#06b6d4",
    orientation: "portrait-primary",
    scope: "/",
    lang: "fr",
    dir: "ltr",
    categories: ["lifestyle", "education", "social"],
    // Référence uniquement des icônes réellement présentes dans public/icons
    // (les tailles 72/96/128/144/384 n'existent pas et renvoyaient 404).
    icons: [
      { src: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcuts: [
      {
        name: "Quiz du jour",
        short_name: "Quiz",
        description: "Le quiz adapté à ton profil",
        url: "/teen/quiz",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Wallet",
        short_name: "Wallet",
        description: "XP, coins, shop partenaires",
        url: "/teen/wallet",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Quests",
        short_name: "Quests",
        description: "Tes missions du jour",
        url: "/teen/quests",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
    ],
  }
}
