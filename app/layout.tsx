import type React from "react"
import type { Metadata, Viewport } from "next"
import { headers } from "next/headers"
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CookieBanner } from "@/components/cookie-banner"
import { CSRFProvider } from "@/components/csrf-provider"
import { SkipLinks } from "@/components/ui/accessibility"
import { OfflineBanner } from "@/components/ui/states"
import { ServiceWorkerRegistration, PWAInstallBanner } from "@/components/pwa"
import { MobileDock } from "@/components/layouts/mobile-dock"
import { AmbientBackground } from "@/components/layouts/ambient-background"
import { PerformanceProvider } from "@/components/providers/performance-provider"
import { SentryBreadcrumbsSetup } from "@/components/monitoring/sentry-breadcrumbs-setup"
import { SentryUserContext } from "@/components/monitoring/sentry-user-context"
import { SentryWebVitals } from "@/components/monitoring/sentry-web-vitals"
import { AppProviders } from "./providers"
import { Toaster } from "@/components/ui/sonner"
import { getPublicAppConfig } from "@/lib/config/app-config"
import { I18nProvider } from "@/lib/i18n"
import { getLocale } from "@/lib/i18n/server"
import { LOCALE_HTML_LANG, isRtlLocale } from "@/lib/i18n/types"
import "./globals.css"
import "leaflet/dist/leaflet.css"

const APP_CONFIG = getPublicAppConfig()

// Premium Typography - Silicon Valley Grade
// Geist: Modern, Clean, Highly Legible (by Vercel)
const geistSans = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
})

// Geist Mono: Perfect for numbers, code, technical content
const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
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
    "gamification adolescents",
    "soirées ados Maroc",
    "événements adolescents sécurisés",
    "Nivy Casablanca",
    "Nivy Marrakech",
    "sans alcool",
    "13-17 ans",
    "contrôle parental",
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
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#06b6d4" },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Get nonce from headers (set by middleware)
  const headersList = await headers()
  const nonce = headersList.get('x-nonce') || ''
  const locale = await getLocale()

  // i18n: derive `lang` and `dir` from the active locale so AR (MSA) renders
  // RTL the moment translators flip the bundle on. See `lib/i18n/types.ts` for
  // the canonical mapping (Darija stays `ar-MA` + LTR in V1 since it ships in
  // Latin script).
  const htmlLang = LOCALE_HTML_LANG[locale]
  const htmlDir = isRtlLocale(locale) ? 'rtl' : 'ltr'

  return (
    <html lang={htmlLang} dir={htmlDir} suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        {/* Preconnect to external resources for faster loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://va.vercel-scripts.com" />
        <link rel="dns-prefetch" href="https://teensparty.supabase.co" />

        {/* Preload critical resources */}
        <link rel="preload" href="/teens-party-event.jpg" as="image" type="image/jpeg" />

        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": "Quelle est la tranche d'âge acceptée ?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Nos soirées sont réservées aux adolescents de 13 à 17 ans inclus. Un contrôle d'identité est effectué à l'entrée."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Les soirées sont-elles sécurisées ?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Absolument ! Nous disposons d'une équipe de sécurité professionnelle, de surveillants formés, et d'un encadrement permanent. Zéro alcool, sortie avant 23h."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Y a-t-il de l'alcool ?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Non, aucun alcool n'est servi. Nous proposons une large sélection de boissons sans alcool, jus de fruits et sodas à volonté."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Comment réserver des billets ?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Vous pouvez réserver vos billets directement en ligne via notre billetterie. Les billets électroniques sont envoyés par email avec un code QR."
                  }
                }
              ]
            })
          }}
        />
      </head>
      <body className="font-sans antialiased bg-background text-foreground">
        <PerformanceProvider>
        <AppProviders>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <I18nProvider initialLocale={locale}>
          <CSRFProvider>
            {/* Skip Links for keyboard navigation */}
            <SkipLinks />

            {/* Offline indicator for PWA */}
            <OfflineBanner />

            {/* Global ambient background (mesh gradient + grain) */}
            <AmbientBackground />

            {/* Main navigation */}
            <nav id="main-navigation" aria-label="Navigation principale">
              <div className="hidden md:block">
                <Navbar />
              </div>
              <div className="md:hidden">
                <Navbar /> {/* Keep top navbar for logo/notifs on mobile but potentially simplified */}
              </div>
            </nav>

            {/* Main content */}
            <main id="main-content" className="min-h-screen pb-24 md:pb-0" tabIndex={-1}>
              {children}
            </main>

            <div className="hidden md:block">
              <Footer />
            </div>
            <div className="md:hidden pb-24">
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

            <Analytics />
            
            {/* Sonner Toaster for toast notifications */}
            <Toaster />
          </CSRFProvider>
          </I18nProvider>
        </ThemeProvider>
        </AppProviders>
        </PerformanceProvider>
      </body>
    </html>
  )
}
