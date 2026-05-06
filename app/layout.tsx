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
    default: "Teens Party Morocco - Soirées Sécurisées pour Ados 13-17 ans | Sans Alcool",
    template: "%s | Teens Party Morocco",
  },
  description:
    "La soirée N°1 pour ados au Maroc. Événements 100% sécurisés, sans alcool, encadrés par des pros. Casablanca, Marrakech, Rabat. Réservez maintenant !",
  generator: "v0.app",
  applicationName: "Teens Party Morocco",
  keywords: [
    "soirées ados Maroc",
    "événements adolescents sécurisés",
    "boite de nuit mineurs",
    "teens party Casablanca",
    "soirées teenagers Marrakech",
    "événements ados Rabat",
    "sans alcool",
    "13-17 ans",
    "anniversaire ado",
    "clubs jeunes Maroc",
  ],
  authors: [{ name: "Teens Party Morocco", url: APP_CONFIG.appUrl }],
  creator: "Teens Party Morocco",
  publisher: "Teens Party Morocco",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: APP_CONFIG.appUrl,
    siteName: "Teens Party Morocco",
    title: "Teens Party Morocco - La Soirée N°1 pour Ados 13-17 ans",
    description:
      "Soirées magiques 100% sécurisées pour ados. Sans alcool, encadrement pro, sortie avant 23h. +15K participants, 98% parents satisfaits. Réservez maintenant !",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Teens Party Morocco - Soirées pour Ados",
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Teens Party Morocco - Soirées Sécurisées pour Ados 13-17 ans",
    description:
      "La soirée N°1 pour ados au Maroc. 100% sécurisé, sans alcool, encadrement pro. Réservez maintenant !",
    images: ["/og-image.jpg"],
    creator: "@teenspartyma",
  },
  verification: {
    google: "your-google-verification-code",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Teens Party",
  },
  icons: {
    icon: [
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
      { rel: "mask-icon", url: "/icons/safari-pinned-tab.svg", color: "#06b6d4" },
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

  return (
    <html lang="fr" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
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
        </ThemeProvider>
        </AppProviders>
        </PerformanceProvider>
      </body>
    </html>
  )
}
