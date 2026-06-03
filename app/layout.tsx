import type React from "react"
import type { Metadata, Viewport } from "next"
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from 'next/font/google'
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CookieBanner } from "@/components/cookie-banner"
import { CSRFProvider } from "@/components/csrf-provider"
import { SkipLinks } from "@/components/ui/accessibility"
import { AnnounceRegion } from "@/components/a11y/announce-region"
import { OfflineBanner } from "@/components/ui/states"
import { ServiceWorkerRegistration, PWAInstallBanner } from "@/components/pwa"
import { MobileDock } from "@/components/layouts/mobile-dock"
import { AmbientBackground } from "@/components/layouts/ambient-background"
import { PerformanceProvider } from "@/components/providers/performance-provider"
import { ViewTransitionsProvider } from "@/components/providers/view-transitions-provider"
import { SentryBreadcrumbsSetup } from "@/components/monitoring/sentry-breadcrumbs-setup"
import { SentryUserContext } from "@/components/monitoring/sentry-user-context"
import { SentryWebVitals } from "@/components/monitoring/sentry-web-vitals"
import { AppProviders } from "./providers"
import { Toaster } from "@/components/ui/sonner"
import { getPublicAppConfig, getEscrowConfig } from "@/lib/config/app-config"
import { I18nProvider } from "@/lib/i18n"
import { getLocale } from "@/lib/i18n/server"
import { LOCALE_HTML_LANG, isRtlLocale } from "@/lib/i18n/types"
import "./globals.css"
import "leaflet/dist/leaflet.css"

const APP_CONFIG = getPublicAppConfig()

// Typographie — charte refonte V1.5 (polices variables, cf. docs/refonte/00-CHARTE-GRAPHIQUE-NIVY.md §2)
// Bricolage Grotesque — display/titres (éditorial, emphase italique)
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-bricolage",
})

// Inter — corps de texte / UI
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

// JetBrains Mono — eyebrows, labels uppercase, montants/stats
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains",
})

export const metadata: Metadata = {
  metadataBase: new URL(APP_CONFIG.appUrl),
  title: {
    default: "Nivy — L'écosystème lifestyle gamifié des 13–17 ans au Maroc",
    template: "%s | Nivy",
  },
  description:
    "Nivy unifie sport, études, créativité, soirées, transport et food pour les ados marocains. Gagne du XP réel, débloque des récompenses, partage avec ton crew. Contrôle parental natif.",
  generator: "v0.app",
  applicationName: "Nivy",
  keywords: [
    "Nivy",
    "lifestyle ados Maroc",
    "hub lifestyle adolescents",
    "gamification adolescents",
    "Nivy Casablanca",
    "Nivy Marrakech",
    "13-17 ans",
    "contrôle parental",
    "wallet prépayé ados",
    "XP récompenses ados",
  ],
  authors: [{ name: "Nivy", url: APP_CONFIG.appUrl }],
  creator: "Nivy",
  publisher: "Nivy",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: APP_CONFIG.appUrl,
    siteName: "Nivy",
    title: "Nivy — L'écosystème lifestyle gamifié des 13–17 ans au Maroc",
    description:
      "Sport, études, créativité, soirées, transport, food — tout dans une seule app gamifiée. XP réel, récompenses réelles, contrôle parental natif. Pour les ados marocains.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Nivy — Lifestyle gamifié pour ados au Maroc",
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nivy — Lifestyle gamifié pour ados 13–17 ans au Maroc",
    description:
      "L'app lifestyle des ados marocains : XP réel, récompenses, soirées, sport, études. Tout en un, contrôle parental inclus.",
    images: ["/og-image.jpg"],
    creator: "@nivyapp",
  },
  // verification.google: removed in Wave D.5 (was placeholder).
  // Add the real Search Console token here when issued by ops.
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Nivy",
  },
  // The new panda-favicon.svg is the source of truth (vector, theme-aware, no
  // raster regen needed when the brand evolves). The PNG entries below remain
  // for legacy browsers that don't ship SVG favicon support — when those
  // assets are generated they should match the panda mark in panda-favicon.svg.
  // See docs/brand/FAVICONS_TODO.md for the export checklist.
  icons: {
    icon: [
      { url: "/icons/panda-favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
    ],
    other: [
      { rel: "mask-icon", url: "/icons/safari-pinned-tab.svg", color: "#a855f7" },
    ],
  },
  alternates: {
    canonical: APP_CONFIG.appUrl,
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4ede0" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0c1a" },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()

  // #289 — affirmation d'escrow centralisee (conditionnelle tant que le tiers
  // e-money agree BAM n'est pas contractualise).
  const escrow = getEscrowConfig()

  // i18n: derive `lang` and `dir` from the active locale so AR (MSA) renders
  // RTL the moment translators flip the bundle on. See `lib/i18n/types.ts` for
  // the canonical mapping (Darija stays `ar-MA` + LTR in V1 since it ships in
  // Latin script).
  const htmlLang = LOCALE_HTML_LANG[locale]
  const htmlDir = isRtlLocale(locale) ? 'rtl' : 'ltr'

  return (
    <html lang={htmlLang} dir={htmlDir} suppressHydrationWarning className={`${bricolage.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        {/* Preconnect to external resources for faster loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://va.vercel-scripts.com" />
        <link rel="dns-prefetch" href="https://teensparty.supabase.co" />


        {/* JSON-LD est un bloc de données (non exécuté) : non soumis au CSP
            script-src, donc aucun nonce requis. Passer un nonce par requête ici
            provoquait un mismatch d'hydratation (le nonce est retiré du payload
            RSC), d'où l'« Application error » côté client. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": "Qu'est-ce que NIVY ?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "NIVY est le hub lifestyle gamifié des 13–17 ans au Maroc. On y entre par ce qu'on fait : 4 piliers — Sport & clubs, Études, Création, Sorties & crew. Tout est réuni dans une seule app, avec une progression par XP et un contrôle parental natif."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Comment fonctionnent les XP et les coins ?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": `Les XP récompensent l'effort et la régularité : ils ne sont jamais convertibles en argent. ${escrow.statement} Les coins servent à payer les services de l'app.`
                  }
                },
                {
                  "@type": "Question",
                  "name": "Quel contrôle les parents gardent-ils ?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Les parents disposent d'un contrôle natif : plafonds de dépense, validation des actions sensibles et historique complet des dépenses et activités de leur ado. Rien n'échappe au compte parental lié."
                  }
                },
                {
                  "@type": "Question",
                  "name": "NIVY est-il légal et sûr au Maroc ?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Oui. NIVY est conçu pour les 13–17 ans dans le respect du cadre marocain : monnaie électronique encadrée par Bank Al-Maghrib (BAM) et protection des données conforme à la loi 09-08 (CNDP). Aucune crypto-monnaie, aucun jeu d'argent — les coins restent une simple monnaie prépayée en dirhams."
                  }
                }
              ]
            })
          }}
        />
      </head>
      <body className="font-sans antialiased bg-background text-foreground">
        <PerformanceProvider>
        <ViewTransitionsProvider>
        <AppProviders>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <I18nProvider initialLocale={locale}>
          <CSRFProvider>
          <AnnounceRegion>
            {/* Skip Links for keyboard navigation */}
            <SkipLinks />

            {/* Offline indicator for PWA */}
            <OfflineBanner />

            {/* Global ambient background (mesh gradient + grain) */}
            <AmbientBackground />

            {/* Main navigation (responsive handled inside Navbar) */}
            <nav id="main-navigation" aria-label="Navigation principale">
              <Navbar />
            </nav>

            {/* Main content — pb-24 clears the mobile dock, reset on md+ */}
            <main id="main-content" className="min-h-screen pb-24 md:pb-0" tabIndex={-1}>
              {children}
            </main>

            {/* Footer rendu une seule fois (responsive géré dans le composant) ;
                pb-dock dégage la barre de bas de page sous le dock mobile fixe,
                annulé en md+ où le dock disparaît. */}
            <div className="pb-dock md:pb-0">
              <Footer />
            </div>

            <CookieBanner />

            {/* Mobile Dock Navigation */}
            <MobileDock />

            {/* PWA Components */}
            <ServiceWorkerRegistration />
            <PWAInstallBanner />

            {/* Sentry Monitoring */}
            <SentryBreadcrumbsSetup />
            <SentryUserContext />
            <SentryWebVitals />

            {process.env.NODE_ENV === "production" && <Analytics />}

            {/* Sonner Toaster for toast notifications */}
            <Toaster />
          </AnnounceRegion>
          </CSRFProvider>
          </I18nProvider>
        </ThemeProvider>
        </AppProviders>
        </ViewTransitionsProvider>
        </PerformanceProvider>
      </body>
    </html>
  )
}
