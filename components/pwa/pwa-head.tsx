/**
 * PWA HEAD - Meta tags pour PWA
 * =============================
 * Inclure dans le layout principal
 */

export function PWAHead() {
  return (
    <>
      {/* PWA Primary Meta Tags */}
      <meta name="application-name" content="Teens Party Morocco" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content="Teens Party" />
      <meta name="format-detection" content="telephone=no" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="msapplication-config" content="/browserconfig.xml" />
      <meta name="msapplication-TileColor" content="#06b6d4" />
      <meta name="msapplication-tap-highlight" content="no" />
      <meta name="theme-color" content="#06b6d4" />

      {/* Manifest */}
      <link rel="manifest" href="/manifest.json" />

      {/* Favicons */}
      <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16x16.png" />
      <link rel="shortcut icon" href="/favicon.ico" />

      {/* Apple Touch Icons */}
      <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
      <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-152x152.png" />

      {/* Apple Splash Screens - iPhone */}
      <link
        rel="apple-touch-startup-image"
        href="/splash/apple-splash-2048-2732.png"
        media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
      />
      <link
        rel="apple-touch-startup-image"
        href="/splash/apple-splash-1668-2388.png"
        media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
      />
      <link
        rel="apple-touch-startup-image"
        href="/splash/apple-splash-1536-2048.png"
        media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
      />
      <link
        rel="apple-touch-startup-image"
        href="/splash/apple-splash-1125-2436.png"
        media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
      />
      <link
        rel="apple-touch-startup-image"
        href="/splash/apple-splash-1242-2688.png"
        media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
      />
      <link
        rel="apple-touch-startup-image"
        href="/splash/apple-splash-828-1792.png"
        media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
      />
      <link
        rel="apple-touch-startup-image"
        href="/splash/apple-splash-1170-2532.png"
        media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
      />
      <link
        rel="apple-touch-startup-image"
        href="/splash/apple-splash-1284-2778.png"
        media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
      />

      {/* MS Tile */}
      <meta name="msapplication-TileImage" content="/icons/icon-144x144.png" />

      {/* PWA Scope & Start URL */}
      <meta name="msapplication-starturl" content="/" />

      {/* Safe Area for notched devices */}
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover"
      />
    </>
  )
}

/**
 * PWA Meta Tags as string (for Next.js metadata export)
 */
export const pwaMetadata = {
  applicationName: "Teens Party Morocco",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Teens Party",
  },
  formatDetection: {
    telephone: false,
  },
  themeColor: "#06b6d4",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/icons/safari-pinned-tab.svg",
        color: "#06b6d4",
      },
    ],
  },
}
