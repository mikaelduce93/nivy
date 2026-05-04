# Audit Front-End Production-Ready
## Teens Party Morocco - Application Web Next.js

**Date**: 2025-01-27  
**Auditeur**: Chef de Projet Produit + Lead Front-End  
**Version analysée**: Codebase actuel (Next.js 16.1.1, React 19.2.0)

---

## 1) Contexte Produit

### Produit
Application web pour adolescents 13-17 ans au Maroc proposant un écosystème lifestyle complet : soirées sécurisées, clubs sportifs/tech/arts, gamification, système de récompenses. Plateforme multi-rôles (Teens, Parents, Ambassadeurs, Partenaires, Admins) avec gestion de budget, approbations parentales, et paiements intégrés.

**Promesse**: Soirées 100% sécurisées, sans alcool, encadrement professionnel, sortie avant 23h.

**Différenciation**: Gamification complète (XP, niveaux, coins, badges), système de piliers (Vitality, Intellect, Creativity, Social), intégration parent-teen avec contrôle budgétaire.

### Plateforme
- **Web** (Next.js App Router)
- **PWA** (Service Worker, manifest, installable)
- **Responsive** (Mobile-first, breakpoints Tailwind)

### Public cible
- **Pays**: Maroc
- **Langues**: Français (i18n non implémenté)
- **Utilisateurs**: Adolescents 13-17 ans, Parents, Ambassadeurs, Partenaires
- **Contexte d'usage**: Mobile majoritaire, connexions 3G/4G variables, appareils Android/iOS
- **Contraintes réseau**: Slow 3G accepté, offline partiel (PWA)

### Flux critiques (P0)
1. **Onboarding** → Sign-up → Vérification âge → Création profil Teen/Parent
2. **Login** → Authentification Supabase → Redirection selon rôle
3. **Réservation événement** → Sélection → Vérification budget → Paiement → QR code
4. **Paiement** → Choix méthode → Traitement → Confirmation
5. **Check-in événement** → Scan QR → Validation → Entrée

**Fail states acceptables**:
- Offline: Cache PWA, message explicite
- API down: Retry avec backoff, fallback UI
- Slow 3G: Loading states, progressive enhancement
- Paiement échoué: Retry, alternative méthodes

### KPI principaux
- Activation: % utilisateurs complétant onboarding
- Rétention J1/J7: % utilisateurs actifs
- Conversion réservations: % visiteurs → réservations
- Temps de session: Durée moyenne
- Taux de paiement: % réservations payées

### KPI perf cible
- **LCP** < 2.5s
- **INP** < 200ms
- **CLS** < 0.1
- **FCP** < 1.8s
- **TTI** < 3.8s
- **Crash-free rate** > 99.5%

### Exigences légales / conformité
- **RGPD**: Consentement cookies (CookieBanner présent)
- **Analytics**: Vercel Analytics + Sentry (avec consentement)
- **Cookies**: Gestion via CookieBanner
- **Âge**: Vérification 13-17 ans (validation côté serveur)
- **Données personnelles**: Stockage Supabase (conforme RGPD)

---

## 2) Contexte Technique

### Stack
- **Framework**: Next.js 16.1.1 (App Router)
- **React**: 19.2.0
- **TypeScript**: 5.x (strict: **false** ⚠️)
- **CSS**: Tailwind CSS 4.1.9
- **UI Kit**: Radix UI (composants accessibles)
- **Styling**: Tailwind + CSS Modules (globals.css)

### State management
- **Server State**: Supabase (RPC, queries directes)
- **Client State**: React hooks (useState, useEffect)
- **Pas de state management global** (Redux/Zustand) ⚠️

### Data fetching
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Client**: `createClient()` (Supabase SSR)
- **Server**: `createClient()` (Server Components)
- **Pas de React Query/SWR** ⚠️
- **Retry logic**: `useRetry` hook (backoff exponentiel)

### Stratégie cache/invalidation
- **Next.js**: Cache automatique (fetch, route handlers)
- **Images**: Next.js Image Optimization (30 jours cache)
- **Static assets**: 1 an cache (headers configurés)
- **Pas de stratégie explicite d'invalidation** ⚠️

### Auth
- **Provider**: Supabase Auth
- **Tokens**: Stockés dans **localStorage** (client) ⚠️ + cookies (server)
- **Refresh**: Automatique via Supabase
- **Session**: Cookies httpOnly (middleware)
- **Rôles**: `profiles.role` (teen, parent, ambassador, partner, admin)
- **Permissions**: Middleware + `admin_roles` table

### Build & hosting
- **Hosting**: Vercel (assumé, `vercel.json` présent)
- **Environnements**: dev/staging/prod (variables d'env)
- **Build**: `next build`
- **Runtime**: Node.js (pas Edge par défaut)

### Observabilité
- **Error Tracking**: Sentry (client + server configurés)
- **Analytics**: Vercel Analytics
- **Logs**: Console (pas de service dédié) ⚠️
- **Metrics**: Pas de RUM dédié ⚠️
- **Traces**: Sentry (10% sample rate)

### Contraintes
- **Deadline**: Non spécifiée
- **Devices**: Mobile-first, iOS/Android
- **SEO**: Oui (metadata, sitemap, robots.txt)
- **i18n**: Non implémenté (français uniquement)
- **Accessibilité**: WCAG 2.1 AA (ESLint jsx-a11y strict)
- **Navigateur min**: Non spécifié
- **Performance budget**: Non défini ⚠️
- **Bundle size max**: Non défini ⚠️

---

## 3) A) Audit "Production-Ready" (Tableau)

| Domaine | Problème | Symptôme | Impact | Recommandation | Priorité | Effort |
|---------|----------|----------|--------|----------------|----------|--------|
| **TypeScript** | `strict: false` dans tsconfig.json | Erreurs de type non détectées, `any` implicites | Bugs en production, maintenance difficile | Activer `strict: true`, corriger erreurs progressivement | P0 | L |
| **TypeScript** | Pas de vérification TypeScript en build (ignoreBuildErrors en dev) | Erreurs TypeScript ignorées en production | Risque de runtime errors | Activer vérification TypeScript en build prod | P0 | S |
| **Auth & Sécurité** | Tokens Supabase stockés dans localStorage (client-side) | Vulnérable au XSS, tokens accessibles via JS | Vol de session, compromission compte | Migrer vers cookies httpOnly uniquement | P0 | M |
| **Auth & Sécurité** | Pas de timeout réseau sur appels API | Requêtes peuvent bloquer indéfiniment | UX dégradée, ressources consommées | Ajouter timeout (10-30s) sur tous les fetch | P0 | M |
| **Auth & Sécurité** | Rate limiting en mémoire (non persisté) | Perte de limite au redémarrage, pas de partage entre instances | DDoS possible, contournement facile | Migrer vers Redis/Upstash pour rate limiting distribué | P0 | M |
| **Auth & Sécurité** | CSP avec `'unsafe-eval'` et `'unsafe-inline'` | Risque XSS élevé | Injection de code possible | Retirer unsafe-*, utiliser nonces pour scripts inline | P0 | M |
| **Data Layer** | Pas de cancellation des requêtes (AbortController) | Requêtes obsolètes continuent, fuites mémoire | Performance dégradée, coûts inutiles | Implémenter AbortController sur tous les fetch | P0 | M |
| **Data Layer** | Pas de timeout explicite sur appels Supabase | Requêtes peuvent bloquer indéfiniment | Timeouts serveur Next.js, UX dégradée | Wrapper Supabase avec timeout (10-30s) | P0 | M |
| **Error Handling** | Pas d'Error Boundary sur routes critiques (/checkout, /payment) | Crash total si erreur dans composant | Perte de conversion, frustration utilisateur | Ajouter Error Boundaries sur routes critiques | P0 | S |
| **Error Handling** | Erreurs API loggées uniquement en console (pas Sentry) | Erreurs non trackées en production | Debugging impossible, problèmes invisibles | Logger toutes erreurs API vers Sentry avec contexte | P0 | S |
| **Error Handling** | Pas de gestion d'erreur réseau (offline, timeout) dans composants | UX dégradée en cas de problème réseau | Abandon utilisateur, perte de conversion | Ajouter retry + fallback UI pour erreurs réseau | P0 | M |
| **Observabilité** | Sentry configuré mais pas de breadcrumbs contextuels | Debugging difficile, manque de contexte | Temps de résolution élevé | Ajouter breadcrumbs (navigation, user actions, API calls) | P1 | M |
| **Observabilité** | Pas de RUM (Real User Monitoring) | Pas de visibilité sur perf réelle utilisateurs | Problèmes perf non détectés | Implémenter Web Vitals tracking (Sentry ou Vercel) | P1 | M |
| **Observabilité** | Logs uniquement en console, pas de service centralisé | Logs perdus en production | Debugging impossible | Centraliser logs (Vercel Logs, Datadog, ou Sentry) | P1 | M |
| **Tests** | Coverage à 50% (seuil minimum), probablement inférieur | Code non testé en production | Régressions non détectées | Augmenter coverage à 80%+ sur code critique | P1 | L |
| **Tests** | Pas de tests E2E sur flux paiement complet | Régressions critiques non détectées | Perte de revenus | Ajouter tests E2E paiement (Playwright) | P1 | M |
| **Tests** | Pas de tests de charge (load testing) | Performance non validée sous charge | Crash en pic de trafic | Ajouter tests de charge (k6 configuré mais non utilisé) | P1 | M |
| **Performance** | Pas de performance budget défini | Bundle peut grossir sans contrôle | LCP/INP dégradés | Définir budget (bundle < 250KB gzipped, LCP < 2.5s) | P1 | S |
| **Performance** | Pas d'analyse de bundle en CI | Bundle size non surveillé | Dégradation progressive | Ajouter bundle analyzer en CI, alerter si > budget | P1 | S |
| **Performance** | Images non optimisées partout (certaines utilisent `<img>`) | LCP dégradé, bande passante gaspillée | Score Lighthouse bas | Remplacer tous `<img>` par `next/image` ou composants optimisés | P1 | M |
| **Performance** | Pas de prefetching des routes critiques | Navigation lente | UX dégradée | Prefetch routes critiques (Link prefetch, router.prefetch) | P1 | S |
| **Performance** | Pas de code splitting sur composants lourds (charts, maps) | Bundle initial trop gros | TTI élevé | Lazy load composants lourds (dynamic imports) | P1 | M |
| **UX** | Pas de skeleton loading sur toutes les pages | Flash de contenu, CLS | UX dégradée | Ajouter skeletons partout (déjà composants disponibles) | P1 | M |
| **UX** | Pas de gestion d'état "empty" cohérente | Pages vides sans message | Confusion utilisateur | Utiliser StateWrapper partout (déjà disponible) | P1 | M |
| **UX** | Microcopy manquant sur erreurs | Messages génériques | Frustration utilisateur | Ajouter microcopy contextuel (ex: "Vérifiez votre connexion") | P1 | S |
| **A11y** | Pas de tests a11y automatisés | Problèmes a11y non détectés | Non-conformité WCAG | Ajouter tests a11y (axe-core, jest-axe) | P1 | M |
| **A11y** | Focus management manquant sur modals | Navigation clavier cassée | Problème a11y majeur | Implémenter focus trap sur modals (Radix le fait mais vérifier) | P1 | S |
| **A11y** | Contraste couleurs non vérifié automatiquement | Risque non-conformité WCAG AA | Problème légal potentiel | Ajouter vérification contraste (stylelint-a11y) | P1 | S |
| **Data Layer** | Pas de cache invalidation stratégique | Données obsolètes affichées | Incohérence UX | Implémenter stratégie cache (SWR/React Query ou cache tags) | P1 | L |
| **Data Layer** | Pas de pagination sur listes longues | Performance dégradée, mémoire consommée | Crash sur grandes listes | Implémenter pagination/infinite scroll | P1 | M |
| **Release** | Pas de feature flags | Rollback difficile, déploiements risqués | Incidents en production | Implémenter feature flags (Vercel Flags, LaunchDarkly) | P1 | M |
| **Release** | Pas de config runtime (tout en build) | Changements nécessitent rebuild | Délai de déploiement élevé | Externaliser config sensible (env runtime, Vercel env) | P1 | S |
| **Release** | Pas de staging parity validée | Différences dev/staging/prod | Bugs en prod non détectés | Automatiser validation staging (tests E2E, health checks) | P1 | M |
| **SEO** | Metadata dynamique manquante sur certaines pages | SEO dégradé | Perte de trafic organique | Ajouter metadata dynamique (generateMetadata) partout | P2 | M |
| **SEO** | Pas de sitemap dynamique complet | Pages non indexées | Perte de trafic | Générer sitemap dynamique (déjà robots.ts, vérifier sitemap.ts) | P2 | S |
| **i18n** | Pas d'internationalisation | Application limitée au français | Pas de scalabilité internationale | Implémenter i18n (next-intl, next-i18next) | P2 | L |
| **Architecture** | Pas de state management global | Props drilling, state dupliqué | Maintenabilité difficile | Évaluer Zustand/Redux pour state complexe | P2 | M |
| **Architecture** | Duplication de code (composants similaires) | Maintenance difficile | Bugs dupliqués | Refactoriser composants communs | P2 | M |
| **Performance** | Pas de service worker avancé (cache stratégique) | PWA basique | Offline limité | Implémenter cache stratégique (workbox, cache-first pour assets) | P2 | M |
| **Performance** | Pas de preconnect pour domaines externes | Latence DNS élevée | LCP dégradé | Ajouter preconnect (Stripe, Supabase, analytics) | P2 | S |
| **UX** | Pas de progressive enhancement | App cassée si JS désactivé | Accessibilité dégradée | Ajouter fallbacks HTML pour fonctionnalités critiques | P2 | M |

---

## 3) B) "À Refaire" (Refactors Nécessaires)

### Refactor 1: Migration Auth vers Cookies httpOnly

**Pourquoi**: Tokens dans localStorage = vulnérable au XSS. Si un script malveillant s'exécute, il peut voler les tokens.

**Approche recommandée**:
- Utiliser uniquement les cookies httpOnly pour les tokens
- Supabase SSR gère déjà les cookies côté serveur
- Supprimer `storage: window.localStorage` dans `lib/supabase/client.ts`
- Utiliser uniquement `createServerClient` pour l'auth

**Risques de régression**:
- Logout peut ne pas fonctionner si mal géré
- Tests E2E à mettre à jour (cookies au lieu de localStorage)

**Comment valider**:
- Tester login/logout sur tous les rôles
- Vérifier que tokens ne sont plus dans localStorage (DevTools)
- Tests E2E passent

**Fichiers concernés**:
- `lib/supabase/client.ts` (ligne 49: `storage: window.localStorage`)
- `app/auth/**/*.tsx` (vérifier utilisation client)

---

### Refactor 2: Wrapper Supabase avec Timeout + Retry

**Pourquoi**: Appels Supabase peuvent bloquer indéfiniment, pas de gestion d'erreur réseau cohérente.

**Approche recommandée**:
```typescript
// lib/supabase/wrapper.ts
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 10000
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
  )
  return Promise.race([promise, timeout])
}

// Utilisation
const { data, error } = await withTimeout(
  supabase.from('events').select('*'),
  10000
)
```

**Risques de régression**:
- Timeouts trop courts = faux négatifs
- Timeouts trop longs = UX dégradée

**Comment valider**:
- Tester avec réseau lent (DevTools throttling)
- Vérifier que timeout fonctionne (mock timeout)
- Logs Sentry pour timeouts

**Fichiers concernés**:
- Créer `lib/supabase/wrapper.ts`
- Refactoriser tous les appels Supabase (progressif)

---

### Refactor 3: Error Boundaries sur Routes Critiques

**Pourquoi**: Crash total si erreur dans composant = perte de conversion.

**Approche recommandée**:
```typescript
// components/error-boundaries/route-error-boundary.tsx
'use client'
import { Component, ReactNode } from 'react'
import * as Sentry from '@sentry/nextjs'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

export class RouteErrorBoundary extends Component<Props> {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    Sentry.captureException(error, { contexts: { react: errorInfo } })
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <DefaultErrorFallback />
    }
    return this.props.children
  }
}
```

**Risques de régression**:
- Erreurs masquées si fallback trop générique
- State peut être perdu si erreur dans boundary

**Comment valider**:
- Tester avec erreur volontaire (throw dans composant)
- Vérifier que Sentry reçoit l'erreur
- UX reste utilisable (fallback affiché)

**Fichiers concernés**:
- Créer `components/error-boundaries/`
- Wrapper routes: `/reservation/**`, `/payment/**`, `/checkout/**`

---

### Refactor 4: Data Fetching avec React Query

**Pourquoi**: Pas de cache, pas d'invalidation, pas de retry cohérent, duplication de code.

**Approche recommandée**:
```typescript
// lib/queries/events.ts
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('events').select('*')
      if (error) throw error
      return data
    },
    staleTime: 5 * 60 * 1000, // 5 min
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}
```

**Risques de régression**:
- Migration progressive nécessaire (ne pas tout refactorer d'un coup)
- Tests à mettre à jour (mocks React Query)

**Comment valider**:
- Tests unitaires passent
- Cache fonctionne (données réutilisées)
- Invalidation fonctionne (refetch après mutation)

**Fichiers concernés**:
- Installer `@tanstack/react-query`
- Refactoriser progressivement: `app/**/page.tsx`, `components/**/*.tsx`

---

### Refactor 5: Rate Limiting Distribué (Redis)

**Pourquoi**: Rate limiting en mémoire = perdu au redémarrage, pas de partage entre instances Vercel.

**Approche recommandée**:
```typescript
// lib/security/rate-limiter-redis.ts
import { Redis } from '@upstash/redis'

const redis = new Redis({ url: process.env.UPSTASH_REDIS_URL, token: process.env.UPSTASH_REDIS_TOKEN })

export async function rateLimitDistributed(
  key: string,
  limit: number,
  window: number
): Promise<{ allowed: boolean; remaining: number }> {
  const count = await redis.incr(key)
  if (count === 1) {
    await redis.expire(key, Math.ceil(window / 1000))
  }
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
  }
}
```

**Risques de régression**:
- Coût Redis (gratuit jusqu'à 10K req/jour sur Upstash)
- Latence ajoutée (minime, < 10ms)

**Comment valider**:
- Tester rate limiting (trop de requêtes = 429)
- Vérifier que limite persiste après redémarrage
- Monitoring Upstash

**Fichiers concernés**:
- `lib/security/rate-limiter.ts` (remplacer store mémoire par Redis)
- `middleware.ts` (utiliser nouvelle fonction)

---

## 3) C) Roadmap en 3 Phases

### Phase 1: Ship Safe (P0 - Bloquants Prod)

**Objectifs**: Stabiliser l'application, sécuriser l'auth, gérer les erreurs critiques.

**Items (tickets)**:
1. ✅ Activer TypeScript strict mode (corriger erreurs progressivement)
2. ✅ Activer vérification TypeScript en build production
3. ✅ Migrer auth vers cookies httpOnly (supprimer localStorage)
4. ✅ Ajouter timeout réseau (10-30s) sur tous les fetch/Supabase
5. ✅ Implémenter AbortController pour cancellation requêtes
6. ✅ Ajouter Error Boundaries sur routes critiques (/reservation, /payment, /checkout)
7. ✅ Logger toutes erreurs API vers Sentry (avec contexte)
8. ✅ Retirer `'unsafe-eval'` et `'unsafe-inline'` du CSP (utiliser nonces)
9. ✅ Migrer rate limiting vers Redis/Upstash (distribué)
10. ✅ Ajouter gestion erreur réseau (retry + fallback UI)

**Critères d'acceptation**:
- ✅ Tous les tests passent
- ✅ Aucun token dans localStorage (DevTools)
- ✅ Timeout fonctionne (test réseau lent)
- ✅ Error Boundaries catch erreurs (test volontaire)
- ✅ Sentry reçoit toutes erreurs API
- ✅ CSP strict (pas d'erreurs console)
- ✅ Rate limiting persiste après redémarrage

**Métriques de succès**:
- ✅ Crash-free rate > 99.5%
- ✅ 0 erreurs TypeScript en build
- ✅ 0 tokens dans localStorage
- ✅ Tous les timeouts respectés (< 30s)

**Durée estimée**: 2-3 semaines

---

### Phase 2: Scale (P1 - Nécessaire pour Scalabilité)

**Objectifs**: Améliorer performance, observabilité, tests, qualité code.

**Items (tickets)**:
1. ✅ Ajouter breadcrumbs Sentry (navigation, user actions, API calls)
2. ✅ Implémenter RUM (Web Vitals tracking via Sentry)
3. ✅ Centraliser logs (Vercel Logs ou Sentry)
4. ✅ Augmenter coverage tests à 80%+ (code critique)
5. ✅ Ajouter tests E2E flux paiement complet
6. ✅ Ajouter tests de charge (k6, scénarios critiques)
7. ✅ Définir performance budget (bundle < 250KB gzipped, LCP < 2.5s)
8. ✅ Ajouter bundle analyzer en CI (alerte si > budget)
9. ✅ Remplacer tous `<img>` par `next/image` ou composants optimisés
10. ✅ Prefetch routes critiques (Link prefetch, router.prefetch)
11. ✅ Lazy load composants lourds (dynamic imports)
12. ✅ Ajouter skeletons loading partout
13. ✅ Utiliser StateWrapper partout (empty states)
14. ✅ Ajouter microcopy contextuel sur erreurs
15. ✅ Ajouter tests a11y automatisés (axe-core, jest-axe)
16. ✅ Implémenter focus trap sur modals
17. ✅ Ajouter vérification contraste couleurs (stylelint-a11y)
18. ✅ Implémenter stratégie cache (React Query ou cache tags)
19. ✅ Implémenter pagination/infinite scroll sur listes longues
20. ✅ Implémenter feature flags (Vercel Flags)
21. ✅ Externaliser config runtime (env Vercel)
22. ✅ Automatiser validation staging (tests E2E, health checks)

**Critères d'acceptation**:
- ✅ Coverage > 80% sur code critique
- ✅ Tests E2E paiement passent
- ✅ Tests de charge validés (100 concurrent users)
- ✅ Bundle < 250KB gzipped
- ✅ LCP < 2.5s (Lighthouse)
- ✅ INP < 200ms (Lighthouse)
- ✅ CLS < 0.1 (Lighthouse)
- ✅ Tous les tests a11y passent
- ✅ Feature flags fonctionnent (rollback testé)

**Métriques de succès**:
- ✅ Lighthouse score > 90 (toutes catégories)
- ✅ Coverage > 80%
- ✅ 0 régressions détectées en staging
- ✅ RUM montre perf stable

**Durée estimée**: 4-6 semaines

---

### Phase 3: Polish (P2 - Amélioration/Polish)

**Objectifs**: UX finale, SEO, i18n, architecture propre.

**Items (tickets)**:
1. ✅ Ajouter metadata dynamique partout (generateMetadata)
2. ✅ Générer sitemap dynamique complet (vérifier sitemap.ts)
3. ✅ Implémenter i18n (next-intl, français/arabe)
4. ✅ Évaluer state management global (Zustand si nécessaire)
5. ✅ Refactoriser composants dupliqués
6. ✅ Implémenter cache stratégique PWA (workbox)
7. ✅ Ajouter preconnect domaines externes (Stripe, Supabase)
8. ✅ Ajouter progressive enhancement (fallbacks HTML)

**Critères d'acceptation**:
- ✅ Metadata dynamique sur toutes pages
- ✅ Sitemap complet (toutes routes)
- ✅ i18n fonctionnel (français/arabe)
- ✅ Code dupliqué < 5%
- ✅ PWA fonctionne offline (cache stratégique)

**Métriques de succès**:
- ✅ SEO score > 90 (Lighthouse)
- ✅ i18n couvre 100% UI
- ✅ Code dupliqué < 5%

**Durée estimée**: 3-4 semaines

---

## 3) D) Definition of Done Front-End (Checklist)

### ✅ Performance
- [ ] LCP < 2.5s (Lighthouse)
- [ ] INP < 200ms (Lighthouse)
- [ ] CLS < 0.1 (Lighthouse)
- [ ] FCP < 1.8s (Lighthouse)
- [ ] TTI < 3.8s (Lighthouse)
- [ ] Bundle size < 250KB gzipped (performance budget)
- [ ] Images optimisées (next/image, WebP/AVIF)
- [ ] Code splitting (dynamic imports pour composants lourds)
- [ ] Prefetch routes critiques
- [ ] Cache headers configurés (static assets 1 an)

### ✅ Accessibilité (A11y)
- [ ] Tests a11y automatisés passent (axe-core)
- [ ] Contraste couleurs WCAG AA (4.5:1 minimum)
- [ ] Navigation clavier fonctionnelle (tab order logique)
- [ ] Focus visible sur tous éléments interactifs
- [ ] Focus trap sur modals
- [ ] ARIA labels sur éléments interactifs
- [ ] Skip links présents
- [ ] Heading hierarchy logique (h1-h6)
- [ ] Alt text sur toutes images
- [ ] Formulaires accessibles (labels associés)

### ✅ Tests
- [ ] Coverage > 80% sur code critique
- [ ] Tests unitaires passent (Vitest)
- [ ] Tests E2E passent (Playwright, flux critiques)
- [ ] Tests de charge validés (k6, scénarios critiques)
- [ ] Tests a11y passent (axe-core, jest-axe)
- [ ] Tests en CI (GitHub Actions)

### ✅ Monitoring & Observabilité
- [ ] Sentry configuré (client + server)
- [ ] Breadcrumbs Sentry (navigation, actions, API)
- [ ] RUM activé (Web Vitals tracking)
- [ ] Logs centralisés (Vercel Logs ou Sentry)
- [ ] Alerts configurés (erreurs critiques)
- [ ] Crash-free rate > 99.5%

### ✅ Sécurité
- [ ] Tokens auth dans cookies httpOnly (pas localStorage)
- [ ] CSP strict (pas d'unsafe-*)
- [ ] CSRF protection (tokens validés)
- [ ] Rate limiting distribué (Redis)
- [ ] Input validation (Zod schemas)
- [ ] XSS prevention (sanitization)
- [ ] Headers sécurité (HSTS, X-Frame-Options, etc.)

### ✅ i18n/SEO (si applicable)
- [ ] i18n implémenté (next-intl)
- [ ] Metadata dynamique (generateMetadata)
- [ ] Sitemap dynamique (sitemap.ts)
- [ ] Robots.txt configuré
- [ ] Langue HTML (lang="fr")

### ✅ CI/CD
- [ ] Build passe en CI
- [ ] Tests passent en CI
- [ ] Lint passe (ESLint)
- [ ] TypeScript vérifié (strict mode)
- [ ] Bundle analyzer en CI (alerte si > budget)
- [ ] Déploiement automatisé (Vercel)

### ✅ UX
- [ ] Loading states (skeletons partout)
- [ ] Error states (messages contextuels)
- [ ] Empty states (StateWrapper)
- [ ] Offline support (PWA, cache)
- [ ] Retry logic (backoff exponentiel)
- [ ] Microcopy contextuel

### ✅ Code Quality
- [ ] TypeScript strict mode activé
- [ ] ESLint passe (règles a11y strictes)
- [ ] Pas de code dupliqué (> 5%)
- [ ] Composants réutilisables
- [ ] Documentation (JSDoc sur fonctions complexes)

---

## 3) E) Patterns / Pseudocode

### Error Boundary + Fallback UX

```typescript
// components/error-boundaries/route-error-boundary.tsx
'use client'
import { Component, ReactNode } from 'react'
import * as Sentry from '@sentry/nextjs'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  route?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log to Sentry with context
    Sentry.captureException(error, {
      contexts: {
        react: errorInfo,
        route: { name: this.props.route },
      },
      tags: { errorBoundary: true },
    })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Une erreur est survenue</h1>
            <p className="text-muted-foreground mb-6">
              {this.state.error?.message || 'Erreur inattendue'}
            </p>
            <Button onClick={this.handleReset} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Réessayer
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// Utilisation
// app/reservation/layout.tsx
export default function ReservationLayout({ children }) {
  return (
    <RouteErrorBoundary route="reservation">
      {children}
    </RouteErrorBoundary>
  )
}
```

---

### Data Layer (Fetch Wrapper avec Timeout + Retry)

```typescript
// lib/fetch/with-timeout.ts
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 10000
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`)
    }
    throw error
  }
}

// lib/supabase/wrapper.ts
import { SupabaseClient } from '@supabase/supabase-js'

export async function withSupabaseTimeout<T>(
  query: Promise<{ data: T | null; error: any }>,
  timeoutMs: number = 10000
): Promise<{ data: T | null; error: any }> {
  const timeout = new Promise<{ data: null; error: Error }>((_, reject) =>
    setTimeout(() => reject(new Error('Supabase query timeout')), timeoutMs)
  )

  try {
    return await Promise.race([query, timeout])
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    }
  }
}

// Utilisation
const { data, error } = await withSupabaseTimeout(
  supabase.from('events').select('*'),
  10000
)
```

---

### Gestion Erreurs API (Mapping + Retry/Timeouts)

```typescript
// lib/api/error-handler.ts
import * as Sentry from '@sentry/nextjs'

export interface ApiError {
  message: string
  code: string
  status: number
  retryable: boolean
}

export function mapApiError(error: unknown, context?: string): ApiError {
  if (error instanceof Response) {
    const status = error.status
    return {
      message: getErrorMessage(status),
      code: `HTTP_${status}`,
      status,
      retryable: status >= 500 || status === 429,
    }
  }

  if (error instanceof Error) {
    // Network error
    if (error.message.includes('timeout') || error.message.includes('fetch')) {
      return {
        message: 'Problème de connexion. Vérifiez votre réseau.',
        code: 'NETWORK_ERROR',
        status: 0,
        retryable: true,
      }
    }

    // Timeout
    if (error.message.includes('timeout')) {
      return {
        message: 'La requête a pris trop de temps. Réessayez.',
        code: 'TIMEOUT',
        status: 0,
        retryable: true,
      }
    }
  }

  // Unknown error
  Sentry.captureException(error, { contexts: { api: { context } } })
  return {
    message: 'Une erreur inattendue est survenue.',
    code: 'UNKNOWN',
    status: 500,
    retryable: false,
  }
}

function getErrorMessage(status: number): string {
  const messages: Record<number, string> = {
    400: 'Requête invalide. Vérifiez vos données.',
    401: 'Vous devez être connecté pour effectuer cette action.',
    403: "Vous n'avez pas les permissions nécessaires.",
    404: 'Ressource introuvable.',
    429: 'Trop de requêtes. Réessayez dans quelques instants.',
    500: 'Erreur serveur. Réessayez plus tard.',
    503: 'Service temporairement indisponible.',
  }
  return messages[status] || 'Une erreur est survenue.'
}

// Utilisation dans composant
const [state, retry] = useRetry(async () => {
  const response = await fetchWithTimeout('/api/events', {}, 10000)
  if (!response.ok) {
    const error = mapApiError(response, 'fetchEvents')
    throw error
  }
  return response.json()
}, {
  maxRetries: 3,
  isRetryable: (error) => error.retryable,
})
```

---

### Analytics (Events + Consent + Data Minimization)

```typescript
// lib/analytics/tracker.ts
import * as Sentry from '@sentry/nextjs'
import { Analytics } from '@vercel/analytics/react'

interface ConsentState {
  analytics: boolean
  marketing: boolean
}

let consentState: ConsentState | null = null

export function setConsent(consent: ConsentState) {
  consentState = consent
  // Store in cookie/localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('consent', JSON.stringify(consent))
  }
}

export function trackEvent(
  event: string,
  properties?: Record<string, any>
) {
  if (!consentState?.analytics) {
    return // Don't track if no consent
  }

  // Vercel Analytics
  if (typeof window !== 'undefined' && window.va) {
    window.va('track', event, properties)
  }

  // Sentry (only errors, not all events)
  // Sentry.addBreadcrumb({
  //   category: 'analytics',
  //   message: event,
  //   data: properties,
  //   level: 'info',
  // })
}

export function trackError(error: Error, context?: Record<string, any>) {
  // Always track errors (not subject to consent)
  Sentry.captureException(error, {
    contexts: { custom: context },
  })
}

// Utilisation
trackEvent('reservation_created', {
  event_id: 'evt_123',
  ticket_type: 'vip',
  price: 150,
})
```

---

### Feature Flags / Config Runtime

```typescript
// lib/features/flags.ts
// Utilise Vercel Edge Config ou LaunchDarkly

export async function getFeatureFlag(flag: string): Promise<boolean> {
  // Option 1: Vercel Edge Config
  const config = await import('@vercel/edge-config')
  return (await config.get(flag)) ?? false

  // Option 2: Environment variable (fallback)
  // return process.env[`FEATURE_${flag.toUpperCase()}`] === 'true'
}

// Utilisation dans composant
'use client'
import { useEffect, useState } from 'react'

export function NewFeatureComponent() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    getFeatureFlag('new_feature').then(setEnabled)
  }, [])

  if (!enabled) return null

  return <div>New Feature</div>
}

// Utilisation dans API route
export async function POST(request: NextRequest) {
  const enabled = await getFeatureFlag('new_payment_method')
  if (!enabled) {
    return NextResponse.json({ error: 'Feature disabled' }, { status: 403 })
  }
  // ...
}
```

---

### Monitoring (Sentry Breadcrumbs, Tags, User Context)

```typescript
// lib/monitoring/sentry-enhanced.ts
import * as Sentry from '@sentry/nextjs'

// Ajouter breadcrumbs automatiquement
export function setupSentryBreadcrumbs() {
  // Navigation
  if (typeof window !== 'undefined') {
    let lastUrl = window.location.href

    // Track route changes
    const observer = new MutationObserver(() => {
      const currentUrl = window.location.href
      if (currentUrl !== lastUrl) {
        Sentry.addBreadcrumb({
          category: 'navigation',
          message: `Route changed to ${currentUrl}`,
          level: 'info',
        })
        lastUrl = currentUrl
      }
    })

    observer.observe(document, { subtree: true, childList: true })
  }
}

// Ajouter contexte utilisateur
export function setUserContext(user: { id: string; email: string; role: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.email,
    role: user.role,
  })
}

// Ajouter tags
export function setTags(tags: Record<string, string>) {
  Object.entries(tags).forEach(([key, value]) => {
    Sentry.setTag(key, value)
  })
}

// Wrapper pour API calls avec breadcrumbs
export async function trackedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  Sentry.addBreadcrumb({
    category: 'fetch',
    message: `API call: ${options.method || 'GET'} ${url}`,
    level: 'info',
    data: {
      url,
      method: options.method || 'GET',
    },
  })

  try {
    const response = await fetch(url, options)
    Sentry.addBreadcrumb({
      category: 'fetch',
      message: `API response: ${response.status} ${url}`,
      level: response.ok ? 'info' : 'warning',
      data: { status: response.status },
    })
    return response
  } catch (error) {
    Sentry.addBreadcrumb({
      category: 'fetch',
      message: `API error: ${url}`,
      level: 'error',
      data: { error: error instanceof Error ? error.message : String(error) },
    })
    throw error
  }
}

// Utilisation dans app
// app/layout.tsx
useEffect(() => {
  setupSentryBreadcrumbs()
}, [])

// Après login
setUserContext({ id: user.id, email: user.email, role: user.role })
setTags({ environment: process.env.NODE_ENV })
```

---

## 4) Risques "Invisibles" Identifiés

### 🔴 Critique
1. **Tokens dans localStorage**: Accessibles via XSS, vol de session possible
2. **Pas de timeout réseau**: Requêtes peuvent bloquer indéfiniment, timeout Next.js (10s) peut être atteint
3. **Rate limiting en mémoire**: Perdu au redémarrage, contournable avec plusieurs IPs
4. **CSP avec unsafe-***: Risque XSS élevé, injection de code possible
5. **Pas de cancellation requêtes**: Fuites mémoire, requêtes obsolètes continuent

### 🟡 Important
6. **Pas de Error Boundary routes critiques**: Crash total = perte conversion
7. **Erreurs non loggées Sentry**: Debugging impossible en production
8. **TypeScript strict: false**: Erreurs de type non détectées
9. **Pas de cache invalidation**: Données obsolètes affichées
10. **Pas de pagination**: Performance dégradée sur grandes listes

### 🟢 Mineur
11. **Pas de feature flags**: Rollback difficile
12. **Pas de RUM**: Problèmes perf non détectés
13. **Logs uniquement console**: Perdus en production
14. **Pas de tests a11y**: Non-conformité WCAG possible

---

## 5) Ordre d'Exécution Recommandé (Minimiser Régressions)

### Semaine 1: Filets de Sécurité
1. ✅ Error Boundaries routes critiques (protège contre crashes)
2. ✅ Logger erreurs vers Sentry (visibilité immédiate)
3. ✅ Timeout réseau (évite blocages)
4. ✅ Tests E2E flux critiques (détecte régressions)

### Semaine 2: Sécurité Auth
5. ✅ Migrer auth vers cookies httpOnly (sécurité critique)
6. ✅ Retirer unsafe-* du CSP (sécurité)
7. ✅ Rate limiting Redis (scalabilité)

### Semaine 3: Qualité Code
8. ✅ TypeScript strict mode (détecte bugs)
9. ✅ AbortController (performance)
10. ✅ Coverage tests 80%+ (stabilité)

### Semaine 4+: Améliorations
11. ✅ React Query (cache, invalidation)
12. ✅ Performance (bundle, images, lazy load)
13. ✅ Observabilité (RUM, logs centralisés)
14. ✅ UX (skeletons, microcopy, empty states)

---

## 6) Questions Ouvertes (Hypothèses)

### Hypothèses faites
1. **Hosting**: Vercel (présence `vercel.json`, `@vercel/analytics`)
2. **Base de données**: Supabase (PostgreSQL)
3. **Paiements**: Stripe + CMI + Mobile Money (fichiers présents)
4. **Public cible**: Maroc (français, pas i18n)

### Questions à clarifier
1. **Performance budget**: Quelles sont les limites acceptables ? (bundle, LCP, etc.)
2. **Navigateur min**: Quels navigateurs doivent être supportés ? (IE11 ?)
3. **Deadline**: Quand doit être livré en production ?
4. **Trafic attendu**: Combien d'utilisateurs simultanés ? (pour dimensionner rate limiting)
5. **Budget monitoring**: Budget Sentry/Vercel Analytics ? (pour configurer sample rates)
6. **i18n**: Besoin d'internationalisation ? (arabe, anglais ?)
7. **Feature flags**: Service préféré ? (Vercel Flags, LaunchDarkly, custom ?)
8. **Redis**: Service préféré ? (Upstash, Redis Cloud, autre ?)

---

## 7) Résumé Exécutif

### ✅ Points Forts
- Architecture Next.js moderne (App Router, Server Components)
- Sécurité de base présente (CSRF, rate limiting, headers)
- Observabilité partielle (Sentry configuré)
- Tests présents (unit, E2E, load)
- Accessibilité prise en compte (ESLint jsx-a11y strict)
- PWA basique (Service Worker, manifest)

### ⚠️ Points Critiques à Corriger (P0)
1. **TypeScript strict: false** → Activer strict mode
2. **Tokens dans localStorage** → Migrer vers cookies httpOnly
3. **Pas de timeout réseau** → Ajouter timeout 10-30s
4. **Pas de Error Boundaries critiques** → Ajouter sur routes critiques
5. **CSP avec unsafe-*** → Retirer, utiliser nonces
6. **Rate limiting en mémoire** → Migrer vers Redis

### 📊 Métriques Cibles
- **Lighthouse**: > 90 (toutes catégories)
- **Coverage**: > 80% (code critique)
- **Crash-free rate**: > 99.5%
- **LCP**: < 2.5s
- **INP**: < 200ms
- **CLS**: < 0.1

### 🎯 Prochaines Étapes
1. Valider roadmap avec équipe
2. Prioriser tickets P0 (Semaine 1-2)
3. Mettre en place filets de sécurité (Error Boundaries, Sentry)
4. Migrer auth (cookies httpOnly)
5. Améliorer progressivement (Phase 2-3)

---

**Fin de l'audit**







