# Lighthouse Optimization Guide

## Overview

This document outlines the optimizations implemented to achieve a Lighthouse score > 90 across all categories.

## Implemented Optimizations

### 1. Performance

#### Image Optimization
- **Next.js Image Component**: All images use `next/image` with automatic WebP/AVIF conversion
- **Blur Placeholders**: LCP images have base64 blur placeholders
- **Lazy Loading**: Below-the-fold images load on demand
- **Responsive Sizes**: Images serve appropriate sizes per viewport
- **Cache Headers**: Static images cached for 1 year

```typescript
// Example usage
import Image from 'next/image'

<Image
  src="/hero.jpg"
  alt="Hero"
  fill
  priority // for LCP images
  sizes="100vw"
  placeholder="blur"
  blurDataURL={BLUR_DATA_URL}
/>
```

#### Font Optimization
- **Font Display Swap**: Prevents invisible text during font load
- **Variable Fonts**: Using Geist variable fonts for smaller bundle
- **Preconnect**: DNS prefetch for Google Fonts

#### Code Splitting
- **Dynamic Imports**: Heavy components loaded on demand
- **Route-based Splitting**: Next.js automatic code splitting
- **Package Optimization**: `optimizePackageImports` in next.config

```typescript
// Lazy loading heavy components
import dynamic from 'next/dynamic'

const HeavyChart = dynamic(() => import('./chart'), {
  ssr: false,
  loading: () => <Skeleton />
})
```

#### Caching
- **Static Assets**: 1-year cache for images, fonts, CSS, JS
- **Image CDN**: Next.js Image Optimization with 30-day cache
- **API Responses**: Appropriate cache headers

### 2. Accessibility

#### Semantic HTML
- **Skip Links**: "Skip to main content" for keyboard users
- **ARIA Labels**: All interactive elements properly labeled
- **Heading Hierarchy**: Logical h1-h6 structure

#### Focus Management
- **Focus Visible**: Clear focus indicators
- **Tab Order**: Logical tab navigation
- **Focus Trap**: Modal dialogs trap focus

#### Color Contrast
- **WCAG AA Compliance**: Minimum 4.5:1 contrast ratio
- **High Contrast Mode**: Support for prefers-contrast

### 3. Best Practices

#### Security Headers
```javascript
// next.config.mjs headers
{
  key: 'Strict-Transport-Security',
  value: 'max-age=63072000; includeSubDomains; preload'
},
{
  key: 'X-DNS-Prefetch-Control',
  value: 'on'
}
```

#### HTTPS
- All requests served over HTTPS
- HSTS header enforces secure connections

### 4. SEO

#### Meta Tags
- Title tags with template
- Meta descriptions
- Open Graph tags
- Twitter Cards
- Canonical URLs

#### Structured Data
- FAQ Schema for common questions
- Organization schema
- Event schema (per event page)

#### Sitemap & Robots
- `sitemap.xml` generated dynamically
- `robots.txt` with appropriate rules

## Monitoring

### Web Vitals Tracking
```typescript
// Automatic tracking via PerformanceProvider
// Metrics: LCP, FID, CLS, FCP, TTFB, INP
```

### Bundle Analysis
```bash
npm run analyze:win  # Windows
npm run analyze      # Unix
```

## Target Scores

| Category | Target | Notes |
|----------|--------|-------|
| Performance | > 90 | Focus on LCP < 2.5s |
| Accessibility | > 90 | WCAG 2.1 AA compliance |
| Best Practices | > 90 | Security headers, HTTPS |
| SEO | > 90 | Meta tags, structured data |

## Testing

Run Lighthouse audit:
```bash
# Using Chrome DevTools
1. Open Chrome DevTools (F12)
2. Go to Lighthouse tab
3. Select categories
4. Generate report

# Using CLI
npx lighthouse https://localhost:3000 --view
```

## Checklist

- [x] next/image for all images
- [x] Font display swap
- [x] Preconnect hints
- [x] Dynamic imports for heavy components
- [x] Skip links for accessibility
- [x] ARIA labels on interactive elements
- [x] Security headers
- [x] Meta tags and Open Graph
- [x] Sitemap and robots.txt
- [x] Structured data (JSON-LD)
- [x] Web Vitals monitoring
- [x] Bundle analyzer setup
