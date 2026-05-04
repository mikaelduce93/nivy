import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Temporary compatibility while legacy TypeScript debt is cleaned up.
    ignoreBuildErrors: true,
  },

  // ========================================
  // REDIRECTIONS - Architecture unifiée
  // ========================================
  async redirects() {
    return [
      // ----------------------------------------
      // ÉVÉNEMENTS - Unifier vers /agenda
      // ----------------------------------------
      {
        source: '/evenements',
        destination: '/agenda',
        permanent: true,
      },
      {
        source: '/evenements/:id',
        destination: '/agenda/:id',
        permanent: true,
      },
      {
        source: '/calendrier',
        destination: '/agenda',
        permanent: true,
      },

      // ----------------------------------------
      // AUTH - Unifier les doublons
      // ----------------------------------------
      {
        source: '/auth/signup',
        destination: '/auth/sign-up',
        permanent: true,
      },
      {
        source: '/login',
        destination: '/auth/login',
        permanent: true,
      },

      // ----------------------------------------
      // FIDÉLITÉ - Unifier vers /carte-vip
      // ----------------------------------------
      {
        source: '/fidelite',
        destination: '/carte-vip',
        permanent: true,
      },
      {
        source: '/fidelite/recompenses',
        destination: '/carte-vip/recompenses',
        permanent: true,
      },

      // ----------------------------------------
      // OPPORTUNITÉS - Renommer en français
      // ----------------------------------------
      {
        source: '/ambassadeurs',
        destination: '/devenir-ambassadeur',
        permanent: true,
      },
      {
        source: '/ambassadeurs/candidature',
        destination: '/devenir-ambassadeur/candidature',
        permanent: true,
      },
      {
        source: '/ambassadeurs/programme',
        destination: '/devenir-ambassadeur/programme',
        permanent: true,
      },
      {
        source: '/partenaires',
        destination: '/devenir-partenaire',
        permanent: true,
      },
      {
        source: '/partenaires/inscription',
        destination: '/devenir-partenaire/inscription',
        permanent: true,
      },
      {
        source: '/influenceurs',
        destination: '/devenir-influenceur',
        permanent: true,
      },
      {
        source: '/influenceurs/candidature',
        destination: '/devenir-influenceur/candidature',
        permanent: true,
      },

      // ----------------------------------------
      // INFO - Consolidation
      // ----------------------------------------
      {
        source: '/parents',
        destination: '/guide-parents',
        permanent: true,
      },
      {
        source: '/support',
        destination: '/aide',
        permanent: true,
      },
      {
        source: '/faq',
        destination: '/aide/faq',
        permanent: true,
      },

      // ----------------------------------------
      // TYPOS - Corrections
      // ----------------------------------------
      {
        source: '/authorisations/:path*',
        destination: '/autorisations/:path*',
        permanent: true,
      },

      // ----------------------------------------
      // DASHBOARD - Smart redirect (vers /espace qui fera le routing)
      // ----------------------------------------
      {
        source: '/dashboard',
        destination: '/espace',
        permanent: false, // Temporary car dépend du rôle
      },
      {
        source: '/dashboard/ambassadeur',
        destination: '/ambassador',
        permanent: false,
      },
      {
        source: '/mon-compte',
        destination: '/espace',
        permanent: false,
      },

      // ----------------------------------------
      // USER SPACE - Redirections temporaires
      // (seront mises à jour en Phase 3)
      // ----------------------------------------
      {
        source: '/mes-reservations',
        destination: '/teen', // TODO: créer /teen/reservations en Phase 3
        permanent: false,
      },
      {
        source: '/mes-clubs',
        destination: '/teen', // TODO: créer /teen/clubs en Phase 3
        permanent: false,
      },
      {
        source: '/profile',
        destination: '/espace',
        permanent: false,
      },
      {
        source: '/profile/:path*',
        destination: '/espace',
        permanent: false,
      },

      // ----------------------------------------
      // GAMIFICATION - Daily redirect
      // ----------------------------------------
      {
        source: '/daily',
        destination: '/gamification/missions',
        permanent: false,
      },

      // ----------------------------------------
      // LEGACY - Anciennes routes
      // ----------------------------------------
      {
        source: '/gamification-demo/:path*',
        destination: '/gamification/:path*',
        permanent: true,
      },
    ]
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'blob.v0.app',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', '@radix-ui/react-icons'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
        ],
      },
      {
        // Cache static assets for 1 year
        source: '/(.*)\\.(jpg|jpeg|png|gif|webp|avif|svg|ico)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache fonts for 1 year
        source: '/(.*)\\.(woff|woff2|ttf|otf|eot)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}

export default withBundleAnalyzer(nextConfig)
