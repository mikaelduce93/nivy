# Prochaines Étapes - Sécurité P0

**Date**: 2025-01-27  
**Statut**: Implémentation de base complétée, migration en cours

---

## ✅ Complété

1. **Migration Auth vers Cookies httpOnly** - `lib/supabase/client.ts` modifié
2. **Sécurisation CSP** - Nonces implémentés dans `middleware.ts` et `app/layout.tsx`
3. **Rate Limiting Distribué** - `lib/security/rate-limiter-redis.ts` créé, middleware mis à jour
4. **Wrappers Timeout** - `lib/fetch/with-timeout.ts` et `lib/supabase/wrapper.ts` créés

---

## ⏳ En Cours

### Migration Timeout (Priorité P0)

**Routes API migrées**: 4/190 (2%)
- ✅ `app/api/payments/process/route.ts`
- ✅ `app/api/bookings/create/route.ts`
- ✅ `app/api/auth/validate-teen/route.ts`
- ✅ `app/api/auth/register-teen/route.ts`

**Hooks migrés**: 1/50+ (2%)
- ✅ `lib/hooks/use-pillars.ts`

**Composants migrés**: 1/100+ (1%)
- ✅ `app/teen/xp-value/page.tsx`

**Prochaines migrations prioritaires**:
1. `app/api/payments/**/*.ts` - Autres routes de paiement
2. `components/payment-method-selector.tsx` - Sélecteur paiement
3. `components/check-in-interface.tsx` - Interface check-in
4. `app/parent/live/page.tsx` - Dashboard live parent

**Guide**: Voir `docs/MIGRATION_GUIDE_TIMEOUT.md`

---

## 📋 À Faire

### Configuration Redis (Optionnel mais Recommandé)

1. **Créer compte Upstash Redis**
   - Aller sur https://console.upstash.com/
   - Créer une base Redis (gratuit jusqu'à 10K req/jour)
   - Copier `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN`

2. **Ajouter variables d'environnement**
   ```env
   UPSTASH_REDIS_REST_URL=your_url_here
   UPSTASH_REDIS_REST_TOKEN=your_token_here
   ```

3. **Installer dépendance** (si nécessaire)
   ```bash
   npm install @upstash/redis
   ```

4. **Tester**
   - Vérifier que rate limiting fonctionne
   - Vérifier que limite persiste après redémarrage

---

### Tests de Validation

#### Tâche 1: Auth Cookies httpOnly
- [ ] Ouvrir DevTools → Application → Local Storage
- [ ] Se connecter avec un compte
- [ ] Vérifier qu'aucun token Supabase n'est dans localStorage
- [ ] Vérifier que les cookies sont présents (Application → Cookies)
- [ ] Tester login/logout sur tous les rôles (parent, teen, ambassador, partner, admin)
- [ ] Vérifier que session persiste après refresh

#### Tâche 2: CSP Sécurisé
- [ ] Ouvrir DevTools → Console
- [ ] Naviguer sur toutes les pages principales
- [ ] Vérifier qu'il n'y a pas d'erreurs CSP
- [ ] Tester Stripe (si configuré)
- [ ] Tester analytics (Vercel Analytics)
- [ ] Vérifier que l'application fonctionne normalement

#### Tâche 3: Rate Limiting Distribué
- [ ] Configurer Upstash Redis (voir ci-dessus)
- [ ] Faire 6 requêtes rapides vers `/api/auth/login` (ou autre endpoint avec limite 5)
- [ ] Vérifier que la 6ème requête retourne 429
- [ ] Redémarrer le serveur
- [ ] Vérifier que la limite persiste (si Redis configuré)
- [ ] Vérifier monitoring Upstash (si configuré)

#### Tâche 4: Timeout Réseau
- [ ] Ouvrir DevTools → Network
- [ ] Activer throttling "Slow 3G"
- [ ] Tester routes migrées (payments, bookings)
- [ ] Vérifier que timeout fonctionne (erreur après 10-30s)
- [ ] Vérifier que erreurs timeout sont loggées vers Sentry
- [ ] Vérifier que messages d'erreur sont clairs pour l'utilisateur

---

### Migration Complète (Long terme)

**Estimation**: ~340 fichiers à migrer

**Stratégie**:
1. Migrer routes critiques d'abord (P0)
2. Migrer hooks et composants critiques (P1)
3. Migrer reste du codebase progressivement (P2)

**Outils**:
- Utiliser `grep` pour trouver tous les `fetch` et `supabase.from()`
- Suivre le guide dans `docs/MIGRATION_GUIDE_TIMEOUT.md`
- Tester chaque migration avant de passer à la suivante

---

## 📊 Progression

### Implémentation de Base
- ✅ Tâche 1: Auth Cookies httpOnly - 100%
- ✅ Tâche 2: CSP Sécurisé - 100%
- ✅ Tâche 3: Rate Limiting Distribué - 100% (code), 0% (config)
- ✅ Tâche 4: Wrappers Timeout - 100% (code), 5% (migration)

### Migration Timeout
- Routes API: 4/190 (2%)
- Hooks: 1/50+ (2%)
- Composants: 1/100+ (1%)
- **Total**: 6/340+ (2%)

---

## 🚨 Points d'Attention

1. **Redis Optionnel**: Le rate limiting fonctionne sans Redis (fallback in-memory), mais Redis est recommandé pour la production.

2. **CSP en Développement**: `'unsafe-eval'` peut être nécessaire en développement pour Next.js hot reload. En production, CSP est strict.

3. **Migration Progressive**: Les wrappers timeout doivent être intégrés progressivement. Commencer par les routes critiques.

4. **Tests E2E**: Les tests E2E doivent être mis à jour pour utiliser les cookies au lieu de localStorage.

5. **Performance**: Les timeouts ajoutent une légère latence mais améliorent la fiabilité. Timeout par défaut: 30s (configurable).

---

## 📚 Documentation

- `docs/SECURITY_IMPLEMENTATION_P0.md` - Détails de l'implémentation
- `docs/MIGRATION_GUIDE_TIMEOUT.md` - Guide de migration timeout
- `env.template` - Variables d'environnement (inclut Redis)

---

**Dernière mise à jour**: 2025-01-27

