# 🟠 TODO P1 - IMPORTANT (Stabilisation)

> **Statut verifie 2026-05-06**: ce backlog peut etre obsolete. Voir `docs/audits/AUDIT_E2E_DOUBLONS_HARDCODE_SCAFFOLD.md` pour l'etat verifie a cette date, et `docs/RELEASE_CHECKLIST.md` pour la checklist active.

**Priorité:** HAUTE  
**Objectif:** Stabiliser et optimiser pour production  
**Durée estimée:** 40-50h (5-6 jours)  
**Progression:** 0/35 tâches (0%)

---

## 📋 SECTION 1: TESTS COMPLETS

### 1.1 Tests Unitaires
**Fichier:** `tests/unit/`  
**Durée:** 10-12h

- [ ] **Tâche 1.1.1:** Tests validation schemas
  - [ ] Tester `lib/validation/schemas.ts`
  - [ ] Tester validation email, téléphone, date
  - [ ] Tester validation âge (13-17 ans)
  - [ ] Tester validation pseudo (unique)
  - [ ] Couverture > 80%

- [ ] **Tâche 1.1.2:** Tests sanitization
  - [ ] Tester `lib/validation/sanitize.ts`
  - [ ] Tester protection XSS
  - [ ] Tester nettoyage HTML
  - [ ] Tester échappement caractères spéciaux
  - [ ] Couverture > 80%

- [ ] **Tâche 1.1.3:** Tests fonctions utilitaires
  - [ ] Tester `lib/utils.ts`
  - [ ] Tester `lib/utils/date.ts`
  - [ ] Tester `lib/utils/format.ts`
  - [ ] Couverture > 70%

- [ ] **Tâche 1.1.4:** Tests hooks React
  - [ ] Tester `hooks/use-mobile.ts`
  - [ ] Tester `hooks/use-toast.ts`
  - [ ] Tester `hooks/use-window-size.ts`
  - [ ] Couverture > 70%

- [ ] **Tâche 1.1.5:** Tests composants UI
  - [ ] Tester composants critiques (Button, Input, Card)
  - [ ] Tester accessibilité (ARIA)
  - [ ] Tester interactions (click, hover)
  - [ ] Couverture > 60%

**Sous-total:** 10-12h

---

### 1.2 Tests E2E Complets
**Fichier:** `tests/e2e/`  
**Durée:** 15-20h

- [ ] **Tâche 1.2.1:** Tests parcours parent complets
  - [ ] Test: Gestion multi-enfants
  - [ ] Test: Top-up crédits
  - [ ] Test: Approbations parentales
  - [ ] Test: Historique transactions
  - [ ] Test: Budget limits

- [ ] **Tâche 1.2.2:** Tests parcours teen complets
  - [ ] Test: Gamification complète (XP, streaks, défis)
  - [ ] Test: Leaderboard
  - [ ] Test: Shop XP
  - [ ] Test: Fortune Wheel
  - [ ] Test: Crews

- [ ] **Tâche 1.2.3:** Tests parcours ambassador
  - [ ] Test: Génération code parrainage
  - [ ] Test: Partage code
  - [ ] Test: Suivi commissions
  - [ ] Test: Demande retrait

- [ ] **Tâche 1.2.4:** Tests parcours partner
  - [ ] Test: Création offre
  - [ ] Test: Scanner QR validation
  - [ ] Test: Statistiques
  - [ ] Test: Transactions

- [ ] **Tâche 1.2.5:** Tests parcours admin
  - [ ] Test: Gestion événements (CRUD)
  - [ ] Test: Gestion clubs
  - [ ] Test: Gestion utilisateurs
  - [ ] Test: Analytics
  - [ ] Test: Exports

- [ ] **Tâche 1.2.6:** Tests paiements
  - [ ] Test: Stripe (success, failed)
  - [ ] Test: CMI (success, failed)
  - [ ] Test: Mobile Money
  - [ ] Test: Paiement hybride XP

- [ ] **Tâche 1.2.7:** Tests responsive
  - [ ] Tester toutes pages sur mobile
  - [ ] Tester toutes pages sur tablette
  - [ ] Tester toutes pages sur desktop
  - [ ] Vérifier UI adaptatif

- [ ] **Tâche 1.2.8:** Tests performance
  - [ ] Mesurer temps chargement pages
  - [ ] Mesurer temps réponse APIs
  - [ ] Vérifier Lighthouse score > 90
  - [ ] Optimiser si nécessaire

**Sous-total:** 15-20h

---

### 1.3 Tests de Charge
**Fichier:** `tests/load/` (à créer)  
**Durée:** 5-6h

- [ ] **Tâche 1.3.1:** Setup k6 ou Artillery
  - [ ] Installer outil de test charge
  - [ ] Configurer scripts de test
  - [ ] Préparer données de test
  - [ ] Documenter procédure

- [ ] **Tâche 1.3.2:** Test charge APIs critiques
  - [ ] Test: `/api/bookings/create` (100 req/s)
  - [ ] Test: `/api/check-in/entry` (50 req/s)
  - [ ] Test: `/api/payments/process` (20 req/s)
  - [ ] Identifier goulots d'étranglement

- [ ] **Tâche 1.3.3:** Test charge base de données
  - [ ] Test: Queries fréquentes (events, bookings)
  - [ ] Vérifier temps réponse < 200ms
  - [ ] Identifier queries lentes
  - [ ] Optimiser si nécessaire

- [ ] **Tâche 1.3.4:** Rapport et recommandations
  - [ ] Générer rapport détaillé
  - [ ] Identifier limites actuelles
  - [ ] Recommander optimisations
  - [ ] Documenter résultats

**Sous-total:** 5-6h

---

## 📋 SECTION 2: MONITORING PRODUCTION

### 2.1 Sentry (Erreurs)
**Fichier:** Configuration Sentry  
**Durée:** 4-5h

- [ ] **Tâche 2.1.1:** Installer Sentry
  - [ ] `npm install @sentry/nextjs`
  - [ ] `npx @sentry/wizard@latest -i nextjs`
  - [ ] Configurer `sentry.client.config.ts`
  - [ ] Configurer `sentry.server.config.ts`
  - [ ] Configurer `sentry.edge.config.ts`

- [ ] **Tâche 2.1.2:** Configurer variables env
  - [ ] Ajouter `SENTRY_DSN` en production
  - [ ] Ajouter `SENTRY_AUTH_TOKEN`
  - [ ] Configurer release tracking
  - [ ] Tester connexion

- [ ] **Tâche 2.1.3:** Capturer erreurs frontend
  - [ ] Wrapper erreurs React (ErrorBoundary)
  - [ ] Capturer erreurs API calls
  - [ ] Capturer erreurs formulaires
  - [ ] Tester avec erreur volontaire

- [ ] **Tâche 2.1.4:** Capturer erreurs backend
  - [ ] Wrapper erreurs API routes
  - [ ] Capturer erreurs Server Actions
  - [ ] Capturer erreurs base de données
  - [ ] Tester avec erreur volontaire

- [ ] **Tâche 2.1.5:** Configurer alertes
  - [ ] Alertes email pour erreurs critiques
  - [ ] Alertes Slack/Discord (optionnel)
  - [ ] Seuils d'alerte (ex: > 10 erreurs/min)
  - [ ] Tester alertes

- [ ] **Tâche 2.1.6:** Configurer context utilisateur
  - [ ] Ajouter user_id dans contexte
  - [ ] Ajouter role dans contexte
  - [ ] Ajouter metadata (page, action)
  - [ ] Tester contexte

**Sous-total:** 4-5h

---

### 2.2 Vercel Analytics
**Fichier:** Configuration Vercel  
**Durée:** 2-3h

- [ ] **Tâche 2.2.1:** Activer Vercel Analytics
  - [ ] Installer `@vercel/analytics`
  - [ ] Ajouter `<Analytics />` dans layout
  - [ ] Vérifier tracking activé
  - [ ] Tester en local

- [ ] **Tâche 2.2.2:** Configurer événements custom
  - [ ] Tracker événements métier (booking, payment)
  - [ ] Tracker conversions
  - [ ] Tracker erreurs utilisateur
  - [ ] Documenter événements

- [ ] **Tâche 2.2.3:** Configurer Web Vitals
  - [ ] Tracker Core Web Vitals
  - [ ] Configurer alertes si dégradation
  - [ ] Dashboard Vercel
  - [ ] Optimiser si nécessaire

**Sous-total:** 2-3h

---

### 2.3 Logs Structurés
**Fichier:** `lib/logging/` (à créer)  
**Durée:** 3-4h

- [ ] **Tâche 2.3.1:** Créer système de logging
  - [ ] Créer `lib/logging/logger.ts`
  - [ ] Niveaux: debug, info, warn, error
  - [ ] Format JSON structuré
  - [ ] Context automatique (user, request)

- [ ] **Tâche 2.3.2:** Logger actions critiques
  - [ ] Logger créations bookings
  - [ ] Logger paiements
  - [ ] Logger check-in/check-out
  - [ ] Logger actions admin

- [ ] **Tâche 2.3.3:** Logger erreurs
  - [ ] Logger toutes erreurs avec stack trace
  - [ ] Logger erreurs API avec request details
  - [ ] Logger erreurs DB avec query
  - [ ] Format pour Sentry

- [ ] **Tâche 2.3.4:** Centraliser logs Supabase
  - [ ] Configurer table `application_logs`
  - [ ] Stocker logs importants
  - [ ] Rotation automatique (30 jours)
  - [ ] Dashboard admin pour voir logs

**Sous-total:** 3-4h

---

### 2.4 Alertes Automatiques
**Fichier:** Configuration alertes  
**Durée:** 2-3h

- [ ] **Tâche 2.4.1:** Alertes erreurs critiques
  - [ ] Configurer Sentry alertes
  - [ ] Alertes paiements échoués
  - [ ] Alertes erreurs DB
  - [ ] Notifications email/Slack

- [ ] **Tâche 2.4.2:** Alertes performance
  - [ ] Alertes si temps réponse > 2s
  - [ ] Alertes si erreur rate > 5%
  - [ ] Alertes si disponibilité < 99%
  - [ ] Dashboard monitoring

- [ ] **Tâche 2.4.3:** Alertes sécurité
  - [ ] Alertes tentatives brute force
  - [ ] Alertes accès non autorisés
  - [ ] Alertes anomalies paiement
  - [ ] Logs audit

**Sous-total:** 2-3h

---

## 📋 SECTION 3: PERFORMANCE

### 3.1 Optimisation Images
**Fichier:** Configuration Next.js Image  
**Durée:** 4-5h

- [ ] **Tâche 3.1.1:** Activer Next.js Image Optimization
  - [ ] Vérifier `next.config.mjs` configuré
  - [ ] Configurer domaines images externes
  - [ ] Tester optimisation automatique
  - [ ] Mesurer gains performance

- [ ] **Tâche 3.1.2:** Compression uploads client-side
  - [ ] Utiliser `browser-image-compression`
  - [ ] Compresser avatars (max 1MB, 1920x1920)
  - [ ] Compresser photos événements
  - [ ] Tester qualité vs taille

- [ ] **Tâche 3.1.3:** Formats modernes (WebP)
  - [ ] Configurer Next.js pour WebP
  - [ ] Convertir images existantes
  - [ ] Fallback JPEG/PNG
  - [ ] Mesurer gains

- [ ] **Tâche 3.1.4:** Lazy loading images
  - [ ] Utiliser `loading="lazy"` sur images
  - [ ] Prioriser images above-the-fold
  - [ ] Utiliser `priority` pour hero images
  - [ ] Tester performance

- [ ] **Tâche 3.1.5:** CDN pour assets statiques
  - [ ] Configurer Vercel Blob ou Cloudflare
  - [ ] Migrer images vers CDN
  - [ ] Mettre à jour URLs
  - [ ] Tester vitesse chargement

**Sous-total:** 4-5h

---

### 3.2 Optimisation Code
**Fichier:** Configuration build  
**Durée:** 3-4h

- [ ] **Tâche 3.2.1:** Code splitting optimisé
  - [ ] Vérifier bundles par route
  - [ ] Identifier bundles trop gros
  - [ ] Lazy load composants lourds
  - [ ] Mesurer taille bundles

- [ ] **Tâche 3.2.2:** Tree shaking
  - [ ] Vérifier imports inutilisés
  - [ ] Utiliser imports nommés
  - [ ] Éliminer dead code
  - [ ] Mesurer réduction taille

- [ ] **Tâche 3.2.3:** Minification
  - [ ] Vérifier minification activée
  - [ ] Minifier CSS
  - [ ] Minifier JavaScript
  - [ ] Mesurer gains

- [ ] **Tâche 3.2.4:** Caching stratégique
  - [ ] Configurer `revalidate` sur pages statiques
  - [ ] Cache API responses (si applicable)
  - [ ] Cache assets statiques
  - [ ] Tester cache

**Sous-total:** 3-4h

---

### 3.3 Lighthouse Score > 90
**Fichier:** Tests Lighthouse  
**Durée:** 2-3h

- [ ] **Tâche 3.3.1:** Audit Lighthouse initial
  - [ ] Exécuter Lighthouse sur toutes pages critiques
  - [ ] Documenter scores actuels
  - [ ] Identifier problèmes
  - [ ] Prioriser optimisations

- [ ] **Tâche 3.3.2:** Optimiser Performance
  - [ ] Réduire First Contentful Paint
  - [ ] Réduire Largest Contentful Paint
  - [ ] Optimiser Time to Interactive
  - [ ] Atteindre score > 90

- [ ] **Tâche 3.3.3:** Optimiser Accessibilité
  - [ ] Corriger problèmes ARIA
  - [ ] Améliorer contraste couleurs
  - [ ] Ajouter labels manquants
  - [ ] Atteindre score > 90

- [ ] **Tâche 3.3.4:** Optimiser SEO
  - [ ] Ajouter metadata complètes
  - [ ] Optimiser sitemap
  - [ ] Améliorer structure HTML
  - [ ] Atteindre score > 90

- [ ] **Tâche 3.3.5:** Optimiser Best Practices
  - [ ] Corriger warnings console
  - [ ] Utiliser HTTPS
  - [ ] Éviter APIs dépréciées
  - [ ] Atteindre score > 90

**Sous-total:** 2-3h

---

## 📋 SECTION 4: DOCUMENTATION

### 4.1 Documentation API
**Fichier:** `docs/API.md`  
**Durée:** 4-5h

- [ ] **Tâche 4.1.1:** Documenter toutes API routes
  - [ ] Lister toutes routes `/api/*`
  - [ ] Documenter méthode, params, response
  - [ ] Ajouter exemples requests/responses
  - [ ] Documenter erreurs possibles

- [ ] **Tâche 4.1.2:** Documenter Server Actions
  - [ ] Lister toutes Server Actions
  - [ ] Documenter params, return type
  - [ ] Ajouter exemples usage
  - [ ] Documenter erreurs

- [ ] **Tâche 4.1.3:** Créer Postman collection
  - [ ] Exporter toutes API routes
  - [ ] Ajouter variables d'environnement
  - [ ] Ajouter exemples requests
  - [ ] Partager collection

- [ ] **Tâche 4.1.4:** Documenter authentification
  - [ ] Documenter flow auth
  - [ ] Documenter tokens
  - [ ] Documenter permissions
  - [ ] Exemples code

**Sous-total:** 4-5h

---

### 4.2 Documentation Déploiement
**Fichier:** `docs/DEPLOYMENT.md`  
**Durée:** 2-3h

- [ ] **Tâche 4.2.1:** Guide déploiement production
  - [ ] Étapes déploiement Vercel
  - [ ] Configuration variables env
  - [ ] Configuration domaines
  - [ ] Checklist pré-déploiement

- [ ] **Tâche 4.2.2:** Guide rollback
  - [ ] Procédure rollback
  - [ ] Backup base de données
  - [ ] Restauration données
  - [ ] Communication équipe

- [ ] **Tâche 4.2.3:** Guide maintenance
  - [ ] Procédures maintenance
  - [ ] Mises à jour dépendances
  - [ ] Migrations base de données
  - [ ] Monitoring

**Sous-total:** 2-3h

---

## 📊 RÉCAPITULATIF P1

### Total Estimé
- **Tests Complets:** 30-38h
- **Monitoring Production:** 11-15h
- **Performance:** 9-12h
- **Documentation:** 6-8h

**TOTAL: 56-73h (7-9 jours à plein temps)**

### Progression
- [ ] Section 1: Tests Complets (0/3 sous-sections)
- [ ] Section 2: Monitoring Production (0/4 sous-sections)
- [ ] Section 3: Performance (0/3 sous-sections)
- [ ] Section 4: Documentation (0/2 sous-sections)

**TOTAL: 0/12 sections complétées (0%)**

---

## ✅ VALIDATION P1

Une fois toutes les tâches P1 complétées, valider:

- [ ] Tests E2E passent à 100%
- [ ] Couverture tests unitaires > 60%
- [ ] Sentry configuré et fonctionnel
- [ ] Vercel Analytics activé
- [ ] Lighthouse score > 90 sur toutes pages
- [ ] Documentation API complète
- [ ] Performance optimisée

**Le produit est alors prêt pour production ! 🚀**

---

*Dernière mise à jour: Décembre 2024*









