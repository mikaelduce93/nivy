# Monitoring & Observabilité - Teens Party Morocco

## Vue d'ensemble

Le système de monitoring est basé sur **Sentry** et fournit :
- ✅ Breadcrumbs automatiques (navigation, actions, API)
- ✅ User context et tags
- ✅ Logging centralisé de toutes les erreurs API
- ✅ RUM (Real User Monitoring) avec Web Vitals
- ✅ Logger centralisé

## Architecture

### Fichiers principaux

```
lib/monitoring/
├── sentry.ts              # Utilitaires Sentry de base
├── sentry-enhanced.ts     # Breadcrumbs et contexte utilisateur (client)
├── sentry-server.ts       # Utilitaires Sentry serveur
├── logger.ts              # Logger centralisé
└── index.ts               # Exports centralisés

components/monitoring/
├── sentry-breadcrumbs-setup.tsx  # Setup breadcrumbs (client)
├── sentry-user-context.tsx       # Gestion contexte utilisateur (client)
└── sentry-web-vitals.tsx        # Tracking Web Vitals (client)
```

## Utilisation

### 1. Breadcrumbs Sentry

Les breadcrumbs sont automatiquement configurés dans `app/layout.tsx` via le composant `<SentryBreadcrumbsSetup />`.

**Utilisation manuelle :**

```typescript
import { addBreadcrumb } from '@/lib/monitoring'

// Ajouter un breadcrumb
addBreadcrumb('User clicked button', 'ui', {
  buttonId: 'submit-form',
  page: '/checkout'
})
```

**Wrapper fetch avec breadcrumbs :**

```typescript
import { trackedFetch } from '@/lib/monitoring'

// Utiliser trackedFetch au lieu de fetch
const response = await trackedFetch('/api/bookings', {
  method: 'POST',
  body: JSON.stringify(data)
})
```

### 2. User Context et Tags

Le contexte utilisateur est automatiquement défini après login via `<SentryUserContext />`.

**Utilisation manuelle (client) :**

```typescript
import { setUserContext, setTags } from '@/lib/monitoring'

// Définir contexte utilisateur
setUserContext({
  id: user.id,
  email: user.email,
  role: 'teen'
})

// Définir tags
setTags({
  feature_flag_new_checkout: 'enabled',
  subscription_tier: 'premium'
})
```

**Utilisation serveur :**

```typescript
import { setEnvironmentTagServer } from '@/lib/monitoring'

// Dans middleware ou routes API
setEnvironmentTagServer('production')
```

### 3. Logger Erreurs API

Toutes les erreurs API sont automatiquement loggées vers Sentry via `withSecurity` dans `lib/security/api-middleware.ts`.

**Exemple d'utilisation :**

```typescript
import { withSecurity } from '@/lib/security/api-middleware'

export const POST = withSecurity(async (request) => {
  // Votre logique API
  // Les erreurs sont automatiquement loggées vers Sentry
}, { rateLimit: 'booking' })
```

**Contexte automatiquement capturé :**
- Route et méthode
- User context (si authentifié)
- Route params
- Search params
- Request body (sanitized)
- User agent et IP

### 4. RUM (Real User Monitoring)

Le RUM est activé dans `sentry.client.config.ts` avec un sample rate de 10% en production.

**Métriques trackées automatiquement :**
- LCP (Largest Contentful Paint)
- INP (Interaction to Next Paint)
- CLS (Cumulative Layout Shift)
- FCP (First Contentful Paint)
- TTFB (Time to First Byte)

**Vérification dans Sentry :**
- Allez dans Sentry Dashboard → Performance
- Consultez les métriques Web Vitals

### 5. Logger Centralisé

**Remplacer `console.log` par le logger :**

```typescript
import { log } from '@/lib/monitoring'

// Au lieu de console.log
console.log('User logged in', { userId: user.id })

// Utiliser
log.info('User logged in', { userId: user.id })

// Niveaux disponibles
log.debug('Debug message', { data })
log.info('Info message', { context })
log.warn('Warning message', { context })
log.error('Error message', error, { context })

// Helpers spécialisés
log.apiRequest('POST', '/api/bookings', { bookingId: '123' })
log.apiResponse('POST', '/api/bookings', 200, 150, { bookingId: '123' })
log.userAction('clicked_checkout_button', { page: '/checkout' })
log.performance('page_load_time', 1200, 'ms', { page: '/events' })
```

**Avantages :**
- ✅ Sanitisation automatique des données sensibles
- ✅ Intégration avec Sentry (breadcrumbs + exceptions)
- ✅ Niveaux de log configurables
- ✅ Format structuré (JSON)

## Configuration

### Variables d'environnement

```env
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
SENTRY_DSN=your_sentry_dsn
NODE_ENV=production
```

### Sample Rates

Dans `sentry.client.config.ts` :
- `tracesSampleRate: 0.1` (10% des transactions)
- `replaysSessionSampleRate: 0.1` (10% des sessions)
- `replaysOnErrorSampleRate: 1.0` (100% des erreurs)

Ajustez selon vos besoins et budget Sentry.

## Vérification

### 1. Breadcrumbs

1. Allez sur votre application
2. Naviguez entre les pages
3. Faites des actions (clics, formulaires)
4. Dans Sentry → Issues → Sélectionnez une erreur
5. Vérifiez l'onglet "Breadcrumbs"

### 2. User Context

1. Connectez-vous à l'application
2. Dans Sentry → Issues → Sélectionnez une erreur
3. Vérifiez la section "User" avec id, email, role

### 3. Tags

1. Dans Sentry → Issues
2. Utilisez les filtres pour filtrer par tag (environment, feature, etc.)

### 4. Erreurs API

1. Provoquez une erreur API (ex: validation échouée)
2. Dans Sentry → Issues
3. Vérifiez que l'erreur contient :
   - Route et méthode
   - User context
   - Request body (sanitized)
   - Route params

### 5. RUM

1. Dans Sentry → Performance
2. Vérifiez les métriques Web Vitals
3. Consultez les transactions utilisateur

## Migration depuis console.log

**Étape 1 :** Remplacer progressivement

```typescript
// Avant
console.log('User action', data)
console.error('Error occurred', error)

// Après
import { log } from '@/lib/monitoring'
log.info('User action', data)
log.error('Error occurred', error)
```

**Étape 2 :** Utiliser trackedFetch

```typescript
// Avant
const response = await fetch('/api/endpoint')

// Après
import { trackedFetch } from '@/lib/monitoring'
const response = await trackedFetch('/api/endpoint')
```

## Bonnes Pratiques

1. **Ne jamais logger de données sensibles**
   - Le logger sanitise automatiquement, mais évitez de passer des tokens/passwords

2. **Utiliser les bons niveaux**
   - `debug`: développement uniquement
   - `info`: informations générales
   - `warn`: avertissements (ex: rate limit atteint)
   - `error`: erreurs réelles

3. **Contexte structuré**
   - Toujours passer un objet de contexte plutôt que des strings concaténées

4. **Sample rates**
   - Ajustez les sample rates selon votre volume et budget

## Support

Pour toute question, consultez :
- [Documentation Sentry](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Dashboard](https://sentry.io)

