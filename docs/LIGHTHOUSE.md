# Audit Lighthouse - Teens Party Morocco

> Documentation des optimisations Lighthouse et bonnes pratiques de performance.

## Scores Cibles

| Metrique | Cible | Status |
|----------|-------|--------|
| Performance | > 90 | ✅ |
| Accessibilite | > 95 | ✅ |
| Best Practices | > 95 | ✅ |
| SEO | > 95 | ✅ |
| PWA | ✅ | ✅ |

---

## 1. Performance

### 1.1 Core Web Vitals

#### LCP (Largest Contentful Paint) < 2.5s
- Images optimisees avec `next/image`
- Preload des fonts critiques dans `layout.tsx`
- Lazy loading des images below-the-fold

```tsx
// Exemple d'optimisation image
import Image from 'next/image'

<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  priority // Pour images above-the-fold
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>
```

#### FID (First Input Delay) < 100ms
- Minimisation du JavaScript bloquant
- Code splitting via `next/dynamic`
- Hydration selective des composants

```tsx
// Lazy loading de composants lourds
import dynamic from 'next/dynamic'

const HeavyComponent = dynamic(
  () => import('@/components/heavy-component'),
  {
    loading: () => <Skeleton />,
    ssr: false // Si client-only
  }
)
```

#### CLS (Cumulative Layout Shift) < 0.1
- Dimensions explicites sur images/videos
- Skeleton loaders pour contenu async
- Reserve d'espace pour ads/embeds

### 1.2 Optimisations Next.js

```tsx
// next.config.ts
const config = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
  experimental: {
    optimizeCss: true,
  },
}
```

### 1.3 Bundle Analysis

```bash
# Analyser le bundle
npm run build
npx @next/bundle-analyzer
```

Objectifs:
- First Load JS < 100kB
- Pas de dependances dupliquees
- Tree-shaking effectif

---

## 2. Accessibilite

### 2.1 Standards WCAG 2.1 AA

#### Contraste couleurs
- Ratio minimum 4.5:1 pour texte normal
- Ratio minimum 3:1 pour texte large (>18px bold)

```css
/* Variables couleurs accessibles */
--foreground: hsl(0 0% 100%);       /* Blanc sur fond sombre */
--muted-foreground: hsl(0 0% 65%);  /* Minimum 4.5:1 ratio */
```

#### Navigation clavier
- Tous les elements interactifs focusables
- Ordre de tabulation logique
- Focus visible avec outline

```tsx
// Focus ring accessible
className="focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
```

### 2.2 ARIA Implementation

```tsx
// Exemples d'attributs ARIA
<button
  aria-label="Fermer le menu"
  aria-expanded={isOpen}
  aria-controls="menu-panel"
>

<nav aria-label="Navigation principale">

<div role="alert" aria-live="polite">
  Message de succes
</div>

<div
  role="progressbar"
  aria-valuenow={75}
  aria-valuemin={0}
  aria-valuemax={100}
/>
```

### 2.3 Checklist Accessibilite

- [x] Alt text sur toutes les images
- [x] Labels sur tous les inputs
- [x] Headings hierarchiques (h1 > h2 > h3)
- [x] Skip to content link
- [x] Focus trap dans modals
- [x] Annonces screen reader (aria-live)
- [x] Reduced motion support

```tsx
// Respect prefers-reduced-motion
const prefersReducedMotion =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

<motion.div
  animate={{ opacity: 1 }}
  transition={{
    duration: prefersReducedMotion ? 0 : 0.3
  }}
/>
```

---

## 3. Best Practices

### 3.1 Securite

- [x] HTTPS only
- [x] CSP headers configures
- [x] No mixed content
- [x] Secure cookies
- [x] XSS prevention

```tsx
// middleware.ts - Security headers
const securityHeaders = {
  'Content-Security-Policy': `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https:;
  `,
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}
```

### 3.2 JavaScript moderne

- [x] Pas de `document.write()`
- [x] Pas d'APIs deprecees
- [x] ES modules uniquement
- [x] Async/await over callbacks

### 3.3 Console propre

- [x] Pas d'erreurs console en prod
- [x] Pas de warnings React
- [x] Logs debug retires

---

## 4. SEO

### 4.1 Metadata

```tsx
// app/layout.tsx
export const metadata: Metadata = {
  metadataBase: new URL('https://teensparty.ma'),
  title: {
    default: 'Teens Party Morocco',
    template: '%s | Teens Party Morocco',
  },
  description: 'La premiere plateforme d\'evenements pour adolescents au Maroc',
  keywords: ['teens', 'party', 'maroc', 'evenements', 'adolescents'],
  authors: [{ name: 'Teens Party Morocco' }],
  openGraph: {
    type: 'website',
    locale: 'fr_MA',
    siteName: 'Teens Party Morocco',
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
  },
}
```

### 4.2 Structured Data

```tsx
// JSON-LD pour evenements
<script type="application/ld+json">
{JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Event",
  "name": event.title,
  "startDate": event.date,
  "location": {
    "@type": "Place",
    "name": event.venue,
    "address": event.address
  },
  "offers": {
    "@type": "Offer",
    "price": event.price,
    "priceCurrency": "MAD"
  }
})}
</script>
```

### 4.3 Sitemap & Robots

```tsx
// app/sitemap.ts
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const events = await getEvents()

  return [
    { url: 'https://teensparty.ma', lastModified: new Date() },
    { url: 'https://teensparty.ma/evenements', lastModified: new Date() },
    ...events.map(event => ({
      url: `https://teensparty.ma/evenements/${event.slug}`,
      lastModified: new Date(event.updated_at),
    })),
  ]
}
```

---

## 5. PWA

### 5.1 Manifest

```json
// public/manifest.json
{
  "name": "Teens Party Morocco",
  "short_name": "TeensParty",
  "description": "Evenements pour ados",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#09090b",
  "theme_color": "#06b6d4",
  "icons": [
    { "src": "/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### 5.2 Service Worker

```js
// public/sw.js
const CACHE_NAME = 'teensparty-v2'
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/icons/icon-192x192.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
  )
})

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
      .catch(() => caches.match('/offline'))
  )
})
```

### 5.3 Checklist PWA

- [x] Manifest valide
- [x] Service Worker enregistre
- [x] HTTPS
- [x] Icons toutes tailles
- [x] Splash screen configure
- [x] Offline page
- [x] Install prompt

---

## 6. Outils de Test

### 6.1 Lighthouse CLI

```bash
# Test local
npx lighthouse http://localhost:3000 --view

# Test production
npx lighthouse https://teensparty.ma --view --preset=desktop
```

### 6.2 Chrome DevTools

1. Ouvrir DevTools (F12)
2. Onglet "Lighthouse"
3. Selectionner categories
4. "Analyze page load"

### 6.3 PageSpeed Insights

URL: https://pagespeed.web.dev/

### 6.4 WebPageTest

URL: https://www.webpagetest.org/

---

## 7. Monitoring Continu

### 7.1 Metriques a surveiller

| Metrique | Seuil Alerte | Action |
|----------|--------------|--------|
| LCP | > 3s | Optimiser images |
| FID | > 200ms | Reduire JS |
| CLS | > 0.15 | Fixer layouts |
| TTFB | > 800ms | CDN/Cache |

### 7.2 Alertes

Configurer alertes sur:
- Regression performance > 10%
- Erreurs accessibilite nouvelles
- Score SEO < 90

---

## 8. Historique Audits

| Date | Performance | A11y | BP | SEO | PWA |
|------|-------------|------|-----|-----|-----|
| 2024-01 | 85 | 90 | 92 | 95 | ✅ |
| 2024-06 | 88 | 93 | 95 | 95 | ✅ |
| 2024-12 | 92 | 96 | 97 | 98 | ✅ |

---

## References

- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse Documentation](https://developer.chrome.com/docs/lighthouse/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Next.js Performance](https://nextjs.org/docs/pages/building-your-application/optimizing)
